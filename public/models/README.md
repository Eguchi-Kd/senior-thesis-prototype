# 3Dモデル（GLB）アセット仕様

ここに `.glb` を置くと、`components/game/GltfModel.tsx` 経由で読み込める。
配信は GitHub Pages のサブパス下（`/senior-thesis-prototype/models/...`）になるため、
コードからは必ず `asset("/models/xxx.glb")`（`lib/basePath.ts`）でパスを組み立てること。

## 命名（オブジェクトidに対応）
インタラクト対象は `scenarios/types.ts` の `id` と一致させる：
- `room.glb` … 部屋全体（床・壁・家具など。インタラクト対象は含めない）
- `smartphone.glb` / `calendar.glb` / `id_card.glb` / `receipt.glb` / `poster.glb` … 各インタラクト物

## 制作ルール（Blender等）
- **スケール**：1 単位 = 1m（現行の部屋は約 10m×10m×3m）。
- **向き**：Y-up、正面は -Z（カメラ初期位置は +Z 側）。
- **原点/ピボット**：オブジェクトの底面中心（配置座標が現行 `position` と一致するように）。
- **書き出し**：glTF Binary（.glb）、+Y Up、Apply Modifiers、必要なテクスチャを埋め込み。
- **圧縮**：メッシュは DRACO 圧縮推奨（読み込みは drei の CDN デコーダを使用）。
- **モバイル予算の目安**：部屋全体で ~5万〜10万トライアングル以内、テクスチャは 1K〜2K・合計サイズ小さめ。GLB1ファイルは数MB以内を目標。

## コード側の使い方（配置後）
```tsx
import { GltfModel, preloadModel } from "@/components/game/GltfModel";
import { ModelErrorBoundary } from "@/components/game/ModelErrorBoundary";

// Room.tsx で、手書きジオメトリ（PrimitiveEnvironment）を fallback にして差し替える：
<Suspense fallback={<PrimitiveEnvironment />}>
  <ModelErrorBoundary fallback={<PrimitiveEnvironment />}>
    <GltfModel path="/models/room.glb" />
  </ModelErrorBoundary>
</Suspense>

// 入口で事前読み込み：
preloadModel("/models/room.glb");
```

## 検証
- ローカル `pnpm dev` と**本番URL**の両方で表示（本番でのパスは basePath 付き。404が出たら asset() 経由か確認）。
- スマホ実機で FPS を確認し、重ければポリ数/テクスチャを削減。
