# Design

## Context

See proposal.md for why. Current code (checked):

- **Browser.** The probe (`verify interaction`) runs `capture-interaction.cjs` as a kernel process.
  - It resolves `puppeteer-core` from the project (`resolvePuppeteer` in `film-capture-core.cjs`, re-worded by
    the unexported `interactionPuppeteer`) and the browser (`resolveBrowser`, `browserIdentity` in
    `browser-locate.cjs`).
  - It loads `index.html` over `file://` and takes no screenshots. Nothing in the web workflow serves the page.
- **Sections.**
  - A section is the element carrying `data-section="<id>"`; `web.cjs` finds markers by regex on the HTML
    with comments stripped.
  - Nothing lists the elements inside a section. Quick pages need no sections at all.
- **Two notions of page version exist.**
  - `pageDigest(root)` (`web.cjs`, not exported) hashes `index.html`, `component-manifest.json` and the local
    `src`/`href` files; section verdicts store it as `pageSha256`.
  - The final review binds `reviewInputHashes`, the probe's request-log lineage (exact, but only after a probe).
- **Final review.**
  - `REVIEW.action` (`shared.cjs`) returns an ask with a single `record` template
    `... --stage review --verdict accept|reject [--answer "<reason>"]`, and no `accept` field.
  - `withRoles` stamps `--by owner`, since review is locked to the owner.
  - An accept needs no `--answer`. The decide review branch in `workflow-core.cjs` is shared by film, edit, ui
    and web.
  - `renderStatement` reads `decisions.roles`, whose entries carry no input hashes.
- **Rules.** `activeRules` returns `label: text` strings to the agent; `statementLine` renders the statement.
  Neither knows about elements.

## Goals / Non-Goals

**Goals:**
- One command gives the owner a numbered picture of the page they can answer by reference.
- A cited reference is checked against the page the owner saw, and its meaning travels with the rule to the
  agent that revises the page.
- The final acceptance carries the owner's words on a known version.

**Non-Goals:**
- **Stable references across versions.**
  - References are per page version, like a revision sheet.
  - The rule keeps the selector and text, so an old comment still says what it meant.
  - Mapping old references to new ones needs the per-element comparison of phase 3b.
- **Phase 3b:** click-to-comment, before/after, the page change tier, a mobile capture.
- **Unreachable elements:** shadow DOM and iframe contents get no reference.
- **runtime-review Records.** A reference is not a UI IR object. `--evidence` keeps working unchanged.
- **Removing `--by owner` or proving who spoke.** This is a narrower step than design-owner-attention G:
  - `--by` stays a claim;
  - the owner's words make it checkable;
  - the acceptance binds the probe lineage, which is what was checked.
  - Confirmation through a page action comes with phase 3b.

## Decisions

### 1. `evidence refs` runs its own kernel

- **Files.**
  - `page-refs-core.cjs` holds the in-page numbering and badge code, plus the Node side.
  - `capture-refs.cjs` is the kernel process.
  - Both reuse `resolvePuppeteer`, `resolveBrowser` and `browserIdentity`, with refs-worded messages.
- **CLI.**
  - `evidence refs --root R --project-root R` is a new branch in `evidenceCommand`.
  - It writes through `contained(projectRoot, "evidence/...", false)` to `evidence/refs.json` and
    `evidence/refs.png`.
- **`refs.json`.**
  - Shape: `{schema: "design-pipeline.page-refs.v1", page, viewport, browser, capturedAt,
    refs: [{ref, section, selector, tag, text, box}]}`, where `section` is null outside sections.
  - `page` is `pageDigest(root)`, exported from `web.cjs`. A refs capture and a section verdict therefore name
    the same version, and refs work before any probe.
- **Current capture.** When `refs.json.page` already equals the current digest, the command returns
  `{status: "current"}` and writes nothing. A reference the owner has seen never changes meaning.
- **Moving page.** The digest is computed before and after the capture. If it moved, the command exits 1 and
  writes nothing.
- **Alternatives considered.**
  - Fold it into the probe. Rejected: section reviews happen during the build, before a probe exists.
  - `evidence capture` with an adapter. Rejected: it needs an adapter and a receipt per run, and it numbers
    nothing.
  - A `--replace` flag. Rejected: an unchanged page needs no recapture.

### 2. What gets a reference

- **Settle first.**
  - Load at 1440×900, then scroll to the bottom in viewport steps and back, so scroll-reveal content settles.
  - Wait for fonts.
  - Measure, then screenshot with `fullPage` and `captureBeyondViewport`, so `100vh` sections are not
    re-laid out between measuring and drawing.
- **Candidates.**
  - Text: `h1`–`h6`, `p`, `li`, `blockquote`, `figcaption`, `label`.
  - Interactive: `a`, `button`, `input`, `select`, `textarea`, `summary`, `[role=button|link]`.
  - Media: `img`, `picture`, `video`, `[role=img]`, and an `svg` not inside another candidate.
- **Visible** means:
  - a box of at least 1×1;
  - not `display: none`, `visibility: hidden` or `opacity: 0` after settling.
- **Nesting.**
  - An interactive element is always numbered, even inside a text candidate.
  - Any other candidate inside a numbered candidate is skipped.
  - Plain `div`/`span` are never candidates.
- **References.**
  - In DOM order: `<section>-<n>` inside a `data-section` region whose id matches `SECTION_ID`, and `<n>`
    outside every section. A quick page with no sections is numbered `1, 2, 3`.
  - A region with an invalid id counts as outside.
  - A repeated id continues its numbering.
  - Section references always contain `-` and outside references never do, so they cannot collide.
- **Selector and text.**
  - Selector: a CSS path from the section root (or `body`) with `:nth-of-type`, the section id passed through
    `CSS.escape`.
  - Text: the visible text, or `alt`/`aria-label` for media. Control characters are stripped, whitespace is
    collapsed, and the text is cut to 80 characters. It is data and is never put into a returned command.
- **Alternative:** number every element. Rejected: wrappers and inline spans would bury the useful references.

### 3. Badges exist only in the browser

- The kernel adds one absolutely positioned layer, in a shadow root, with a badge at each element's top-left.
  It takes the screenshot, and the page is never saved.
- `index.html` stays the shipped bytes.
- **Alternative:** the agent writes `data-ref` into `index.html`. Rejected: the shipped page would carry review
  markup.

### 4. `--ref` is checked against the current capture

- `--ref` goes in `REPEATABLE_OPTIONS` and is passed by decide. It is valid only with `--answer`, on a web
  rejection at `section` or `review`.
- **Checks:**
  - each reference is in `refs.json`;
  - `refs.json.page` equals `pageDigest(root)`;
  - at a section, `ref.section` equals `--choice`.
- Repeated references are deduplicated.
- The refs attach to the rule made from `--answer`. Rules from cited `--evidence` are unchanged.
- **Rule shape.** The rule's `object` gains `refs: [{ref, tag, selector, text}]`.
  - `retired`, `candidates`, `widen` and `isProject` read only `object.stage` and `object.choice`, so the extra
    field does not change them.
- **Display.**
  - `activeRules` appends `(on hero-2 a "Reserve")` to the text the agent receives.
  - `statementLine` adds `on hero-2 a "Reserve"` to its scope.
- A director's section rejection works the same way. Review is locked to the owner, so no delegation applies
  there.
- **Alternative:** put the reference into the rule text. Rejected: the owner's words stay their own, and the
  structured refs survive for phase 3b.

### 5. The web final acceptance needs the owner's words

- **Scope.** When `state.deliverable === "web"`, an owner accept at `review` needs `--answer` that passes
  `reason()`:
  - at least two words, where each CJK character counts as one, so "可以" passes and "ok" does not;
  - no `<` and `>` pair, which would mean an unedited placeholder.
- **Other deliverables.** Film, edit and ui accepts are unchanged.
- **Returned template.** `REVIEW.action` for web returns
  `record: ... --stage review --verdict accept|reject --answer "<the owner's words: their acceptance, or what is wrong>"`.
  - There is exactly one quoted placeholder, as the returned-command execution test requires.
  - Its instruction says to record only words the owner gave, and how to add `--ref`.
- **Version on the role entry.** `stampRecord` stores `version` (`sha256` of `canonicalJson` of the
  `inputHashes` the draft bound, first 12 hex characters) on web review entries.
- **Statement.**
  - "Owner acceptance" reads the latest owner review entry.
  - An accept shows the words and the version.
  - A later reject shows that the latest owner review was a rejection.
- **Earlier version.** When the latest draft is an owner accept whose inputs differ from the current ones, the
  review `first` says "The owner accepted an earlier version at <at>; show them the current page and ask
  again".

### 6. Owner-facing asks offer the references

- **When a capture is missing or old.**
  - This applies to a kept section review, and to the web final review.
  - `first` gains the step "run `<cli> evidence refs ...` and then `next` again to show the numbered page; if
    the capture fails, ask in text".
  - The step is appended to any existing `first`, such as the revise-after-reject text.
- **When the capture is current.**
  - `evidence/refs.png` joins `show`.
  - `first` says to show it and to ask for references.
- **Delegated self-checks.** They get no capture step: `ownerFacing` strips the `first`, as it does today. Their
  `correction` template is unchanged; the owner's correction is relayed in text.
- **Alternative:** return a `run` action for the capture before the ask. Rejected: a missing browser would block
  building, and self-checks would launch a browser per section for no one.

## Risks / Trade-offs

- **[A reference shifts after an edit]**
  - Comments keep the selector and text.
  - `--ref` against an old capture is refused.
  - A current capture is never overwritten.
- **[Badges cover content]** Badges are small and sit at the top-left of each element. The owner can open the page
  itself.
- **[A dense section gets many references]** Wrappers and nested content are skipped. A long list still gets one
  reference per item, which a comment on the third item needs.
- **[Mobile-only controls are missing]**
  - The capture is desktop only, and this is stated in the action text.
  - A mobile capture comes with phase 3b.
- **[Breaking: the agent needs the owner's words to finish a web page]** This is intended. An agent that never
  asked cannot quote an answer.
- **[No browser in the environment]**
  - References are optional: the ask falls back to text.
  - Only `--ref` needs a capture.

## Migration

- `refs.json` and `refs.png` are new files under `evidence/`.
- A rule `object` may gain `refs`, and a web review role entry may gain `version`.
- Owner accepts recorded before this change stay valid. Only a new web accept needs `--answer`.
- The test helpers and callers that record a web review accept without `--answer` are updated (tasks).
- **Rollback:** reverting ignores the new fields and files.
