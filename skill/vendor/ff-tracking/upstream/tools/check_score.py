#!/usr/bin/env python3
"""Compare the unchanged Python score and Rust score using the same Slab resources.

    SLAB=/path/to/slab python3 tools/check_score.py --render

Runs in temporary directories: the committed project, WAV and event exports
are never rewritten. Python slabkit's usual numpy dependency is required.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile


def compare(actual, expected, path=""):
    if isinstance(expected, dict):
        assert isinstance(actual, dict) and actual.keys() == expected.keys(), f"{path}: object keys differ"
        for key in expected:
            compare(actual[key], expected[key], f"{path}/{key}")
    elif isinstance(expected, list):
        assert isinstance(actual, list) and len(actual) == len(expected), f"{path}: array lengths differ"
        for i, (a, e) in enumerate(zip(actual, expected)):
            compare(a, e, f"{path}/{i}")
    else:
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"


def wav_payload(path):
    data = path.read_bytes()
    assert data[:4] == b"RIFF" and data[8:12] == b"WAVE"
    chunks = {}
    offset = 12
    while offset + 8 <= len(data):
        kind, size = struct.unpack_from("<4sI", data, offset)
        chunks[kind] = data[offset + 8:offset + 8 + size]
        offset += 8 + size + size % 2
    return chunks[b"fmt "], chunks[b"data"]


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slab", type=Path, default=os.environ.get("SLAB"), help="built Slab checkout (with tools/slabkit)")
    parser.add_argument("--video", type=Path, default=root, help="checkout with out/tracks.json and out/camera.json")
    parser.add_argument("--render", action="store_true", help="also compare float32 render samples exactly")
    args = parser.parse_args()
    if args.slab is None:
        parser.error("set SLAB or use --slab to name a built Slab checkout")
    slab = Path(args.slab).resolve()
    binary = slab / "zig-out/bin/slab"
    if not binary.is_file():
        parser.error(f"{binary} is missing; build Slab first")
    events = json.loads((args.video / "out/tracks.json").read_text())
    camera = json.loads((args.video / "out/camera.json").read_text())
    env = dict(os.environ, SLAB=str(slab), PYTHONPATH=str(slab / "tools"))
    with tempfile.TemporaryDirectory(prefix="ff-score-parity-") as temp:
        temp = Path(temp)
        # Exercise original inputs and changed timing/positions/zoom. A copied
        # Python script puts its default project next to that copy, safely.
        for scenario in ["original", "changed"]:
            directory = temp / scenario
            out = directory / "out"
            out.mkdir(parents=True)
            ev = json.loads(json.dumps(events))
            cam = json.loads(json.dumps(camera))
            if scenario == "changed":
                ev["keys"][0] += 0.01
                ev["cuts"][2] += 0.01
                ev["locks"][1] += 1.0 / ev["fps"]
                for i, frame in enumerate(cam["frames"]):
                    frame["focus_screen"][0] += 90
                    frame["centre_screen"][0] -= 45
                    frame["zoom"] *= 1 + i % 15 * 0.01
            (out / "tracks.json").write_text(json.dumps(ev))
            (out / "camera.json").write_text(json.dumps(cam))
            shutil.copyfile(root / "score/score.py", directory / "score.py")
            subprocess.run([sys.executable, str(directory / "score.py"), "--video", str(directory)], env=env, check=True, cwd=root)
            rust = directory / "rust.slab"
            subprocess.run(["cargo", "run", "--locked", "-p", "score", "--", "--video", str(directory), "--project", str(rust)], env=env, check=True, cwd=root)
            python = directory / "ff_tracking.slab"
            compare(json.loads((rust / "project.json").read_text()), json.loads((python / "project.json").read_text()))
            print(f"{scenario}: Python and Rust projects match exactly", flush=True)
            if args.render:
                paths = []
                for name, project in [("python", python), ("rust", rust)]:
                    wav = directory / f"{name}.wav"
                    subprocess.run([str(binary), str(project), "--render", str(wav), "--bits", "32f", "--no-dither"], env=env, check=True, cwd=slab)
                    paths.append(wav)
                assert wav_payload(paths[0]) == wav_payload(paths[1]), f"{scenario}: rendered samples differ"
                print(f"{scenario}: float32 render samples match exactly", flush=True)


if __name__ == "__main__":
    main()
