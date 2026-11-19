"""Build the relightable villa scene for the hero panel (prototype media).

From assets/Vila-big-background.webp (a dusk photo with its lights on) this makes:
  villa-night.webp      the square crop with every artificial light switched off
  villa-light-int.webp  interior light (three windows), blended with `screen`
  villa-light-ext.webp  exterior light (wall sconce, porch, garden lights), `screen`
`screen`-ing the two light layers over the night base at full opacity gives back the
original photo (the layers are the exact screen-inverse), so a scene is just three
opacities plus the shutters, which the page draws itself.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = 'C:/Users/mlolo/claude/abdo7085.github.io/assets/Vila-big-background.webp'
OUT = sys.argv[1]
PREVIEW = sys.argv[2]

full = Image.open(SRC).convert('RGB')
F = np.asarray(full).astype(np.float32) / 255.0
X0, Y0, S = 500, 330, 920          # the screen shows this square of the photo
o = F[Y0:Y0 + S, X0:X0 + S].copy()


def m_poly(points, feather):
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).polygon([(x - X0, y - Y0) for x, y in points], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(m).astype(np.float32)[..., None] / 255.0


def m_rect(x1, y1, x2, y2, feather):
    return m_poly([(x1, y1), (x2, y1), (x2, y2), (x1, y2)], feather)


def blur(a, r):
    out = np.zeros_like(a)
    for c in range(3):
        ch = Image.fromarray(np.clip(a[..., c] * 255, 0, 255).astype(np.uint8))
        out[..., c] = np.asarray(ch.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
    return out


def gray(a):
    return (a[..., :1] * 0.299 + a[..., 1:2] * 0.587 + a[..., 2:3] * 0.114)


u = o.copy()

# ── 1. Windows: lit interiors → dark night glass (keeps a faint hint of the room) ──
WINDOWS = {  # glass rectangles measured on the photo (full-image pixels)
    'A1': (906, 402, 1005, 483), 'A2': (908, 490, 1004, 573),
    'B': (1163, 494, 1243, 662), 'C': (1163, 903, 1242, 983),
}
win_mask = np.zeros((S, S, 1), np.float32)
for (x1, y1, x2, y2) in WINDOWS.values():
    m = m_rect(x1, y1, x2, y2, 1.2)
    t = np.linspace(0, 1, S, dtype=np.float32)[:, None, None]
    glass = (1 - t) * np.array([0.27, 0.31, 0.37], np.float32) + t * np.array([0.13, 0.15, 0.18], np.float32)
    glass = glass * np.ones((S, S, 3), np.float32)
    dark = glass * 0.9 + gray(o) * 0.1
    u = u * (1 - m) + dark * m
    win_mask = np.maximum(win_mask, m)

# ── 2. Wall sconce: divide out the warm beams, keep the stucco texture ──
ref_wall = F[450:700, 380:540].reshape(-1, 3).mean(0)            # same facade, no beam
# the column face: 562–772 above the garage door, 610–772 beside it; soft top edge into the real wall
sconce = m_poly([(562, 470), (772, 470), (772, 1085), (610, 1085), (610, 772), (562, 772)], 6)
ramp = np.clip((np.arange(S, dtype=np.float32)[:, None, None] + Y0 - 470) / 60.0, 0, 1)
sconce = sconce * ramp
ref_col = F[380:440, 572:760].reshape(-1, 3).mean(0)              # same column, above the beam
patch = F[452:700, 382:542]                                        # unlit plaster, same plane
tile = np.concatenate([patch, patch[:, ::-1]], 1)
tile = np.concatenate([tile, tile[::-1]], 0)
reps = (S // tile.shape[0] + 2, S // tile.shape[1] + 2, 1)
tex = np.tile(tile, reps)[:S, :S]
tex = tex - blur(tex, 40) + ref_col                                  # keep grain, flatten shading
yy = np.linspace(-1, 1, S, dtype=np.float32)[:, None, None]
tex = np.clip(tex * (1 - 0.05 * yy), 0, 1)                           # sky light fades slightly downwards
u = u * (1 - sconce) + tex * sconce
# glow on the wall behind the plant: brightness-only de-light, so the plant keeps its colours
low = m_poly([(606, 1060), (776, 1060), (776, 1200), (606, 1200)], 18)
k = np.clip(gray(ref_col[None, None, :]) / np.maximum(gray(blur(o, 26)), 1e-3), 0.45, 1.0)
dl = o * k
dl = dl * 0.5 + gray(dl) * (ref_col / gray(ref_col[None, None, :])) * 0.5   # take the warmth out
u = u * (1 - low) + dl * low
sconce = np.maximum(sconce, low)
fx = m_rect(663, 784, 701, 882, 1.5)                                 # the fixture itself, switched off
fixture_off = np.clip(gray(o) * 0.55 * np.array([0.96, 1.0, 1.03], np.float32), 0, 1)
u = u * (1 - fx) + fixture_off * fx

# ── 3. Porch: recessed entrance under the canopy, ceiling lamp off ──
porch = m_poly([(862, 696), (1041, 696), (1041, 1036), (862, 1036)], 8)
spill = m_poly([(848, 1036), (1052, 1036), (1060, 1110), (840, 1110)], 16) * 0.6
ratio = np.clip(gray(o) / np.maximum(gray(blur(o, 30)), 1e-3), 0.6, 1.45)
delit_p = np.clip(ratio * (ref_wall * 0.56), 0, 1)
pm = np.maximum(porch, spill)
u = u * (1 - pm) + delit_p * pm

# ── 4. Garden path lights: warm hot spots replaced by their surroundings ──
gx1, gy1, gx2, gy2 = 1160 - X0, 1130 - Y0, 1310 - X0, S
reg = o[gy1:gy2, gx1:gx2]
hot = (reg[..., 0] > 0.72) & ((reg[..., 0] - reg[..., 2]) > 0.22)
hot_img = Image.fromarray((hot * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
hm = np.asarray(hot_img).astype(np.float32)[..., None] / 255.0
med = np.asarray(Image.fromarray((reg * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(11))).astype(np.float32) / 255.0
u[gy1:gy2, gx1:gx2] = reg * (1 - hm) + med * 0.75 * hm
garden = np.zeros((S, S, 1), np.float32)
garden[gy1:gy2, gx1:gx2] = hm

# ── Light layers = exact screen-inverse of (night → original) ──
def screen_inverse(mask):
    L = 1 - (1 - o) / np.maximum(1 - u, 1e-3)
    return np.clip(L, 0, 1) * (mask > 0.002)


ext_mask = np.maximum(np.maximum(sconce, pm), garden)
L_int = screen_inverse(win_mask)
L_ext = screen_inverse(ext_mask)


def bbox(mask, pad=6):
    ys, xs = np.where(mask[..., 0] > 0.002)
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(S, xs.max() + pad + 1), min(S, ys.max() + pad + 1)


def save(arr, path, q):
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=q, method=6)


save(u, OUT + '/villa-night.webp', 80)
geo = {'size': S}
for name, L, mask in (('int', L_int, win_mask), ('ext', L_ext, ext_mask)):
    x1, y1, x2, y2 = bbox(mask)
    save(L[y1:y2, x1:x2], OUT + '/villa-light-' + name + '.webp', 85)
    geo[name] = {k: round(v / S * 100, 3) for k, v in (('left', x1), ('top', y1), ('width', x2 - x1), ('height', y2 - y1))}
geo['shutters'] = {
    'A': {k: round(v / S * 100, 3) for k, v in (('left', 905 - X0), ('top', 401 - Y0), ('width', 1006 - 905), ('height', 574 - 401))},
    'B': {k: round(v / S * 100, 3) for k, v in (('left', 1163 - X0), ('top', 493 - Y0), ('width', 1244 - 1163), ('height', 663 - 493))},
    'C': {k: round(v / S * 100, 3) for k, v in (('left', 1163 - X0), ('top', 902 - Y0), ('width', 1243 - 1163), ('height', 984 - 902))},
}
json.dump(geo, open(OUT + '/villa-geometry.json', 'w'), indent=1)


# ── Check: night + layers (from the saved, compressed files) ≈ original ──
def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255.0


def compose(dim, a_int, a_ext, shutters_closed):
    base = load(OUT + '/villa-night.webp') * (1 - dim)
    out = base.copy()
    for name, a in (('int', a_int), ('ext', a_ext)):
        g = geo[name]
        x1 = round(g['left'] * S / 100); y1 = round(g['top'] * S / 100)
        L = load(OUT + '/villa-light-' + name + '.webp') * a
        h, w = L.shape[:2]
        if name == 'ext':
            continue_later = (x1, y1, L)
        else:
            out[y1:y1 + h, x1:x1 + w] = 1 - (1 - out[y1:y1 + h, x1:x1 + w]) * (1 - L)
    if shutters_closed:
        for g in geo['shutters'].values():
            x1 = round(g['left'] * S / 100); y1 = round(g['top'] * S / 100)
            w = round(g['width'] * S / 100); h = round(g['height'] * S / 100)
            rows = np.arange(h)[:, None, None]
            slat = np.select([rows % 6 == 5, rows % 6 == 4], [0.40, 0.50], 0.60).astype(np.float32) * np.ones((h, w, 3), np.float32)
            slat *= (1 - 0.16 * (rows / h))                                  # light from the sky, darker low
            slat[:3] *= 0.6                                                   # shadow under the lintel
            slat[-3:] = 0.36                                                  # bottom bar
            slat *= np.array([0.97, 1.0, 1.03], np.float32) * (1 - dim * 0.85)
            out[y1:y1 + h, x1:x1 + w] = slat
    x1, y1, L = continue_later
    h, w = L.shape[:2]
    out[y1:y1 + h, x1:x1 + w] = 1 - (1 - out[y1:y1 + h, x1:x1 + w]) * (1 - L)
    return out


rec = compose(0, 1, 1, False)
err = np.abs(rec - o)
print('reconstruction error: mean %.4f  p99 %.4f' % (err.mean(), np.percentile(err, 99)))
row = [compose(0, 1, 1, False), compose(0, 0, 0, False), compose(0.35, 0.3, 0.6, True), compose(0.62, 0, 1, True)]
sheet = np.concatenate([np.concatenate(row[:2], 1), np.concatenate(row[2:], 1)], 0)
Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8)).resize((920, 920)).save(PREVIEW)
import os
for f in ('villa-night.webp', 'villa-light-int.webp', 'villa-light-ext.webp'):
    print(f, os.path.getsize(OUT + '/' + f) // 1024, 'KB')
print(json.dumps(geo))
