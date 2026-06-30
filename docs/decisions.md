# 技術決定ログ

## D-001: フレームワーク — Next.js 15 (App Router, 静的エクスポート)
**日付**: 2026-06-29  
**決定**: Next.js 15.3.3 を使用。`output: 'export'` で静的ファイルを生成し GitHub Pages に配信。

**理由**:
- GitHub Pages は静的ファイルのみホスト可能 → `output: 'export'` が必須
- Next.js 16 は Windows で Turbopack が `0xc0000142` クラッシュを起こすため 15.3.3 にダウングレード
- App Router を使用（Pages Router は非推奨）

**制約**:
- `next start` は使用不可（静的エクスポートはサーバーレス）
- Next.js Image Optimization は使用不可 → `images: { unoptimized: true }`
- basePath: `/senior-thesis-prototype`（GitHub Pages のサブパス）

---

## D-002: 3Dエンジン — React Three Fiber + Three.js
**日付**: 2026-06-29  
**決定**: `@react-three/fiber` (R3F) + `three` でWebGL 3D描画。`@react-three/drei` でヘルパー。

**理由**:
- スマートフォンブラウザはWebGL対応◎、ネイティブアプリ不要
- R3Fにより React の状態管理（Zustand）と3D描画を自然に統合できる
- `drei` の `Html` コンポーネントで 3D 空間内にオーバーレイUIを配置可能

**注意**:
- SSR不可（`window`/`document`依存）→ `dynamic(() => import(...), { ssr: false })` でラップ必須
- `"use client"` を `ssr: false` のラッパーコンポーネントに付与する必要あり

---

## D-003: モバイルFPS操作 — nipplejs + カスタムタッチイベント
**日付**: 2026-06-29  
**決定**: 左画面半分にnipplejs仮想ジョイスティック（移動）、右半分にスワイプで視点回転。

**理由**:
- `drei` の `PointerLockControls` はモバイルの pointer lock API に未対応
- nipplejs は mobile FPS のデファクト標準、`dynamic` モードで任意位置に出現

**nipplejs v1.0.4 API変更**:
```typescript
// 旧API（v0.x）: (_, data) => data.force — 動かない
// 新API（v1.0.4）:
joystick.on("move", (evt) => {
  const { vector } = evt.data;  // { x: number, y: number } normalized
});
// 型: useRef<ReturnType<typeof nipplejs.create> | null>(null)
```

---

## D-004: 状態管理 — Zustand
**日付**: 2026-06-29  
**決定**: `zustand` をグローバルゲーム状態管理に使用。

**理由**:
- React Context はレンダリングコスト高（`useFrame` 内で毎フレーム参照するため不適）
- Zustand はシンプルなAPIで RT タイマー・フェーズ管理・ログ蓄積を一元管理できる
- Redux は小規模プロジェクトにオーバーキル

**ゲームフェーズ**: `title → exploring → investigating → judging → feedback → transfer_test → result`

---

## D-005: データ収集 — Firebase Firestore
**日付**: 2026-06-29  
**決定**: Firebase Firestore でセッションログを収集。

**コレクション**: `sessions/{sessionId}`  
**スキーマ**:
```typescript
{
  sessionId: string,
  createdAt: Timestamp,
  logs: ScenarioLog[],       // RT・確信度・判定結果
  transferTest?: TransferLog[]
}
```

**注意**: Firebase 環境変数は `.env.local` に設定（Gitには `.env.local.example` のみコミット）

---

## D-006: デプロイ — GitHub Actions + GitHub Pages
**日付**: 2026-06-29  
**決定**: `master` push 時に GitHub Actions が `pnpm build` → `out/` を GitHub Pages に配信。

**Node バージョン**: 22（当初 20 だったが非推奨警告により変更）  
**ユーザー設定必須**: GitHub リポジトリ Settings → Pages → Source: **GitHub Actions**

---

## D-007: パッケージマネージャー — pnpm
**日付**: 2026-06-29  
**決定**: npm/yarn ではなく pnpm を使用。

**理由**: ディスク効率・インストール速度。GitHub Actions も `pnpm/action-setup@v4` で対応。
