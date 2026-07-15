"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { getScenario } from "@/lib/scenarios";

const ROOM_W = 10;
const ROOM_H = 3;
const ROOM_D = 10;

// ─── オブジェクト種別ごとの外形定義 ─────────────────────
function getObjectShape(id: string) {
  switch (id) {
    case "smartphone": return { w: 0.09, h: 0.18, d: 0.012, color: "#1a1a1a" };
    case "calendar":   return { w: 0.35, h: 0.45, d: 0.02,  color: "#f5f5ef" };
    case "id_card":    return { w: 0.22, h: 0.14, d: 0.008, color: "#eef2ff" };
    case "receipt":    return { w: 0.14, h: 0.22, d: 0.004, color: "#fffde8" };
    case "poster":     return { w: 0.52, h: 0.72, d: 0.02,  color: "#ffffff" };
    default:           return { w: 0.30, h: 0.30, d: 0.02,  color: "#e0e0e0" };
  }
}

// ─── インタラクタブルオブジェクト ────────────────────────
function InteractableObject({
  obj,
  onInspect,
}: {
  obj: { id: string; label: string; position: [number, number, number] };
  onInspect: (id: string) => void;
}) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const dotRef  = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const shape = getObjectShape(obj.id);
  const [px, py, pz] = obj.position;

  useFrame(() => {
    const dist = camera.position.distanceTo(new THREE.Vector3(px, py, pz));
    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = dist < 2.5 ? Math.max(0, (2.5 - dist) * 0.35) : 0;
    }
    if (dotRef.current) {
      const mat = dotRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = dist < 2.5 ? 1.4 : 0.4;
    }
  });

  return (
    <group position={[px, py, pz]} onClick={() => onInspect(obj.id)}>
      {/* メイン本体 */}
      <mesh ref={bodyRef} castShadow>
        <boxGeometry args={[shape.w, shape.h, shape.d]} />
        <meshStandardMaterial
          color={shape.color}
          roughness={0.6}
          metalness={0.05}
          emissive="#ff6600"
          emissiveIntensity={0}
        />
      </mesh>

      {/* スマートフォン: 画面 */}
      {obj.id === "smartphone" && (
        <mesh position={[0, 0, 0.007]}>
          <boxGeometry args={[0.078, 0.155, 0.002]} />
          <meshStandardMaterial color="#101830" roughness={0.1} metalness={0.3} />
        </mesh>
      )}

      {/* カレンダー: 赤ヘッダー + 罫線 + 吊り穴 */}
      {obj.id === "calendar" && (
        <>
          <mesh position={[0, shape.h / 2 - 0.04, 0.012]}>
            <boxGeometry args={[shape.w, 0.08, 0.005]} />
            <meshStandardMaterial color="#cc2200" roughness={0.7} />
          </mesh>
          {[-0.08, 0.02, 0.12].map((dy, i) => (
            <mesh key={i} position={[0, dy, 0.012]}>
              <boxGeometry args={[shape.w - 0.04, 0.005, 0.003]} />
              <meshStandardMaterial color="#cccccc" />
            </mesh>
          ))}
          <mesh position={[0, shape.h / 2 + 0.03, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.025, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.5} />
          </mesh>
        </>
      )}

      {/* 社員証: 青帯 + 顔写真エリア */}
      {obj.id === "id_card" && (
        <>
          <mesh position={[0, shape.h / 2 - 0.022, 0.005]}>
            <boxGeometry args={[shape.w, 0.044, 0.003]} />
            <meshStandardMaterial color="#1a44aa" />
          </mesh>
          <mesh position={[-0.06, -0.01, 0.005]}>
            <boxGeometry args={[0.055, 0.07, 0.003]} />
            <meshStandardMaterial color="#aaaaaa" roughness={0.8} />
          </mesh>
        </>
      )}

      {/* 領収書: 罫線 */}
      {obj.id === "receipt" && (
        <>
          {[-0.06, -0.01, 0.04, 0.07].map((dy, i) => (
            <mesh key={i} position={[0, dy, 0.003]}>
              <boxGeometry args={[0.12, 0.004, 0.002]} />
              <meshStandardMaterial color="#ddddcc" />
            </mesh>
          ))}
        </>
      )}

      {/* ポスター: 青帯 + QRブロック */}
      {obj.id === "poster" && (
        <>
          <mesh position={[0, shape.h / 2 - 0.078, 0.012]}>
            <boxGeometry args={[shape.w, 0.155, 0.005]} />
            <meshStandardMaterial color="#1a44bb" />
          </mesh>
          <mesh position={[0.1, -0.18, 0.012]}>
            <boxGeometry args={[0.12, 0.12, 0.005]} />
            <meshStandardMaterial color="#222222" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* インタラクト可能インジケーター（常時光る青白い点） */}
      <mesh ref={dotRef} position={[0, shape.h / 2 + 0.12, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color="#aaccff"
          emissive="#88aaff"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── メインルーム ─────────────────────────────────────
export function Room({ onInspect }: { onInspect: (id: string) => void }) {
  const { currentScenario } = useGameStore();
  const scenario = getScenario(currentScenario);

  return (
    <group>
      {/* ─── 照明（3点照明） ─── */}
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2.8, -2]} intensity={1.8} color="#fffbe6" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, 1]} intensity={0.6} color="#cce8ff" />
      <pointLight position={[-3, 1.8, -4.8]} intensity={1.0} color="#d4eeff" />
      <pointLight position={[3, 1.5, 2]} intensity={0.25} color="#ffffff" />

      {/* ─── 床 ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#9a7a56" roughness={0.9} />
      </mesh>

      {/* ─── 天井 ─── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f2ede8" roughness={1} />
      </mesh>

      {/* ─── 壁 ─── */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, ROOM_H / 2, ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#d8d0c4" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#d8d0c4" roughness={0.95} />
      </mesh>

      {/* ─── 巾木（4面） ─── */}
      <mesh position={[0, 0.04, -ROOM_D / 2 + 0.01]}>
        <boxGeometry args={[ROOM_W, 0.08, 0.02]} />
        <meshStandardMaterial color="#c4b89a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, ROOM_D / 2 - 0.01]}>
        <boxGeometry args={[ROOM_W, 0.08, 0.02]} />
        <meshStandardMaterial color="#c4b89a" roughness={0.8} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_W / 2 + 0.01, 0.04, 0]}>
        <boxGeometry args={[ROOM_D, 0.08, 0.02]} />
        <meshStandardMaterial color="#c4b89a" roughness={0.8} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[ROOM_W / 2 - 0.01, 0.04, 0]}>
        <boxGeometry args={[ROOM_D, 0.08, 0.02]} />
        <meshStandardMaterial color="#c4b89a" roughness={0.8} />
      </mesh>

      {/* ─── 窓（奥壁・左寄り） ─── */}
      <mesh position={[-2.5, 1.8, -4.97]}>
        <boxGeometry args={[1.4, 1.0, 0.06]} />
        <meshStandardMaterial color="#d8cfc0" roughness={0.7} />
      </mesh>
      <mesh position={[-2.5, 1.8, -4.96]}>
        <boxGeometry args={[1.2, 0.8, 0.02]} />
        <meshStandardMaterial color="#b8d8e8" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[-2.5, 1.8, -4.94]}>
        <boxGeometry args={[0.04, 0.8, 0.03]} />
        <meshStandardMaterial color="#d0c8b8" roughness={0.8} />
      </mesh>
      <mesh position={[-2.5, 1.8, -4.94]}>
        <boxGeometry args={[1.2, 0.04, 0.03]} />
        <meshStandardMaterial color="#d0c8b8" roughness={0.8} />
      </mesh>

      {/* ─── 天井ライト器具 ─── */}
      <mesh position={[0, 2.97, -2]}>
        <boxGeometry args={[0.32, 0.04, 0.32]} />
        <meshStandardMaterial color="#e0d8cc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.91, -2]}>
        <boxGeometry args={[0.22, 0.14, 0.22]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>

      {/* ─── 机（天板 + 4本脚 + 引き出し + モニター） ─── */}
      <mesh position={[0, 0.76, -3.5]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.06, 1.0]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.7} metalness={0.05} />
      </mesh>
      {([[-1.05, -0.42], [-1.05, 0.42], [1.05, -0.42], [1.05, 0.42]] as [number, number][]).map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.365, -3.5 + dz]} castShadow>
          <boxGeometry args={[0.07, 0.73, 0.07]} />
          <meshStandardMaterial color="#7a5030" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.72, 0.54, -3.06]}>
        <boxGeometry args={[0.85, 0.24, 0.06]} />
        <meshStandardMaterial color="#7a5030" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.81, -3.85]}>
        <boxGeometry args={[0.18, 0.04, 0.22]} />
        <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.12, -3.95]} castShadow>
        <boxGeometry args={[0.78, 0.48, 0.04]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.12, -3.93]}>
        <boxGeometry args={[0.72, 0.42, 0.01]} />
        <meshStandardMaterial color="#0a1020" emissive="#1a2840" emissiveIntensity={0.4} roughness={0.1} />
      </mesh>

      {/* ─── 椅子（座面 + 背もたれ + 4本脚） ─── */}
      <mesh position={[0, 0.52, -2.55]} castShadow>
        <boxGeometry args={[0.65, 0.05, 0.62]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, -2.88]} castShadow>
        <boxGeometry args={[0.65, 0.55, 0.06]} />
        <meshStandardMaterial color="#4a4a5a" roughness={0.9} />
      </mesh>
      {([[-0.28, -0.25], [-0.28, 0.25], [0.28, -0.25], [0.28, 0.25]] as [number, number][]).map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.245, -2.55 + dz]} castShadow>
          <boxGeometry args={[0.05, 0.49, 0.05]} />
          <meshStandardMaterial color="#333344" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* ─── 本棚（左壁沿い） ─── */}
      <mesh position={[-4.52, 0.72, -2.5]} castShadow>
        <boxGeometry args={[0.04, 1.44, 0.38]} />
        <meshStandardMaterial color="#9a7a50" roughness={0.8} />
      </mesh>
      <mesh position={[-3.62, 0.72, -2.5]} castShadow>
        <boxGeometry args={[0.04, 1.44, 0.38]} />
        <meshStandardMaterial color="#9a7a50" roughness={0.8} />
      </mesh>
      <mesh position={[-4.07, 0.72, -2.69]}>
        <boxGeometry args={[0.9, 1.44, 0.02]} />
        <meshStandardMaterial color="#8a6a40" roughness={0.9} />
      </mesh>
      {[0.08, 0.56, 1.04].map((dy, i) => (
        <mesh key={i} position={[-4.07, dy, -2.5]}>
          <boxGeometry args={[0.86, 0.03, 0.36]} />
          <meshStandardMaterial color="#9a7a50" roughness={0.8} />
        </mesh>
      ))}
      {[
        { x: -4.42, y: 0.26, c: "#2244aa", w: 0.06 },
        { x: -4.34, y: 0.26, c: "#cc3322", w: 0.07 },
        { x: -4.25, y: 0.26, c: "#228844", w: 0.05 },
        { x: -4.18, y: 0.26, c: "#884422", w: 0.08 },
        { x: -4.08, y: 0.26, c: "#442288", w: 0.06 },
        { x: -4.35, y: 0.74, c: "#aa6622", w: 0.07 },
        { x: -4.27, y: 0.74, c: "#226688", w: 0.06 },
        { x: -4.19, y: 0.74, c: "#663322", w: 0.09 },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.y, -2.52]} castShadow>
          <boxGeometry args={[b.w, 0.24, 0.22]} />
          <meshStandardMaterial color={b.c} roughness={0.9} />
        </mesh>
      ))}

      {/* ─── インタラクタブルオブジェクト ─── */}
      {scenario.objects.map((obj) => (
        <InteractableObject key={obj.id} obj={obj} onInspect={onInspect} />
      ))}
    </group>
  );
}
