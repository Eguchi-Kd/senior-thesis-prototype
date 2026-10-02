"""
窓の外の都市風景（3D）を Blender で手続き的に作り、ゲーム用の GLB と空のテクスチャを書き出す。
  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" -b -P scripts/blender/make_window_city.py
出力:
  public/models/window_city.glb        … 建物・道路・駅・線路・樹木・電車1編成・車（ゲームでリアルタイム描画）
  public/textures/window_city_sky.jpg  … 空と雲（ゲーム側の円筒に貼って横に流す）
  assets_src/window_city.blend         … 編集用データ（public には置かない）

設計：
- 座標はゲーム（three.js）の座標で書く（x：室内→屋外が負、y：上、z：窓の左右）。Blender の Z-up へは to_b() で変換し、
  glTF 書き出し（+Y up）で元に戻る。窓は左壁 x=-1.8、中心 z=0.9、目の高さ 1.6。部屋は地上から約24mの高さ（GY）。
- 光は焼き込み（面ごとの明るさ＋距離による霞を頂点色に入れる）。ゲーム側は照明計算をしない材質で描き、影も使わない。
- 車・電車・葉の揺れ・雲の流れはゲーム側で時間の関数として動かす（毎フレームの位置更新とシェーダのみ）。
  車・電車の進行方向・周回距離・位相は glTF の extras（three の userData）で渡す。
- 研究上の注意：読める看板・社名・駅名・時計・広告・点滅は作らない（判定の手がかりに見えないように）。
"""

import math
import os
import random

import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_GLB = os.path.join(ROOT, "public", "models", "window_city.glb")
OUT_SKY = os.path.join(ROOT, "public", "textures", "window_city_sky.jpg")
OUT_BLEND = os.path.join(ROOT, "assets_src", "window_city.blend")

# ─── 設定（ゲーム側 components/game/WindowCity.tsx と合わせる） ─────────
SEED = 20261003
GY = -24.0              # 地面の高さ（部屋の床 y=0 から見て。約8階から見下ろす）
WALL_X = -1.8           # 窓のある壁
WIN_Z = 0.9             # 窓の中心（左右）
ROAD_D = (90.0, 102.0)   # 車道（壁からの距離。部屋の中ほどからも窓越しに見える距離）
LANES = [(93.0, 1), (99.0, -1)]   # (壁からの距離, 進行方向 +z=1 / -z=-1)
MOVE_PERIOD = 40.0      # 車・電車が1周する秒数（ゲーム側で時間の関数として動かす）
CAR_SPAN = 520.0        # 車の周回距離（40秒で1周＝13m/s。窓のそばからも見えない ±260m で折り返す）
TRACKS_D = (125.0, 133.0)  # 線路2本
TRAIN_SPAN = 720.0      # 電車の周回距離（40秒で1周＝18m/s。±360m で折り返す）
SKY_R, SKY_H, SKY_BOTTOM = 950.0, 1400.0, -120.0   # 空の円筒（ゲーム側と同じ値）

rng = random.Random(SEED)


def srgb(c):
    """sRGB の色 → 線形（glTF の頂点色は線形）"""
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


PAL = {
    "beige": (0.80, 0.75, 0.66), "grey": (0.68, 0.69, 0.70), "bluegrey": (0.58, 0.64, 0.70),
    "white": (0.86, 0.85, 0.81), "glass": (0.42, 0.50, 0.58), "brown": (0.62, 0.55, 0.48),
    "asphalt": (0.40, 0.41, 0.43), "walk": (0.72, 0.70, 0.66), "ground": (0.60, 0.62, 0.57),
    "ballast": (0.55, 0.52, 0.48), "rail": (0.45, 0.44, 0.43), "platform": (0.74, 0.72, 0.68),
    "roof": (0.70, 0.72, 0.74), "trunk": (0.42, 0.35, 0.28), "leaf": (0.40, 0.55, 0.36),
    "leaf2": (0.47, 0.60, 0.40), "park": (0.52, 0.64, 0.45), "line": (0.88, 0.88, 0.86),
}
HAZE = (0.80, 0.84, 0.87)
SUN = np.array([0.45, 0.85, 0.30]) / np.linalg.norm([0.45, 0.85, 0.30])


def to_b(p):
    x, y, z = p
    return (x, -z, y)


class Batch:
    """1つのメッシュにまとめる面の集まり（描画命令を減らすため結合する）"""

    def __init__(self, name, materials):
        self.name, self.materials = name, materials
        self.verts, self.faces, self.cols, self.uvs, self.mats = [], [], [], [], []

    def quad(self, pts, color, mat=0, uv=None, shade=True, haze=True):
        """pts：ゲーム座標の4点（反時計回り＝表）。面の明るさと霞を頂点色に焼き込む"""
        p = np.array(pts, float)
        n = np.cross(p[1] - p[0], p[2] - p[0])
        n = n / (np.linalg.norm(n) + 1e-9)
        c = np.array(srgb(color))
        if shade:
            c = c * (0.64 + 0.36 * max(0.0, float(n @ SUN)))
        if haze:
            ctr = p.mean(0)
            dist = math.hypot(ctr[0] - WALL_X, ctr[2] - WIN_Z)
            h = 0.82 * (1 - math.exp(-dist / 650.0))
            c = c * (1 - h) + np.array(srgb(HAZE)) * h
        base = len(self.verts)
        self.verts += [to_b(q) for q in pts]
        self.faces.append((base, base + 1, base + 2, base + 3))
        self.cols.append(tuple(c) + (1.0,))
        self.uvs.append(uv or [(0, 0), (1, 0), (1, 1), (0, 1)])
        self.mats.append(mat)

    def tri(self, pts, color, haze=True):
        self.quad([pts[0], pts[1], pts[2], pts[2]], color, haze=haze)

    def box(self, x0, x1, y0, y1, z0, z1, color, facade=False, top=True, roof_color=None, floor=3.5, bay=4.0):
        """直方体（底面なし）。facade=True なら側面に窓の模様（UV を階・柱間で繰り返す）"""
        w, d, h = x1 - x0, z1 - z0, y1 - y0
        sides = [  # 4つの側面（外向き）
            ([(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], d),   # +x（窓の方を向く面）
            ([(x0, y0, z1), (x0, y0, z0), (x0, y1, z0), (x0, y1, z1)], d),   # -x
            ([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], w),   # -z
            ([(x1, y0, z1), (x0, y0, z1), (x0, y1, z1), (x1, y1, z1)], w),   # +z
        ]
        for pts, width in sides:
            if facade:
                u, v = max(1, round(width / bay)), max(1, round(h / floor))
                self.quad(pts, color, mat=0, uv=[(0, 0), (u, 0), (u, v), (0, v)])
            else:
                self.quad(pts, color, mat=1)
        if top:
            self.quad([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], roof_color or color, mat=1)

    def flat(self, x0, x1, z0, z1, y, color, mat=1, haze=True):
        self.quad([(x0, y, z1), (x1, y, z1), (x1, y, z0), (x0, y, z0)], color, mat=mat, haze=haze)

    def build(self):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.verts, [], self.faces)
        me.update()
        # 層を追加するとそれ以前に取得した層への参照が無効になるため、両方作ってから名前で取り直す
        me.uv_layers.new(name="UVMap")
        me.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="CORNER")
        uv, col = me.uv_layers["UVMap"], me.color_attributes["Col"]
        # 面は4頂点ずつ順に作っているので、ループの並びは面の順・頂点の順と一致する
        uv.data.foreach_set("uv", np.array(self.uvs, np.float32).ravel())
        col.data.foreach_set("color", np.repeat(np.array(self.cols, np.float32), 4, axis=0).ravel())
        me.polygons.foreach_set("material_index", np.minimum(self.mats, len(self.materials) - 1).astype(np.int32))
        me.color_attributes.active_color = col
        ob = bpy.data.objects.new(self.name, me)
        for m in self.materials:
            ob.data.materials.append(m)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def material(name, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    if image is not None:
        tex = m.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        ca = m.node_tree.nodes.new("ShaderNodeVertexColor")
        ca.layer_name = "Col"
        m.node_tree.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def facade_image():
    """窓の模様（白い壁に青灰色の窓）。1枚＝1階×1柱間"""
    S = 64
    a = np.ones((S, S, 4), np.float32)
    y0, y1, x0, x1 = int(S * 0.30), int(S * 0.82), int(S * 0.14), int(S * 0.86)
    a[y0:y1, x0:x1, :3] = (0.56, 0.62, 0.68)
    a[y1 - 3:y1, x0:x1, :3] = (0.70, 0.75, 0.80)   # 窓上部の映り込み
    a[int(S * 0.20):y0, :, :3] = 0.93               # 階の帯
    img = bpy.data.images.new("facade", S, S, alpha=False)
    img.pixels.foreach_set(a.ravel())
    img.pack()
    return img


def sky_image():
    """空と雲（横方向に継ぎ目なく繰り返す）。行ごとの仰角で色を決める（円筒の寸法はゲーム側と同じ）"""
    W, H = 1024, 256   # GPU のメモリを抑える（2048×512 と見た目の差は小さい）
    v = (np.arange(H) + 0.5) / H                          # 下→上
    y = SKY_BOTTOM + v * SKY_H
    elev = np.degrees(np.arctan2(y - 1.6, SKY_R))
    t = np.clip((elev + 2) / 40, 0, 1)[:, None]
    horizon, zenith = np.array([0.86, 0.88, 0.88]), np.array([0.60, 0.72, 0.83])
    base = horizon * (1 - t[..., None]) + zenith * t[..., None]
    base = np.broadcast_to(base, (H, W, 3)).copy()
    r = np.random.default_rng(SEED)
    f = np.fft.fft2(r.standard_normal((H, W)))
    ky, kx = np.fft.fftfreq(H)[:, None], np.fft.fftfreq(W)[None, :]
    k = np.sqrt((kx * 3.0) ** 2 + ky ** 2)
    f *= np.exp(-(k / 0.02) ** 2) + 0.15 * np.exp(-(k / 0.06) ** 2)
    c = np.real(np.fft.ifft2(f))
    c = (c - c.mean()) / c.std()
    band = np.clip((elev[:, None] - 0.5) / 3, 0, 1) * np.clip((45 - elev[:, None]) / 15, 0, 1)  # 窓から見える低い空にも雲
    cloud = (np.clip((c - 0.2) * 0.75, 0, 0.85) * band)[..., None]
    img = base * (1 - cloud) + np.array([0.97, 0.96, 0.94]) * cloud
    rgba = np.concatenate([img, np.ones((H, W, 1))], -1).astype(np.float32)
    im = bpy.data.images.new("sky", W, H, alpha=False)
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = OUT_SKY
    im.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 85
    im.save()


def icosphere(b, cx, cy, cz, rx, ry, color):
    """葉のかたまり（低ポリゴンの球）"""
    t = (1 + 5 ** 0.5) / 2
    vs = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
          (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    fs = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
          (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
          (8, 6, 7), (9, 8, 1)]
    nrm = math.sqrt(1 + t * t)
    p = [(cx + vx / nrm * rx, cy + vy / nrm * ry, cz + vz / nrm * rx) for vx, vy, vz in vs]
    for a, bb, c in fs:
        b.tri([p[a], p[c], p[bb]], color)


def tree(static, foliage, x, z, size):
    h = 2.2 * size
    static.box(x - 0.18, x + 0.18, GY, GY + h, z - 0.18, z + 0.18, PAL["trunk"], top=False)
    col = PAL["leaf"] if rng.random() < 0.6 else PAL["leaf2"]
    icosphere(foliage, x, GY + h + 1.6 * size, z, 2.2 * size, 1.9 * size, col)


def city(static, foliage):
    X = lambda d: WALL_X - d       # 壁からの距離 → x
    Z = lambda s: WIN_Z + s        # 窓の中心からの左右 → z
    # 地面・歩道・車道・白線
    static.flat(X(1500), X(2), Z(-1500), Z(1500), GY - 0.05, PAL["ground"])
    static.flat(X(ROAD_D[1] + 2), X(ROAD_D[1]), Z(-600), Z(600), GY + 0.02, PAL["walk"])
    static.flat(X(ROAD_D[0]), X(ROAD_D[0] - 2), Z(-600), Z(600), GY + 0.02, PAL["walk"])
    static.flat(X(ROAD_D[1]), X(ROAD_D[0]), Z(-600), Z(600), GY + 0.01, PAL["asphalt"])
    mid = sum(ROAD_D) / 2
    for s in range(-300, 300, 12):
        static.flat(X(mid + 0.12), X(mid - 0.12), Z(s), Z(s + 6), GY + 0.03, PAL["line"])
    # 小公園と植栽
    static.flat(X(118), X(105), Z(-150), Z(-70), GY + 0.02, PAL["park"])
    for _ in range(9):
        tree(static, foliage, X(rng.uniform(106, 117)), Z(rng.uniform(-145, -75)), rng.uniform(1.2, 1.7))
    for d in (ROAD_D[0] - 2.5, ROAD_D[1] + 2.5):   # 街路樹
        for s in range(-160, 170, 17):
            if rng.random() < 0.85:
                tree(static, foliage, X(d), Z(s + rng.uniform(-2, 2)), rng.uniform(0.9, 1.25))
    # 線路と駅（屋根付きの島式ホーム）
    static.flat(X(TRACKS_D[1] + 4), X(TRACKS_D[0] - 4), Z(-700), Z(700), GY + 0.03, PAL["ballast"])
    for d in TRACKS_D:
        for off in (-0.75, 0.75):
            static.box(X(d + off + 0.08), X(d + off - 0.08), GY + 0.03, GY + 0.25, Z(-700), Z(700), PAL["rail"])
    pd0, pd1 = TRACKS_D[0] + 2.2, TRACKS_D[1] - 2.2
    static.box(X(pd1), X(pd0), GY, GY + 1.1, Z(-48), Z(48), PAL["platform"])
    for s in range(-40, 41, 10):
        pm = (pd0 + pd1) / 2
        static.box(X(pm + 0.12), X(pm - 0.12), GY + 1.1, GY + 5.0, Z(s - 0.12), Z(s + 0.12), PAL["grey"], top=False)
    static.box(X(pd1 + 0.4), X(pd0 - 0.4), GY + 5.0, GY + 5.4, Z(-44), Z(44), PAL["roof"])
    static.box(X(TRACKS_D[1] + 6), X(TRACKS_D[0] - 6), GY + 6.2, GY + 8.6, Z(14), Z(18), PAL["white"], facade=True, roof_color=PAL["roof"])  # 跨線橋
    for dd in (TRACKS_D[0] - 6, TRACKS_D[1] + 6):
        static.box(X(dd + 2), X(dd - 2), GY, GY + 8.6, Z(13), Z(19), PAL["grey"], roof_color=PAL["roof"])  # 階段塔
    static.box(X(TRACKS_D[1] + 14), X(TRACKS_D[1] + 6), GY, GY + 7, Z(52), Z(74), PAL["beige"], facade=True, roof_color=PAL["roof"])  # 駅舎
    # 建物：中景（駅の奥）→ 遠景（霞む）。中央の駅の手前には建てない
    def building(d, s, w, dep, h, color):
        x0, x1 = X(d + dep), X(d)
        z0, z1 = Z(s - w / 2), Z(s + w / 2)
        roof = tuple(v * 0.92 for v in color)
        static.box(x0, x1, GY, GY + h, z0, z1, color, facade=True, roof_color=roof)
        if h > 25 and rng.random() < 0.55:   # 屋上の段差
            sh = rng.uniform(3, 9)
            static.box(x0 + dep * 0.2, x1 - dep * 0.2, GY + h, GY + h + sh, z0 + w * 0.2, z1 - w * 0.2,
                       PAL["grey"], roof_color=PAL["roof"])
    colors = ["beige", "grey", "bluegrey", "white", "brown", "glass"]
    for d0, d1, step, hmin, hmax in [(160, 300, 30, 8, 36), (300, 600, 46, 16, 65), (600, 850, 55, 15, 60)]:
        d = d0
        while d < d1:
            s = -420.0 + rng.uniform(0, step)
            while s < 420:
                w, dep = rng.uniform(14, 30), rng.uniform(14, 28)
                h = rng.uniform(hmin, hmax)
                if d < 300 and abs(s) < 70:
                    h = min(h, rng.uniform(8, 20))  # 窓の正面の中景は低め（駅・電車を隠さない）
                if rng.random() < 0.06 and d > 330:
                    h = rng.uniform(80, 120)         # 高層タワー（空が見えるよう少なめ）
                building(d + rng.uniform(-4, 4), s, w, dep, h, PAL[rng.choice(colors)])
                s += w + rng.uniform(8, step * 0.6)
            d += step
    for _ in range(18):   # 左右の中層（窓の端・近づいた時に見える）
        s_side = rng.choice([-1, 1]) * rng.uniform(60, 220)
        building(rng.uniform(30, 75), s_side, rng.uniform(14, 26), rng.uniform(12, 20), rng.uniform(8, 22),
                 PAL[rng.choice(colors)])
    d = 30.0
    while d < 80:   # 中央手前の低い家並み（窓のそばから道路への見通しを遮らない高さに抑える）
        s = -70.0
        while s < 70:
            w, dep = rng.uniform(8, 14), rng.uniform(8, 12)
            cap = (1.6 - (1.6 - GY) * (d + dep) / ROAD_D[0]) - GY - 0.5
            if cap > 2.5:
                building(d, s + w / 2, w, dep, rng.uniform(2.5, min(cap, 7.0)), PAL[rng.choice(["beige", "white", "grey", "brown"])])
            s += w + rng.uniform(3, 7)
        d += rng.uniform(13, 17)
    # 山並み（遠景の稜線）
    ridge = [(s, 35 + 40 * math.sin(s / 140) + 25 * math.sin(s / 61 + 1.3)) for s in range(-1100, 1101, 50)]
    for (s0, h0), (s1, h1) in zip(ridge, ridge[1:]):
        static.quad([(X(880), GY, Z(s0)), (X(880), GY, Z(s1)), (X(880), GY + h1, Z(s1)), (X(880), GY + h0, Z(s0))],
                    (0.60, 0.67, 0.72), shade=False)


def train(mats):
    """電車1編成（4両）。原点は編成の中央、+z 方向に進む"""
    b = Batch("Train", mats)
    n, L, gap = 4, 19.5, 0.8
    total = n * L + (n - 1) * gap
    x0, x1 = -1.45, 1.45
    for i in range(n):
        z0 = -total / 2 + i * (L + gap)
        z1 = z0 + L
        b.box(x0, x1, 0.5, 3.9, z0, z1, (0.84, 0.85, 0.86), roof_color=(0.70, 0.71, 0.73))
        for side in (1, -1):   # 窓の帯と色の帯（側面に少し浮かせる）
            xs = x1 + 0.02 if side == 1 else x0 - 0.02
            for (ya, yb, c) in [(2.2, 3.2, (0.24, 0.29, 0.34)), (1.15, 1.95, (0.22, 0.48, 0.62))]:  # 窓の帯と太い色帯（ホームの屋根と見分けやすく）
                pts = [(xs, ya, z0 + 0.6), (xs, ya, z1 - 0.6), (xs, yb, z1 - 0.6), (xs, yb, z0 + 0.6)]
                if side == -1:
                    pts = pts[::-1]
                b.quad(pts, c)
    ob = b.build()
    ob["kind"], ob["span"], ob["dir"], ob["phase"], ob["period"] = "train", TRAIN_SPAN, 1, 0.0, MOVE_PERIOD
    ob.location = to_b((WALL_X - TRACKS_D[0], GY + 0.25, 0.0))
    return ob


def cars(mats):
    tones = [(0.86, 0.86, 0.84), (0.70, 0.72, 0.74), (0.38, 0.43, 0.50), (0.78, 0.72, 0.60), (0.62, 0.36, 0.33),
             (0.30, 0.32, 0.34)]
    phases = [0.03, 0.37, 0.71, 0.18, 0.52, 0.86]
    out = []
    for i, ph in enumerate(phases):
        lane_d, direction = LANES[i % 2]
        b = Batch(f"Car{i}", mats)
        c = tones[i]
        b.box(-0.9, 0.9, 0.25, 1.05, -2.15, 2.15, c)
        b.box(-0.8, 0.8, 1.05, 1.6, -1.1, 0.9, (0.36, 0.40, 0.45), roof_color=c)
        ob = b.build()
        ob["kind"], ob["span"], ob["dir"], ob["phase"], ob["period"] = "car", CAR_SPAN, direction, ph, MOVE_PERIOD
        ob.location = to_b((WALL_X - lane_d, GY, 0.0))
        out.append(ob)
    return out


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fac = material("Facade", facade_image())
    plain = material("Plain")
    leafm = material("Foliage")
    static = Batch("CityStatic", [fac, plain])
    foliage = Batch("Foliage", [leafm])
    city(static, foliage)
    static.build()
    foliage.build()
    train([plain])
    cars([plain])
    sky_image()
    os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    kw = dict(filepath=OUT_GLB, export_format="GLB", export_yup=True, export_extras=True, export_apply=True,
              export_cameras=False, export_lights=False, export_animations=False)
    try:
        bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**kw, export_colors=True)
    tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH") * 2
    print(f"書き出し完了: {OUT_GLB} ({os.path.getsize(OUT_GLB) // 1024} KB), 三角形 約{tris}, "
          f"オブジェクト {len(bpy.data.objects)}")


main()
