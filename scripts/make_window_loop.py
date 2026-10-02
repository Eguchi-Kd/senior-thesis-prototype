"""
3Dルームの窓に流すループ映像（レース越しのやわらかい景色）を生成する。
出力: public/textures/window_loop.mp4（H.264・音声なし）と window_loop.jpg（再生できない時の静止画）
  python scripts/make_window_loop.py
必要: numpy, scipy, pillow, imageio-ffmpeg（ffmpeg 同梱）

研究上の注意：このゲームは部屋とスマホの食い違いを探すため、窓から時刻・季節・天気が
読み取れないようにする（太陽・夕焼け・夜空・雨・建物・文字は描かない）。
継ぎ目なくループさせるため、動きはすべてループの長さ LOOP_SEC を周期にする。
"""

import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

W, H = 480, 416          # 窓の縦横比 1.16:1
FPS, LOOP_SEC = 24, 12
N = FPS * LOOP_SEC
OUT = Path(__file__).resolve().parent.parent / "public" / "textures"
rng = np.random.default_rng(20261002)  # 毎回同じ映像になるよう固定


def sky():
    """淡い青灰色→暖かいクリーム色の縦グラデーション"""
    top, bottom = np.array([190, 207, 219]), np.array([238, 228, 210])
    t = np.linspace(0, 1, H)[:, None, None] ** 0.9
    return np.broadcast_to(top * (1 - t) + bottom * t, (H, W, 3)).astype(np.float32)


def cloud_spectrum():
    """横方向に周期 W をもつ雲のノイズ（周波数領域で持ち、位相を回して横に流す）"""
    noise = rng.standard_normal((H, W))
    f = np.fft.fft2(noise)
    ky = np.fft.fftfreq(H)[:, None]
    kx = np.fft.fftfreq(W)[None, :]
    k = np.sqrt((kx * 1.0) ** 2 + (ky * 1.6) ** 2)  # 雲は横長
    f *= np.exp(-(k / 0.018) ** 2) + 0.35 * np.exp(-(k / 0.045) ** 2)
    return f, kx


def clouds(f, kx, t):
    """時刻 t（0〜1）の雲。1周期で W ピクセル右へずれ、t=1 で t=0 と一致する"""
    shifted = np.real(np.fft.ifft2(f * np.exp(-2j * np.pi * kx * W * t)))
    c = (shifted - shifted.mean()) / (shifted.std() + 1e-6)
    mask = np.clip((c - 0.15) * 0.55, 0, 1)                 # 雲の濃さ
    fade = np.clip(1.2 - np.linspace(0, 1, H), 0, 1)[:, None]  # 下ほど薄く
    return mask * fade


def tree_layer():
    """窓の右上から垂れる枝葉のシルエット（RGBA・ぼかす前）"""
    S = 2  # 回転時のはみ出し対策で大きめに描く
    img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px, py = W * S - 40, -20  # 枝の付け根（右上の外）
    branches = [(-300, 260), (-220, 420), (-380, 150), (-140, 330)]
    for bx, by in branches:
        ex, ey = px + bx, py + by
        d.line([(px, py), (ex, ey)], fill=(92, 104, 92, 200), width=7)
        for _ in range(26):  # 葉のかたまり
            r = rng.uniform(10, 26)
            t = rng.uniform(0.35, 1.05)
            cx = px + bx * t + rng.normal(0, 22)
            cy = py + by * t + rng.normal(0, 22)
            g = int(rng.uniform(98, 124))
            d.ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], fill=(g - 12, g, g - 14, 175))
    return img, (px, py)


def lace():
    """レースカーテンの模様（白・半透明）。ぼかさずに最前面へ重ねる"""
    a = np.zeros((H, W), np.float32)
    a[:, ::9] += 0.10   # 縦糸
    a[::9, :] += 0.10   # 横糸
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    for y in range(-24, H + 24, 52):
        for x in range(-24, W + 24, 52):
            ox = 26 if (y // 52) % 2 else 0
            cx, cy = x + ox, y
            for k in range(6):  # 小さな花
                ang = k * np.pi / 3
                dx, dy = 7 * np.cos(ang), 7 * np.sin(ang)
                d.ellipse([cx + dx - 4, cy + dy - 4, cx + dx + 4, cy + dy + 4], outline=60, width=1)
            d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=70)
    a += np.asarray(img, np.float32) / 255
    return np.clip(gaussian_filter(a, 0.5), 0, 0.45)[..., None]


def frame(i, base, f, kx, tree, pivot, lace_a):
    t = i / N
    img = base.copy()
    c = clouds(f, kx, t)[..., None]
    img = img * (1 - c) + np.array([248, 246, 240]) * c
    # 枝葉：ループ周期の sin で小さく揺らす
    ang = 2.2 * np.sin(2 * np.pi * t) + 0.8 * np.sin(4 * np.pi * t + 1.0)
    rot = tree.rotate(ang, resample=Image.BICUBIC, center=pivot)
    small = np.asarray(rot.resize((W, H), Image.LANCZOS), np.float32)
    al = small[..., 3:4] / 255
    img = img * (1 - al) + small[..., :3] * al
    # レース越しの奥行き：全体を強くぼかす
    img = gaussian_filter(img, sigma=(5, 5, 0))
    # 暖色寄りの色味（部屋の電球色に合わせる）とごく弱い明るさの揺らぎ
    img = img * np.array([1.03, 1.0, 0.95]) * (1 + 0.015 * np.sin(2 * np.pi * t))
    img = img * (1 - lace_a) + 255 * lace_a
    return np.clip(img, 0, 255).astype(np.uint8)


def main():
    import imageio_ffmpeg
    OUT.mkdir(parents=True, exist_ok=True)
    base = sky()
    f, kx = cloud_spectrum()
    tree, pivot = tree_layer()
    lace_a = lace()
    frames = [frame(i, base, f, kx, tree, pivot, lace_a) for i in range(N)]
    # 継ぎ目の確認：最後の次（= t=1）のフレームが最初と一致するか
    wrap = frame(N, base, f, kx, tree, pivot, lace_a)
    print("ループの継ぎ目（最初との差の平均）:", float(np.abs(wrap.astype(int) - frames[0].astype(int)).mean()))
    Image.fromarray(frames[0]).save(OUT / "window_loop.jpg", quality=88)
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-profile:v", "main",
           "-pix_fmt", "yuv420p", "-crf", "24", "-preset", "slow", "-movflags", "+faststart",
           "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact", str(OUT / "window_loop.mp4")]
    p = subprocess.run(cmd, input=b"".join(fr.tobytes() for fr in frames))
    if p.returncode != 0:
        sys.exit("ffmpeg の書き出しに失敗しました")
    print("saved", OUT / "window_loop.mp4", (OUT / "window_loop.mp4").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
