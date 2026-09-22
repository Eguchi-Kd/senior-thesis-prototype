"use client";

import { useGLTF } from "@react-three/drei";
import { asset } from "@/lib/basePath";

// public/models 配下の GLB を basePath 付きで読み込む汎用コンポーネント。
// path は "/models/xxx.glb" のようにルート相対で渡す（asset() が basePath を付与）。
// 第2引数 true で drei の CDN DRACO デコーダを使う（本番はオンライン前提）。
export function GltfModel({
  path,
  position,
  scale,
  rotation,
}: {
  path: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(asset(path), true);
  return <primitive object={scene} position={position} scale={scale} rotation={rotation} />;
}

// 事前読み込み（初回表示のカクつき防止）。モデル配置後にゲーム入口で呼ぶ。
export const preloadModel = (path: string) => useGLTF.preload(asset(path), true);
