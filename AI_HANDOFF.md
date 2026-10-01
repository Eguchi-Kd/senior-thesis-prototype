# AI HANDOFF

## Current Goal
公開直前の修正後レビュー。最新結果は `docs/release-followup-review.md`。2026-10-02の依頼では「明後日」（10/4）、既存チェックリストは10/3のため日程を揃える。

## Current State
- 確認対象HEAD `7ff3251`、contentVersion `2026-10-07`、schemaVersion 4。Next.js静的出力＋R3F＋Zustand、GitHub Pages、Firestore。
- research：同意→属性→事前6問→練習→本編6問→事後6問→アンケート→結果。free：同意→練習→本編→結果。
- 前回A1の操作不能はresumePathと各画面ガードで修正済み。既存画面試験11/11成功。
- 新たにB1を再現：ヒント・調査後の実際の戻る→本編復帰で途中履歴が消え、hintUsed=false / restarted=falseで回答が記録される。
- 企業名の架空化と教材版更新、カード絵文字の追加を確認。正答条件の変更なし。

## Last Work
Claude Code（2026-10-02）：友人のテストプレイ感想（11項目）に対応。最終配信 `ea24d1c`、contentVersion `2026-10-09`、schemaVersion 5。本収集は 10/3。
- 答えの漏れ修正：PRE_F2/POST_F2 の「普段の案内に似た」削除、PRE_S1/POST_S1 の「リンクや入力の要求はありません」削除＋正規リンク付与、S3 の「（突然表示）」削除
- S3 の偽警告をブラウザの警告画面風に表示（DigitalContent.type に "alert"）、テストの公式情報を枠付きで強調
- 練習：移動・見回し→スマホと部屋の情報の両方（順番は自由）→ヒント→判定（記録なし・正解なし）。自由プレイは練習を省略可（t_practiceSkipped）
- 問題開始の「第n問 / 全6問」（特定の物へ誘導しない文言）、進捗バーに「あとn問でクリア！」
- この端末に過去のプレイ記録がある状態で「はじめて遊ぶ」→本人が初めてか確認（firstTimeConfirmed）
- 見送り：ストーリー演出（事後だけ“ラスボス”扱いは意欲の交絡になる。本収集後に対称な演出を検討）、スマホへの誘導（ラベル強調・自動で開く：探索の記録に影響するためユーザー判断で不採用）
- **GitHub Pages の配信元が legacy（master ブランチを Jekyll で公開）に切り替わっていて、README のページが公開されていた**。build_type を workflow に戻して再デプロイ（ゲームの公開を確認）

## Changed Files
- `lib/pretest.ts`・`lib/transferTest.ts`・`scenarios/scenario3.ts`・`scenarios/practice.ts`・`scenarios/types.ts`
- `app/game/GameClient.tsx`・`app/page.tsx`・`components/ui/QuizRunner.tsx`・`store/gameStore.ts`・`lib/logger.ts`・`lib/version.ts`
- `analysis/export_firestore.py`（firstTimeConfirmed・t_practiceSkipped）・`analysis/items.json`・`docs/{分析計画,公開前チェックリスト,パイロット実施手順}.md`

## Decisions
- 今回はレビュー。B1の実装修正は未実施。新規問題や全面改修は不要。
- カード維持・research/free分離・単群事前事後・各テスト6問・担当者による本人初回照合を継続。
- 実保存の成功はClaudeの引き継ぎ記録として扱い、Codexが今回独立検証したとは記載しない。
- 本収集開始と試遊の区別を確定し、最終検証後は配信を固定する。DB削除・ルール適用は未実施。

## Verification
- tsc・lint・check_store 13/13・再現データ validate ERROR 0・CI（ea24d1c）成功
- 公開ページ：check_navigation 11/11 OK。Codex の実ブラウザ再現を新しい練習の流れに合わせた版（scratchpad の release-followup-v2）で2回成功（戻る前後でヒント・調査の記録が保持、最終ログ hintUsed=true）。練習の流れを実クリックで最後まで通過
- 画面確認（ヘッドレス Edge）：初回確認ダイアログ、2回目以降→自由プレイ、自由プレイの練習省略、第n問の表示（DOM）、あとn問、S3 の警告画面
- 未確認：実機（Android/iOS）・通信断からの復帰。Pages 設定が切り替わった原因は不明（誰かが Settings → Pages を変更した可能性）

## Known Issues
- B1：戻る→復帰でヒント・調査・計測を消し、やり直しを識別できない。自力判定と本編の行動・RT分析に影響。
- B2：権限拒否された書き込みは通常の通信断と異なり、ルール復旧だけで自動再試行を保証できない。再送と欠損記録の手順が必要。
- 実機チェック未完了。初回の自己選択だけでは本人初回を保証しない。認証なし書き込みの既存リスクは残る。
- 通知ID・判断理由・解説閲覧は未記録。本編行動・RT集計は別途必要。project.mdの一次指標は現行計画と不一致。

## Next Steps
1. Claude Code：B1を局所修正。同じ未回答問題への再入場と新規開始を区別し、ヒント履歴を未使用に戻さない。実際の戻る操作後のログまで検証。
2. 緊急停止後の受付停止・再送・欠損記録をチェックリストへ追記。
3. 最終公開コミットでAndroid/iOSの研究・自由プレイ・通信断復帰を確認。
4. 公開日・対象版・試遊/本収集を確定。本番端末のテストモードを解除し、本収集中は版を固定。

## Last Agent
Claude Code
