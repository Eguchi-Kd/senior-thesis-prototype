import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Next 15 の eslint-config-next は旧形式（eslintrc）のため FlatCompat 経由で読み込む
const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "orchestrator/**", "analysis/**", "scripts/**"],
  },
];

export default eslintConfig;
