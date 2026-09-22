// GitHub Pages のサブパス配信に対応するための basePath 単一情報源。
// next.config.ts と、public/ 配下の静的アセット参照（GLB等）の両方で使う。
// ※ これを付けないと本番（https://eguchi-kd.github.io/senior-thesis-prototype/）で 404 になる。
export const BASE_PATH = "/senior-thesis-prototype";

// 例: asset("/models/room.glb") -> "/senior-thesis-prototype/models/room.glb"
export const asset = (p: string) => `${BASE_PATH}${p.startsWith("/") ? p : "/" + p}`;
