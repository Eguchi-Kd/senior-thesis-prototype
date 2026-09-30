"use client";

import dynamic from "next/dynamic";

// 入手状況は localStorage にあるためクライアントのみで描画
const CollectionClient = dynamic(() => import("./CollectionClient"), { ssr: false });

export default function CollectionPage() {
  return <CollectionClient />;
}
