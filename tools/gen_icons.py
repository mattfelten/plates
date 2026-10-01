#!/usr/bin/env python3
"""Generate Plates app icons (stacked plates on a bar) as RGBA PNGs.

Pure stdlib — no image libraries required.
"""
import os
import struct
import zlib


def hexrgb(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def in_rrect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    dx = max(x0 + r - x, 0, x - (x1 - r))
    dy = max(y0 + r - y, 0, y - (y1 - r))
    return dx * dx + dy * dy <= r * r


def render(size, path):
    S = size
    bg = hexrgb('#161c26')
    bar = hexrgb('#39424f')
    cy = 0.52
    bar_h = 0.07

    # (width, height, color) as fractions of S — big blue 45, green 25, purple 2.5
    spec = [
        (0.16, 0.52, '#1d4ed8'),
        (0.13, 0.40, '#15803d'),
        (0.10, 0.28, '#8b5cf6'),
    ]
    gap = 0.02
    total_w = sum(w for w, _, _ in spec) + gap * (len(spec) - 1)
    rects = []
    x = (1 - total_w) / 2
    for w, h, c in spec:
        rects.append((x * S, (cy - h / 2) * S, (x + w) * S, (cy + h / 2) * S, hexrgb(c)))
        x += w + gap

    bx0, by0 = 0.08 * S, 0.08 * S
    bx1, by1 = 0.92 * S, 0.92 * S
    br = 0.20 * S
    half_bar = bar_h * S / 2

    raw = bytearray()
    for y in range(S):
        raw.append(0)  # filter: none
        row = bytearray()
        for x in range(S):
            px = (0, 0, 0, 0)
            if in_rrect(x, y, bx0, by0, bx1, by1, br):
                px = (*bg, 255)
                if abs(y - cy * S) < half_bar:
                    px = (*bar, 255)
                for (x0, y0, x1, y1, col) in rects:
                    if in_rrect(x, y, x0, y0, x1, y1, 0.03 * S):
                        if abs(y - cy * S) < half_bar:
                            pass  # hub: bar shows through
                        elif y - y0 < max(2, 0.014 * S):
                            px = (*tuple(min(255, v + 55) for v in col), 255)
                        else:
                            px = (*col, 255)
            row += bytes(px)
        raw += row

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data)))

    ihdr = struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print(f'{path}: {len(png)} bytes')


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    render(180, os.path.join(out, 'icon-180.png'))
    render(512, os.path.join(out, 'icon-512.png'))
