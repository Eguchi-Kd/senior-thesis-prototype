"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

// 「8番出口」風の落ち着いた没入感を出すためのポストエフェクト。
// モバイル負荷が高い場合は enabled={false} で丸ごと無効化できる。
export function PostFX({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return null;
  return (
    <EffectComposer>
      {/* 明るい部分をふわっと光らせる（控えめ） */}
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      {/* 画面周辺を軽く暗くして視線を中央に集める */}
      <Vignette offset={0.3} darkness={0.65} eskil={false} />
    </EffectComposer>
  );
}
