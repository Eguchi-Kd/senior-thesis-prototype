"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { getScenarioById } from "@/lib/scenarios";

const ROOM_W = 3.6; // 幅(x)
const ROOM_H = 2.5; // 高さ(y)
const ROOM_D = 5.4; // 奥行(z)

// タップ対象を家具（デスク上／奥壁）の定位置に固定し、全シナリオでレイアウトを安定させる。
// いずれもプレイヤー(+z)向きで回転不要。scenario 側の position より優先する。
const OBJECT_ANCHORS: Record<string, [number, number, number]> = {
  smartphone: [-0.45, 0.79, -2.15], // 机の上に平置き
  receipt: [0.5, 0.88, -2.2],
  id_card: [0.05, 0.84, -2.2],
  calendar: [0.7, 1.6, -2.66],
  poster: [-0.55, 1.55, -2.66],
};

// 見た目メッシュの回転（ラベル等は直立のまま）。スマホは画面を上にして机に寝かせる。
const OBJECT_ROTATIONS: Record<string, [number, number, number]> = {
  smartphone: [-Math.PI / 2, 0, 0],
};

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
  rotation,
}: {
  obj: { id: string; label: string; position: [number, number, number] };
  onInspect: (id: string) => void;
  rotation?: [number, number, number];
}) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const dotRef  = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLButtonElement>(null);
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
    if (labelRef.current) {
      // 近づくと少し大きく、遠いと少し薄くして「近づいて調べる」を促す
      labelRef.current.style.opacity = dist > 8 ? "0.6" : "1";
      labelRef.current.style.transform = dist < 2.5 ? "scale(1.12)" : "scale(1)";
    }
  });

  return (
    <group position={[px, py, pz]}>
      {/* 大きめの透明な当たり判定（指でのタップを容易にする。不可視でもレイキャスト対象） */}
      <mesh onClick={() => onInspect(obj.id)}>
        <boxGeometry args={[0.6, Math.max(0.6, shape.h + 0.3), 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 見た目メッシュ（任意で寝かせる等の回転を適用。ラベル/ドット/当たり判定は直立のまま） */}
      <group rotation={rotation}>
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
      </group>

      {/* インタラクト可能インジケーター（常時光る青白い点） */}
      <mesh ref={dotRef} position={[0, shape.h / 2 + 0.12, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color="#aaccff"
          emissive="#88aaff"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* フローティングラベル：常時表示の大きなタップ対象（見つけやすく・押しやすく） */}
      <Html position={[0, shape.h / 2 + 0.3, 0]} center zIndexRange={[16, 0]} style={{ pointerEvents: "auto" }}>
        <button
          ref={labelRef}
          onClick={(e) => { e.stopPropagation(); onInspect(obj.id); }}
          className="whitespace-nowrap px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-bold border border-white/40 shadow-lg backdrop-blur-sm transition-transform"
        >
          🔍 {obj.label}
        </button>
      </Html>
    </group>
  );
}

// ─── メインルーム（在宅ワークのワンルーム／温かい生活感） ─────────────
export function Room({ onInspect }: { onInspect: (id: string) => void }) {
  const { scenarioOrder, currentIndex } = useGameStore();
  const scenario = getScenarioById(scenarioOrder[currentIndex]);

  const HX = ROOM_W / 2; // 1.8
  const HZ = ROOM_D / 2; // 2.7

  return (
    <group>
      {/* ─── 照明（温かい電球色ベース） ─── */}
      <ambientLight intensity={0.5} color="#ffe8cc" />
      <pointLight position={[0, 2.2, -0.2]} intensity={0.85} color="#ffdca8" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-0.7, 0.95, -2.35]} intensity={0.6} color="#ffd9a0" />
      <directionalLight position={[-3, 2.4, 1.5]} intensity={0.45} color="#fff2e0" />
      <pointLight position={[1.5, 0.6, -0.6]} intensity={0.35} color="#ffcf9a" />

      {/* ─── 床＋ラグ ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#a97c50" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.1]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshStandardMaterial color="#b5613f" roughness={1} />
      </mesh>

      {/* ─── 天井 ─── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f3ece2" roughness={1} />
      </mesh>

      {/* ─── 壁（4面・暖色） ─── */}
      <mesh position={[0, ROOM_H / 2, -HZ]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e8ddcf" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, ROOM_H / 2, HZ]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e8ddcf" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-HX, ROOM_H / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#e0d3c1" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[HX, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#e0d3c1" roughness={0.95} />
      </mesh>

      {/* ─── 巾木 ─── */}
      {([[0, -HZ + 0.01], [0, HZ - 0.01]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]}>
          <boxGeometry args={[ROOM_W, 0.08, 0.02]} />
          <meshStandardMaterial color="#c9b48f" roughness={0.8} />
        </mesh>
      ))}
      {[-HX + 0.01, HX - 0.01].map((x, i) => (
        <mesh key={i} rotation={[0, Math.PI / 2, 0]} position={[x, 0.04, 0]}>
          <boxGeometry args={[ROOM_D, 0.08, 0.02]} />
          <meshStandardMaterial color="#c9b48f" roughness={0.8} />
        </mesh>
      ))}

      {/* ─── 窓＋カーテン（左壁・詳細版） ─── */}
      {/* group ローカル: +z が室内向き。壁(x=-1.8)から離して z-fighting を回避 */}
      <group position={[-1.74, 1.5, 0.9]} rotation={[0, Math.PI / 2, 0]}>
        {/* 外の空（ガラスの奥） */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[1.16, 1.0]} />
          <meshStandardMaterial color="#bfe0f5" emissive="#eaf6ff" emissiveIntensity={0.7} />
        </mesh>
        {/* ガラス（薄い青・半透明・昼光） */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.16, 1.0, 0.01]} />
          <meshStandardMaterial color="#d5ecf7" emissive="#fff6e6" emissiveIntensity={0.35} transparent opacity={0.35} roughness={0.05} metalness={0.1} />
        </mesh>
        {/* 外枠（上下左右） */}
        <mesh position={[0, 0.52, 0.03]}><boxGeometry args={[1.28, 0.09, 0.07]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        <mesh position={[0, -0.52, 0.03]}><boxGeometry args={[1.28, 0.09, 0.07]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        <mesh position={[-0.6, 0, 0.03]}><boxGeometry args={[0.08, 1.04, 0.07]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        <mesh position={[0.6, 0, 0.03]}><boxGeometry args={[0.08, 1.04, 0.07]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        {/* 桟（十字のマリオン） */}
        <mesh position={[0, 0, 0.03]}><boxGeometry args={[0.04, 1.0, 0.05]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        <mesh position={[0, 0, 0.03]}><boxGeometry args={[1.16, 0.04, 0.05]} /><meshStandardMaterial color="#f3ede2" roughness={0.7} /></mesh>
        {/* 窓台（下枠のせり出し） */}
        <mesh position={[0, -0.58, 0.08]}><boxGeometry args={[1.36, 0.06, 0.2]} /><meshStandardMaterial color="#e6ddce" roughness={0.8} /></mesh>
        {/* カーテンレール＋端の玉 */}
        <mesh position={[0, 0.62, 0.12]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 1.5, 10]} /><meshStandardMaterial color="#8a7355" metalness={0.3} roughness={0.5} /></mesh>
        {[-0.75, 0.75].map((x, i) => (
          <mesh key={i} position={[x, 0.62, 0.12]}><sphereGeometry args={[0.035, 10, 10]} /><meshStandardMaterial color="#6e5a3f" metalness={0.3} /></mesh>
        ))}
        {/* カーテン（左右・縦ヒダ・少し開けて窓を見せる） */}
        {[-0.62, -0.53, -0.44, -0.35, 0.35, 0.44, 0.53, 0.62].map((x, i) => (
          <mesh key={i} position={[x, 0.02, 0.1]}>
            <boxGeometry args={[0.09, 1.12, 0.04]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#c98a5a" : "#b87a4c"} roughness={1} />
          </mesh>
        ))}
      </group>

      {/* ─── 天井ペンダント器具 ─── */}
      <mesh position={[0, 2.5, -0.2]}><cylinderGeometry args={[0.01, 0.01, 0.3, 6]} /><meshStandardMaterial color="#555" /></mesh>
      <mesh position={[0, 2.32, -0.2]}><coneGeometry args={[0.16, 0.16, 16]} /><meshStandardMaterial color="#5a4632" emissive="#ffdca8" emissiveIntensity={0.6} roughness={0.5} /></mesh>

      {/* ─── デスク（奥壁沿い） ─── */}
      <group position={[0, 0, -2.3]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow><boxGeometry args={[1.7, 0.05, 0.55]} /><meshStandardMaterial color="#8b5e3c" roughness={0.7} /></mesh>
        {([[-0.78, -0.2], [-0.78, 0.2], [0.78, -0.2], [0.78, 0.2]] as [number, number][]).map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.36, dz]} castShadow><boxGeometry args={[0.06, 0.72, 0.06]} /><meshStandardMaterial color="#79502f" roughness={0.8} /></mesh>
        ))}
        {/* モニタ */}
        <mesh position={[0, 0.83, -0.18]}><boxGeometry args={[0.03, 0.14, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
        <mesh position={[0, 1.02, -0.2]} castShadow><boxGeometry args={[0.62, 0.36, 0.03]} /><meshStandardMaterial color="#222" roughness={0.4} /></mesh>
        <mesh position={[0, 1.02, -0.185]}><boxGeometry args={[0.57, 0.31, 0.01]} /><meshStandardMaterial color="#10182e" emissive="#24406e" emissiveIntensity={0.5} roughness={0.1} /></mesh>
        {/* キーボード・マウス */}
        <mesh position={[-0.02, 0.775, 0.12]}><boxGeometry args={[0.42, 0.02, 0.14]} /><meshStandardMaterial color="#3a3a42" roughness={0.6} /></mesh>
        <mesh position={[0.34, 0.775, 0.12]}><boxGeometry args={[0.06, 0.02, 0.1]} /><meshStandardMaterial color="#3a3a42" roughness={0.6} /></mesh>
        {/* マグ */}
        <mesh position={[-0.6, 0.80, 0.05]}><cylinderGeometry args={[0.045, 0.04, 0.09, 12]} /><meshStandardMaterial color="#d1663f" roughness={0.6} /></mesh>
        {/* デスクの小さな観葉植物 */}
        <mesh position={[0.66, 0.80, -0.1]}><cylinderGeometry args={[0.05, 0.04, 0.08, 8]} /><meshStandardMaterial color="#b9885a" /></mesh>
        <mesh position={[0.66, 0.90, -0.1]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#3f7d4a" roughness={0.9} /></mesh>
        {/* ペン立て */}
        <mesh position={[0.5, 0.80, -0.05]}><cylinderGeometry args={[0.035, 0.035, 0.1, 10]} /><meshStandardMaterial color="#5b6b7a" /></mesh>
        {/* デスクライト */}
        <mesh position={[-0.72, 0.78, -0.15]}><cylinderGeometry args={[0.05, 0.06, 0.02, 12]} /><meshStandardMaterial color="#444" /></mesh>
        <mesh position={[-0.72, 0.9, -0.13]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.008, 0.008, 0.28, 6]} /><meshStandardMaterial color="#555" /></mesh>
        <mesh position={[-0.72, 1.02, -0.02]}><coneGeometry args={[0.06, 0.08, 12]} /><meshStandardMaterial color="#e8a23a" emissive="#ffcf80" emissiveIntensity={0.5} /></mesh>
      </group>

      {/* ─── 椅子 ─── */}
      <group position={[0, 0, -1.75]}>
        <mesh position={[0, 0.48, 0]} castShadow><boxGeometry args={[0.5, 0.05, 0.5]} /><meshStandardMaterial color="#6b5140" roughness={0.9} /></mesh>
        <mesh position={[0, 0.75, 0.24]} castShadow><boxGeometry args={[0.5, 0.5, 0.05]} /><meshStandardMaterial color="#6b5140" roughness={0.9} /></mesh>
        {([[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]] as [number, number][]).map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.23, dz]}><boxGeometry args={[0.04, 0.46, 0.04]} /><meshStandardMaterial color="#3a2f26" /></mesh>
        ))}
      </group>

      {/* ─── ベッド（右壁沿い） ─── */}
      <group position={[1.2, 0, 0.4]}>
        <mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[0.95, 0.28, 1.95]} /><meshStandardMaterial color="#6b4a34" roughness={0.8} /></mesh>
        <mesh position={[0, 0.4, 0.05]}><boxGeometry args={[0.9, 0.14, 1.8]} /><meshStandardMaterial color="#c98a5a" roughness={1} /></mesh>
        <mesh position={[0, 0.44, 0.35]}><boxGeometry args={[0.92, 0.1, 1.1]} /><meshStandardMaterial color="#7fa9b0" roughness={1} /></mesh>
        <mesh position={[0, 0.5, -0.75]}><boxGeometry args={[0.75, 0.1, 0.3]} /><meshStandardMaterial color="#efe6d8" roughness={1} /></mesh>
      </group>

      {/* ─── ナイトテーブル＋ランプ ─── */}
      <group position={[1.5, 0, -0.75]}>
        <mesh position={[0, 0.28, 0]} castShadow><boxGeometry args={[0.35, 0.42, 0.35]} /><meshStandardMaterial color="#7a5030" roughness={0.8} /></mesh>
        <mesh position={[0, 0.53, 0]}><cylinderGeometry args={[0.03, 0.05, 0.14, 10]} /><meshStandardMaterial color="#888" /></mesh>
        <mesh position={[0, 0.64, 0]}><coneGeometry args={[0.1, 0.14, 14]} /><meshStandardMaterial color="#e8c98a" emissive="#ffcf9a" emissiveIntensity={0.6} /></mesh>
      </group>

      {/* ─── 本棚（左壁沿い） ─── */}
      <group position={[-1.6, 0, -0.9]}>
        <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.28, 1.4, 0.9]} /><meshStandardMaterial color="#8a6a40" roughness={0.85} /></mesh>
        {[0.25, 0.7, 1.15].map((y, i) => (
          <mesh key={i} position={[0.02, y, 0]}><boxGeometry args={[0.24, 0.02, 0.86]} /><meshStandardMaterial color="#9a7a50" /></mesh>
        ))}
        {[
          { z: -0.3, y: 0.42, c: "#2f5aa0", w: 0.22 }, { z: -0.14, y: 0.42, c: "#b23b30", w: 0.26 },
          { z: 0.02, y: 0.42, c: "#2f8a52", w: 0.2 }, { z: 0.2, y: 0.42, c: "#8a5a2c", w: 0.28 },
          { z: -0.2, y: 0.87, c: "#a5641f", w: 0.24 }, { z: -0.02, y: 0.87, c: "#356a86", w: 0.22 },
          { z: 0.16, y: 0.87, c: "#5a3322", w: 0.3 },
        ].map((b, i) => (
          <mesh key={i} position={[0.12, b.y + 0.02, b.z]}><boxGeometry args={[0.16, b.w, 0.14]} /><meshStandardMaterial color={b.c} roughness={0.9} /></mesh>
        ))}
      </group>

      {/* ─── ミニキッチン隅（手前左） ─── */}
      <group position={[-1.3, 0, 2.1]}>
        <mesh position={[0, 0.44, 0]} castShadow><boxGeometry args={[0.9, 0.88, 0.5]} /><meshStandardMaterial color="#cbb79a" roughness={0.8} /></mesh>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.94, 0.04, 0.54]} /><meshStandardMaterial color="#6b6b6b" roughness={0.4} metalness={0.3} /></mesh>
        <mesh position={[-0.2, 1.0, 0]}><cylinderGeometry args={[0.08, 0.09, 0.16, 12]} /><meshStandardMaterial color="#d9d9de" metalness={0.4} roughness={0.3} /></mesh>
        <mesh position={[0.15, 0.97, 0.05]}><cylinderGeometry args={[0.04, 0.035, 0.08, 10]} /><meshStandardMaterial color="#e0e0e0" /></mesh>
      </group>

      {/* ─── 隅の観葉植物（手前右） ─── */}
      <group position={[1.55, 0, 2.2]}>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.13, 0.1, 0.4, 12]} /><meshStandardMaterial color="#b9885a" /></mesh>
        <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.26, 10, 10]} /><meshStandardMaterial color="#3f7d4a" roughness={0.9} /></mesh>
        <mesh position={[0.1, 0.85, 0.05]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color="#4f9159" roughness={0.9} /></mesh>
      </group>

      {/* ─── 壁の装飾 ─── */}
      <mesh position={[1.3, 1.55, -HZ + 0.03]}><boxGeometry args={[0.4, 0.5, 0.02]} /><meshStandardMaterial color="#6b4a34" /></mesh>
      <mesh position={[1.3, 1.55, -HZ + 0.04]}><boxGeometry args={[0.34, 0.44, 0.01]} /><meshStandardMaterial color="#cfa06a" emissive="#8a6a3a" emissiveIntensity={0.15} /></mesh>
      <mesh position={[0, 2.1, -HZ + 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.03, 20]} /><meshStandardMaterial color="#efe6d8" /></mesh>
      <group position={[-HX + 0.03, 1.5, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><boxGeometry args={[0.7, 0.5, 0.02]} /><meshStandardMaterial color="#b98a55" roughness={1} /></mesh>
        {([[-0.2, 0.1, "#f2d24b"], [0.05, -0.05, "#7fc7f0"], [0.22, 0.12, "#f29fb0"]] as [number, number, string][]).map(([x, y, c], i) => (
          <mesh key={i} position={[x, y, 0.02]}><boxGeometry args={[0.12, 0.12, 0.005]} /><meshStandardMaterial color={c} /></mesh>
        ))}
      </group>

      {/* ─── インタラクタブルオブジェクト（家具の定位置に配置） ─── */}
      {scenario.objects.map((obj) => (
        <InteractableObject
          key={obj.id}
          obj={{ ...obj, position: OBJECT_ANCHORS[obj.id] ?? obj.position }}
          onInspect={onInspect}
          rotation={OBJECT_ROTATIONS[obj.id]}
        />
      ))}
    </group>
  );
}
