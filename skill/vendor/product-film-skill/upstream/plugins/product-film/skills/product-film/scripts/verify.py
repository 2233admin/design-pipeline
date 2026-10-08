"""Check rendered deliverables by decoding them: duration, colors, loop seam.

    uv run --with numpy --with imageio-ffmpeg python3 scripts/verify.py out/<film> \
        --duration 52.8 --bg 10,10,10 [--probe 9.4:944,800] [--probe 33.0:1000,860]

For every .mp4 and .webm in the folder:
- duration matches (to the frame)
- frame 0 at the center decodes to the background (within 2)
- the last frame vs frame 0: only encoder noise (a loop must not jump)
- each probe (seconds:x,y) prints its decoded color, to check an accent or a surface
Exits non-zero when a check fails.
"""

import argparse
import glob
import os
import subprocess
import sys

import imageio_ffmpeg
import numpy as np

FF = imageio_ffmpeg.get_ffmpeg_exe()


def frame(path, index, width=1920, height=1080):
    raw = subprocess.run(
        [FF, "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{index})", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(height, width, 3).astype(int)


def duration_of(path):
    info = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    hms = info.split("Duration: ")[1].split(",")[0]
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--bg", default="10,10,10")
    parser.add_argument("--fps", type=int, default=60)
    parser.add_argument("--size", default="1920x1080")
    parser.add_argument("--probe", action="append", default=[])
    args = parser.parse_args()

    width, height = (int(v) for v in args.size.split("x"))
    bg = np.array([int(v) for v in args.bg.split(",")])
    last = round(args.duration * args.fps) - 1
    failed = False
    files = sorted(glob.glob(os.path.join(args.folder, "*.mp4")) + glob.glob(os.path.join(args.folder, "*.webm")))
    for path in files:
        name = os.path.basename(path)
        dur = duration_of(path)
        first, end = frame(path, 0, width, height), frame(path, last, width, height)
        center = first[height // 2, width // 2]
        diff = np.abs(first - end).max(axis=2)
        noisy = int((diff > 3).sum())
        ok_dur = abs(dur - args.duration) < 1.5 / args.fps
        ok_bg = bool(np.all(np.abs(center - bg) <= 2))
        ok_seam = noisy < 0.001 * width * height and diff.max() < 24
        failed |= not (ok_dur and ok_bg and ok_seam)
        print(f"{name}: {dur:.3f}s {'ok' if ok_dur else 'WRONG'} | bg {center.tolist()} {'ok' if ok_bg else 'OFF (color range?)'} | seam {noisy}px>3 max {int(diff.max())} {'ok' if ok_seam else 'JUMPS'}")
        for probe in args.probe:
            when, point = probe.split(":")
            x, y = (int(v) for v in point.split(","))
            print(f"    probe {probe}: {frame(path, round(float(when) * args.fps), width, height)[y, x].tolist()}")
    if not files:
        print("no .mp4 or .webm files found")
        failed = True
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
