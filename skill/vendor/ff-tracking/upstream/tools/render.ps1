# Windows pipeline. Run from any directory with: powershell -File tools/render.ps1
param([string]$Python = 'python')

$ErrorActionPreference = 'Stop'
function Assert-Success([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit $LASTEXITCODE)." }
}

Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    foreach ($command in @('cargo', 'ffmpeg', 'ffprobe', $Python)) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Required command '$command' was not found. See the Windows setup in README.md."
        }
    }
    & $Python -I -c 'import numpy, scipy'
    Assert-Success 'Python dependencies'

    cargo build --release -p hud -p flat -p lens
    Assert-Success 'Build'
    # Use Cargo metadata so custom target directories and .cargo/config.toml work too.
    $metadata = cargo metadata --no-deps --format-version 1
    Assert-Success 'Cargo metadata'
    $bin = Join-Path (($metadata | ConvertFrom-Json).target_directory) 'release'
    New-Item -ItemType Directory -Force out/pass | Out-Null
    & (Join-Path $bin 'tracks.exe')
    Assert-Success 'Track export'
    & (Join-Path $bin 'flat.exe') render -o out/pass/flat.mp4
    Assert-Success 'Flat render'
    & $Python -I tools/sfx.py
    Assert-Success 'Sound synthesis'
    & (Join-Path $bin 'lens.exe') render -o out/tracking.mp4
    Assert-Success 'Lens render'
    ffprobe -v error -show_entries stream=codec_type,width,height,nb_frames,duration -of compact out/tracking.mp4
    Assert-Success 'Output verification'
} finally {
    Pop-Location
}
