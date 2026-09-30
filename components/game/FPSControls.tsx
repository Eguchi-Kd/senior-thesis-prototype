"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import nipplejs from "nipplejs";

// 速度は「秒あたり」で定義し、経過時間(delta)を掛けて端末のFPS差をなくす（従来の60fps時と同じ体感）
const MOVE_SPEED = 3.0;          // m/秒
const LOOK_RATE = 1.8;           // 右スティック最大倒しでの回転 rad/秒
const MOUSE_SENSITIVITY = 0.003; // PC: ドラッグ量(px)あたりの回転量
const PLAYER_HEIGHT = 1.6;
const PITCH_LIMIT = Math.PI / 3; // 上下視点の可動域 ±60°
const MAX_DELTA = 0.1;           // タブ復帰直後などの大きな飛びを防ぐ
const LIMIT_X = 1.5;             // 部屋の内寸に合わせた移動境界（壁抜け防止）
const LIMIT_Z = 2.3;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();

// enabled=false（調査パネル・判定画面などを開いている間）は入力を捨てて移動・旋回しない
// onActivity：初めて移動/見回しをしたときに一度だけ通知（操作練習のチェック用）
export function FPSControls({
  enabled = true,
  onActivity,
}: {
  enabled?: boolean;
  onActivity?: (kind: "move" | "look") => void;
}) {
  const reported = useRef({ move: false, look: false });
  const { camera, gl } = useThree();
  const moveDir = useRef({ x: 0, y: 0 });      // 左スティック / WASD（保持）
  const lookVec = useRef({ x: 0, y: 0 });      // 右スティック（保持・レート制御）
  const mouseDelta = useRef({ x: 0, y: 0 });   // PCマウスドラッグ（毎フレーム消費）
  const pitchRef = useRef(0);
  const moveStickRef = useRef<ReturnType<typeof nipplejs.create> | null>(null);
  const lookStickRef = useRef<ReturnType<typeof nipplejs.create> | null>(null);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 2.3); // 入口側からデスクを正面に見る
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

    // ウィンドウが非アクティブになったら押しっぱなし状態を解除（keyup を取りこぼして動き続けるのを防ぐ）
    const resetInput = () => {
      moveDir.current = { x: 0, y: 0 };
      lookVec.current = { x: 0, y: 0 };
      mouseDelta.current = { x: 0, y: 0 };
      drag.active = false;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") resetInput();
    };
    window.addEventListener("blur", resetInput);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("blur", resetInput);
      document.removeEventListener("visibilitychange", onVisibility);
      moveStickRef.current?.destroy();
      lookStickRef.current?.destroy();
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, gl]);

  useFrame((_, rawDelta) => {
    if (!enabled) {
      mouseDelta.current = { x: 0, y: 0 };
      return;
    }
    const dt = Math.min(rawDelta, MAX_DELTA);

    // ─── 視点：右スティック（レート）＋ PCマウスドラッグ（差分） ───
    let yawDelta = 0;
    let pitchDelta = 0;

    if (lookVec.current.x !== 0 || lookVec.current.y !== 0) {
      yawDelta += lookVec.current.x * LOOK_RATE * dt;
      pitchDelta += lookVec.current.y * LOOK_RATE * dt; // スティック上倒し = 上を向く
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
      if (!reported.current.look && onActivity) {
        reported.current.look = true;
        onActivity("look");
      }
    }

    // ─── 移動：左スティック / WASD ───
    const { x: mx, y: my } = moveDir.current;
    if (mx !== 0 || my !== 0) {
      forward.set(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
      right.set(Math.cos(camera.rotation.y), 0, -Math.sin(camera.rotation.y));
      camera.position.addScaledVector(forward, my * MOVE_SPEED * dt);
      camera.position.addScaledVector(right, mx * MOVE_SPEED * dt);
      camera.position.y = PLAYER_HEIGHT;
      if (!reported.current.move && onActivity) {
        reported.current.move = true;
        onActivity("move");
      }

      camera.position.x = Math.max(-LIMIT_X, Math.min(LIMIT_X, camera.position.x));
      camera.position.z = Math.max(-LIMIT_Z, Math.min(LIMIT_Z, camera.position.z));
    }
  });

  return null;
}
