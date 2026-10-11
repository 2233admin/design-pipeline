# Offline audio lifecycle follow-up

Scope: adapt only the reviewed `koubo.py` file operations from
`57d67608ab458f57d9b153b1a2831b921e22498b` into the maintained tools layer.
Vendor files retain their committed bytes. Existing source providers, configuration,
training, image plans and receipts remain source reference; no cloud calls are added.

The maintained entry consumes caller-supplied audio and writes a new output under the
chosen project root. It exposes bounded duration fitting, average-level matching and
optional 24 kHz mono PCM preparation. The remote upload fallback/size policy is not
part of this local preparation. Delivery mastering still uses the existing audio tools.

Use the existing font-subset path boundary and exclusive hard-link publication pattern.
Create every FFmpeg temporary file beside the output, close its descriptor before
encoding/replacement, and remove it on success or failure. Reject existing output and
`<output>.json` paths; preserve supplied files. No new receipt or acceptance gate is added.

Planned checks: reproduce the pinned Windows descriptor failure; run actual FFmpeg
fit/match/preparation with a system temp directory on another drive; force processing
failure and final-publication races; reject existing outputs/sidecars and unsafe paths.
Verify the static sidecar-overwrite and request-binding candidates offline before
deciding whether their source-only interfaces need maintained changes.

## Performed checks

`tests/art-motion-voice.test.cjs` (then named after `koubo`): six checks pass, no failures or skips on Windows with
Python 3.14 and actual FFmpeg/ffprobe. Checks cover closed descriptors and replacement,
real 2-second supplied WAV fitting to 1.87 seconds, matching to -35 dBFS, 24 kHz mono
PCM output, source preservation, failed encoder cleanup, fit-range rejection,
concurrent output publication, existing output/sidecar/symbolic-link preservation, invalid paths
and non-finite input. No visual or creative acceptance follows from these checks.

The ignored `.design-pipeline/koubo-review/offline-probe.py` and `offline-probe.json`
record additional actual pinned-source probes and C:/F: volume checks:

- Raw `fit_duration` and `match_loudness` each fail with `PermissionError / WinError 32`
  while one mkstemp descriptor remains open. Raw `prepare_audio` returns with one
  descriptor still open. The probe closes and removes these temporary resources.
- Both maintained C: output/F: OS temp and F: output/C: OS temp passes produce
  1.869375-second, -35 dBFS audio. All four per-run allocations stay beside the output;
  source bytes stay unchanged and no temporary files remain.
- Raw `capabilities.py use-audio` overwrites an existing `<output>.json` with one
  writer while the audio output path is free. The maintained helper refuses that path.
- Raw `images.accept` accepts a plan with a changed prompt and the original unchanged
  receipt, recording the changed prompt hash. This confirms the missing full-request
  binding; the raw plan/receipt path remains source-only and is not admitted as pipeline
  evidence. The existing v1 toolchain receipt continues to bind `planSha256`.

The checked raw `koubo.py` SHA-256 is
`7837507e6bf02b20f8aa63efdc881c8de0d5de775b4bf31a1040bd3824348494`.
No credentials were read, no cloud synthesis/training/image call ran, and no remote
service availability or speech quality was validated. Imported vendor bytes remain
unchanged. The offline entry disables bytecode before importing its existing path
helper; tests/probes run Python with `-B` so package files do not acquire test caches.
