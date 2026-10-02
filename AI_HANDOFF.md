# AI HANDOFF

## Current Goal
Codex の問題切替レビュー（`docs/stage-transition-review.md`）C1〜C4・B1補足への対応と、収集ログの論文上の説得力・収集方法の最終確認。本収集は 10/3。

## Current State
- 教材版 `2026-10-10`、schemaVersion 5。
- 第n問／全6問を約2.2秒表示（位置・大きさはユーザー判断で変更なし）、残り問題数を常時表示。
- 解説のボタンは「第n問へ進む →」／最終問「本編を終える →」。
- 調査パネルを開いたまま本編を離れた場合、離れた時点で閉じた扱い（GameClient のアンマウント時に closeInspect）。再入場時の close は保険として残す。
- prepare_publish.mjs は出力先がリポジトリ直下の `publish` 以外なら何も消さずに停止。
- 配信専用リポジトリ `scam-detective` はまだ空（dry run のみ成功）。

## Last Work
Claude（2026-10-02）：
- C1 採用、C2 は変更なし（計測上の注記のみ分析計画へ）、B1 補足を修正（dwellMs が離れていた時間を含まない）→ 版を 2026-10-10 に。
- C3 を切り替え手順（チェックリスト5）に追記：新URLで直接表示・アセット・戻る・実機保存、localStorage 共有の点検、本収集の途中で切り替えない。
- C4 の出力先ガードを追加。
- 分析計画：天井効果の扱い（事前満点の割合を報告・事後に除外しない）、dwellMs の定義、開始案内が探索時間と hintAtScenarioMs に含まれることを追記。
- チェックリスト：本収集前に最終版で担当者が2〜3回通しプレイ→export→validate。

## Decisions
- 開始案内は非ブロッキングのまま。RT（初回調査→決定）からは差し引かない。
- 記録の取り方が変わったので版を上げた（2026-10-09 のデータとは合算しない）。
- カード維持・research/free分離・単群事前事後・各6問・担当者照合を継続。

## Verification
- tsc（incremental false）・lint：成功。check_store：14/14（離脱時に閉じた調査の dwellMs のケースを追加）。
- prepare_publish.mjs：`out` を出力先に `out`・`.`・`out/sub`・`..`・リポジトリ外・`other`・`publish/x` を指定 → すべて停止し、何も削除されない。`out publish` は成功。
- 公開ページでの check_navigation は commit 後に実施（結果は下記の Last Agent の報告を参照）。
- 未確認：実機 Android/iOS、通信断からの実同期、新URLでの実プレイ・保存。

## Known Issues
- 本編の通知ID・判断理由・解説閲覧は未収集（理解の直接測定はない）。行動・RT集計は別途。
- 本人初回は自己申告＋端末の回数＋担当者記録に頼る。
- 最終版でのパイロットなし → 難易度・天井効果は本収集の結果で判断（分析計画に事前固定済み）。
- dwellMs はアプリ切替などの非表示時間を差し引かない。

## Next Steps
1. 担当者が最終版で通しプレイ（テストモード）→ export → validate。実機 Android/iOS の確認。
2. 本収集の開始時にコミット・版・items.json・分析計画を記録し、期間中は配信を更新しない。
3. 全修正の完了後に scam-detective へ配信（チェックリスト5）。

## Last Agent
Claude
