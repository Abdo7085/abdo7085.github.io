#!/usr/bin/env python3
"""
Image pipeline: turn the originals in media/ into the files the site serves.

  media/products/<file>  ->  assets/products/<stem>-<w>.webp   w = 400 / 800 / 1200,
                                                                never wider than the original
  first product image    ->  assets/og/products/<id>.jpg        1200x630 share card
  project "cover"        ->  assets/og/projects/<slug>.jpg      1200x630 share card
  media/site/<file>      ->  assets/<file>                      homepage / 404 media (SITE_MEDIA)
  media/site/<video>     ->  assets/<video> + poster .webp      homepage video (SITE_VIDEO, ffmpeg)

Nothing under assets/products/ or assets/og/ is edited by hand: the build
deletes any file there that no product or project uses any more.

Product files list their images by file name only, first = primary:
    "images": ["zennio-z50.png", "zennio-z50-2.jpg"]

data/product_images.json  {product id: [descriptor, ...]} in that order.
A descriptor is what the browser needs to draw the image:
    {"src": "/assets/products/x-800.webp",
     "srcset": "/assets/products/x-400.webp 400w, /assets/products/x-800.webp 800w",
     "width": 800, "height": 600}
width/height are those of the largest variant. build_products.py copies the
first descriptor into products_index.json ("image"); build_product.py reads
the whole list for the gallery.

Incremental: scripts/state/images.json remembers each source's sha1 and the
settings used. Unchanged sources are skipped, so a rebuild with no image
change rewrites nothing (and a newer Pillow cannot cause churn).

Usage:
    python scripts/build_images.py
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

import _lib
from _lib import ROOT, STATE_DIR

MEDIA_PRODUCTS = ROOT / "media" / "products"
MEDIA_SITE = ROOT / "media" / "site"
OUT_PRODUCTS = ROOT / "assets" / "products"
OUT_OG = ROOT / "assets" / "og"
MANIFEST_PATH = ROOT / "data" / "product_images.json"
STATE_PATH = STATE_DIR / "images.json"

# Card images need 400/800, the product-page gallery 800/1200.
WIDTHS = (400, 800, 1200)
WEBP_QUALITY = 80
OG_SIZE = (1200, 630)
OG_QUALITY = 85
OG_BG = (241, 239, 236)        # --cream, the card image backdrop
OG_GLOW = (184, 108, 37)       # --brand copper, same soft glow as the cards
MAX_SOURCE_PX = 2000           # originals larger than this only get a warning
SOURCE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
SAFE_NAME = re.compile(r"^[a-z0-9][a-z0-9._-]*$")

# Decorative media used by the homepage bundle, project galleries and 404.
# served name in assets/ -> (max width, WebP quality). Source: media/site/<name>.
SITE_MEDIA = {
    "roomwebp.webp": (2400, 72),             # homepage hero (desktop), villa project cover
    "Vila-big-background.webp": (2000, 72),  # homepage hero (phones), villa project gallery
    "logocircular.webp": (256, 90),          # 404 page logo, shown at 72px
}

# Homepage video, re-encoded with ffmpeg (H.264, no audio track, +faststart;
# aq-mode 3 keeps detail in its dark scenes) plus a poster frame. The poster
# is what a phone that blocks autoplay (iPhone Low Power Mode) shows, so it is
# taken from the opening scene, not frame 0 (a black fade-in). Source:
# media/site/<name>. The homepage <video> is written by scripts/build_home.py
# (VIDEO, POSTER, width/height) — update it there if the video's shape changes.
# ffmpeg is needed only when the source or these settings change.
SITE_VIDEO = {
    "example01.mp4": {"max_w": 1280, "crf": 26, "aq_mode": 3,
                      "poster": "example01-poster.webp", "poster_at": 2.0},
}

# Bump when the encoding logic changes so every output is rebuilt once.
PIPELINE_VERSION = 1


# ---------------- small helpers ----------------

def _sha1(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def _settings_key(*parts) -> str:
    return hashlib.sha1(json.dumps([PIPELINE_VERSION, *parts]).encode()).hexdigest()[:12]


def _url(path: Path) -> str:
    return "/" + path.relative_to(ROOT).as_posix()


def _load_state() -> dict:
    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        return state if isinstance(state, dict) else {}
    except Exception:
        return {}


def _write_if_changed(path: Path, text: str) -> None:
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _open(path: Path) -> Image.Image:
    """Open an original as RGB or RGBA, upright, alpha dropped when unused."""
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if im.mode == "P":
        im = im.convert("RGBA" if "transparency" in im.info else "RGB")
    elif im.mode in ("LA", "La", "RGBa", "PA"):
        im = im.convert("RGBA")
    elif im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    if im.mode == "RGBA" and im.getchannel("A").getextrema()[0] == 255:
        im = im.convert("RGB")
    return im


def _ladder(width: int) -> list:
    """Variant widths for an original this wide: the standard steps below it,
    plus one at min(width, largest step). Never upscales."""
    steps = [w for w in WIDTHS if w < width]
    top = min(width, WIDTHS[-1])
    if top not in steps:
        steps.append(top)
    return steps


def _resize(im: Image.Image, width: int) -> Image.Image:
    if width >= im.width:
        return im
    height = max(1, round(im.height * width / im.width))
    return im.resize((width, height), Image.LANCZOS)  # premultiplied for RGBA


def _save_webp(im: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)


def _descriptor(variants: list) -> dict:
    """variants: [[url, w, h], ...] ascending by width."""
    mid = [v for v in variants if v[1] <= 800][-1]
    largest = variants[-1]
    return {
        "src": mid[0],
        "srcset": ", ".join(f"{u} {w}w" for u, w, _ in variants),
        "width": largest[1],
        "height": largest[2],
    }


_og_bg_cache = None


def _og_background() -> Image.Image:
    """Cream canvas with the cards' faint copper glow from the top centre."""
    global _og_bg_cache
    if _og_bg_cache is None:
        w, h = OG_SIZE
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse((-w * 0.1, -h * 0.9, w * 1.1, h * 0.75), fill=22)
        mask = mask.filter(ImageFilter.GaussianBlur(120))
        bg = Image.new("RGB", (w, h), OG_BG)
        bg.paste(Image.new("RGB", (w, h), OG_GLOW), (0, 0), mask)
        _og_bg_cache = bg
    return _og_bg_cache.copy()


def _og_product(im: Image.Image) -> Image.Image:
    """Product cut-out centred on the cream card, trimmed of empty margins."""
    if im.mode == "RGBA":
        bbox = im.getchannel("A").point(lambda p: 255 if p > 10 else 0).getbbox()
        if bbox:
            im = im.crop(bbox)
    w, h = OG_SIZE
    box_w, box_h = w * 0.84, h * 0.80
    scale = min(box_w / im.width, box_h / im.height, 2.0)  # small originals: at most 2x
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    im = im.resize(size, Image.LANCZOS)
    card = _og_background()
    pos = ((w - size[0]) // 2, (h - size[1]) // 2)
    if im.mode == "RGBA":
        card.paste(im, pos, im)
    else:
        card.paste(im, pos)
    return card


def _og_photo(im: Image.Image) -> Image.Image:
    """Photo filling the card, centre-cropped."""
    return ImageOps.fit(im.convert("RGB"), OG_SIZE, Image.LANCZOS, centering=(0.5, 0.5))


def _ffmpeg() -> str:
    """ffmpeg executable: $FFMPEG, PATH, or where `winget install Gyan.FFmpeg`
    puts it (a shell opened before the install does not see the new PATH)."""
    exe = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if exe:
        return exe
    winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet"
    found = sorted(winget.glob("Links/ffmpeg.exe")) + sorted(winget.glob("Packages/Gyan.FFmpeg*/*/bin/ffmpeg.exe"))
    return str(found[-1]) if found else ""


def _encode_video(exe: str, src: Path, out: Path, poster: Path, cfg: dict) -> list:
    """H.264 MP4 without audio, at most cfg max_w wide, moov atom first so it
    starts playing while downloading; bitexact so a re-encode is stable.
    Returns [width, height] of the result."""
    tmp_video = out.with_name(out.stem + ".tmp.mp4")
    tmp_frame = poster.with_name(poster.stem + ".tmp.png")
    scale = f"scale='min({cfg['max_w']},iw)':-2:flags=lanczos,format=yuv420p"
    run = lambda args: subprocess.run([exe, "-hide_banner", "-v", "error", "-y", *args], check=True)
    try:
        run(["-i", str(src), "-map", "0:v:0", "-an", "-sn", "-dn", "-vf", scale,
             "-c:v", "libx264", "-preset", "slow", "-crf", str(cfg["crf"]),
             "-aq-mode", str(cfg["aq_mode"]), "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1",
             "-fflags", "+bitexact", "-flags:v", "+bitexact", str(tmp_video)])
        run(["-ss", str(cfg["poster_at"]), "-i", str(tmp_video), "-frames:v", "1", str(tmp_frame)])
        frame = Image.open(tmp_frame)
        frame.load()
        _save_webp(frame.convert("RGB"), poster, 78)
        os.replace(tmp_video, out)
        return [frame.width, frame.height]
    finally:
        for f in (tmp_video, tmp_frame):
            if f.exists():
                f.unlink()


def _save_jpg(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "JPEG", quality=OG_QUALITY, optimize=True, progressive=True)


# ---------------- the build ----------------

class Pipeline:
    def __init__(self):
        self.old_state = _load_state()
        self.state = {}
        self.expected = set()      # every generated file this run stands behind
        self.made = 0
        self.kept = 0
        self.warnings = []

    def _fresh(self, key: str, fingerprint: str, outputs: list) -> bool:
        prev = self.old_state.get(key)
        return (
            isinstance(prev, dict)
            and prev.get("fp") == fingerprint
            and all((ROOT / o).exists() for o in outputs)
        )

    # -- product variants --
    def product_variants(self, name: str) -> list:
        key = f"products/{name}"
        if key in self.state:                     # same file used by two products
            return self.state[key]["variants"]
        src = MEDIA_PRODUCTS / name
        fp =f"{_sha1(src)}:{_settings_key(WIDTHS, WEBP_QUALITY)}"
        prev = self.old_state.get(key) or {}
        variants = prev.get("variants") or []
        outputs = [u.lstrip("/") for u, _, _ in variants]
        if not (variants and self._fresh(key, fp, outputs)):
            im = _open(src)
            if max(im.size) > MAX_SOURCE_PX:
                self.warnings.append(
                    f"media/products/{name} is {im.width}x{im.height}; originals should be "
                    f"at most {MAX_SOURCE_PX}px (the site still gets correct sizes)"
                )
            stem = Path(name).stem
            variants = []
            for w in _ladder(im.width):
                out = OUT_PRODUCTS / f"{stem}-{w}.webp"
                v = _resize(im, w)
                _save_webp(v, out, WEBP_QUALITY)
                variants.append([_url(out), v.width, v.height])
            self.made += 1
        else:
            self.kept += 1
        self.state[key] = {"fp": fp, "variants": variants}
        self.expected.update(u.lstrip("/") for u, _, _ in variants)
        return variants

    # -- share cards --
    def og(self, key: str, src: Path, out: Path, kind: str) -> str:
        fp = f"{_sha1(src)}:{_settings_key(OG_SIZE, OG_QUALITY, OG_BG, OG_GLOW, kind)}"
        rel = out.relative_to(ROOT).as_posix()
        if not self._fresh(key, fp, [rel]):
            im = _open(src)
            _save_jpg(_og_product(im) if kind == "product" else _og_photo(im), out)
            self.made += 1
        else:
            self.kept += 1
        self.state[key] = {"fp": fp, "out": rel}
        self.expected.add(rel)
        return _url(out)

    # -- homepage / 404 media --
    def site_media(self) -> None:
        for name, (max_w, quality) in SITE_MEDIA.items():
            src = MEDIA_SITE / name
            if not src.exists():
                self.warnings.append(f"media/site/{name} is missing (SITE_MEDIA in build_images.py)")
                continue
            key = f"site/{name}"
            out = ROOT / "assets" / name
            fp = f"{_sha1(src)}:{_settings_key(max_w, quality)}"
            if not self._fresh(key, fp, [out.relative_to(ROOT).as_posix()]):
                _save_webp(_resize(_open(src), max_w), out, quality)
                self.made += 1
            else:
                self.kept += 1
            self.state[key] = {"fp": fp}

    # -- homepage video + poster --
    def site_video(self) -> None:
        for name, cfg in SITE_VIDEO.items():
            src = MEDIA_SITE / name
            if not src.exists():
                self.warnings.append(f"media/site/{name} is missing (SITE_VIDEO in build_images.py)")
                continue
            key = f"site/{name}"
            out = ROOT / "assets" / name
            poster = ROOT / "assets" / cfg["poster"]
            outputs = [out.relative_to(ROOT).as_posix(), poster.relative_to(ROOT).as_posix()]
            fp = f"{_sha1(src)}:{_settings_key(cfg)}"
            if self._fresh(key, fp, outputs):
                self.kept += 1
                self.state[key] = self.old_state[key]
                continue
            exe = _ffmpeg()
            if not exe:
                self.warnings.append(
                    f"media/site/{name} changed but ffmpeg is not installed "
                    f"(winget install Gyan.FFmpeg) — assets/{name} left as it was"
                )
                if key in self.old_state:
                    self.state[key] = self.old_state[key]   # retry on the next build
                continue
            size = _encode_video(exe, src, out, poster, cfg)
            self.state[key] = {"fp": fp, "size": size}
            self.made += 1

    def clean_orphans(self) -> list:
        removed = []
        for folder in (OUT_PRODUCTS, OUT_OG):
            if not folder.exists():
                continue
            for f in sorted(folder.rglob("*")):
                rel = f.relative_to(ROOT).as_posix()
                if f.is_file() and rel not in self.expected:
                    f.unlink()
                    removed.append(rel)
        return removed

    def save_state(self) -> None:
        text = json.dumps(self.state, indent=1, sort_keys=True) + "\n"
        _write_if_changed(STATE_PATH, text)


def _read_products() -> tuple:
    products, problems = [], []
    for pf in sorted((ROOT / "data" / "products").glob("*.json")):
        try:
            products.append((pf.name, json.loads(pf.read_text(encoding="utf-8"))))
        except Exception as e:
            problems.append(f"{pf.name}: not valid JSON ({e})")
    return products, problems


def check_product_images(products: list) -> list:
    """Every listed image must be a file in media/products/ with a safe name.
    Two different files may not share a stem (x.png and x.jpg would both
    produce x-400.webp)."""
    problems = []
    stems = {}
    for fname, data in products:
        images = data.get("images", [])
        if not isinstance(images, list) or not images:
            problems.append(f"{fname}: \"images\" must list at least one file from media/products/")
            continue
        for name in images:
            if not isinstance(name, str) or "/" in name or "\\" in name:
                problems.append(
                    f"{fname}: image {name!r} must be a file name only, "
                    f"e.g. \"{data.get('id', 'product')}.png\" (the file lives in media/products/)"
                )
                continue
            if not SAFE_NAME.match(name) or Path(name).suffix.lower() not in SOURCE_EXT:
                problems.append(
                    f"{fname}: image \"{name}\" — use lowercase letters, digits, '-', '_' "
                    f"and one of {', '.join(sorted(SOURCE_EXT))}"
                )
                continue
            if not (MEDIA_PRODUCTS / name).is_file():
                problems.append(f"{fname}: image \"{name}\" not found in media/products/")
                continue
            stem = Path(name).stem
            if stems.setdefault(stem, name) != name:
                problems.append(
                    f"{fname}: \"{name}\" and \"{stems[stem]}\" share the name \"{stem}\" — rename one"
                )
    return problems


def build() -> dict:
    """Run the whole pipeline. Returns {product id: [descriptor, ...]}."""
    products, problems = _read_products()
    problems += check_product_images(products)
    _lib.abort_on_problems(
        problems, "product images",
        hint="Put the original in media/products/ and list its file name in \"images\".",
    )

    p = Pipeline()
    manifest = {}
    for _, data in products:
        pid = data["id"]
        descs = []
        for name in data["images"]:
            descs.append(_descriptor(p.product_variants(name)))
        manifest[pid] = descs
        p.og(f"og/products/{pid}", MEDIA_PRODUCTS / data["images"][0],
             OUT_OG / "products" / f"{pid}.jpg", "product")

    for pf in sorted((ROOT / "data" / "projects").glob("*.json")):
        try:
            data = json.loads(pf.read_text(encoding="utf-8"))
        except Exception:
            continue  # build_projects.py reports invalid project files
        cover = data.get("cover")
        slug = data.get("id") or pf.stem
        if isinstance(cover, str) and cover.startswith("/"):
            src = ROOT / cover.lstrip("/")
            if src.name in SITE_MEDIA:          # read the original, not the served copy
                src = MEDIA_SITE / src.name
            if src.is_file():
                p.og(f"og/projects/{slug}", src, OUT_OG / "projects" / f"{slug}.jpg", "photo")
            else:
                p.warnings.append(f"projects/{pf.name}: cover {cover} not found, no share image")

    p.site_media()
    p.site_video()
    removed = p.clean_orphans()

    manifest_text = json.dumps(dict(sorted(manifest.items())), indent=1, ensure_ascii=False) + "\n"
    _write_if_changed(MANIFEST_PATH, manifest_text)
    p.save_state()

    print(f"  Images: {p.made} generated, {p.kept} unchanged, {len(removed)} orphan file(s) removed.")
    for r in removed:
        print(f"    removed {r}")
    for w in p.warnings:
        print(f"  WARNING: {w}")
    return manifest


def largest_url(desc: dict) -> str:
    """URL of the widest variant in a descriptor (structured data wants big)."""
    return desc["srcset"].split(", ")[-1].split(" ")[0]


def og_url(kind: str, ident: str) -> str:
    """Public path of a share card written by build(); '' if there is none."""
    path = OUT_OG / kind / f"{ident}.jpg"
    return _url(path) if path.exists() else ""


def load_manifest() -> dict:
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main():
    print("=== Building images ===\n")
    build()


if __name__ == "__main__":
    main()
