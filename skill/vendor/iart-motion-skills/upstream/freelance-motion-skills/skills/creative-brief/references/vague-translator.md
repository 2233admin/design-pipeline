# Vague-Adjective Translator

Clients describe motion in feelings. Translate each feeling into concrete, decidable questions. Always offer bounded choices (A or B), never an open prompt.

## Adjective → concrete questions

| Client says | Ask which of these they mean |
|---|---|
| "Clean" | Minimal layout? / lots of negative space? / limited palette (2-3 colours)? / slow, smooth easing? |
| "Modern" | Flat 2D? / bold geometric type? / muted gradient palette? / fast snappy cuts? |
| "Pop / punchy" | Saturated colour? / fast cuts (<1s holds)? / bouncy overshoot easing? / big scale jumps? |
| "Premium / high-end" | Slow easing? / restrained palette? / serif or refined type? / lots of breathing room? / subtle depth/light? |
| "Fun / playful" | Bouncy easing? / bright primaries? / character/illustration? / sound-effect-led? |
| "Dynamic" | Camera moves? / fast pacing? / continuous motion (no static holds)? / 3D space? |
| "Smooth" | Long ease-in-out curves? / no hard cuts (morphs/transitions)? / consistent slow speed? |
| "Bold" | Heavy type weight? / high contrast? / full-bleed colour? / large scale? |
| "Cinematic" | 2.39:1 framing? / shallow depth of field? / slow push-ins? / graded/film-look colour? |
| "Tech / futuristic" | HUD/UI motifs? / glow and grids? / cold palette? / glitch/data textures? |
| "Organic / human" | Hand-drawn frames? / irregular timing? / warm palette? / textured (grain/paper)? |
| "Simple" | One idea per scene? / no more than 2 elements moving at once? / single transition type? |

## Bounded-choice patterns

Use these structures to force a decision without asking the client to design:

- **A-or-B**: "Closer to A (calm, premium, slow) or B (punchy, bold, fast)?"
- **Pick-and-flaw**: "Of these three, which is nearest — and what is wrong with it?"
- **One-line forcing**: "If the viewer keeps only one sentence, which?"
- **Band anchoring**: "Usually X-Y for this — which end are we?"
- **Rank-don't-list**: "Rank these three messages 1-3; the brief carries #1."

## Tone guardrail rule

Every tone descriptor needs a "but not." It prevents most revisions:
- "playful, but not childish"
- "premium, but not cold"
- "bold, but not aggressive"
- "simple, but not boring"

If the client gives adjectives with no "but not," supply candidate guardrails and let them pick.
