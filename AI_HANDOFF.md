# AI HANDOFF

## Current Goal
学祭の本収集に向け、既存の詐欺認知学習ゲームの教材品質・使いやすさ・研究用データ品質を整える。今回の依頼は、取り下げられた機能提案の記述削除と、友人のプレイ感想に基づく課題分析。

## Current State
- Next.js 15 静的出力＋R3F＋Zustand、GitHub Pages、Firestore。contentVersion `2026-10-06`、schemaVersion 4。
- research：同意→属性→事前6問→練習→本編6問→事後6問→アンケート→結果。free：同意→練習→本編→結果。
- 本編のヒントは探索画面の「⚖️ 判定する」の右隣「💡 ヒント」ボタンのみ（各シナリオの最初から表示。判定画面には見たヒントの文面だけを表示）。ログは hintAtScenarioMs（シナリオ開始から）、hintAtMs は常に null。
- 解説は「今回の根拠／見比べた情報／次に取る行動」の要点（Scenario.keyPoints）を先に表示し、詳しい解説は開閉式。
- テストモードは localStorage に保持。解除時は URL の ?test=1 も消す。
- 分析：export → validate（NaN/Infinity も ERROR 扱いで停止しない）→ select_sample（複数版なら --content-version 必須）→ analyze_primary（単一版を確認、|Z| と r の符号を定義、c・確信度・SUS・priorPlays=0 感度分析）。

## Last Work
Claude Code（2026-10-01）：Codex の docs/content-and-update-review.md と docs/player-feedback-assessment.md に対応。
- T1〜T4 採用（解除時のURL、版の単一化、非有限値、依存宣言・README・副次評価・r の符号）
- 本編：S1 に公式サイトのメモ（relevantIds=メモ＋スマホ）、S2「今日、青森市内で事故」、S3 をスマホのメモ×ブラウザ警告に、S4 のヒント・状況・https 化・断定の緩和、S101 のメモ具体化と母の通知の無関係化、S102「みずほ銀行アプリ」、カレンダーの曜日を2026年に
- テスト：F2 の A/B 構造と「身に覚え」をそろえる、PRE_F1/POST_F1/PRE_S1/POST_S1/PRE_S2/PRE_S3/POST_S2/POST_S3 の根拠・表現
- 表示：送信元・リンク・要求のラベル分け、文字を text-sm に、解説の要点表示
- ヒントの入口：ユーザー案で探索画面のボタンに一本化
- 不採用：S2（認証コード/パスワード変更）の作り替え（実データなしで別の非対称を生む恐れ。分析計画に異質性を明記）、既有知識での照合省略への対策・強制閲覧・出題順固定・対象年齢拡大（感想1件では根拠不足）

## Changed Files
- `scenarios/*.ts`・`types.ts`（keyPoints）、`lib/pretest.ts`・`lib/transferTest.ts`
- `app/game/GameClient.tsx`（ヒントボタン・カード、ラベル、文字）、`components/ui/{ConfidenceSlider,FeedbackCard,QuizRunner}.tsx`、`app/page.tsx`（T1）
- `store/gameStore.ts`（takeHint ※ useHint から改名：lint がフックと誤認するため、hintAtScenarioMs）、`lib/version.ts`
- `analysis/{validate_export,select_sample,analyze_primary,export_firestore}.py`、`check_store.mjs`（9ケース）、`simulate_sessions.ts`、`items.json`、`requirements.txt`、`README.md`
- `docs/分析計画.md`・`パイロット実施手順.md`・`難易度ルーブリック.md`（旧版の注意書き）

## Decisions
- 既決定を継続（コレクション維持・research/free 分離、統制群なし、各テスト6問、フォームのランダム割付、旧版の強制リセットなし、表示集計の重複排除なし、参加者コードで照合）。
- ヒントは探索画面のボタン1つ（ユーザー判断）。「減点なし」等の採点に関する表示はしない。
- docs/project.md（北極星）は CLAUDE.md の規約により直接変更せず、更新案をユーザーに提示済み（一次指標の RT 短縮・転移60%目標などが現行の分析計画と不一致）。

## Verification
- `pnpm exec tsc --noEmit`・`pnpm lint`：成功。GitHub Actions：下記コミットで確認
- `node analysis/check_store.mjs`：9/9 OK（?test=1 の画面で解除→開始で本番扱い、を追加）
- 再現データ：NaN/Infinity を ERROR 検出し停止しない／複数版は版指定なしで停止、指定で対象外の版を除外／analyze_primary の全出力（c・確信度・SUS・感度分析）を確認
- 未確認：実機（ヒントボタンの位置・重なり、要点の開閉、ラベル・文字サイズ）、ローカル build

## Known Issues
- 実機・ブラウザでの通し確認が未実施。
- 本編ログに判定した通知ID・理由はない（主張は即時判断成績に限定）。
- 現行18問の難易度の再採点はパイロット後。所要時間と倫理申請「約10分」の差。部屋の衝突判定なし。ローカル `.env.local` なし。`orchestrator/`・`Microsoft/` は触らない。

## Next Steps
1. 実機で確認（ヒントボタン、要点表示、ラベル、研究/自由プレイ、テストモード解除、通信断→復帰）
2. パイロット → export（--include-test）→ validate → select_sample（--include-test --content-version 2026-10-06 --staff）→ analyze_primary
3. project.md の更新可否をユーザーが判断。パイロット後に難易度の再採点と問題の最終確定、版・items.json・計画の固定

## Last Agent
Claude Code
