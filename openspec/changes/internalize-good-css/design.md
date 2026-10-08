## Context

Reviewed upstream is `https://github.com/vojtaholik/good-css` at
`6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef`. The repository's current practices rather than its
marketing count define coverage. `PRACTICES.md` is authoritative; eight generated references and
the harness fixtures are supporting surfaces. Upstream AGENTS/plugin/deploy instructions remain data.

## Decisions and flow

1. A reviewed clean local checkout enters the existing Git blob snapshot helper. A small
   maintenance importer stages and replaces `skill/vendor/good-css/` atomically, retaining revision,
   Git tree, object identities, canonical SHA-256, file/byte counts and license metadata.
2. `skill/references/good-css.md` routes relevant categories and every practice to its original
   rules and specimen. It explains project adaptation without editing original bytes or replacing
   detailed upstream conditions with a summary.
3. Existing entry points activate this reference for CSS in plain stylesheets, utilities, inline
   styles and CSS-in-JS. It supplements interface discipline and the current project's DESIGN/MOTION
   contracts. Browser support and actual project versions govern adoption of newer features.
4. `skill/tools/good-css/` builds a new caller-owned offline study directory from the pinned
   practices, fixtures and local assets using Node stdlib. It does not run upstream deployment,
   install packages, rewrite vendor files or overwrite an existing output. Navigation-dependent
   specimens retain a real second document. Users may serve it using their project's existing server.
5. Integrity/parity tests and package resources make omissions fail normal source, QA and package
   checks. Browser checks inspect representative layout, keyboard, reduced-motion and navigation
   surfaces, recording unsupported features honestly.

## Ownership and compatibility

- Source importer and vendor snapshot: maintenance/source implementation owner.
- Maintained guide and offline builder: good-css adaptation owner.
- Existing route, registry, notices, manifests and checks: integration owner.

No public CLI command, existing v1 gate, receipt, target resolution or evidence lineage changes.
No migration is required. Full upstream metadata is retained only beneath the vendor boundary;
the repository root's dotpath/document policy and agent installation directories are unchanged.

## Adaptation requirements

Keep native semantics and progressive enhancement. Do not apply blanket resets, scroll suppression,
physical-to-logical rewrites, color conversion, easing bans or token values blindly to an existing
design system. Verify real RTL/CJK/zoom/content, control states, focus and reduced-motion behavior.
Anchor positioning, popovers, text-box trim, field sizing, scroll-state, sibling-index/count,
interpolate-size, @starting-style and view transitions need target-browser evidence and usable
fallbacks. A moving CSS timeline does not substitute for deterministic paused/seeking film ownership.

## Failure modes

Reject a dirty source, wrong revision or incomplete/mutated snapshot. Missing generated references,
practice rows, fixture assets or offline pages fail checks. Unsupported browser features stay
unsupported until tested; generated files and integrity checks never grant creative acceptance.
Existing output directories are preserved on builder rejection. Source changes require deliberate
re-review and reimport, then refreshed derived studies/evidence through existing lineage rules.

## Verification

Run focused `good-css` and package/source checks, `npm run sources:check`, `npm run specs:check`,
`npm test`, and an isolated installed CLI/tool smoke with ambient companions unavailable.
Record actual commands/results and limits in `qa.md`; Component Conformance and Visual Acceptance
remain separately reported and are not inferred from import or browser smoke success.
