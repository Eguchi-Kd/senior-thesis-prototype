"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/basePath";

// 窓の外の都市風景（3D）。プレイヤーの移動に応じて本当の奥行き（視差）が出るよう、ゲーム内で描画する。
// モデルは scripts/blender/make_window_city.py で生成（光は頂点色に焼き込み済み）。
// 負荷を抑えるため：照明計算をしない材質・影なし・建物は1メッシュに結合・動きは位置の更新とシェーダだけ。
// 動きはすべて時間の周期関数（任意の時刻で同じ状態）：葉は30秒、車・電車は40秒、雲は120秒で1周。
// 時間は120秒（すべての周期の公倍数）で折り返す。新しい requestAnimationFrame は作らず useFrame で更新する。

const GLB = "/models/window_city.glb";
const SKY = "/textures/window_city_sky.jpg";
const SWAY_SEC = 30;      // 葉の揺れの周期
const WRAP_SEC = 120;     // 時間を折り返す長さ（30・40・…の公倍数）
const GROUND_Y = -24;     // 生成スクリプトの GY と同じ（約8階から見下ろす）
const WIN_Z = 0.9;        // 窓の中心（左右）
// 空の円筒（生成スクリプトの SKY_R・SKY_H・SKY_BOTTOM と同じ。テクスチャの仰角がこの寸法で決まっている）
const SKY_R = 950, SKY_H = 1400, SKY_BOTTOM = -120;
// 屋外は室内より少し暗く描き、ブルーム（明るい部分のにじみ）のしきい値を超えないようにする
const TINT = new THREE.Color("#e2e2e2");

type Mover = { obj: THREE.Object3D; span: number; dir: number; phase: number; period: number };

// 葉の揺れ：場所ごとに位相をずらした小さな揺れ（30秒で割り切れる周期）。幹（別メッシュ）は動かない
function swayMaterial(base: THREE.MeshBasicMaterial, time: { value: number }) {
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float ph = position.x * 0.23 + position.z * 0.17;
      float lift = clamp((position.y - (${GROUND_Y.toFixed(1)} + 2.0)) * 0.25, 0.0, 1.0);
      float w = sin(uTime * 6.2831853 * (6.0 / ${SWAY_SEC}.0) + ph) * 0.65
              + sin(uTime * 6.2831853 * (11.0 / ${SWAY_SEC}.0) + ph * 1.7) * 0.35;
      transformed.x += w * 0.16 * lift;
      transformed.z += w * 0.11 * lift;`,
    );
  };
  return base;
}

export function WindowCity() {
  const { scene } = useGLTF(asset(GLB), false);
  const time = useRef({ value: 0 });
  const skyRef = useRef<THREE.Mesh>(null);

  // 材質を「照明計算なし・影なし」に置き換え、動くもの（車・電車）を集める
  const { root, movers, owned } = useMemo(() => {
    const root = scene.clone(true);
    const movers: Mover[] = [];
    const owned: THREE.Material[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const src = mesh.material as THREE.MeshStandardMaterial;
        let m = new THREE.MeshBasicMaterial({ map: src.map ?? null, vertexColors: true, color: TINT });
        if (src.name === "Foliage") m = swayMaterial(m, time.current);
        owned.push(m);
        mesh.material = m;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
      const u = o.userData as { kind?: string; span?: number; dir?: number; phase?: number; period?: number };
      if (u.kind === "car" || u.kind === "train") {
        movers.push({ obj: o, span: u.span ?? 520, dir: u.dir ?? 1, phase: u.phase ?? 0, period: u.period ?? 40 });
      }
    });
    return { root, movers, owned };
  }, [scene]);

  const skyTex = useMemo(() => {
    const t = new THREE.TextureLoader().load(asset(SKY));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }, []);

  useEffect(() => () => {
    owned.forEach((m) => m.dispose());
    skyTex.dispose();
  }, [owned, skyTex]);

  // 遠くの山・空（約1km先）まで描けるよう、表示中だけカメラの描画距離を延ばす（既定は1000）
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useEffect(() => {
    const prev = camera.far;
    camera.far = 2500;
    camera.updateProjectionMatrix();
    return () => {
      camera.far = prev;
      camera.updateProjectionMatrix();
    };
  }, [camera]);

  useFrame((_, delta) => {
    // 長時間でも精度が落ちないよう折り返す（すべての動きの周期の公倍数なので見た目は連続）
    const t = (time.current.value + Math.min(delta, 0.1)) % WRAP_SEC;
    time.current.value = t;
    // 車・電車：見えない遠く（±span/2）で折り返して周回する
    for (const m of movers) {
      const f = (t / m.period + m.phase) % 1;
      m.obj.position.z = WIN_Z + m.dir * (-m.span / 2 + f * m.span);
    }
    // 雲：120秒でテクスチャ1枚分だけ横に流す（折り返しの長さと同じなので継ぎ目なし）
    if (skyRef.current) skyTex.offset.x = t / WRAP_SEC;
  });

  return (
    <group>
      <primitive object={root} />
      {/* 空と雲（窓の外側の半円筒） */}
      <mesh ref={skyRef} position={[-1.8, SKY_BOTTOM + SKY_H / 2, WIN_Z]}>
        <cylinderGeometry args={[SKY_R, SKY_R, SKY_H, 24, 1, true, Math.PI, Math.PI]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} color={TINT} depthWrite={false} />
      </mesh>
    </group>
  );
}
