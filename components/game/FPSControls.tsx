"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import nipplejs from "nipplejs";

const MOVE_SPEED = 0.05;
const LOOK_RATE = 0.03;          // 右スティックの毎フレーム回転量（押し続けで回転）
const MOUSE_SENSITIVITY = 0.003; // PC: ドラッグ量あたりの回転量
const PLAYER_HEIGHT = 1.7;
const PITCH_LIMIT = Math.PI / 3; // 上下視点の可動域 ±60°

export function FPSControls() {
  const { camera, gl } = useThree();
  const moveDir = useRef({ x: 0, y: 0 });      // 左スティック / WASD（保持）
  const lookVec = useRef({ x: 0, y: 0 });      // 右スティック（保持・レート制御）
  const mouseDelta = useRef({ x: 0, y: 0 });   // PCマウスドラッグ（毎フレーム消費）
  const pitchRef = useRef(0);
  const moveStickRef = useRef<ReturnType<typeof nipplejs.create> | null>(null);
  const lookStickRef = useRef<ReturnType<typeof nipplejs.create> | null>(null);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 2);
    camera.rotation.order = "YXZ";

    // 横画面ロック（Android等で有効。iOS Safari等の非対応環境は握りつぶし、回転オーバーレイでフォローする）
    (async () => {
      try {
        await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape");
      } catch {
        /* 非対応環境：オーバーレイがフォールバック */
      }
    })();

    // ─── 左：移動ジョイスティック（常時可視） ───
    const moveZone = document.getElementById("joystick-zone");
    if (moveZone) {
      moveStickRef.current = nipplejs.create({
        zone: moveZone,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "rgba(255,255,255,0.5)",
        size: 110,
      });
      moveStickRef.current.on("move", (evt) => {
        const { vector } = evt.data;
        moveDir.current = { x: vector.x, y: vector.y };
      });
      moveStickRef.current.on("end", () => {
        moveDir.current = { x: 0, y: 0 };
      });
    }

    // ─── 右：視点ジョイスティック（常時可視） ───
    const lookZone = document.getElementById("look-zone");
    if (lookZone) {
      lookStickRef.current = nipplejs.create({
        zone: lookZone,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "rgba(255,255,255,0.5)",
        size: 110,
      });
      lookStickRef.current.on("move", (evt) => {
        const { vector } = evt.data;
        lookVec.current = { x: vector.x, y: vector.y };
      });
      lookStickRef.current.on("end", () => {
        lookVec.current = { x: 0, y: 0 };
      });
    }

    // ─── PC：マウスドラッグで視点操作（クリックによる調査と両立） ───
    const dom = gl.domElement;
    const drag = { active: false, x: 0, y: 0 };
    const onMouseDown = (e: MouseEvent) => {
      drag.active = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!drag.active) return;
      mouseDelta.current.x += e.clientX - drag.x;
      mouseDelta.current.y += e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onMouseUp = () => {
      drag.active = false;
    };
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // ─── PC：WASD / 矢印キーで移動 ───
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") moveDir.current.y = 1;
      if (e.code === "KeyS" || e.code === "ArrowDown") moveDir.current.y = -1;
      if (e.code === "KeyA" || e.code === "ArrowLeft") moveDir.current.x = -1;
      if (e.code === "KeyD" || e.code === "ArrowRight") moveDir.current.x = 1;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (["KeyW", "ArrowUp", "KeyS", "ArrowDown"].includes(e.code)) moveDir.current.y = 0;
      if (["KeyA", "ArrowLeft", "KeyD", "ArrowRight"].includes(e.code)) moveDir.current.x = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      moveStickRef.current?.destroy();
      lookStickRef.current?.destroy();
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, gl]);

  useFrame(() => {
    // ─── 視点：右スティック（レート）＋ PCマウスドラッグ（差分） ───
    let yawDelta = 0;
    let pitchDelta = 0;

    if (lookVec.current.x !== 0 || lookVec.current.y !== 0) {
      yawDelta += lookVec.current.x * LOOK_RATE;
      pitchDelta += lookVec.current.y * LOOK_RATE; // スティック上倒し = 上を向く
    }
    if (mouseDelta.current.x !== 0 || mouseDelta.current.y !== 0) {
      yawDelta += mouseDelta.current.x * MOUSE_SENSITIVITY;
      pitchDelta -= mouseDelta.current.y * MOUSE_SENSITIVITY; // マウス下移動 = 下を向く
      mouseDelta.current = { x: 0, y: 0 };
    }

    if (yawDelta !== 0 || pitchDelta !== 0) {
      camera.rotation.y -= yawDelta;
      pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current + pitchDelta));
      camera.rotation.x = pitchRef.current;
    }

    // ─── 移動：左スティック / WASD ───
    const { x: mx, y: my } = moveDir.current;
    if (mx !== 0 || my !== 0) {
      const forward = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
      const right = new THREE.Vector3(Math.cos(camera.rotation.y), 0, -Math.sin(camera.rotation.y));
      camera.position.addScaledVector(forward, my * MOVE_SPEED);
      camera.position.addScaledVector(right, mx * MOVE_SPEED);
      camera.position.y = PLAYER_HEIGHT;

      const limit = 4.5;
      camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
      camera.position.z = Math.max(-limit, Math.min(limit, camera.position.z));
    }
  });

  return null;
}
