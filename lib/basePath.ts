// GitHub Pages のサブパス配信に対応するための basePath 単一情報源。
// next.config.ts と、public/ 配下の静的アセット参照（GLB等）の両方で使う。
// ※ これを付けないと本番（https://eguchi-kd.github.io/senior-thesis-prototype/）で 404 になる。
// 配信先ごとにビルド時の環境変数で切り替える（配信専用リポジトリ scam-detective 向けは "/scam-detective"）。
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/senior-thesis-prototype";

// 例: asset("/models/room.glb") -> "/senior-thesis-prototype/models/room.glb"
export const asset = (p: string) => `${BASE_PATH}${p.startsWith("/") ? p : "/" + p}`;
