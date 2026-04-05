#!/usr/bin/env python3
"""
Generate Everyone 72 app icon assets using pure Python stdlib.
Produces: icon.png (1024x1024), adaptive-icon.png (1024x1024),
          splash.png (1284x2778), favicon.png (192x192)
Design: Dark green background + white golf flag + gold "72"
"""

import struct, zlib, os, math

# ── Colors ──────────────────────────────────────────────────────────────────
BG_DARK   = (26,  71, 42,  255)   # #1a472a  deep green
BG_MID    = (34,  91, 54,  255)   # #225b36  mid green (gradient illusion)
WHITE     = (255, 255, 255, 255)
GOLD      = (212, 175, 55,  255)  # #d4af37
TRANS     = (0,   0,   0,   0)

# ── PNG Writer ───────────────────────────────────────────────────────────────
def _chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def write_png(filename, pixels, w, h):
    """pixels: list of (R,G,B,A) tuples, row-major order"""
    raw = bytearray()
    for y in range(h):
        raw += b'\x00'   # filter: None
        for x in range(w):
            r, g, b, a = pixels[y * w + x]
            raw += bytes([r, g, b, a])
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_chunk(b'IHDR', struct.pack('>II5B', w, h, 8, 6, 0, 0, 0)))
        f.write(_chunk(b'IDAT', zlib.compress(bytes(raw), 6)))
        f.write(_chunk(b'IEND', b''))
    print(f'  ✓ {filename}  ({w}×{h})')

# ── Drawing Helpers ───────────────────────────────────────────────────────────
def blend(bg, fg):
    """Alpha-blend fg over bg."""
    a = fg[3] / 255.0
    return (
        int(bg[0] * (1 - a) + fg[0] * a),
        int(bg[1] * (1 - a) + fg[1] * a),
        int(bg[2] * (1 - a) + fg[2] * a),
        255
    )

def fill_rect(pixels, w, x0, y0, x1, y1, color):
    for y in range(max(0,y0), min(len(pixels)//w, y1)):
        for x in range(max(0,x0), min(w, x1)):
            pixels[y * w + x] = color

def fill_circle(pixels, w, cx, cy, r, color):
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dx*dx + dy*dy <= r*r:
                x, y = cx+dx, cy+dy
                if 0 <= x < w and 0 <= y < len(pixels)//w:
                    pixels[y * w + x] = color

def fill_triangle(pixels, w, pts, color):
    """Fill a triangle given 3 (x,y) vertices."""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    min_y, max_y = max(0, min(ys)), min(len(pixels)//w - 1, max(ys))
    for y in range(min_y, max_y + 1):
        intersections = []
        for i in range(3):
            x0, y0 = pts[i]; x1, y1 = pts[(i+1)%3]
            if (y0 <= y < y1) or (y1 <= y < y0):
                t = (y - y0) / (y1 - y0)
                intersections.append(int(x0 + t * (x1 - x0)))
        if len(intersections) >= 2:
            intersections.sort()
            for x in range(max(0, intersections[0]), min(w, intersections[-1]+1)):
                pixels[y * w + x] = color

def rounded_corners(pixels, w, h, r, corner_color=TRANS):
    """Knock out corners with given radius."""
    for y in range(h):
        for x in range(w):
            cx = cy = None
            if x < r and y < r:       cx,cy = r,   r
            elif x >= w-r and y < r:  cx,cy = w-r-1, r
            elif x < r and y >= h-r:  cx,cy = r,   h-r-1
            elif x >= w-r and y >= h-r: cx,cy = w-r-1, h-r-1
            if cx is not None and math.hypot(x-cx, y-cy) > r:
                pixels[y * w + x] = corner_color

# ── Bitmap Font (5×9, digits only) ───────────────────────────────────────────
# Each digit is a list of (x,y) "on" pixels in a 5×9 grid
DIGIT_MAP = {
    '7': [
        (0,0),(1,0),(2,0),(3,0),(4,0),
        (4,1),(4,2),(3,3),(2,4),(2,5),(2,6),(2,7),(2,8),
    ],
    '2': [
        (1,0),(2,0),(3,0),(0,1),(4,1),(4,2),(3,3),(2,4),
        (1,5),(0,6),(0,7),(0,8),(1,8),(2,8),(3,8),(4,8),
    ],
}

def draw_digit(pixels, w, digit, ox, oy, scale, color):
    pts = DIGIT_MAP.get(digit, [])
    for (dx, dy) in pts:
        x0 = ox + dx * scale
        y0 = oy + dy * scale
        fill_rect(pixels, w, x0, y0, x0+scale, y0+scale, color)

# ── Build Icon Pixels ─────────────────────────────────────────────────────────
def make_icon(size):
    pixels = [BG_DARK] * (size * size)

    # Subtle gradient: lighter stripe in top-left area
    for y in range(size // 3):
        for x in range(size // 3):
            t = 1 - math.hypot(x/(size/3), y/(size/3))
            if t > 0:
                r = int(BG_DARK[0] + (BG_MID[0]-BG_DARK[0]) * t * 0.6)
                g = int(BG_DARK[1] + (BG_MID[1]-BG_DARK[1]) * t * 0.6)
                b = int(BG_DARK[2] + (BG_MID[2]-BG_DARK[2]) * t * 0.6)
                pixels[y * size + x] = (r, g, b, 255)

    s = size / 1024  # scale factor

    # ── Flag pole (white vertical bar) ──────────────────────────────────────
    px   = int(360 * s); pw = int(28 * s)
    ptop = int(140 * s); pbot = int(820 * s)
    fill_rect(pixels, size, px, ptop, px+pw, pbot, WHITE)

    # ── Flag (white triangle pointing right from pole) ───────────────────────
    # Triangle: (pole right, top), (pole right + width, mid), (pole right, bottom)
    ftop = int(140 * s); fbot = int(440 * s); fmid = (ftop + fbot) // 2
    fright = int(660 * s)
    fill_triangle(pixels, size,
                  [(px+pw, ftop), (fright, fmid), (px+pw, fbot)],
                  WHITE)

    # ── Golf hole circle (white ring at pole bottom) ─────────────────────────
    hcx = int(360 * s + 14 * s); hcy = int(820 * s)
    fill_circle(pixels, size, hcx, hcy, int(60 * s), WHITE)
    fill_circle(pixels, size, hcx, hcy, int(44 * s), BG_DARK)

    # ── "72" in gold (bottom area) ───────────────────────────────────────────
    scale = int(44 * s)
    text_y = int(840 * s)
    text_x = int(220 * s)
    gap    = int(14 * s)
    digit_w = 5 * scale + gap
    draw_digit(pixels, size, '7', text_x,            text_y, scale, GOLD)
    draw_digit(pixels, size, '2', text_x + digit_w,  text_y, scale, GOLD)

    # ── Rounded corners ──────────────────────────────────────────────────────
    r = int(160 * s)
    rounded_corners(pixels, size, size, r, TRANS)

    return pixels

# ── Build Splash Screen ───────────────────────────────────────────────────────
def make_splash(w, h):
    pixels = [BG_DARK] * (w * h)

    # Radial highlight at center-top
    cx, cy = w // 2, h // 3
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max(w, h)
            t = max(0, 0.5 - d) * 0.4
            r = int(BG_DARK[0] + (BG_MID[0]-BG_DARK[0]) * t)
            g = int(BG_DARK[1] + (BG_MID[1]-BG_DARK[1]) * t)
            b = int(BG_DARK[2] + (BG_MID[2]-BG_DARK[2]) * t)
            pixels[y * w + x] = (r, g, b, 255)

    # Centered logo (same as icon but smaller)
    logo_size = min(w, h) // 3
    logo_px = make_icon(logo_size)

    # Composite logo into splash center
    ox = (w - logo_size) // 2
    oy = (h - logo_size) // 2 - h // 10
    for ly in range(logo_size):
        for lx in range(logo_size):
            src = logo_px[ly * logo_size + lx]
            if src[3] > 0:
                pixels[(oy + ly) * w + (ox + lx)] = src

    # "Everyone 72" text as simple wide rectangles (brand mark)
    bx = w // 2 - int(160 * w/1284)
    by = oy + logo_size + int(40 * w/1284)
    bw = int(320 * w/1284); bh = int(6 * w/1284)
    fill_rect(pixels, w, bx, by,      bx+bw, by+bh,    WHITE)
    fill_rect(pixels, w, bx, by+bh*3, bx+bw, by+bh*4,  GOLD)

    return pixels

# ── Main ──────────────────────────────────────────────────────────────────────
BASE = '/Users/ruiyiyang/Desktop/everyone72/assets'

print('\n🎨 Generating Everyone 72 assets...\n')

# 1. App icon (1024×1024 for App Store)
write_png(f'{BASE}/icon.png',          make_icon(1024), 1024, 1024)

# 2. Android adaptive icon foreground (1024×1024)
write_png(f'{BASE}/adaptive-icon.png', make_icon(1024), 1024, 1024)

# 3. Splash screen (1284×2778 – iPhone 14 Pro Max native)
print('  Generating splash (this takes a moment)...')
write_png(f'{BASE}/splash.png',        make_splash(1284, 2778), 1284, 2778)

# 4. Favicon (192×192)
write_png(f'{BASE}/favicon.png',       make_icon(192), 192, 192)

print('\n✅ All assets written to assets/\n')
