# Design: Exact static-reference reconstruction

`reference-evidence.json` v2 records what the image means:

- role: primary target, constraint, or inspiration;
- requested fidelity;
- effective fidelity;
- explicit downgrade status;
- reconstruction artifact.

`reconstruction.json` records how the target frame is generated:

```text
source image space
  -> rectified canonical/object space
  -> world-space geometry
  -> locked camera space
  -> rendered image space
  -> independent final comparison
```

The geometry gate validates artifact existence and recomputes landmark error. The final gate
requires an EvidencePort capability probe and a receipt that binds pixel/SSIM metrics to the exact
reference, implementation, and diff bytes.

Exit `2` means the evidence is blocked or incomplete. Exit `3` means evidence is complete but
measured fidelity is outside the declared threshold.
