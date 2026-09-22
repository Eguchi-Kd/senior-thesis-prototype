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
プレイ時のURL末尾に `?test=1` を付けると `testRun=true` として記録され、既定のエクスポートで除外される。
本番（大学祭）ではクリーンなURL（QR）を使うこと。

## 補足
- 信号検出の集計例：`trials.csv` の `signalType`（hit/miss/fa/cr）と `isFraud` から
  ヒット率・誤警報率を出し、感度 d′ と判断基準 c を算出できる。
- 実際の統計分析スクリプト（d′・pre/post・確信度校正・SUS集計）は別途整備する。
