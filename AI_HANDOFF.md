# AI HANDOFF

## Current Goal
大学祭（2026年11月・青森）での実験に向けて、パイロットテストを実施できる状態に仕上げる。
研究：「体験型ゲームを用いたデジタル詐欺認知学習の設計と効果検証」（卒業研究、2027年1月提出）。

## Current State
- Next.js 15 (App Router, `output: "export"`, basePath `/senior-thesis-prototype`) + React Three Fiber の一人称3D部屋探索ゲーム。GitHub Pages で配信、Firestore はログ保存のみ（書き込みのみ許可）。
- フロー：タイトル → 同意 → 属性入力 → 事前テスト(6問) → ゲーム本編(6シナリオ) → 事後テスト(6問) → アンケート(SUS 10項目) → スコア。
- ゲーム本編：部屋に4オブジェクト常設（カレンダー・メモ・ポスター・スマホ）。各シナリオで関係するのは2つ（`relevantIds`）、残りはダミー。スマホは通知3件（ダミー通知含む）。判定は「通知の中に詐欺はあるか」。
- ヒントは判定画面の中央。答えではなく「どこを見比べるか」だけを示す（`Scenario.hint`）。`anomaly.clue` は研究者向けの正解根拠でプレイヤーには出さない。
- 事前/事後テストはフォームA（`lib/pretest.ts`）/B（`lib/transferTest.ts`）をセッションごとにランダム割付、出題順もシャッフル（`lib/testForms.ts`）。各フォーム詐欺3:安全3、易2/中2/難2。
- ローカル確認：`pnpm dev` → `http://localhost:3000/senior-thesis-prototype/?test=1`（タイトルに「3Dルーム直行」ボタン）。開発サーバーでのプレイは自動で `testRun=true`。

## Last Work
Codex（2026-09-30）：初回の構成・主要差分レビュー。具体的な開発依頼は未記入のため、ゲームコードは変更せず、検証結果と課題を本ファイルに記録。

Claude Code（2026-09-28〜29）：パイロット前の計測設計の固め
- テストのカウンターバランス、安全問題の追加（PRE_S3 / POST_S3）
- 1〜5評定を初期値なしのボタン式に（`components/ui/LikertButtons.tsx`）
- 調査イベント（開閉時刻・滞在時間）、ヒント使用タイミング、フェーズ時刻、再プレイ回数、参加者コードの記録
- Firestore をオフライン永続キャッシュに（会場Wi-Fi対策）
- SUS を日本語版10項目に置換、エクスポートで susScore / totalDurationSec を算出
- オブジェクト配置の分散（メモ＝左壁コルクボード、ポスター＝ベッド脇の右壁）
- **すべて未コミット**（ブランチ `feat/game-polish`、最終コミット e3150b1）

## Changed Files
今回のCodex変更は AI_HANDOFF.md のみ。以下は維持したClaude Codeの未コミット実装。

- `store/gameStore.ts`：ログ項目追加（inspectEvents, hintAtMs, decisionBeforeHint, testForms, phaseTimes, priorPlays）、`closeInspect` / `markPhase` / `setPriorPlays`
- `scenarios/*.ts`, `scenarios/types.ts`：4オブジェクト常設・通知配列・`hint` / `relevantIds`
- `lib/testForms.ts`, `lib/shuffle.ts`（新規）, `lib/pretest.ts`, `lib/transferTest.ts`
- `components/ui/QuizRunner.tsx`, `ConfidenceSlider.tsx`, `LikertButtons.tsx`（新規）
- `app/{page,consent,intake,pretest}/…`, `app/game/GameClient.tsx`, `app/result/ResultClient.tsx`
- `components/game/Room.tsx`：オブジェクトの定位置・向き、コルクボード
- `lib/firebase.ts`, `lib/logger.ts`, `analysis/export_firestore.py`, `docs/難易度ルーブリック.md`

## Decisions
- 事前/事後フォームはランダム割付を維持（固定するとフォーム差が学習効果と区別できない）。事前テストの点を人どうしで比べるときはフォームを要因に入れる。
- 相談しながらのプレイは禁止（同意画面に注意書き）。自己申告の質問は威圧的なので取らない。
- 未成年の保護者同意・データ削除の手続きは書面で扱い、ゲーム内には入れない（終了画面の参加者コード表示のみ）。
- 統制群は置かない（n≈30で2群に分けると検出力不足）。論文で限界として明記。
- 大規模な構造変更は避ける。研究データの取り方はパイロット前に固定し、パイロット後は変えない。

## Verification
Codex（2026-09-30）：
- `pnpm exec tsc --noEmit --incremental false`：成功（終了コード0）。
- `pnpm lint`：失敗（終了コード2）。既存ESLint設定の import 解決エラーで解析開始前に停止。
- `pnpm build`：Next.js 15.3.3 表示後、数分間進展がなく今回起動したコマンドを中断。ビルド成否・停止原因は未確定。以前からのNodeプロセスが複数あり、それらは停止していない。
- `git diff --check`：成功。既存の25ファイルの変更量は調査前後で同一。今回編集は本ファイルのみ（未追跡）。
- package.json にunit/integration testスクリプトなし。ブラウザ通しプレイ・実機・オフライン同期・性能測定は未実施。
前任の記録（今回再検証していない）：全ページHTTP 200、Pythonエクスポート構文とSUS計算の確認済み。
## Known Issues
- 初回調査で確認：`pnpm lint` は ESLint 設定の `eslint-config-next/core-web-vitals` 解決エラーで停止（ゲームコード変更前から存在）。
- `FPSControls.tsx` の移動・スティック旋回は delta 未使用でFPS依存。調査/判定中の操作停止と blur 時の入力解除もない。実機再現・最小修正が次の候補。
- `Room.tsx` は各対象で毎フレーム Vector3 を生成、移動中も FPSControls で生成。性能への実影響は未計測。
- `ResultClient.tsx` はローカル screen のみで survey/score に遷移し、store.phase は transfer_test のまま。保存 phase/dropoutPhase の分類が実画面とずれる。
- Zustand はメモリ内のみで、ページ再読込からの進行復元は未実装。Firestore永続キャッシュはログ送信待ち用。
- README は雛形、docs/architecture.md は転移テスト・ポストエフェクト等を未実装としており実装と不一致。実際は双方実装済み。docs/todo.md の Node 22 対応も実施済み。
- AGENTS.md 指定の `node_modules/next/dist/docs/` はこのインストールには存在しない。今回はコード変更なし。
- ダミー導入後のゲーム内6問は、難易度ルーブリックでの再採点が未実施（特に X＝照合負荷）。
- 通しの所要時間が倫理申請の「約10分」に収まるか未計測。
- 部屋に衝突判定はない（家具をすり抜けられる）。既知・現状許容。
- `docs/todo.md` は古い（実態と合っていない）。
- `orchestrator/` は別用途のミラーで tsconfig の exclude 対象。触らない。

## Next Steps
- 今回の具体的な開発依頼を確認し、まず lint の既存失敗と build 停滞の原因を調査、保存フェーズと入力の問題を検証する。既存の未コミット変更は保持する。

1. ブラウザで `?test=1` の通しプレイ → `python analysis/export_firestore.py --include-test` で新しい列を確認、所要時間を計測
2. 問題なければコミット → push → master にマージして GitHub Pages に反映
3. パイロット実施 → 項目分析スクリプト（D-12：p値・RT・識別力・d′）→ 難易度の最終確定
4. 効果音（howler・導入済みで未使用）、GLBモデル（読み込み基盤あり）は余力があれば

## Last Agent
Codex


