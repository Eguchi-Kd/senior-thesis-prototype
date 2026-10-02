# AI HANDOFF

## Current Goal
10/3 大学祭の掲示用 A1 ポスターの作成と、QR に載せる新URL（`https://eguchi-kd.github.io/scam-detective/`）への切替。本収集は 10/3。

## Current State
- 教材版 `2026-10-10`、schemaVersion 5（ゲーム本体は変更なし）。
- 配信専用の公開リポジトリ `scam-detective` へ配信済み（publish.yml を dry_run=false で実行）。Pages は gh-pages / root。
- 旧URL（senior-thesis-prototype）も deploy.yml で動き続けている。旧リポジトリの非公開化・deploy.yml 削除は大学祭の後。
- **修正を新URLに反映するには push に加えて publish.yml の手動実行が必要**（本収集の期間中は配信を更新しない）。
- ポスター一式は `docs/poster/`（未コミット・ゲームの動作に不要）：poster_gen.py → poster.pptx、export.ps1 → poster_A1.pdf・preview.png、split_a3.py → poster_A3x4.pdf（コンビニの A3×4枚、仕上がり約 554×784mm）。

## Last Work
Claude（2026-10-02）：
- 新URLへ配信し確認。パイロット手順の URL を新URLに、チェックリスト5に実施状況と「publish.yml も実行」を追記。
- ポスター：画面は新URLを Edge ヘッドレス（d3d11、Firestore 遮断・テスト扱い）で撮影。通知画面は1問目の答え（偽のセキュリティ警告）が写るため使わず、判定画面を掲載。

## Decisions
- ポスターの QR は新URL（ユーザー判断）。本収集の途中で配信先を切り替えないため、本収集前に切替。
- 自分のスマホで遊ぶ人にも、結果画面の参加者コードを受付で見せるよう案内（担当者記録と照合するため）。
- ポスターに本編の問題の答えが分かる画面を載せない（事前・本編の成績を汚さないため）。

## Verification
- publish.yml 成功（漏えい検査通過）。新URLで check_navigation 11/11。`/`・`/game/`・`/result/`・`/consent/` が 200、撮影中に HTTP 400 以上の応答なし。
- QR：生成画像・A1 PDF・A3 分割 PDF のいずれも読み取り結果が新URLと一致。分割 PDF は A3×4ページで、QR は右下の1枚に収まる。
- 未確認：新URLでの実機の通しプレイと「✓ データ送信済み」、印刷物の QR の読み取り。

## Known Issues
- 本編の通知ID・判断理由・解説閲覧は未収集（理解の直接測定はない）。
- 本人初回は自己申告＋端末の回数＋担当者記録に頼る。
- 最終版でのパイロットなし → 難易度・天井効果は本収集の結果で判断（分析計画に事前固定済み）。
- project.md・architecture.md の URL は旧URLのまま（更新案を提示済み・判断待ち）。

## Next Steps
1. 新URLで担当者が実機（Android/iOS）通しプレイ（`?test=1`）→ export → validate。各端末のテストモード解除を新URLで確認。
2. ポスターを印刷し、印刷物の QR を実機のカメラで読み取る。
3. 本収集の開始時にコミット・版・items.json・分析計画を記録し、期間中は配信を更新しない。
4. 大学祭の後：旧リポジトリの非公開化・deploy.yml の削除（チェックリスト5の手順4・5）。

## Last Agent
Claude
