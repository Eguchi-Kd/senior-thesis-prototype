"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { scenario1 } from "@/scenarios/scenario1";

const ROOM_W = 10;
const ROOM_H = 3;
const ROOM_D = 10;

function InteractableObject({
  obj,
  onInspect,
}: {
  obj: (typeof scenario1.objects)[0];
  onInspect: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current) return;
    const dist = camera.position.distanceTo(meshRef.current.position);
    const scale = dist < 2 ? 1.1 : 1.0;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh
      ref={meshRef}
      position={obj.position}
      onClick={() => onInspect(obj.id)}
      castShadow
    >
      <boxGeometry args={[0.4, 0.4, 0.05]} />
      <meshStandardMaterial color={obj.id === "smartphone" ? "#1a1a2e" : "#f0f0e8"} />
    </mesh>
  );
}

export function Room({ onInspect }: { onInspect: (id: string) => void }) {
  const { currentScenario } = useGameStore();
  const scenario = scenario1;

  return (
    <group>
      {/* 照明 */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 2.5, 0]} intensity={1.2} castShadow />

      {/* 床 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#c8b89a" />
      </mesh>

      {/* 天井 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f5f5f0" />
      </mesh>

      {/* 壁（奥） */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e8e0d0" />
      </mesh>

      {/* 壁（手前） */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, ROOM_H / 2, ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#e8e0d0" />
      </mesh>

      {/* 壁（左） */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-ROOM_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#ddd5c5" />
      </mesh>

      {/* 壁（右） */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[ROOM_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#ddd5c5" />
      </mesh>

      {/* 机 */}
      <mesh position={[0, 0.75, -3.5]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.05, 1]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      <mesh position={[-0.9, 0.35, -3.5]} castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#7a5c10" />
      </mesh>
      <mesh position={[0.9, 0.35, -3.5]} castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#7a5c10" />
      </mesh>

      {/* インタラクタブルオブジェクト */}
      {scenario.objects.map((obj) => (
        <InteractableObject key={obj.id} obj={obj} onInspect={onInspect} />
      ))}
    </group>
  );
}
