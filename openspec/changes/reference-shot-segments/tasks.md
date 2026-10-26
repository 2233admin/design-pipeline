# Tasks

## 1. Change records

- [x] 1.1 proposal.md and the `design-pipeline` spec delta; Relates to #192.
- [x] 1.2 `npm exec -- openspec validate reference-shot-segments --strict` and `npm run specs:check`.

## 2. Behaviour

- [x] 2.1 `film-core.cjs`: onset strength and silence intervals from the existing onset decoder; `detectOnsets` keeps its output.
- [x] 2.2 `reference-video-core.cjs`: `--shots` segmentation, per-shot frame budget and limitations, per-shot motion and sound fields, labelled overview.
- [x] 2.3 Report validation accepts the new optional fields and keeps old reports valid.
- [x] 2.4 `cli-core.cjs`: `--shots`, `--cut-threshold`, `--min-shot` registered and in help.

## 3. Docs and tests

- [x] 3.1 Reference-stage docs name `--shots` for shot-for-shot work.
- [x] 3.2 Tests in `tests/reference-video.test.cjs`: synthetic three-shot source with a tone and a silence; budget shortfall names the shot; window mode unchanged.
- [ ] 3.3 `npm test`.
- [x] 3.4 Run on the 99.8 s reference: shot count against the hand count of 90, cut error, the 8.95 s scream and the 7.9-8.9 s silence.
