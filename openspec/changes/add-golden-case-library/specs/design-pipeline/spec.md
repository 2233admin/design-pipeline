# Design pipeline delta

## Requirement: golden case library
The repository SHALL keep golden cases per deliverable type outside the shipped package. Each case
SHALL record its brief, the user's approval state (with the sha256 of the reviewed render once
decided), the rules behind its choices, and counter-examples that apply one named defect to the
golden. Repository QA SHALL fail when a golden fails a storyboard, score or timeline gate, when a
counter-example does not produce the finding codes it names, or when a rule claims gate
enforcement without a counter-example that exercises it.

## Requirement: planned cuts found by pixel change
The render gate SHALL count a planned hard cut or match cut as present when either the scene
detector or the one-step pixel-change detector used for carried boundaries finds it.

## Requirement: fades do not carry handoffs
The timeline gate SHALL NOT accept a tween that animates only opacity as the subject carrying a
planned continuation, morph or camera-carry handoff.
