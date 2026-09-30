# AI HANDOFF

## Current Goal
学祭での本収集に向け、研究用ログの品質と研究設計を固める。研究は体験型デジタル詐欺学習ゲームの設計と即時判断成績・使用体験の評価。今回の依頼はClaude Codeの変更後レビューと、現在のログで論文を書けるかの評価。

## Current State
- HEAD は下の Last Work のコミット。Next.js 15 静的出力＋R3F＋Zustand、GitHub Pages、Firestore。contentVersion `2026-10-05`、schemaVersion 3。
- research：同意→属性→事前6問→練習→本編6問→事後6問→アンケート→結果。free：同意→練習→本編→結果。export は free/testRun を既定除外。
- テストモード：`?test=1` を開くと端末（localStorage）に保存され、タイトルの「テストモードを解除」か `?test=0` まで維持。タイトルに「🧪 テストモード中」を表示。
- 分析の流れ：`export_firestore.py` → `validate_export.py`（同意・値域も検査）→ `select_sample.py`（除外基準を適用し sample/ に採否と理由）→ `analyze_primary.py`（主要・副次評価。方法は docs/分析計画.md に固定）。

## Last Work
Claude Code（2026-09-30）：Codex の docs/research-readiness-review.md に対応。R1〜R6 はコードで事実を確認し全採用。
- R1 テストモードの端末保存（lib/testMode.ts）・解除ボタン
- R2 export に consent_agreed/consent_timestamp、select_sample.py（担当者記録CSVは参加者コードで照合。新しい個人情報・受付番号は追加しない）
- R3 集計 Promise は送信時の sessionId と一致する場合だけ状態更新
- R4 結果画面の setPhase を本編完了時のみ
- R5 validator：SUS・自己効力感・学習実感・没入感・難しさ・ITへの自信が整数1〜5、playMode・同意
- R6 hiddenAfterFirstInspectMs を追加し診断・レーダーはそれを使用（研究分析は従来どおり非表示の多い試行を除外）
- 計画の仕上げ：Wilcoxon（Pratt・正規近似・連続性補正なし）、順位双列相関、ペアのブートストラップ（seed 20261103）、全員差0の扱い、項目－残余相関、本収集時の固定保存を分析計画に明記し analyze_primary.py に実装
- 保留：判定した通知ID・理由の記録（パイロットの聞き取り後に判断）

## Changed Files
- 新規 `lib/testMode.ts`、`analysis/select_sample.py`、`analysis/analyze_primary.py`
- `store/gameStore.ts`、`lib/version.ts`、`lib/playerType.ts`、`app/page.tsx`、`app/result/ResultClient.tsx`
- `analysis/export_firestore.py`、`analysis/validate_export.py`（check() に分割）、`analysis/check_store.mjs`（8ケース）、`analysis/items.json`
- `docs/分析計画.md`、`docs/パイロット実施手順.md`

## Decisions
- 既決定を継続：コレクション変更なし・research/free の論理分離、統制群なし、各テスト6問、ヒント減点なし、フォームのランダム割付、旧版の強制リセットなし、表示用集計のサーバー側重複排除なし、アンケート途中復元・確信度再確認・保存間引き・匿名認証は見送り。
- R2 の「匿名の受付番号」は既存の参加者コードで代替（個人情報を増やさない）。
- 判定した通知ID・理由の記録は、主張を即時判断成績に絞る現計画では回答負担を増やさないため保留。パイロットの聞き取りで必要性を判断。

## Verification
- `pnpm exec tsc --noEmit`・`pnpm lint`：成功。GitHub Actions：下記コミットで確認
- `node analysis/check_store.mjs`：8/8 OK（テストモードが再プレイ後も維持され ?test=0 で解除、初回調査以降の非表示時間の区間を含む）
- 本番想定の再現データ16件：validate が同意なし・SUS 99 を ERROR 検出 → select_sample が自由プレイ・同意なし・検証エラーを理由付きで除外（14件採用）→ analyze_primary が主要・副次評価を出力
- パイロット想定（testRun）：select_sample は既定で全件除外、`--include-test` で採用
- R3 はコンポーネント内の処理のため自動試験なし（コードで sessionId 照合を確認）
- 未確認：実機・ブラウザ（テストモード表示・解除、連続参加、結果URL直行、通信断→復帰）、ローカル build（CIは成功）

## Known Issues
- 実機・ブラウザでの通し確認が未実施。
- 本編ログに判定した通知ID・理由がない（理解の直接測定には不足。主張の範囲を即時判断成績に限定）。
- 所要時間（倫理申請「約10分」との差）、フォーム難易度、欠損率はパイロットで確認。
- ダミー導入後の難易度再採点、部屋の衝突判定は未対応。ローカル `.env.local` なし。`orchestrator/`・`Microsoft/` は触らない。

## Next Steps
1. 実機で研究/自由プレイ、テストモードの表示と解除、連続参加、結果URL直行、解説中の再読み込み、通信断→復帰を確認
2. 5〜8名パイロット → export（--include-test）→ validate → select_sample（--include-test, --staff）→ analyze_primary
3. 変更したら版・items.json・分析計画を更新。本収集開始時にコミット・版・items.json・計画を記録し、本番端末のテストモードを解除、stats/festival2026 をリセット

## Last Agent
Claude Code
