"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CARDS, TOTAL_CARDS } from "@/lib/cards";
import { loadCollection } from "@/lib/collection";

// 学習カードのコレクション（この端末に保存された入手状況）
export default function CollectionClient() {
  const [owned, setOwned] = useState<string[]>([]);
  // 結果画面から来たときは、一番下のボタンで結果画面へ戻す（タイトルから来たときはタイトルへ）
  const [fromResult, setFromResult] = useState(false);
  useEffect(() => {
    setOwned(loadCollection());
    setFromResult(new URLSearchParams(window.location.search).get("from") === "result");
  }, []);

  const count = CARDS.filter((c) => owned.includes(c.id)).length;
  const groups = [
    { title: "シナリオカード", cards: CARDS.filter((c) => c.kind === "scenario") },
    { title: "タイプカード", cards: CARDS.filter((c) => c.kind === "type") },
  ];

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black text-center mb-1">📇 学習カード コレクション</h1>
        <p className="text-center text-gray-400 text-sm mb-3">
          収集率 <span className="text-white font-black">{count} / {TOTAL_CARDS}</span>
        </p>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400" style={{ width: `${(count / TOTAL_CARDS) * 100}%` }} />
        </div>

        {groups.map((g) => (
          <div key={g.title} className="mb-6">
            <p className="text-gray-400 text-xs font-bold mb-2 tracking-wide">{g.title}</p>
            <div className="space-y-3">
              {g.cards.map((c, i) => {
                const has = owned.includes(c.id);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl p-4 ${
                      has ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg" : "bg-gray-900 border border-dashed border-gray-700 text-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{has ? c.emoji : "❓"}</span>
                      <span className="font-bold text-sm">{has ? c.title : "？？？"}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{has ? c.body : `入手方法：${c.howToGet}`}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-center text-gray-500 text-[11px] mb-4">カードはこの端末のブラウザに保存されます。</p>
        <Link href={fromResult ? "/result" : "/"} className="block w-full py-4 text-center bg-blue-600 text-white text-lg font-black rounded-2xl">
          {fromResult ? "結果画面に戻る" : "タイトルへ戻る"}
        </Link>
      </div>
    </div>
  );
}
