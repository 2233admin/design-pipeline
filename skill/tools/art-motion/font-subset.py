#!/usr/bin/env python3
# /// script
# dependencies = ["fonttools>=4.0"]
# ///
"""Subset a caller-provided font to explicitly supplied or scanned project text."""

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

MAX_TEXT_CHARS = 50000
MAX_JS_FILES = 1000
MAX_FONT_BYTES = 64 * 1024 * 1024
MAX_TEXT_BYTES = 8 * 1024 * 1024
JS_STRING = re.compile(r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`", re.S)


def contained(root: Path, raw: str, label: str, must_exist: bool = True) -> Path:
    if not raw or Path(raw).is_absolute() or re.match(r"^[a-zA-Z]:", raw) or "\\" in raw:
        raise ValueError(f"{label} must be a relative path using forward slashes")
    parts = raw.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError(f"{label} must not contain empty, '.' or '..' path segments")
    base = root.resolve(strict=True)
    target = (base / Path(*parts)).resolve(strict=must_exist)
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError(f"{label} resolves outside --root") from exc
    if must_exist and not target.exists():
        raise ValueError(f"{label} does not exist: {raw}")
    return target


def read_bounded_bytes(file: Path, limit: int, label: str) -> bytes:
    with file.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f"{label} exceeds the {limit}-byte aggregate text limit")
    return data


def source_strings(directory: Path, root: Path, text_budget: list[int]) -> str:
    files = []
    for file in directory.rglob("*.js"):
        files.append(file)
        if len(files) > MAX_JS_FILES:
            raise ValueError(f"scan directory contains more than {MAX_JS_FILES} JavaScript files")
    chunks = []
    for file in sorted(files):
        resolved = file.resolve(strict=True)
        try:
            resolved.relative_to(root)
        except ValueError as exc:
            raise ValueError(f"scanned file escapes --root: {file}") from exc
        remaining = MAX_TEXT_BYTES - text_budget[0]
        source_bytes = read_bounded_bytes(resolved, remaining, "scanned JavaScript/text")
        text_budget[0] += len(source_bytes)
        source = source_bytes.decode("utf-8")
        # This is intentionally a string-literal scanner, not a JavaScript parser. Removing
        # full-line comments avoids counting prose while keeping scanning deterministic.
        source = "\n".join(line for line in source.splitlines() if not line.lstrip().startswith("//"))
        chunks.extend(match.group(0)[1:-1] for match in JS_STRING.finditer(source))
    return "".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="workspace root; all paths below it must be contained")
    parser.add_argument("--font", required=True, help="font file relative to --root (TTF/OTF/WOFF supported by fontTools)")
    parser.add_argument("--output", required=True, help="new .woff output path relative to --root; existing files are refused")
    parser.add_argument("--text", action="append", default=[], help="literal text to preserve; repeat as needed")
    parser.add_argument("--text-file", action="append", default=[], help="UTF-8 text file relative to --root")
    parser.add_argument("--scan-js", action="append", default=[], help="contained directory; include characters in simple JS string literals")
    parser.add_argument("--allow-missing", action="store_true", help="write the subset while reporting source-font-missing glyphs")
    args = parser.parse_args()

    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError as exc:
        print(json.dumps({"ok": False, "error": "fontTools is required; run this script with a scoped fontTools environment (for example, uv run --with fonttools python ...). It never installs dependencies."}), file=sys.stderr)
        return 2

    try:
        root = Path(args.root).resolve(strict=True)
        if not root.is_dir():
            raise ValueError("--root must be an existing directory")
        font_path = contained(root, args.font, "--font")
        output = contained(root, args.output, "--output", must_exist=False)
        if font_path.stat().st_size > MAX_FONT_BYTES:
            raise ValueError("font exceeds the 64 MiB input limit")
        if output.exists():
            raise ValueError(f"output already exists: {args.output}")
        if output.suffix.lower() != ".woff":
            raise ValueError("--output must end in .woff")
        text_parts = list(args.text)
        text_budget = [sum(len(part.encode("utf-8")) for part in text_parts)]
        if text_budget[0] > MAX_TEXT_BYTES:
            raise ValueError("literal text exceeds the 8 MiB aggregate text limit")
        for name in args.text_file:
            file = contained(root, name, "--text-file")
            remaining = MAX_TEXT_BYTES - text_budget[0]
            content = read_bounded_bytes(file, remaining, "text files")
            text_budget[0] += len(content)
            text_parts.append(content.decode("utf-8"))
        for name in args.scan_js:
            directory = contained(root, name, "--scan-js")
            if not directory.is_dir():
                raise ValueError(f"--scan-js is not a directory: {name}")
            text_parts.append(source_strings(directory, root, text_budget))
        text = "".join(text_parts)
        if not text:
            raise ValueError("provide at least one --text, --text-file or --scan-js source")
        if len(text) > MAX_TEXT_CHARS:
            raise ValueError(f"requested text exceeds {MAX_TEXT_CHARS} characters")
        requested = sorted(set(text))
        font = TTFont(font_path)
        cmap = font.getBestCmap() or {}
        missing = [char for char in requested if not char.isspace() and ord(char) not in cmap]
        if missing and not args.allow_missing:
            raise ValueError("source font lacks requested glyphs: " + "".join(missing))
        options = subset.Options()
        options.flavor = "woff"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        worker = subset.Subsetter(options)
        worker.populate(text="".join(requested))
        worker.subset(font)
        output.parent.mkdir(parents=True, exist_ok=True)
        font.flavor = "woff"
        temp_path = None
        try:
            fd, temp_name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=".tmp", dir=output.parent)
            temp_path = Path(temp_name)
            with os.fdopen(fd, "wb") as stream:
                font.save(stream)
            # Hard-link publication is atomic and fails if the destination already exists.
            os.link(temp_path, output)
        finally:
            if temp_path is not None:
                try:
                    temp_path.unlink()
                except FileNotFoundError:
                    pass
        print(json.dumps({"ok": True, "font": args.font, "output": args.output, "requestedUniqueCharacters": len(requested), "missingGlyphs": missing, "bytes": output.stat().st_size, "scannerNote": "--scan-js reads simple string literals and is not a JavaScript parser; explicitly include generated or escaped text with --text/--text-file."}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
