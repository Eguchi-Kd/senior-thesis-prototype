"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import nipplejs from "nipplejs";
import { lookControl, getSensitivity, SENSITIVITY_RAD } from "@/lib/lookControl";

// 速度は「秒あたり」で定義し、経過時間(delta)を掛けて端末のFPS差をなくす
const MOVE_SPEED = 3.0;          // m/秒
const MOUSE_SENSITIVITY = 0.003; // PC: ドラッグ量(px)あたりの回転量
const PITCH_RATIO = 0.6;         // スワイプの上下は左右より控えめに（上下に振れすぎて迷わないように）
const TAP_SLOP_PX = 8;           // これ未満の指の移動はタップ（物を調べる）とみなす
const RECENTER_SEC = 0.3;        // 「正面に戻す」にかける時間
const PLAYER_HEIGHT = 1.6;
const START_POS = new THREE.Vector3(0, PLAYER_HEIGHT, 2.3); // 入口側からデスクを正面に見る
const PITCH_LIMIT = Math.PI / 4; // 上下視点の可動域 ±45°
const MAX_DELTA = 0.1;           // タブ復帰直後などの大きな飛びを防ぐ
const LIMIT_X = 1.5;             // 部屋の内寸に合わせた移動境界（壁抜け防止）
const LIMIT_Z = 2.3;
const LOOK_ACTIVITY_RAD = 0.5;   // 練習の「見回す」を達成とみなす回転量（約30°）
const MOVE_ACTIVITY_M = 0.8;     // 練習の「進む」を達成とみなす移動距離

const forward = new THREE.Vector3();
const right = new THREE.Vector3();

// 角度を -π〜π に正規化（正面へ戻すとき最短方向に回すため）
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// enabled=false（調査パネル・判定画面などを開いている間）は入力を捨てて移動・旋回しない
// resetKey：値が変わったら位置と向きを初期値に戻す（本編の各問の開始で使う）
// onActivity：見回す・進む・正面に戻す を初めて一定量行ったときに通知（操作練習の段階の判定用）
export function FPSControls({
  enabled = true,
  resetKey,
  onActivity,
}: {
  enabled?: boolean;
  resetKey?: string | number;
  onActivity?: (kind: "move" | "look" | "recenter") => void;
}) {
  const { camera, gl } = useThree();
  const moveDir = useRef({ x: 0, y: 0 });      // 左スティック / WASD（保持）
  const lookDelta = useRef({ x: 0, y: 0 });    // スワイプ・マウスドラッグの移動量（px、毎フレーム消費）
  const pitchRef = useRef(0);
  const yawRef = useRef(0);
  const recenter = useRef<{ fromYaw: number; fromPitch: number; t: number } | null>(null);
  const progress = useRef({ look: 0, move: 0, reported: { move: false, look: false } });
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  // 位置と向きを初期値へ（初回と resetKey の変化時）
  useEffect(() => {
    camera.position.copy(START_POS);
    camera.rotation.order = "YXZ";
    yawRef.current = 0;
    pitchRef.current = 0;
    camera.rotation.set(0, 0, 0);
    moveDir.current = { x: 0, y: 0 };
    lookDelta.current = { x: 0, y: 0 };
    recenter.current = null;
  }, [camera, resetKey]);

  useEffect(() => {
    getSensitivity();

    // ─── 左：移動ジョイスティック（親指が届く高さの小さな領域だけ。ラベルを覆わない） ───
    let moveStick: ReturnType<typeof nipplejs.create> | null = null;
    const moveZone = document.getElementById("joystick-zone");
    if (moveZone) {
      moveStick = nipplejs.create({
        zone: moveZone,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "rgba(255,255,255,0.55)",
        size: 120,
      });
      moveStick.on("move", (evt) => {
        const { vector } = evt.data;
        moveDir.current = { x: vector.x, y: vector.y };
      });
      moveStick.on("end", () => {
        moveDir.current = { x: 0, y: 0 };
      });
    }

    // ─── 視点：3D画面をなぞる（タッチ）・ドラッグする（マウス） ───
    // ジョイスティックやボタン（DOM）の上で始まった指はここに来ないので、移動しながら見回せる
    const dom = gl.domElement;
    dom.style.touchAction = "none";
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean }>();
    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) >= TAP_SLOP_PX) p.moved = true;
      if (p.moved) {
        lookDelta.current.x += e.clientX - p.x;
        lookDelta.current.y += e.clientY - p.y;
      }
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (p?.moved) lookControl.lastSwipeEndAt = performance.now();
      pointers.delete(e.pointerId);
    };
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

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
      lookDelta.current = { x: 0, y: 0 };
      pointers.clear();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") resetInput();
    };
    window.addEventListener("blur", resetInput);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("blur", resetInput);
      document.removeEventListener("visibilitychange", onVisibility);
      moveStick?.destroy();
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, gl]);

  useFrame((_, rawDelta) => {
    if (!enabled) {
      lookDelta.current = { x: 0, y: 0 };
      lookControl.recenterRequested = false;
      return;
    }
    const dt = Math.min(rawDelta, MAX_DELTA);

    // ─── 正面に戻す（0.3秒で机の方向・水平へ） ───
    if (lookControl.recenterRequested) {
      lookControl.recenterRequested = false;
      recenter.current = { fromYaw: wrapAngle(yawRef.current), fromPitch: pitchRef.current, t: 0 };
      onActivityRef.current?.("recenter");
    }
    if (recenter.current) {
      const r = recenter.current;
      r.t = Math.min(1, r.t + dt / RECENTER_SEC);
      const k = 1 - (1 - r.t) * (1 - r.t); // ゆっくり止まる
      yawRef.current = r.fromYaw * (1 - k);
      pitchRef.current = r.fromPitch * (1 - k);
      if (r.t >= 1) recenter.current = null;
      lookDelta.current = { x: 0, y: 0 };
    }

    // ─── 視点：なぞった量に比例して回す（画面の横幅いっぱい＝感度の角度） ───
    const { x: dx, y: dy } = lookDelta.current;
    if (dx !== 0 || dy !== 0) {
      const radPerPx = SENSITIVITY_RAD[getSensitivity()] / Math.max(320, window.innerWidth);
      const isMouse = window.matchMedia?.("(pointer: fine)").matches;
      const yawD = isMouse ? dx * MOUSE_SENSITIVITY : dx * radPerPx;
      const pitchD = isMouse ? dy * MOUSE_SENSITIVITY : dy * radPerPx * PITCH_RATIO;
      yawRef.current -= yawD;                                  // 右へなぞる＝右を向く
      pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current - pitchD)); // 上へなぞる＝上を向く
      lookDelta.current = { x: 0, y: 0 };
      recenter.current = null;
      progress.current.look += Math.abs(yawD) + Math.abs(pitchD);
      if (!progress.current.reported.look && progress.current.look >= LOOK_ACTIVITY_RAD) {
        progress.current.reported.look = true;
        onActivityRef.current?.("look");
      }
    }
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;

    // ─── 移動：左スティック / WASD ───
    const { x: mx, y: my } = moveDir.current;
    if (mx !== 0 || my !== 0) {
      forward.set(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
      right.set(Math.cos(camera.rotation.y), 0, -Math.sin(camera.rotation.y));
      const before = camera.position.clone();
      camera.position.addScaledVector(forward, my * MOVE_SPEED * dt);
      camera.position.addScaledVector(right, mx * MOVE_SPEED * dt);
      camera.position.y = PLAYER_HEIGHT;
      camera.position.x = Math.max(-LIMIT_X, Math.min(LIMIT_X, camera.position.x));
      camera.position.z = Math.max(-LIMIT_Z, Math.min(LIMIT_Z, camera.position.z));
      progress.current.move += before.distanceTo(camera.position);
      if (!progress.current.reported.move && progress.current.move >= MOVE_ACTIVITY_M) {
        progress.current.reported.move = true;
        onActivityRef.current?.("move");
      }
    }
  });

  return null;
}
