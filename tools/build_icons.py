#!/usr/bin/env python3
"""Draw the «Кора» mark and render the Telegram and web icons.

The mark is a light leaf on deep green. Its veins bend like the folds of the cortex,
and faint growth rings sit behind it: «кора» is both bark and cortex.

Writes:
  branding/kora-mark.svg            master mark (square, full bleed)
  branding/kora-avatar-640.png      bot profile photo for @BotFather /setuserpic (also the Mini App icon)
  branding/kora-cover-640x360.png   Mini App photo for @BotFather /newapp
  webapp/public/favicon.svg, apple-touch-icon.png (180), icon-512.png

Usage:  python3 tools/build_icons.py   (PNG rendering needs Chromium; set CHROMIUM=/path if it is not found)
"""
import math, os, pathlib, shutil, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
GREEN, GREEN_RING, CREAM, INK_SOFT = '#195e4e', '#1f6a57', '#f6f3ec', '#58706a'
FONTS = pathlib.Path(os.environ.get('KORA_FONTS', '/root/.claude/skills/synced/d16bbedc-19d4-4b84-9b77-fc43b7503f0b_2f80ee09-8e64-4e3a-8a8d-ca1b877a5599/canvas-design/canvas-fonts'))

def f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')

def quad(p0, p1, p2, t):
    a = (1 - t) ** 2; b = 2 * (1 - t) * t; c = t * t
    return (a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1])

def tapered(p0, p1, p2, w0, w1, steps=28):
    """A quadratic curve drawn as a filled shape that thins from w0 to w1, with a round start."""
    left, right = [], []
    for i in range(steps + 1):
        t = i / steps
        x, y = quad(p0, p1, p2, t)
        dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
        dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        w = (w0 + (w1 - w0) * t ** 0.85) / 2
        left.append((x + nx * w, y + ny * w)); right.append((x - nx * w, y - ny * w))
    pts = left + right[::-1]
    d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts)
    r, (cx, cy) = w0 / 2, p0
    # Round start: a full circle under the first point (non-zero fill merges it with the stroke).
    return d + f'Z M{f(cx - r)} {f(cy)} a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0 a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0Z'

BODY = ((-262, 0), (-196, -226), (150, -196), (266, -4), (156, 156), (-178, 210))

def cubic(p0, p1, p2, p3, t):
    a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
    return (a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1])

def edge(x, upper):
    """Distance from the axis to the leaf edge at x (sampled from the outline)."""
    b, c1, c2, t, c3, c4 = BODY
    pts = [cubic(b, c1, c2, t, i / 400) for i in range(401)] if upper else [cubic(t, c3, c4, b, i / 400) for i in range(401)]
    return abs(min(pts, key=lambda p: abs(p[0] - x))[1])

def leaf(detail=True):
    """Leaf in local coordinates: base at x=-262, tip at x=+262, centred on 0."""
    b, c1, c2, t, c3, c4 = BODY
    body = f'M{b[0]} {b[1]}C{c1[0]} {c1[1]} {c2[0]} {c2[1]} {t[0]} {t[1]}C{c3[0]} {c3[1]} {c4[0]} {c4[1]} {b[0]} {b[1]}Z'
    stem = tapered((-236, 0), (-296, 6), (-346, 34), 30, 22)
    parts = [f'<path d="{body}" fill="{CREAM}"/>', f'<path d="{stem}" fill="{CREAM}"/>']
    ink = [tapered((-186, 3), (-6, 12), (222, -5), 14, 2)]
    if detail:
        # Veins bow toward the tip like soft folds of the cortex and stop well inside the edge.
        for side, starts in ((True, (-146, -66, 16, 96, 164)), (False, (-160, -80, 2, 84, 152))):
            for i, x in enumerate(starts):
                reach = 104 - i * 9
                xe = x + reach
                ye = edge(xe, side) * 0.74 * (-1 if side else 1)
                y0 = 6 if side else 9
                w = (11.5 if side else 11) - i * 1.6
                ink.append(tapered((x, y0), (x + reach * 0.26, y0 + (ye - y0) * 0.74), (xe, ye), w, 1.6))
    parts += [f'<path d="{d}" fill="{GREEN}"/>' for d in ink]
    return ''.join(parts)

def rings(cx, cy, count, r0, step, colour, width, seed=0.0):
    """Slightly irregular concentric rings, as on a cut of a tree."""
    out = []
    for k in range(count):
        r = r0 + step * k * (1 + 0.035 * k)
        pts = []
        for i in range(181):
            a = 2 * math.pi * i / 180
            rr = r * (1 + 0.013 * math.sin(3 * a + seed + k * 0.7) + 0.008 * math.sin(5 * a + 1.3 * k + seed))
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z'
        out.append(f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{f(width)}" stroke-linejoin="round"/>')
    return ''.join(out)

def mark_svg(size=1024, with_rings=True, radius=0, detail=True):
    s = size / 1024
    bg = f'<rect width="1024" height="1024" rx="{radius}" fill="{GREEN}"/>'
    ring = f'<g clip-path="url(#clip)">{rings(512, 512, 9, 250, 44, GREEN_RING, 5, 0.6)}</g>' if with_rings else ''
    clip = f'<defs><clipPath id="clip"><rect width="1024" height="1024" rx="{radius}"/></clipPath></defs>'
    body = f'<g transform="translate(526 504) rotate(-42) scale(1.12)">{leaf(detail)}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{f(size)}" height="{f(size)}" viewBox="0 0 1024 1024">'
            f'{clip}{bg}{ring}{body}</svg>')

def cover_svg():
    """640×360: the mark on warm paper, the name in a book serif, one quiet line."""
    lora, lora_i = (FONTS / 'Lora-Regular.ttf').as_uri(), (FONTS / 'Lora-Italic.ttf').as_uri()
    mark = mark_svg(176, True, 232).replace('<svg ', '<svg x="72" y="92" ', 1)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<style>@font-face{{font-family:K;src:url("{lora}")}}@font-face{{font-family:KI;src:url("{lora_i}")}}</style>
<rect width="640" height="360" fill="{CREAM}"/>
{mark}
<text x="290" y="186" font-family="K" font-size="84" fill="{GREEN}" letter-spacing="-1">Кора</text>
<line x1="293" y1="213" x2="333" y2="213" stroke="{GREEN}" stroke-width="2" stroke-linecap="round"/>
<text x="292" y="248" font-family="KI" font-size="21" fill="{INK_SOFT}">справочник для родителей</text>
</svg>'''

def chromium():
    # The classic headless shell keeps the window size exactly; the new headless mode crops the page.
    for c in [os.environ.get('CHROMIUM'), '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', '/opt/pw-browsers/chromium', shutil.which('chromium'), shutil.which('google-chrome')]:
        if c and os.path.exists(c):
            return c

def render(svg, out, w, h):
    exe = chromium()
    if not exe:
        print('Chromium not found, skipped', out); return
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / 'page.html'
        page.write_text(f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;background:transparent}}body>svg{{display:block;width:{w}px;height:{h}px}}</style>{svg}')
        subprocess.run([exe, '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                        '--default-background-color=00000000', f'--window-size={w},{h}', '--virtual-time-budget=2000',
                        f'--screenshot={out}', page.as_uri()], check=True, capture_output=True)
    print('wrote', out.relative_to(ROOT))

def main():
    brand = ROOT / 'branding'; public = ROOT / 'webapp/public'
    brand.mkdir(exist_ok=True)
    (brand / 'kora-mark.svg').write_text(mark_svg(1024) + '\n')
    fav = mark_svg(64, False, 230, detail=False)
    (public / 'favicon.svg').write_text(fav + '\n')
    render(mark_svg(640), brand / 'kora-avatar-640.png', 640, 640)
    render(cover_svg(), brand / 'kora-cover-640x360.png', 640, 360)
    render(mark_svg(180, True, 0), public / 'apple-touch-icon.png', 180, 180)
    render(mark_svg(512, True, 0), public / 'icon-512.png', 512, 512)

if __name__ == '__main__':
    main()
