# AI HANDOFF

## Current Goal
大学祭（2026年11月・青森）での実験に向けて、少人数パイロット（5〜8名）を実施し、その結果で最終調整してから本実験に入る。
研究：「体験型ゲームを用いたデジタル詐欺認知学習の設計と効果検証」（卒業研究、2027年1月提出）。

## Current State
- Next.js 15 (App Router, `output: "export"`, basePath `/senior-thesis-prototype`) + React Three Fiber。GitHub Pages で配信（master への push で自動デプロイ）。Firestore はログ（書き込みのみ）と匿名集計 `stats/festival2026`（読める・1ずつ加算のみ）。
- フロー：タイトル → 同意 → 属性 → 事前テスト（開始/終了画面つき・6問）→ 本編（開始画面→操作練習→6問→終了画面）→ 事後テスト（開始/終了画面・6問）→ アンケート（SUS10）→ 結果発表。
- 本編：4オブジェクト常設（2つがダミー）、スマホ通知3件。判定画面で見る場所だけのヒント（減点なし）、「もう一度調べる」で探索に戻れる（答え・確信度は保持）。
- テスト：フォームA/Bをランダム割付、出題順をストアで固定（再読み込みで続きから）。正誤は最後の結果発表でまとめて表示（途中で見せると測定が崩れるため）。
- 結果発表：総合スコア、タイプ診断（5種）、事前→事後、みんなとの正答数分布（5人以上で表示）、答え合わせ、誤答の復習、コレクション収集率。コレクションは `/collection`（localStorage、11枚）。
- セッションは sessionStorage に保存し、再読み込みで再開。同意前は Firestore に保存しない。
- 公開URL：https://eguchi-kd.github.io/senior-thesis-prototype/ （テストは `?test=1`）

## Last Work
Claude Code（2026-09-30）：Codex評価（docs/development-assessment.md）のP0＋ユーザーのフィードバック（docs/2026-09-30_フィードバック.txt）を実装。コミット c20f1f1 以降。
- 土台：lint修正（FlatCompat）、背景色バグ、操作のdelta化・非アクティブ時停止、persist、非表示時間、保存状態、版
- 教材：解説の断定を避け「この事例では」と確認方法を分離、ホスト名の読み方、公式ドメインの提示
- 体験：区切り画面、通知風テストUI（確信度タップで次へ）、操作練習、正解時「お見事！」
- 結果発表とコレクション、匿名集計と Firestore ルール（デプロイ済み・実地で許可/拒否を確認）
- ログ検証：再現プレイ（analysis/simulate_sessions.ts）→ export（--from-json）→ validate_export.py。ERROR 0件

## Changed Files
- `store/gameStore.ts`：persist、非表示/再開/判定回数/練習/版などのログ、onRehydrateStorage での再開処理
- `lib/logger.ts`（保存状態 `useSaveStatus`、`buildPayload` をexport）、`lib/firebase.ts`、`firestore.rules`
- 新規：`lib/{version,stats,playerType,collection,cards}.ts`、`components/SessionTracker.tsx`、`components/ui/StageScreen.tsx`、`app/pretest/PretestClient.tsx`、`app/collection/*`、`scenarios/practice.ts`
- `app/game/GameClient.tsx`（練習・調べ直し・区切り画面）、`app/result/ResultClient.tsx`（全面改訂）、`components/ui/{QuizRunner,ConfidenceSlider,FeedbackCard}.tsx`
- `components/game/{FPSControls,Room}.tsx`、`scenarios/*.ts`、`lib/{pretest,transferTest,testForms}.ts`
- `analysis/{export_firestore.py,validate_export.py,simulate_sessions.ts,run_simulation.mjs}`
- `docs/{分析計画,パイロット実施手順,ログ検証報告,todo}.md`

## Decisions
- テストは6問（詐欺3:安全3）を維持。4問だと誤警報が測れない。飽き対策はUIで行う。
- テストの正誤は途中で見せず、結果発表でまとめて答え合わせ（事前の答えを見せると学習効果と区別できない）。
- ヒントの減点は廃止（助けを避ける行動を生むため）。結果では自力正解とヒントあり正解を分けて表示。
- 事前/事後フォームはランダム割付を維持。統制群は置かず限界として明記。
- `priorPlays` は共用端末があるので自動除外に使わない（docs/分析計画.md）。
- 相談しながらのプレイは禁止（同意画面の注意書き）、自己申告は取らない。保護者同意とデータ削除の手続きは書面で扱う。
- GLB・効果音・新ステージ・大規模リファクタリングは後回し。

## Verification
- `pnpm exec tsc --noEmit`：成功
- `pnpm lint`：成功（エラー0）
- GitHub Actions のビルド＆Pagesデプロイ：成功（c20f1f1）
- 開発サーバーで全ページ HTTP 200（/, consent, intake, pretest, game, result, collection）
- Firestore ルール：本番で正しい加算は許可、不正（+2・未知の項目・上書き・別ドキュメント・sessions読み取り）は拒否を確認
- 再現プレイ6通り → export → validate：ERROR 0 / WARN 3（想定どおりの検出）
- 未確認：**ブラウザ・実機での通しプレイ**（このセッションではブラウザ操作ツールが使えなかった）、オフライン→復帰の実機確認

## Known Issues
- ブラウザでの通しプレイ未確認（特に：操作練習のチェック、調べ直し、再読み込みでの再開、結果画面のグラフ）。
- 本編の判定はどの通知を詐欺と思ったかを記録しない（パイロットの聞き取りで要否を判断）。
- 所要時間は再現で約10分、実際は12〜15分の見込み。倫理申請の「約10分」と差がある可能性。
- ローカルに `.env.local` がなく、`pnpm dev` では Firestore に保存できない（本番は GitHub Secrets で注入）。ローカルで保存を試すなら `firebase apps:sdkconfig WEB` の値で `.env.local` を作る。
- ダミー導入後の本編6問は難易度ルーブリック未再採点。部屋に衝突判定なし。
- `orchestrator/`、`Microsoft/` は無関係の未追跡フォルダ。触らない。

## Next Steps
1. 実機で `?test=1` の通しプレイ（Android Chrome / iOS Safari）→ 問題があれば修正
2. パイロット実施 → `export_firestore.py` → `validate_export.py` → 聞き取り結果の反映
3. 修正したら `lib/version.ts` の CONTENT_VERSION を上げ、`docs/分析計画.md` を再固定
4. 本実験前に集計 `stats/festival2026` をリセット（テストで加算された場合）：Admin SDK でドキュメント削除

## Last Agent
Claude Code
