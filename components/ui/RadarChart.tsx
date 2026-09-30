"use client";

import { motion } from "framer-motion";

// 依存ライブラリなしのSVGレーダーチャート（値は 0〜1）
export function RadarChart({ axes, size = 170 }: { axes: { label: string; value: number }[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 30; // ラベル用の余白
  const n = axes.length;
  const point = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (v: (i: number) => number) => axes.map((_, i) => point(i, v(i)).join(",")).join(" ");
  const clamp = (x: number) => Math.max(0.04, Math.min(1, x)); // 0でも形が見えるように最小値

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="回答の傾向">
      {[1 / 3, 2 / 3, 1].map((lv) => (
        <polygon key={lv} points={poly(() => lv)} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
      })}
      <motion.polygon
        points={poly((i) => clamp(axes[i].value))}
        fill="rgba(251,191,36,0.45)"
        stroke="#fbbf24"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />
      {axes.map((ax, i) => {
        const [x, y] = point(i, 1.28);
        return (
          <text key={ax.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10} fontWeight={700}>
            <tspan x={x} dy="-0.35em">{ax.label}</tspan>
            <tspan x={x} dy="1.2em" fill="rgba(255,255,255,0.7)" fontWeight={400}>{Math.round(ax.value * 100)}%</tspan>
          </text>
        );
      })}
    </svg>
  );
}
