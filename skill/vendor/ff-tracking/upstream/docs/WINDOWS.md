# Windows setup

The Windows build uses Vulkan in place of Metal. Scenes, camera math, shader and
sound synthesis are unchanged.

## Requirements

- 64-bit Windows and a Vulkan-capable GPU with current drivers.
- [Rust](https://rustup.rs/) with the MSVC toolchain.
- Visual Studio Build Tools with **Desktop development with C++**, including a Windows SDK.
- Python 3 with `numpy` and `scipy`.
- LLVM/libclang, available from [LLVM releases](https://github.com/llvm/llvm-project/releases).
- A **shared FFmpeg 9.0 development build**, with `bin`, `include` and `lib` directories.
  For example, use `ffmpeg-n9.0-latest-win64-gpl-shared-9.0.zip` from
  [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases/tag/latest).

A standalone `ffmpeg.exe` is insufficient: Rust links against FFmpeg libraries,
and build-time media processing loads the DLLs. See also
[fframes' Windows requirements](https://github.com/dmtrKovalenko/fframes#requirements).

## Render

In PowerShell, adjust the installation paths to match your machine:

```powershell
$env:FFMPEG_DIR = "C:\tools\ffmpeg-n9.0-latest-win64-gpl-shared-9.0"
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
$env:PATH = "$env:FFMPEG_DIR\bin;$env:PATH"

git clone https://github.com/mrsarac/ff-tracking
cd ff-tracking
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install numpy scipy
powershell -NoProfile -ExecutionPolicy Bypass -File tools/render.ps1 -Python .\.venv\Scripts\python.exe
# -> out/tracking.mp4
```

The execution-policy option applies only to this PowerShell process. Keep FFmpeg's
`bin` directory on `PATH` when running the built programs. The script accepts the
Python executable via `-Python`, stops on failed steps, restores the caller's
directory, and honors Cargo's configured target directory.

After rendering, the usual per-pass tools work:

```powershell
.\target\release\lens.exe preview
.\target\release\lens.exe strip all -n 12
.\target\release\lens.exe audio analyze
```

If you configured a custom Cargo target directory, use its `release` folder instead.

Windows uses the codecs from the shared FFmpeg installation, so the Cargo features
that request building codecs from source are enabled only for the original
non-Windows configuration. Windows limits the rendering pipeline to two GPU
contexts, two encoder workers and a small queue: each worker decodes the 4K first
pass, so unrestricted concurrency can exhaust memory, especially on longer edits.
The original macOS backend and concurrency setting remain unchanged.
