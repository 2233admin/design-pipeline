# Design

This change is a scope and principle change; it modifies no runtime behavior.

- `openspec/project.md`: new purpose statement, a Capability Model section, and product-boundary
  entries for animation/film, composition/art direction and model-independent output quality.
- `skill/SKILL.md` frontmatter description: leads with code-carried art and design literacy so
  routing surfaces the skill for composition, motion and film requests, not only frontend.
- `README.md`: a short positioning section ahead of the existing introduction.

Consequences for future changes: new capability work should arrive as gates with fix hints,
parameterized templates, or cross-model evals under the existing benchmark contract, and must keep
creative acceptance separate. The film gates (`codify-product-film-gates`,
`film-timeline-and-model-evals`, `polish-film-toolchain`) are the reference implementation.
The next planned capability is a static visual-composition gate over rendered screenshots.
