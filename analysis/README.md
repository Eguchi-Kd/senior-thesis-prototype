# データエクスポート（Firestore → CSV）

Firestore の `sessions` コレクションはセキュリティルールで**読み取り禁止**にしているため、
分析用のデータ取り出しは**サービスアカウント鍵を使う Admin SDK**で行う（ルールをバイパスする。無料プランで可）。

## 1. サービスアカウント鍵の取得（初回のみ）
1. [Firebase コンソール](https://console.firebase.google.com/project/project-ba2d6/settings/serviceaccounts/adminsdk) を開く
2. プロジェクト設定 → **サービス アカウント** → **新しい秘密鍵を生成**
3. ダウンロードしたJSONを `analysis/serviceAccountKey.json` として保存する

> ⚠️ この鍵は**データベースへの全権限**を持つ秘密情報。**絶対にコミット・共有しない**（`.gitignore` 済み）。

## 2. 依存のインストール
```bash
pip install -r analysis/requirements.txt
```

## 3. エクスポート実行
```bash
python analysis/export_firestore.py                # 本番データのみ（testRun を除外）
python analysis/export_firestore.py --include-test # テスト実行も含める
```

出力：`analysis/data/export_YYYYMMDD_HHMMSS/` に3つのCSV
- `sessions.csv` … 1行/セッション（属性・自己効力感 pre/post・SUS・完遂/離脱 など）
- `trials.csv` … 1行/ゲーム内シナリオ（RT・確信度・signalType・difficulty・提示順 など）
- `tests.csv` … 1行/事前・事後テスト項目（phase=pre/post・正誤・RT など）

## テスト/本番の区別
プレイ時のURL末尾に `?test=1` を付けると、その端末に「テストモード」が保存され、`testRun=true` として記録される（既定のエクスポートで除外）。
テストモードは **解除するまで続く**（結果画面から再プレイしても切れない）。タイトルに「🧪 テストモード中」と表示される。
本番（大学祭）の前に、本番用の各端末でタイトルの「テストモードを解除」を押すか `?test=0` を開き、表示が消えたことを確認すること。

## 分析の流れ
```
python export_firestore.py [--include-test]          # 抽出（パイロットは --include-test）
python validate_export.py data/export_XXXX            # 検証（ERROR 0 を確認）
python select_sample.py data/export_XXXX --content-version <版> [--staff 記録.csv] [--include-test]
python analyze_primary.py data/export_XXXX/sample     # 主要・副次評価（分析計画どおり）
```
select_sample.py の notes（priorPlays・再読み込み・所要時間の欠損など）は自動では除外しない。担当者記録と照合し、要確認の一覧を確定してから主解析に進むこと。

## 補足
- 信号検出の集計例：`trials.csv` の `signalType`（hit/miss/fa/cr）と `isFraud` から
  ヒット率・誤警報率を出し、感度 d′ と判断基準 c を算出できる。
- 統計分析：`analyze_primary.py` で主要評価（事前→事後の正答数差・Wilcoxon・効果量・ブートストラップ区間）と副次評価（見逃し/誤警報・d′・c・確信度・フォーム順・項目分析・SUS・自己効力感・priorPlays=0 の感度分析）を出力する。
- 未実装（別途集計）：本編の行動（確認行動・ヒント・調べ直し・RT）、学習実感・没入感・難しさの要約。RT を集計するときは restarted と非表示時間の基準（docs/分析計画.md）を適用する。
