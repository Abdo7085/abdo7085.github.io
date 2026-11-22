"""
Diagrams drawn as inline SVG on black glass (the protocol pages and the articles).

`graph_diagram(graph, labels, title)` draws a diagram described as data — nodes placed by their
centre, links between them — so a protocol file or an article can carry its own diagram.
Node kinds: box (icon + label, 140 x 82), pill (label, 120 x 40), bus (a yellow line from x1 to
x2 with its label above), text (a yellow caption). Link styles: wire, radio, mesh, load, net.
`labels` maps node ids to text in one language; "\n" breaks a box label over two lines.
Styles: the .kd* rules in assets/se-pages.css.
"""

from __future__ import annotations

from _icons import ICONS
from _ui import esc

# 24-unit icons in the site's stroke style
DEV_ICONS = dict(
    buttons='<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18"/><path d="M7.5 7.5h.01M16.5 7.5h.01"/>',
    thermostat=ICONS["thermo"],
    panel='<rect x="2" y="4" width="20" height="15" rx="2"/><rect x="5" y="7" width="6" height="4" rx="1"/><rect x="13" y="7" width="6" height="4" rx="1"/><path d="M5 15h14"/>',
    actuators='<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h.01M12 6h.01M15 6h.01M9 18h.01M12 18h.01M15 18h.01"/><rect x="8" y="10" width="8" height="4" rx="1"/>',
    gateway='<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h8l-2-2M18 14h-8l2 2"/>',
    ip='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
)


# Icons for the "graph" diagrams (24-unit grid, same stroke style)
GRAPH_ICONS = dict(DEV_ICONS,
    router='<rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 17h.01M10 17h.01"/><path d="M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0"/>',
    switch='<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 11h2M10 11h2M14 11h2M6 14h12"/>',
    ap='<circle cx="12" cy="15" r="6"/><circle cx="12" cy="15" r="1.5"/><path d="M8.5 6.5a5 5 0 0 1 7 0M6 4a8.5 8.5 0 0 1 12 0"/>',
    phone='<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    cloud='<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5z"/>',
    relay='<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/><path d="M16 16h.01"/>',
    dimmer='<circle cx="12" cy="12" r="8"/><path d="M12 4v4"/><path d="M12 12l4-3"/>',
    shutter=ICONS["blinds"],
    bulb=ICONS["bulb"],
    cameras='<rect x="1.5" y="4.5" width="2.5" height="15" rx="1"/><path d="M4 15.5h3.5l3-3.6"/><g transform="rotate(24 14 8)"><path d="M7 4.2h14.5l-1.6 2.8H7z"/><path d="M8.2 7h10.6v4.2H9.7a1.5 1.5 0 0 1-1.5-1.5z"/><rect x="18.8" y="7.9" width="2.6" height="2.5" rx=".6"/></g>',   # wall-mounted surveillance camera
    door='<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="8" r="2.5"/><path d="M10 15h4M10 18h4"/>',
    monitor='<rect x="2" y="4" width="20" height="13" rx="2"/><circle cx="8" cy="10.5" r="2.5"/><path d="M13 9h5M13 12h4M9 21h6"/>',
    hub='<rect x="3" y="8" width="18" height="10" rx="3"/><circle cx="12" cy="13" r="1.5"/><path d="M8.5 5a5 5 0 0 1 7 0"/>',
    sensor='<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M12 8v4"/>',
    bluetooth='<path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>',
    apps='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
)

_LINK = {"wire": "kd-drop", "radio": "kd-wifi", "mesh": "kd-mesh", "load": "kd-load", "net": "kd-net"}


def graph_diagram(g: dict, x: dict, title: str) -> str:
    """A diagram described in the protocol file ("graph"): nodes placed by their centre, links
    between them. Node kinds: box (icon + label, 140 x 82), pill (label, 120 x 40), bus (a yellow
    line from x1 to x2 with its label above), text (a yellow caption). Link styles: wire, radio,
    mesh, load, net. A link meets the edge of each box; a link to a bus drops straight onto it."""
    nodes = {n["id"]: n for n in g["nodes"]}

    def size(n):
        k = n.get("kind", "box")
        if k == "box":
            return n.get("w", 140) / 2, n.get("h", 82) / 2
        if k == "pill":
            return n.get("w", 120) / 2, 20
        return 0, 0

    def edge(n, tx, ty):
        hw, hh = size(n)
        dx, dy = tx - n["x"], ty - n["y"]
        if not (hw and (dx or dy)):
            return n["x"], n["y"]
        k = min(hw / abs(dx) if dx else 1e9, hh / abs(dy) if dy else 1e9)
        return n["x"] + dx * k, n["y"] + dy * k

    links = ""
    for a, b, style in g.get("links", []):
        na, nb = nodes[a], nodes[b]
        if nb.get("kind") == "bus":
            x1, y1 = edge(na, na["x"], nb["y"])
            x2, y2 = na["x"], nb["y"]
        else:
            x1, y1 = edge(na, nb["x"], nb["y"])
            x2, y2 = edge(nb, na["x"], na["y"])
        links += f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" class="{_LINK[style]}"/>'

    body = ""
    for n in g["nodes"]:
        k, cx, cy = n.get("kind", "box"), n.get("x"), n["y"]
        label = x.get(n["id"], "")
        if k == "bus":
            body += (f'<line x1="{n["x1"]}" y1="{cy}" x2="{n["x2"]}" y2="{cy}" class="kd-bus"/>'
                     f'<text x="{n.get("lx", (n["x1"] + n["x2"]) / 2)}" y="{cy - 24}" class="kd-bus-t">{esc(label)}</text>')
        elif k == "text":
            body += f'<text x="{cx}" y="{cy}" class="kd-t kd-y">{esc(label)}</text>'
        elif k == "pill":
            hw, _ = size(n)
            body += (f'<rect x="{cx - hw}" y="{cy - 20}" width="{hw * 2}" height="40" rx="20" class="kd-pill"/>'
                     f'<text x="{cx}" y="{cy}" class="kd-t">{esc(label)}</text>')
        else:
            hw, hh = size(n)
            lines = label.split("\n")
            top = cy - hh
            iy, ty = (top + 4, (top + 44, top + 65)) if len(lines) > 1 else (top + 12, (top + 58,))
            txt = "".join(f'<text x="{cx}" y="{yy}" class="kd-t">{esc(l)}</text>' for l, yy in zip(lines, ty))
            cls = "kd-box kd-ps" if n.get("accent") else "kd-box"
            body += (f'<rect x="{cx - hw}" y="{top}" width="{hw * 2}" height="{hh * 2}" rx="10" class="{cls}"/>'
                     f'<g transform="translate({cx - 13} {iy}) scale(1.0833)" class="kd-ic">{GRAPH_ICONS[n["icon"]]}</g>{txt}')
    w, h = g.get("view", [940, 390])
    cap = f'<figcaption>{esc(x["caption"])}</figcaption>' if x.get("caption") else ""
    return (f'<figure class="kd dark"><svg viewBox="0 0 {w} {h}" role="img" aria-label="{esc(x.get("caption") or title)}">'
            + links + body + '</svg>' + cap + '</figure>')


# ---------------- Card scenes ----------------

def scene(items: list, view=(320, 132)) -> str:
    """A small wordless picture for an article card (black glass header), so the card says what
    the article is about before anyone reads the title. Language-free: shapes only.
    Items (drawn in order):
      {"house": [x, y, w, h], "floors": 2, "dashed": true}   a house outline (roof + walls, floor lines)
      {"icon": name, "at": [x, y], "size": 22, "dim": true}  a GRAPH_ICONS icon centred on x, y
      {"line": [x1, y1, x2, y2, ...], "style": "wire|radio|net|faint"}
      {"mark": "ok|x", "at": [x, y]}                          a check or a cross in a small disc
      {"waves": [x, y], "r": [10, 17], "dim": true}           Wi-Fi waves spreading downward
    """
    out = []
    for it in items:
        if "house" in it:
            x, y, w, h = it["house"]
            r = min(30, h // 3)
            cls = "cv-house cv-dash" if it.get("dashed") else "cv-house"
            d = f"M{x + 8} {y + h}V{y + r}L{x + w / 2} {y}L{x + w - 8} {y + r}V{y + h}Z"
            floors = "".join(f'<path d="M{x + 8} {y + r + (h - r) * k / it["floors"]:.1f}H{x + w - 8}" class="cv-floor"/>'
                             for k in range(1, it.get("floors", 1)))
            out.append(f'<path d="{d}" class="{cls}"/>{floors}')
        elif "icon" in it:
            x, y = it["at"]
            s = it.get("size", 22)
            cls = "cv-icon cv-dim" if it.get("dim") else "cv-icon"
            out.append(f'<g transform="translate({x - s / 2} {y - s / 2}) scale({s / 24:.4f})" class="{cls}">{GRAPH_ICONS[it["icon"]]}</g>')
        elif "line" in it:
            pts = it["line"]
            d = "M" + " L".join(f"{pts[i]} {pts[i + 1]}" for i in range(0, len(pts), 2))
            out.append(f'<path d="{d}" class="cv-{it.get("style", "wire")}"/>')
        elif "mark" in it:
            x, y = it["at"]
            if it["mark"] == "ok":
                out.append(f'<circle cx="{x}" cy="{y}" r="8" class="cv-ok-bg"/><path d="M{x - 3.5} {y}l2.5 2.6 4.6-5" class="cv-ok"/>')
            else:
                out.append(f'<circle cx="{x}" cy="{y}" r="8" class="cv-x-bg"/><path d="M{x - 3} {y - 3}l6 6M{x + 3} {y - 3}l-6 6" class="cv-x"/>')
        elif "waves" in it:
            x, y = it["waves"]
            cls = "cv-wave cv-dim" if it.get("dim") else "cv-wave"
            out.append("".join(f'<path d="M{x - r} {y}A{r} {r} 0 0 0 {x + r} {y}" class="{cls}"/>' for r in it.get("r", [10, 17])))
    w, h = view
    return f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid meet">' + "".join(out) + '</svg>'
