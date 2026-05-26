#!/usr/bin/env python3
"""
One-shot surgical patch: add a "Brands" entry to the SPA bundle navbar
(Desktop + Mobile + Footer) in assets/index-CGMiSPUa.js.

Per §7 of docs/AI_DEVELOPMENT_GUIDE.md, every replacement uses a verbatim
match of the existing minified JSX, asserts the expected substitution count,
and aborts on mismatch. Re-running this script is safe: it detects the
already-patched state and exits as a no-op.

After patching, do NOT re-run this script casually — it should be idempotent
but every extra invocation re-reads the whole bundle.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "assets" / "index-CGMiSPUa.js"

# Sentinel: if "/brands.html" is already present as a Link target, the bundle is
# already patched. (We check the route as a literal string — the navbar uses
# `to: "/brands.html"` with `reloadDocument: true` because brands is a separate
# root template, not an SPA-routed component.)
SENTINEL = 'to: "/brands.html"'


# ---- Patch 1: Desktop navbar — insert "Brands" Link after Previous Work ----
DESKTOP_PW = (
    '}), u.jsx(Mt, {\n'
    '                    to: "/previous-work",\n'
    '                    onClick: () => {\n'
    '                        i.pathname === "/previous-work" && window.scrollTo({\n'
    '                            top: 0,\n'
    '                            behavior: "smooth"\n'
    '                        })\n'
    '                    }\n'
    '                    ,\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_previous_work",\n'
    '                    children: ""\n'
    '                }), u.jsx("button", {\n'
    '                    onClick: () => s("contact"),\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_contact",'
)

DESKTOP_PW_NEW = (
    '}), u.jsx(Mt, {\n'
    '                    to: "/previous-work",\n'
    '                    onClick: () => {\n'
    '                        i.pathname === "/previous-work" && window.scrollTo({\n'
    '                            top: 0,\n'
    '                            behavior: "smooth"\n'
    '                        })\n'
    '                    }\n'
    '                    ,\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_previous_work",\n'
    '                    children: ""\n'
    '                }), u.jsx(Mt, {\n'
    '                    to: "/brands.html",\n'
    '                    reloadDocument: true,\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "nav_brands",\n'
    '                    children: ""\n'
    '                }), u.jsx("button", {\n'
    '                    onClick: () => s("contact"),\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_contact",'
)


# ---- Patch 2: Mobile navbar — insert "Brands" Link after Previous Work ----
MOBILE_PW = (
    '}), u.jsx(Mt, {\n'
    '                    to: "/previous-work",\n'
    '                    onClick: () => {\n'
    '                        i.pathname === "/previous-work" && window.scrollTo({\n'
    '                            top: 0,\n'
    '                            behavior: "smooth"\n'
    '                        })\n'
    '                    }\n'
    '                    ,\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_previous_work",\n'
    '                    children: ""\n'
    '                }), u.jsx("button", {\n'
    '                    onClick: () => s("contact"),\n'
    '                    className: "nav-link text-base py-1 text-left",'
)

MOBILE_PW_NEW = (
    '}), u.jsx(Mt, {\n'
    '                    to: "/previous-work",\n'
    '                    onClick: () => {\n'
    '                        i.pathname === "/previous-work" && window.scrollTo({\n'
    '                            top: 0,\n'
    '                            behavior: "smooth"\n'
    '                        })\n'
    '                    }\n'
    '                    ,\n'
    '                    className: "nav-link",\n'
    '                    "data-i18n": "spa_previous_work",\n'
    '                    children: ""\n'
    '                }), u.jsx(Mt, {\n'
    '                    to: "/brands.html",\n'
    '                    reloadDocument: true,\n'
    '                    className: "nav-link text-base py-1 text-left",\n'
    '                    "data-i18n": "nav_brands",\n'
    '                    children: ""\n'
    '                }), u.jsx("button", {\n'
    '                    onClick: () => s("contact"),\n'
    '                    className: "nav-link text-base py-1 text-left",'
)


# ---- Patch 3: Footer — insert "Brands" Link after Previous Work ----
# Footer block ends with: `}), u.jsx("li", { children: u.jsx(Mt, { to: "/previous-work" ...`
# followed by `})] (end of the ul children). We add a new li before that closing.
FOOTER_PW = (
    '), u.jsx("li", {\n'
    '                            children: u.jsx(Mt, {\n'
    '                                to: "/previous-work",\n'
    '                                onClick: () => {\n'
    '                                    t.pathname === "/previous-work" && window.scrollTo({\n'
    '                                        top: 0,\n'
    '                                        behavior: "smooth"\n'
    '                                    })\n'
    '                                }\n'
    '                                ,\n'
    '                                className: "text-gray-400 hover:text-primary transition-colors",\n'
    '                                "data-i18n": "spa_previous_work",\n'
    '                                children: ""\n'
    '                            })\n'
    '                        })]'
)

FOOTER_PW_NEW = (
    '), u.jsx("li", {\n'
    '                            children: u.jsx(Mt, {\n'
    '                                to: "/previous-work",\n'
    '                                onClick: () => {\n'
    '                                    t.pathname === "/previous-work" && window.scrollTo({\n'
    '                                        top: 0,\n'
    '                                        behavior: "smooth"\n'
    '                                    })\n'
    '                                }\n'
    '                                ,\n'
    '                                className: "text-gray-400 hover:text-primary transition-colors",\n'
    '                                "data-i18n": "spa_previous_work",\n'
    '                                children: ""\n'
    '                            })\n'
    '                        }), u.jsx("li", {\n'
    '                            children: u.jsx(Mt, {\n'
    '                                to: "/brands.html",\n'
    '                                reloadDocument: true,\n'
    '                                className: "text-gray-400 hover:text-primary transition-colors",\n'
    '                                "data-i18n": "nav_brands",\n'
    '                                children: ""\n'
    '                            })\n'
    '                        })]'
)


PATCHES = [
    ("Desktop navbar", DESKTOP_PW, DESKTOP_PW_NEW, 1),
    ("Mobile navbar",  MOBILE_PW,  MOBILE_PW_NEW,  1),
    ("Footer",         FOOTER_PW,  FOOTER_PW_NEW,  1),
]


def main() -> int:
    if not BUNDLE.exists():
        print(f"ERROR: {BUNDLE} not found.", file=sys.stderr)
        return 1

    text = BUNDLE.read_text(encoding="utf-8")

    if SENTINEL in text:
        print(f"[skip] Bundle already patched (sentinel '{SENTINEL}' found).")
        return 0

    failures = []
    for name, target, replacement, expected_count in PATCHES:
        count = text.count(target)
        if count != expected_count:
            failures.append(f"{name}: expected {expected_count} match(es), found {count}.")
            continue
        text = text.replace(target, replacement, 1)
        print(f"[ok] {name}: 1 replacement applied.")

    if failures:
        print("\nABORT — no changes written. Anchor mismatches:")
        for f in failures:
            print(f"  - {f}")
        return 2

    BUNDLE.write_text(text, encoding="utf-8")
    print(f"\n[done] Wrote {BUNDLE.relative_to(ROOT)} with 3 surgical patches.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
