# AI HANDOFF

## Current Goal
大学祭（2026年11月・青森）での実験に向けて、少人数パイロット（5〜8名）を実施し、その結果で最終調整してから本実験に入る。
研究：「体験型ゲームを用いたデジタル詐欺認知学習の設計と効果検証」（卒業研究、2027年1月提出）。

## Current State
- Next.js 15（静的書き出し、basePath `/senior-thesis-prototype`）＋ React Three Fiber。master への push で GitHub Pages に自動デプロイ。Firestore：sessions（書き込みのみ）と匿名集計 `stats/festival2026`（読める・「n＋本編/事後/タイプの区分を1つずつ+1」だけ許可）。
- タイトルに2つの開始ボタン：「はじめて遊ぶ」（playMode=research：同意→属性→事前テスト→練習→本編→事後テスト→アンケート→結果）と「2回目以降（自由プレイ）」（playMode=free：同意→練習→本編→結果。研究用データと分けて収集、export 既定除外、集計に加算しない）。
- セッションは sessionStorage に保存して再読み込みで再開：解説中なら同じ解説から、判定前なら同じシナリオを最初から（restarted）、テスト中なら続きから（次の回答に restarted）。非表示のまま再読み込みした時間も加算。途中で配信が更新された場合は contentVersionsSeen に記録（ラベルは書き換えない）。保存領域の例外はメモリで続行。
- 結果画面：最終保存を開くたびに再実行し、サーバーが受け付けたときだけ「送信済み」。本編が終わっていなければ /game へ戻す。匿名集計は none/pending/done/failed で管理し失敗時のみ再試行。
- タイプ診断6種（名探偵・のびしろ・慎重派・お人よし・直感派・バランス）＋判定理由＋5軸レーダー（見破る・見極める・両方確認・時間・自力）＋注意書き。テスト実行時はダミー集計（3人/30人/120人）で表示確認可。
- contentVersion `2026-10-04`、schemaVersion 2。公開URL：https://eguchi-kd.github.io/senior-thesis-prototype/ （パイロットは `?test=1`）

## Last Work
Claude Code（2026-09-30）：Codex の docs/post-update-review.md（R1〜R8）に対応。コミット e71347a〜。
- 採用：R1（送信確認）、R2（解説の復元）、R3（版の混在の記録）、R4（ルール厳格化・再試行・取得順）、R6（のびしろタイプ・表現）、R7（検証の失敗条件・問題定義との照合）、R8（非表示時間・テストの restarted・保存領域の例外）、結果画面の直行ガード
- R5 はユーザー判断で「コレクションは変更なし」＋「はじめて/2回目以降」で研究データと自由プレイを分離する回避策
- 不採用（理由は docs/post-update-review.md への回答として下の Decisions に記載）

## Changed Files
- `store/gameStore.ts`：playMode、statsState、contentVersionsSeen、testRestartPending、TestLog.restarted、safeSessionStorage、rehydrate 処理（feedback 復元・非表示時間・版）
- `lib/logger.ts`：saveSnapshot が成否を返す、confirmFinalSave、playMode/contentVersionsSeen を保存
- `app/result/ResultClient.tsx`：送信確認表示、集計の送信/再試行/再取得、自由プレイ経路、直行ガード、表現修正
- `app/game/GameClient.tsx`（feedback 復元・自由プレイの区切り画面）、`app/page.tsx`（2つの開始ボタン）、`app/consent/page.tsx`（自由プレイは /game へ）
- `lib/playerType.ts`（のびしろ追加・非表示時間を除いた時間・表現）、`lib/stats.ts`（ダミー集計の整合）、`firestore.rules`（デプロイ済み）
- `analysis/validate_export.py`（失敗条件・items.json 照合・自由プレイ対応）、`analysis/export_firestore.py`（--include-free、新列）、新規 `analysis/dump_items.mjs`・`analysis/items.json`・`analysis/check_store.mjs`、`analysis/simulate_sessions.ts`（自由プレイのパターン）
- `docs/分析計画.md`・`docs/パイロット実施手順.md` 更新

## Decisions
- テスト6問（詐欺3:安全3）、正誤は結果発表でまとめて、ヒント減点なし、フォームのランダム割付、統制群なし（限界として明記）。
- R3：旧版の途中セッションを強制的にやり直させない（同意済みデータを捨て新セッションを作るため）。記録して分析で除外し、本番期間中は配信を更新しない。
- R4：sessionId 単位の重複排除・管理側集計はしない（集計は表示用、研究人数は検証済みセッションから算出）。
- R5：コレクションは変更なし。共用端末は担当者が「はじめて遊ぶ」を押して渡す運用で事前閲覧を防ぎ、2回目以降は自由プレイとして研究データから分離。
- 不採用：アンケート途中入力の復元（負担小）、確信度タップの確定前取り消し（タップ削減の意図的なトレードオフ）、sessionStorage 書き込みの間引き（計測上の根拠なし。パイロットで確認）、sessions の匿名認証（規模に対し導入コスト大。限界として記載）。
- `priorPlays` は共用端末があるので自動除外に使わない。相談しながらのプレイは禁止（自己申告は取らない）。保護者同意・データ削除は書面。
- GLB・効果音・新ステージ・大規模リファクタリングは後回し。

## Verification
- `pnpm exec tsc --noEmit`・`pnpm lint`：成功。GitHub Actions：各コミットで成功を確認（最終は下の commit）
- `node analysis/check_store.mjs`（実際の persist.rehydrate を使用）：6/6 OK（解説の復元、判定前のやり直し、版の記録、非表示時間の加算、テストの restarted、保存領域の例外）
- validate：正常7セッション（自由プレイ含む）ERROR 0。不存在フォルダ・0件（--allow-empty なし）・列欠損・破損（確信度7、正解の不一致、シナリオ重複）はすべて失敗（終了コード1）
- Firestore ルール（本番）：正しい1人分・新タイプは許可。n なし、区分の欠け（p/t なし）、g が2つ、+2、未知キー、上書き、別ドキュメント、sessions 読み取りは拒否。試験後に集計を削除
- タイプ診断の期待値表 11ケース：判定ロジックどおり（全部「詐欺あり」＝4/6正解は慎重派）
- 未確認：ブラウザ・実機の通しプレイ、オフライン完了→再読み込み→復帰の実機確認、ローカルの `pnpm build`（CI では成功）

## Known Issues
- 実機（Android/iOS）での通しプレイ未確認：操作練習、調べ直し、解説中の再読み込み、自由プレイ経路、結果画面のレーダー/グラフ、送信確認表示。
- 本編の判定はどの通知を詐欺と思ったかを記録しない（パイロットの聞き取りで要否を判断）。
- 所要時間は再現で約10分、実際は12〜15分の見込み（倫理申請は「約10分」）。
- ダミー導入後の本編6問は難易度ルーブリック未再採点。部屋に衝突判定なし。
- ローカルに `.env.local` なし（`pnpm dev` では Firestore に保存されない）。
- `orchestrator/`、`Microsoft/` は無関係の未追跡フォルダ。触らない。

## Next Steps
1. 実機で `?test=1` の通しプレイ（はじめて／自由プレイ、解説中の再読み込み、オフライン完了→再読み込み→復帰）
2. パイロット実施 → `export_firestore.py --include-test` → `validate_export.py` → 聞き取りの反映
3. 変更したら `lib/version.ts` を上げ、`node analysis/dump_items.mjs`、`docs/分析計画.md` を再固定
4. 本実験前に `stats/festival2026` をリセット（Admin SDK で削除）

## Last Agent
Claude Code
