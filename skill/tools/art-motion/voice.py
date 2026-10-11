#!/usr/bin/env python3
"""Fit/match caller-supplied audio into a new file; optional local PCM preparation.

Adapted from MIT-licensed work by alchaincyf; see LICENSE in this directory.
Provider calls, credentials, registries and training are not exposed here.
"""
import argparse
from contextlib import contextmanager
from importlib import import_module
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
contained = import_module("font-subset").contained


@contextmanager
def temporary_audio(output):
    fd, name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=output.suffix, dir=output.parent)
    path = Path(name)
    try:
        os.close(fd)  # FFmpeg and Windows replacement need the mkstemp handle closed.
        yield path
    finally:
        path.unlink(missing_ok=True)


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True)


def ffprobe_duration(path):
    value = float(run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(path)]).stdout.strip())
    if not math.isfinite(value) or value <= 0:
        raise ValueError("input must contain an audio stream with positive duration")
    return value


def mean_volume(path):
    error = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af", "volumedetect", "-f", "null", "-"]).stderr
    match = re.search(r"mean_volume:\s*(-?[\d.]+) dB", error)
    if not match:
        raise ValueError("audio average level could not be measured")
    return float(match.group(1))


def transform(path, options):
    with temporary_audio(path) as temporary:
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path), "-vn", *options, str(temporary)])
        temporary.replace(path)


def fit_duration(path, target):
    current = ffprobe_duration(path)
    if abs(current - target) <= 0.05:
        return current
    ratio = current / target
    if not 0.9 <= ratio <= 1.1:
        raise ValueError("duration fitting exceeds the source's +/-10% adjustment limit")
    transform(path, ["-filter:a", f"atempo={ratio:.6f}"])
    duration = ffprobe_duration(path)
    if abs(duration - target) > 0.05:
        raise ValueError("fitted audio did not reach the target within 0.05 seconds")
    return duration


def match_loudness(path, target_db):
    gain = target_db - mean_volume(path)
    if abs(gain) >= 0.5:
        transform(path, ["-filter:a", f"volume={gain:.2f}dB"])
    return mean_volume(path)


def prepare_audio(path):
    transform(path, ["-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le"])


def process_audio(root, source_name, output_name, fit_seconds=None, match_db=None, prepare=False):
    root = Path(root).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("--root must be an existing directory")
    source = contained(root, source_name, "--input")
    output = contained(root, output_name, "--output", must_exist=False)
    if (root / output_name).is_symlink():
        raise FileExistsError("output is a symbolic link; choose a new output")
    if not source.is_file():
        raise ValueError("--input must be a file")
    if source.suffix.lower() not in (".wav", ".mp3") or output.suffix.lower() != source.suffix.lower():
        raise ValueError("input/output must use the same .wav or .mp3 extension")
    if prepare and output.suffix.lower() != ".wav":
        raise ValueError("--prepare requires a .wav output")
    if fit_seconds is not None and (not math.isfinite(fit_seconds) or fit_seconds <= 0):
        raise ValueError("--fit-seconds must be finite and positive")
    if match_db is not None and (not math.isfinite(match_db) or match_db > 0):
        raise ValueError("--match-db must be finite and at most 0 dB")
    sidecar = output.with_name(output.name + ".json")
    if output.exists() or sidecar.exists() or sidecar.is_symlink():
        raise FileExistsError("output or sidecar already exists; choose a new output")
    ffprobe_duration(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    with temporary_audio(output) as staged:
        shutil.copyfile(source, staged)
        if prepare:
            prepare_audio(staged)
        if fit_seconds is not None:
            fit_duration(staged, fit_seconds)
        if match_db is not None:
            match_loudness(staged, match_db)
        duration = ffprobe_duration(staged)
        average_db = mean_volume(staged)
        if sidecar.exists() or sidecar.is_symlink():
            raise FileExistsError("sidecar was created during processing; choose a new output")
        os.link(staged, output)  # Existing outputs also survive a concurrent publisher.
    return {"ok": True, "input": source_name, "output": output_name, "durationSec": duration, "meanVolumeDb": average_db, "preparedPcm": prepare}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True)
    parser.add_argument("--input", required=True, help="existing project-relative .wav or .mp3")
    parser.add_argument("--output", required=True, help="new project-relative file; existing output/sidecar refused")
    parser.add_argument("--fit-seconds", type=float)
    parser.add_argument("--match-db", type=float, help="average dBFS, separate from delivery LUFS mastering")
    parser.add_argument("--prepare", action="store_true", help="prepare supplied WAV as 24 kHz mono PCM; no upload or training")
    args = parser.parse_args()
    try:
        print(json.dumps(process_audio(args.root, args.input, args.output, args.fit_seconds, args.match_db, args.prepare)))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        detail = exc.stderr.strip().splitlines()[-1] if isinstance(exc, subprocess.CalledProcessError) and exc.stderr else str(exc)
        print(json.dumps({"ok": False, "error": detail}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
