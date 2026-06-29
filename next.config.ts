import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/senior-thesis-prototype",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
