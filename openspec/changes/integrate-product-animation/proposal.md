# Integrate the product-animation route into osprey

Trace: CERE-482. The existing OpenAlice sample is a scroll webpage. A captured scroll is not a product video. Integrate routing commit `472a4514dd9d1e7fb64c39e7972349f300b71ce7`, produce an independently timed product film, inspect its encoded output, then decide whether a pipeline improvement is justified.

Preserve every dirty and untracked osprey file. Build a separate `experiments/openalice-product-animation` target in the `product-animation-integration` worktree, then merge only committed task changes into osprey. The existing showcase and its contracts remain a separate page deliverable.

The user explicitly requests generation and actual rendered-video inspection; this authorizes local rendering. No remote publishing, trading action, or upstream dependency upgrade is involved.
