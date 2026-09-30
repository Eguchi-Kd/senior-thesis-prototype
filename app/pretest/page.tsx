"use client";

import dynamic from "next/dynamic";

// セッション状態（出題フォーム・回答済み）に依存するためクライアントのみで描画
const PretestClient = dynamic(() => import("./PretestClient"), { ssr: false });

export default function PretestPage() {
  return <PretestClient />;
}
