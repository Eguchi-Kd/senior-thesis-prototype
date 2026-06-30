# TODO リスト

ステータス凡例: `[ ]` 未着手 / `[>]` 進行中 / `[x]` 完了 / `[!]` ブロック中

---

## 緊急（デプロイ修正）

- [x] `next.config.ts` に `output: 'export'`, `basePath`, `trailingSlash` を追加
- [x] `.github/workflows/deploy.yml` を作成（GitHub Actions 自動デプロイ）
- [ ] `deploy.yml` の `node-version: 20` → `22` に変更してプッシュ
- [!] GitHubリポジトリ Settings → Pages → Source: **GitHub Actions** に設定（ユーザー操作必須）
- [!] GitHubリポジトリを **Public** に変更（ユーザー操作必須）

---

## Phase 4: 残シナリオ実装

- [ ] `scenarios/scenario2.ts` — 社員証 × セキュリティアラートメール
- [ ] `scenarios/scenario3.ts` — 領収書 × 催促メール（架空請求）
- [ ] `scenarios/scenario4.ts` — ポスター × 改ざんQRコード
- [ ] `app/game/GameClient.tsx` を複数シナリオ対応に更新（scenario1 ハードコード → store から動的取得）

---

## Phase 4: 転移テスト・結果画面

- [ ] `app/result/page.tsx` — 転移テスト問題 + 最終スコア表示
- [ ] 転移テスト問題設計（未学習の詐欺パターン 3〜5 問）
- [ ] Firestore への最終セッション保存（`saveSession()` 呼び出し）

---

## Firebase 連携

- [ ] Firebase プロジェクト作成（コンソール）
- [ ] `.env.local` に NEXT_PUBLIC_FIREBASE_* 環境変数を設定（`.env.local.example` を参照）
- [ ] GitHub Actions の Secrets に Firebase 環境変数を追加（デプロイ時のビルドに必要）
- [ ] Firestore セキュリティルール設定（書き込み許可、読み取り制限）

---

## 没入感・品質向上

- [ ] `@react-three/postprocessing` でブルーム・ヴィネット追加
- [ ] howler.js で環境音・UI効果音追加
- [ ] 3Dモデル（Blender → GLB/DRACO圧縮）を `public/models/` に配置・`useGLTF` でロード

---

## スマホ最適化

- [ ] Android Chrome / iOS Safari での実機動作確認
- [ ] nipplejs ゾーンのタッチ感度調整
- [ ] 描画負荷チェック（`stats.js` or R3F `perf` で FPS 計測）
- [ ] テクスチャ KTX2/BasisU 圧縮（GPU メモリ節約）

---

## 完了済み

- [x] Node.js / pnpm / Next.js 15.3.3 + TypeScript セットアップ
- [x] 全依存パッケージインストール（R3F, drei, zustand, nipplejs, firebase 等）
- [x] GitHub リポジトリ作成・初回プッシュ
- [x] Box Geometry 仮部屋（壁・床・天井・机）`Room.tsx`
- [x] FPS 一人称カメラ（PC: WASD, モバイル: nipplejs + タッチスワイプ）`FPSControls.tsx`
- [x] Zustand ゲーム状態管理（RT タイマー・フェーズ・ログ）`store/gameStore.ts`
- [x] シナリオ1（カレンダー × SMS フィッシング）`scenarios/scenario1.ts`
- [x] 確信度スライダー UI `components/ui/ConfidenceSlider.tsx`
- [x] フィードバックカード UI `components/ui/FeedbackCard.tsx`
- [x] Firebase 初期化 + Firestore ログ送信基盤 `lib/firebase.ts`, `lib/logger.ts`
- [x] SSR 無効化（`dynamic(..., { ssr: false })`）`app/game/page.tsx` + `GameClient.tsx`
- [x] GitHub Pages 用 `next.config.ts` 設定
- [x] GitHub Actions ワークフロー `deploy.yml`
