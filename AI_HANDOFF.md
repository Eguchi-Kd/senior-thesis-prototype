# AI HANDOFF

## Current Goal
10月3日の公開に向け、最低限の修正箇所を特定し、Claude Codeによる修正後の状態を評価する。最新レビュー：docs/release-readiness-review.md。

## Current State
- HEAD `0366fa7`。Next.js 15静的出力＋R3F＋Zustand、GitHub Pages、Firestore。contentVersion `2026-10-06`、schemaVersion 4。
- research：同意→属性→事前6問→練習→本編6問→事後6問→アンケート→結果。free：同意→練習→本編→結果。
- ヒントは探索画面、ログはhintAtScenarioMs。解説は根拠・比較・行動の要点＋開閉式の詳細。
- 前回のURL試験モード解除・混在版の選択停止・非有限値検証・教材の根拠と表示改善を確認。
- 公開ページで本編6問の進行を確認。ただし戻る／再入場で画面とphaseが不一致になり操作不能になる経路が残る（A1）。

## Last Work
Claude Code（2026-10-01）：Codex の docs/release-readiness-review.md（公開前レビュー）に対応。
- A1（戻る／再入場で本編が操作不能）を修正：行き先を phase ではなく回答済みデータで決める `lib/progress.ts`（resumePath）。同意・属性・事前テストは回答済みなら正しい場所へ送り phase を巻き戻さない、ゲーム画面は本編終了後なら結果側へ・途中なら段階を exploring に正規化
- 画面経由の回帰確認 `scripts/check_navigation.cjs`（Edge ヘッドレス＋CDP、Firestore 遮断）：公開ページで 11/11 OK
- A3 の一部：公開ページで testRun の完了済みセッションの結果画面→「送信済み（サーバーで確認）」→ Admin export→ validate ERROR 0 を確認し、そのテスト用データは削除
- A4/A5：`docs/公開前チェックリスト.md`（実機確認・試遊/本収集の手順・監視と緊急停止）、緊急停止ルール `firestore.rules.lockdown` と `firebase.lockdown.json`（dry run でコンパイル確認、未適用）
- 教材・ログ構造は変えていない（版は 2026-10-06 / schema 4 のまま）

## Changed Files
- 新規 `lib/progress.ts`、`scripts/check_navigation.cjs`、`firestore.rules.lockdown`、`firebase.lockdown.json`、`docs/公開前チェックリスト.md`
- `app/consent/page.tsx`、`app/intake/page.tsx`、`app/pretest/PretestClient.tsx`、`app/game/GameClient.tsx`、`analysis/README.md`、`docs/パイロット実施手順.md`

## Decisions
- 今回は調査・評価であり、A1の修正実装は未実施。全面改修や公開直前の問題追加は不要。
- カード維持、research/free分離、単群事前事後、各テスト6問、ランダム割付、旧版強制リセットなし、担当者記録での参加者照合を継続。
- 本収集も公開日から始めるかは未回答。レビューは試遊公開と本収集開始を区別して記載。
- docs/project.md等の状態ファイルの変更案は規約どおり人間のレビュー対象。今回は直接変更しない。

## Verification
- `pnpm exec tsc --noEmit`・`pnpm lint`：成功。GitHub Actions：成功
- `node scripts/check_navigation.cjs https://eguchi-kd.github.io/senior-thesis-prototype/`：11/11 OK（ログ件数は増えない）
- 実保存（A3）：公開ページ→本番 Firestore→export→validate で ERROR 0（テスト用データは削除済み）
- 本番 DB のテスト36件の ERROR は旧版（版の記録なし）と開発用直行（同意なし）由来で、現行版の問題ではない
- 匿名集計 stats/festival2026 に非テストのプレイ1件分あり（本収集前にリセット：チェックリスト参照）
- ローカルの開発サーバーはメモリ不足で応答せず、回帰確認は公開ページで実施
- 未確認：実機（Android Chrome / iOS Safari）のタッチ操作・通信断からの復帰・発熱

## Known Issues
- A1：GameClientのstageがtransfer_test以外のsurvey/resultをmainに戻し、調査がphaseで拒否される。事前テスト再訪でもphase巻き戻しの構造がある。
- A2/A3：実機操作・最終保存・通信復帰と実exportは公開前に確認が必要。
- A4/A5：初回選択だけでは本人初回を保証しない。認証なし書き込みの既存判断は、一般公開の範囲に応じて再確認。
- 本編の通知ID・判断理由・解説閲覧は未収集。即時判断成績を超える主張はできない。
- 行動・RT等の副次集計はanalyze_primaryでは未出力。project.mdと分析計画、analysis/README末尾に不一致あり。
- 難易度再採点・所要時間の確認、衝突判定なし等の既存課題を継続。ローカル.env.localなし。

## Next Steps
1. Claude Code：レビューA1を最小修正。途中・最終解説・事後・アンケート・研究/自由結果からの戻る／再入場を確認。ログをリセットしない。
2. 型チェック・lint・既存テスト・build、実機Android/iOSで確認。
3. テストモードで実保存→通信断復帰→export→validate→select→analyzeを通す。
4. 公開範囲と本収集開始を確定。対象版を固定し、本番端末のテストモード解除を確認。

## Last Agent
Codex
