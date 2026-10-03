"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const MORE_PX = 12; // 最下部までこれ以上残っていれば「続きがある」とみなす

// 中身の大きさが変わった（画像の読み込み・開閉など）ときにも判定し直す
function useOverflow(getEl: () => HTMLElement | null, target: "element" | "page") {
  const [more, setMore] = useState(false);
  const update = useCallback(() => {
    if (target === "page") {
      const d = document.documentElement;
      setMore(d.scrollHeight - window.scrollY - window.innerHeight > MORE_PX);
      return;
    }
    const el = getEl();
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > MORE_PX);
  }, [getEl, target]);

  useEffect(() => {
    const el = target === "page" ? document.body : getEl();
    if (!el) return;
    update();
    const scroller: HTMLElement | Window = target === "page" ? window : el;
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [getEl, target, update]);
  return more;
}

function Badge({ dark }: { dark?: boolean }) {
  return (
    <span
      className={`animate-bounce rounded-full px-3 py-1 text-sm font-bold shadow-lg ${
        dark ? "bg-gray-800/95 text-white" : "bg-blue-600 text-white"
      }`}
    >
      ▼ 下にスクロール
    </span>
  );
}

// 枠の中でスクロールするパネル。中身があふれていて最下部まで見ていない間だけ、下端に合図を出す
export const ScrollPanel = forwardRef<HTMLDivElement, { className?: string; children: ReactNode; fade?: string }>(
  function ScrollPanel({ className = "", children, fade = "from-white" }, forwarded) {
    const inner = useRef<HTMLDivElement | null>(null);
    const getEl = useCallback(() => inner.current, []);
    const more = useOverflow(getEl, "element");
    return (
      <div
        ref={(el) => {
          inner.current = el;
          if (typeof forwarded === "function") forwarded(el);
          else if (forwarded) forwarded.current = el;
        }}
        className={`${className} overflow-y-auto scroll-contain`}
      >
        {children}
        {/* 見えている範囲の下端に張り付く合図（操作の邪魔をしない） */}
        <div
          aria-hidden
          className={`sticky bottom-0 -mt-14 flex h-14 items-end justify-center bg-gradient-to-t ${fade} to-transparent pb-1 pointer-events-none transition-opacity ${
            more ? "opacity-100" : "opacity-0"
          }`}
        >
          <Badge />
        </div>
      </div>
    );
  },
);

// ページ全体が縦に長い画面用：画面の下に固定して出す
export function PageScrollHint() {
  const getEl = useCallback(() => document.body, []);
  const more = useOverflow(getEl, "page");
  if (!more) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-3 z-[70] flex justify-center">
      <Badge dark />
    </div>
  );
}
