# Codify product-film gates

`references/product-film-direction.md` defines how a promotional film should be directed, but
none of it is enforced in code. Strong models follow the prose; weaker models regress to panels
that fade in, hold and fade out, and nothing in the pipeline rejects that result.

Encode the known failure shapes as deterministic gates and provide parametric choreography so
any model can build a demonstrable film by selecting and parameterizing patterns:

1. A structured `storyboard.json` contract and `verify film-storyboard` gate.
2. Objective render evidence via `verify film-render`: duration, scene cuts against planned
   handoffs, cut/audio-onset alignment, and a per-beat contact sheet for multimodal review.
3. A GSAP choreography library (`references/film-choreography/`) of seek-safe patterns.

Creative acceptance stays a separate reviewed state; gates never grant it. Timeline runtime
analysis and cross-model evals are deferred to a later change.
