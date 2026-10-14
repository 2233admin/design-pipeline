# Design

## Context

See proposal.md for why. Current code (checked):

- **Browser.** The probe (`verify interaction`) runs `capture-interaction.cjs` as a kernel process. It finds
  `puppeteer-core` in the project (`interactionPuppeteer`) and the browser (`browser-locate.cjs`), and loads
  `index.html` over `file://`. It takes no screenshots. Nothing in the web workflow serves the page.
- **Sections.** A section is the element carrying `data-section="<id>"`; `web.cjs` finds markers by regex on
  the HTML with comments stripped. Nothing lists the elements inside a section.
- **Page version.**
  - `pageDigest(root)` (`web.cjs`, not exported) hashes `index.html`, `component-manifest.json` and the local
    `src`/`href` files; section verdicts store it as `pageSha256`.
  - The final review binds `reviewInputHashes`, which is the probe's request-log lineage.
- **Final review.**
  - `next` returns an ask whose `record` is `... --stage review --verdict accept|reject [--answer "<reason>"]`;
    `withRoles` stamps `--by owner`.
  - An accept needs no `--answer`, and the drafts record keeps `reason` and `inputHashes`.
  - The statement's "Owner acceptance" line quotes the latest owner review answer.
- **Section review.** Its instruction tells the agent to have the owner name elements in text and never to offer
  clicking (spec "Section comments may cite runtime-review Feedback").

## Goals / Non-Goals

**Goals:**
- One command gives the owner a numbered picture of the page they can answer by number.
- A cited number is checked against the page the owner saw, and its meaning is kept in the rule.
- The final acceptance is the owner's words on a known version.

**Non-Goals:**
- **Stable numbers across versions.** Numbers are per page version, like a revision sheet. The rule keeps the
  selector and text, so an old comment still says what it meant. Mapping old numbers to new ones needs the
  per-element comparison of phase 3b.
- **Click-to-comment, before/after and the page change tier.** These are phase 3b.
- **runtime-review Records.** A number is not a UI IR object, and runtime-review needs inputs an ordinary web
  project does not have. `--evidence` keeps working unchanged.
- **Proving who spoke.** `--by` stays a claim; the owner's words make the claim checkable, not proven.

## Decisions

### 1. `evidence refs` runs its own kernel beside the probe's

- **What it is:** a new kernel `capture-refs.cjs` with the numbering in a new `page-refs-core.cjs`. It reuses
  `interactionPuppeteer`, `resolveBrowser` and `browserIdentity`, loads `index.html` over `file://` at
  1440×900, numbers the elements, draws the badges, takes a full-page screenshot and returns JSON.
- **CLI:** `evidence refs --root R --project-root R` (`evidence` already holds capture and check).
  - It writes `evidence/refs.json` and `evidence/refs.png`.
  - `refs.json` holds `{schema: "design-pipeline.page-refs.v1", page: pageDigest(root), viewport, browser,
    refs: [{ref, section, selector, tag, text, box}]}`.
- **`pageDigest`** is exported from `web.cjs` and used as is, so a section verdict and a refs capture name the
  same version.
- **Alternatives:**
  - Fold it into the probe. Rejected: section reviews happen during the build, before any probe exists.
  - Use `evidence capture` with a Playwright adapter. Rejected: it needs an adapter and a receipt per run, and it
    numbers nothing.

### 2. What gets a number

- **Scope:** inside each `[data-section]`, in document order.
- **Candidates:**
  - headings `h1`–`h6`, `p`, `li`, `blockquote`, `figcaption`, `label`;
  - `a`, `button`, `input`, `select`, `textarea`, `summary`, and `[role=button|link|img]`;
  - `img`, `picture`, `video`, and `svg` that is not inside another candidate.
- **Visibility:** an element counts when its box is at least 1×1, and it is neither `display: none`,
  `visibility: hidden` nor `opacity: 0`.
- **Nesting:** an interactive element is numbered even inside a text candidate (a link in a paragraph gets its
  own number). Any other candidate inside a numbered candidate is skipped (an `img` inside a numbered link is
  part of the link).
- **Wrappers:** a plain `div`/`span` is never a candidate, so wrappers get no number.
- **Selector:** a CSS path from the section root using `:nth-of-type`, for example
  `[data-section="hero"] > div:nth-of-type(1) > a:nth-of-type(2)`.
- **Text:** the visible text, collapsed, first 80 characters (alt text or `aria-label` for images and icons).
- **Alternative:** number every element. Rejected: wrappers and inline spans would bury the useful numbers.

### 3. Badges exist only in the browser

- The kernel adds one absolutely positioned layer, in a shadow root, with a badge at each element's top-left.
  It takes the screenshot, and the page is never saved.
- `index.html` stays the shipped bytes, as the umbrella decision for the overlay requires.
- **Alternative:** the agent writes `data-ref` into `index.html`. Rejected: the shipped page would carry review
  markup, and its digest would change for review reasons.

### 4. `--ref` is checked against the current capture

- `decide` takes repeatable `--ref` on a section or final-review rejection.
- Each number must be in `refs.json`, and `refs.json.page` must equal `pageDigest(root)` now.
- The rule's `object` gains `refs: [{ref, selector, text}]`. `statementLine` prints them, for example
  `"The button is too small" (section hero 1; for section hero; on hero-2 a "Reserve")`.
- A cited number on an accept, on another stage, or with a stale or missing capture exits 1 and records
  nothing.
- **Alternative:** accept any string. Rejected: a stale number would point at a different element.

### 5. The final acceptance needs the owner's words

- At the web final review, an owner accept needs a non-empty `--answer`. It is stored as today (`reason` on the
  draft, `answer` on the role record).
- The returned accept command becomes
  `--verdict accept --answer "<the owner's words of acceptance, quoted from the conversation>"`.
- The instruction says to record only words the owner gave.
- The statement's acceptance line adds the version: a short digest of the draft's `inputHashes`.
- When the latest draft is an accept but its inputs differ from the current ones, `first` says the owner
  accepted an earlier version at that time and asks them to look at the current page.
- **Scope:** web only. Film, edit and ui reviews are unchanged in this change.
- **Alternative:** a separate `--quote` flag. Rejected: `--answer` already carries the owner's words on every
  other record.

### 6. Owner-facing asks offer the numbers

- The section review (when the owner keeps it) and the final review get a `first` step:
  - run `evidence refs` when `refs.json` is missing or its page digest is old;
  - then show `evidence/refs.png`;
  - if the capture fails, ask in text as before.
- `evidence/refs.png` is added to `show`.
- **Delegated section self-checks:** no capture is asked for.
- **Alternative:** return a `run` action for the capture before the ask. Rejected: a missing browser would block
  building, and a delegated self-check would launch a browser per section for no one.

## Risks / Trade-offs

- **[A number shifts after an edit]**
  - Comments keep the selector and text.
  - `--ref` against an old capture is refused, so a stale number is never recorded as a new comment.
- **[Badges cover content in the screenshot]** Badges are small and offset to the element's top-left corner. The
  owner can still open the page itself.
- **[A dense section gets many numbers]** The candidate rule skips wrappers and nested content. Long lists still
  get one number per item, which is what a comment on the third item needs.
- **[Breaking: the agent now needs the owner's words to finish]** Intended (design-owner-attention G). An agent
  that never asked cannot quote an answer.
- **[No browser in the environment]** Refs are optional: the ask falls back to text, and only `--ref` needs a
  capture.

## Migration

- `refs.json` and `refs.png` are new files under `evidence/`.
- The rule `object` may gain `refs`.
- Owner accepts recorded before this change stay valid. Only a new accept needs `--answer`.
- **Rollback:** reverting ignores `refs` on rules and the new files.
