# アーキテクチャ

## 技術スタック

| カテゴリ | ライブラリ / サービス | バージョン | 役割 |
|---|---|---|---|
| フレームワーク | Next.js (App Router) | 15.3.3 | ルーティング・静的エクスポート |
| 言語 | TypeScript | ^5 | 型安全性 |
| 3D描画 | Three.js | ^0.185.0 | WebGL レンダリング |
| R3F | @react-three/fiber | ^9.6.1 | Three.js の React ラッパー |
| R3F ヘルパー | @react-three/drei | ^10.7.7 | Camera, Html, useGLTF 等 |
| ポストエフェクト | @react-three/postprocessing | ^3.0.4 | ブルーム・ヴィネット（未実装） |
| 状態管理 | Zustand | ^5.0.14 | ゲームグローバル状態 |
| モバイル操作 | nipplejs | ^1.0.4 | 仮想ジョイスティック |
| UI アニメーション | framer-motion | ^12.42.0 | 画面遷移・フィードバックカード |
| 効果音 | howler.js | ^2.2.4 | 環境音・SE（未実装） |
| データ収集 | Firebase Firestore | ^12.15.0 | セッションログ保存 |
| スタイリング | Tailwind CSS | ^4 | オーバーレイ UI |
| パッケージ管理 | pnpm | 10 | 依存管理 |
| CI/CD | GitHub Actions | — | 自動ビルド・デプロイ |
| ホスティング | GitHub Pages | — | 静的ファイル配信 |

---

## ディレクトリ構造

```
prototype/
├── app/
│   ├── layout.tsx          # メタデータ・Viewport・グローバルCSS
│   ├── page.tsx            # タイトル画面（framer-motion アニメ付き）
│   └── game/
│       ├── page.tsx        # SSR無効ラッパー（"use client" + dynamic ssr:false）
│       └── GameClient.tsx  # ゲーム本体（Canvas + UI ロジック）
│
├── components/
│   ├── game/
│   │   ├── Room.tsx              # 3D部屋（Box Geometry + InteractableObject）
│   │   └── FPSControls.tsx       # FPS操作（nipplejs + タッチ + WASD）
│   └── ui/
│       ├── ConfidenceSlider.tsx  # 確信度1〜5スライダー + 判定ボタン
│       └── FeedbackCard.tsx      # フィードバック画面（正誤・解説・学習ポイント）
│
├── store/
│   └── gameStore.ts        # Zustand store（全ゲーム状態）
│
├── lib/
│   ├── firebase.ts         # Firebase 初期化（getApps() でシングルトン）
│   └── logger.ts           # Firestore セッション保存（saveSession）
│
├── scenarios/
│   └── scenario1.ts        # シナリオ定義（id, objects, isFraud, explanation）
│
├── public/
│   └── models/             # Blender → GLB ファイル置き場（未配置）
│
├── docs/                   # このknowledge base
│   ├── project.md
│   ├── decisions.md
│   ├── todo.md
│   └── architecture.md
│
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions（push→build→Pages配信）
├── next.config.ts          # 静的エクスポート設定
├── .env.local.example      # Firebase 環境変数テンプレート
└── package.json
```

---

## ゲームフロー

```
title
  ↓ スタートボタン押下
exploring          ← 3D空間を自由に移動・オブジェクトを探す
  ↓ オブジェクトをタップ
investigating      ← 調査パネル表示（カレンダー/SMS等の内容確認）
  ↓ 「確認した → 判定する」ボタン
judging            ← ConfidenceSlider 表示（確信度1〜5 + report/ignore 選択）
  ↓ 送信
feedback           ← FeedbackCard 表示（正誤・解説・学習ポイント）
  ↓ 「次へ」ボタン（currentScenario < 4 なら exploring に戻る）
transfer_test      ← 転移テスト（未実装）
  ↓
result             ← 最終スコア・Firestore保存
```

---

## Zustand ゲーム状態

```typescript
// store/gameStore.ts
{
  // 状態
  phase: GamePhase           // "title" | "exploring" | "investigating" | "judging" | "feedback" | "transfer_test" | "result"
  currentScenario: number    // 1〜4
  totalScenarios: number     // 4
  rtStartTime: number | null // performance.now() のタイムスタンプ
  hintUsed: boolean
  logs: ScenarioLog[]        // 各シナリオの計測結果
  sessionId: string          // "session_<timestamp>_<random>"

  // アクション
  setPhase(phase)
  startTimer()               // rtStartTime = performance.now()
  stopTimer() → number       // 経過ms を返し rtStartTime をリセット
  useHint()
  submitDecision(decision, confidence, correct)  // stopTimer() を内部で呼ぶ
  nextScenario()             // 4本終了なら phase → "transfer_test"
  reset()
}
```

---

## シナリオ定義スキーマ

```typescript
// scenarios/scenario*.ts
{
  id: number,
  title: string,
  description: string,
  anomaly: { type: string, clue: string },
  objects: [
    {
      id: string,
      label: string,
      position: [number, number, number],
      content: string | { type, sender, body, timestamp }  // テキスト or SMS風オブジェクト
    }
  ],
  isFraud: boolean,
  explanation: string,    // フィードバック画面の解説文
  learningPoint: string   // フィードバック画面の学習ポイント
}
```

---

## Firestore データスキーマ

```
sessions/{sessionId}
├── sessionId: string
├── createdAt: Timestamp
├── logs: [
│   {
│     scenarioId: number,
│     reactionTimeMs: number,     // performance.now() ベースのms
│     decision: "report" | "ignore" | "mistake" | null,
│     confidence: number,         // 1〜5
│     hintUsed: boolean,
│     correct: boolean
│   }
│ ]
└── transferTest?: [
    { questionId: string, answer: string, correct: boolean, confidence: number }
  ]
```

---

## SSR 無効化パターン

Three.js / nipplejs は `window` / `document` に依存するため SSR 不可。

```typescript
// app/game/page.tsx
"use client";
import dynamic from "next/dynamic";
const GameClient = dynamic(() => import("./GameClient"), { ssr: false });
export default function GamePage() { return <GameClient />; }
```

`"use client"` は `ssr: false` の `dynamic` を使うラッパー側に付与する必要がある（Next.js 15 の制約）。

---

## GitHub Actions デプロイフロー

```
push to master
  → actions/checkout@v4
  → pnpm/action-setup@v4 (version: 10)
  → actions/setup-node@v4 (node-version: 22)
  → pnpm install
  → pnpm build  →  out/ ディレクトリ生成
  → actions/configure-pages@v5
  → actions/upload-pages-artifact@v3 (path: out)
  → actions/deploy-pages@v4
  → https://eguchi-kd.github.io/senior-thesis-prototype/
```

**前提条件（ユーザー設定）**:
- GitHub リポジトリを **Public** にする
- Settings → Pages → Source: **GitHub Actions** を選択
