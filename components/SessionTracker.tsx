"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { saveSnapshot } from "@/lib/logger";

// 全ページ共通：画面の非表示/再表示を記録し、非表示になった時点の状態を保存する（途中離脱の備え）
export function SessionTracker() {
  useEffect(() => {
    const onVisibility = () => {
      const { markHidden, markVisible } = useGameStore.getState();
      if (document.visibilityState === "hidden") {
        markHidden();
        void saveSnapshot();
      } else {
        markVisible();
      }
    };
    const onPageHide = () => {
      useGameStore.getState().markHidden();
      void saveSnapshot();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
  return null;
}
