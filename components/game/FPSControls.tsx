"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import nipplejs from "nipplejs";

const MOVE_SPEED = 0.05;
const LOOK_SPEED = 0.003;
const PLAYER_HEIGHT = 1.7;

export function FPSControls() {
  const { camera } = useThree();
  const moveDir = useRef({ x: 0, y: 0 });
  const lookDelta = useRef({ x: 0, y: 0 });
  const pitchRef = useRef(0);
  const joystickRef = useRef<ReturnType<typeof nipplejs.create> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 2);
    camera.rotation.order = "YXZ";

    const leftZone = document.getElementById("joystick-zone");
    if (!leftZone) return;

    joystickRef.current = nipplejs.create({
      zone: leftZone,
      mode: "dynamic",
      color: "rgba(255,255,255,0.4)",
    });

    joystickRef.current.on("move", (evt) => {
      const { vector } = evt.data;
      moveDir.current = { x: vector.x, y: vector.y };
    });

    joystickRef.current.on("end", () => {
      moveDir.current = { x: 0, y: 0 };
    });

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX < window.innerWidth / 2) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = Array.from(e.touches).find((t) => t.clientX > window.innerWidth / 2);
      if (!touch) return;
      lookDelta.current = {
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
      lookDelta.current = { x: 0, y: 0 };
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

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
      joystickRef.current?.destroy();
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera]);

  useFrame(() => {
    const { x: dx, y: dy } = lookDelta.current;
    if (dx !== 0 || dy !== 0) {
      camera.rotation.y -= dx * LOOK_SPEED;
      pitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitchRef.current - dy * LOOK_SPEED));
      camera.rotation.x = pitchRef.current;
      lookDelta.current = { x: 0, y: 0 };
    }

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
