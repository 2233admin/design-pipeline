---
sourceMeta:
  id: modern-web-guidance
  kind: github
  url: https://github.com/GoogleChrome/modern-web-guidance/tree/4dd968349e54ca45a05dd5c818fb035c9054b022
  reviewedRevision: 4dd968349e54ca45a05dd5c818fb035c9054b022
  reviewedContentHash: 74cd02cb89bfb177a00e0dfe0a0b3235b81272fa478ba188ed676aef2b2274e9
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: skills/modern-web-guidance/SKILL.md, LICENSE
  reviewedPackage: modern-web-guidance@1.0.0
  reviewedSkillVersion: 2026_11_09-5bcc021b
  reviewedAt: 2026-11-12T00:00:00.000Z
  freshnessDays: 30
  license: Apache-2.0
  useBoundary: reference-only; this guide restates, in this project's words, when and how to call the installed CLI; do not copy, import or execute the upstream guides, scripts or search data, which are read live with the CLI
---

# Modern Web Guidance

`modern-web-guidance` is Google Chrome's optional skill and CLI
([`GoogleChrome/modern-web-guidance`](https://github.com/GoogleChrome/modern-web-guidance),
Apache-2.0). It holds 17 categories of platform guides, each with the current HTML, CSS or DOM
pattern, the fallback a browser without the feature needs and the known gotchas. It is a companion:
the package holds no copy of its guides, scripts or search data, so the guidance stays as current as
the CLI. When it is not installed, use the fallback below; the pipeline never fails for its absence.

The reviewed facts are in the frontmatter: the Git revision and content hash of the upstream
`SKILL.md` and `LICENSE` (the hash covers those two files in that order, each as path, newline,
bytes, newline), the npm package `modern-web-guidance@1.0.0` that `npx` resolved and the
`--skill-version` the reviewed `SKILL.md` passes (`2026_11_09-5bcc021b`). `sources:update` moves
the revision and the hash; the package version and skill version are re-read by whoever reviews
that bump.

## Consult it on demand

The pipeline asks it when the task needs it, not at the start of every task.

| Situation | Do |
| --- | --- |
| The work produces or reviews one concrete platform pattern in a web interface: dialog, popover, tooltip, dropdown, form and validation, data table, accessibility behaviour, motion that depends on a platform feature (view transitions, scroll-driven animation), layout that depends on one (container queries, anchoring), dark mode, dates, sanitisation | Consult it: `search`, then `retrieve` |
| A review has to state a platform rule and say where it comes from | Consult it and cite the guide id (see [Citing a rule](#citing-a-rule-in-a-review)) |
| The change only follows what the repository already does (another instance of an existing component, a copy of an existing pattern), or the task is not web-interface work (backend, CI, scripts, tooling, copy edits) | Do not consult it |

`designer-pipeline route --query "<brief>"` applies the same rule: a brief that names such a
pattern, or asks for a cited platform rule, selects the job `modern-web-guidance`, whose primary
knowledge is this guide; a brief that says to copy or follow the existing implementation, or that is
backend or CI work, keeps its own job. A route result is not a requirement to run the CLI when the
change turns out to follow an existing pattern.

## Where it sits

| Question | Authority |
| --- | --- |
| The project's own rules: its `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, design rules and recorded user rejections | The project, always |
| How it should look (tokens, type, colour, density, motion feel) | `DESIGN.md`, `design-system/tokens.json`, existing components |
| Which platform feature carries it, and what fallback it needs | A retrieved `modern-web-guidance` guide |
| How CSS should be written and which practice applies | [good-css.md](good-css.md) |
| Does the changed UI meet the interface rules | [web-interface-guidelines.md](web-interface-guidelines.md), the interface-discipline review and the motion gate |

**The project wins.** When a guide and the project's own rules disagree, follow the project and
note the divergence in `qa.md`. For example, a project that deliberately does not follow
`prefers-reduced-motion` (written in its `AGENTS.md`) keeps that rule where a guide recommends
following the preference. A guide never overrides a token, an existing component, a user rejection
or a motion decision; it decides the platform feature and its fallback where the project is silent.
Applying a guide is Component Conformance evidence at most, never Visual Acceptance. Do not copy
guide text into `DESIGN.md`, a reference file or the repository.

## Run every command with telemetry off

The CLI sends anonymous usage data to Google (installs, the calling agent, guide ids, search
queries; no raw prompts). Every command in this pipeline sets `DISABLE_TELEMETRY=1`:

```bash
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "light dismiss dialog" --skill-version <version>
```

In PowerShell set it for the session first: `$env:DISABLE_TELEMETRY = "1"` (then run the same
`npx` command). Do not rely on a profile setting the user may not have.

## Install

The user decides whether and where to install; the pipeline never installs a companion silently.

```bash
DISABLE_TELEMETRY=1 npx modern-web-guidance@latest install
```

This is an interactive wizard. It runs `npx -y skills add GoogleChrome/modern-web-guidance --skill
modern-web-guidance` and forwards every extra argument, so an agent without a terminal prompt uses
the non-interactive form:

```bash
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest install -g -a codex -y
```

- `-g` installs for the user; omit it to install into the current project.
- `-a <agent>` names the agent (`codex`, `claude-code` and so on); the Skills CLI lists the rest.
- `--choose` lists the repository's skills and lets the user pick; it also offers the
  `chrome-extensions` skill, which this pipeline does not use.
- `DISABLE_TELEMETRY=1 npx modern-web-guidance@latest update` and `uninstall` change what is installed.
- On Windows use `npx.cmd` where the shell requires it. Fetching needs outbound network access, so
  allowlist `npx -y modern-web-guidance@latest *` rather than bare `npx *`.

The skill lands in a skill root `node scripts/check-deps.cjs` already searches
(`~/.agents/skills`, `~/.claude/skills`, the project's `.agents/skills` or `.claude/skills`);
that command reports whether the skill is present and whether it still has the commands this guide
uses.

## The loop

Run it before writing the code, once per capability.

1. **Search.** `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "<query>" --skill-version <version>`
   returns `[{ "id", "description" }]`. Take `--skill-version` from the installed `SKILL.md`; the
   CLI warns when the installed skill is older than the package.
2. **Retrieve.** `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest retrieve "<id>"` for each
   matching id, plus a broad discipline guide (`html`, `css`, `forms`, `accessibility`,
   `performance`, `security`) when it applies. Output over 9.5 KB is saved to a file; read that file
   in full with the file reader, not `cat` or `head`.
3. **Verify.** Before finishing, check the code against the guide and against the project's rules:
   the modern pattern is used, the fallback it requires for a feature that is not Baseline widely
   available is present, and the request is fully met. Do not add features the request did not ask for.
4. **Record.** Put the consulted guide ids, the fallbacks adopted, any guide skipped as unrelated
   and any divergence from a guide for a project rule in the change's `qa.md` implementation notes.
   Nothing is added to a gate or receipt.

Query rules, from the upstream skill:

- Two to five words, one capability or UI pattern, an action and an object: `light dismiss dialog`,
  `responsive data table`, `date picker input`.
- Name the implied primitive, not the intent: `confirmation modal dialog`, not
  `confirm destructive action`.
- Leave out frameworks (React, Vue, Tailwind), product and route names, component and file names.
  Search queries are among the data the CLI would send without the opt-out, so the query must not
  carry anything from the brief.
- Split a compound task into separate searches. With weak or empty results rephrase once with the
  concrete noun (`dialog`, `popover`, `table`, `form`), then use `list` once; if nothing matches,
  continue without a guide.

`legacy-scan <path> --json` is a modernisation audit for a whole directory and checks about a fifth
of the corpus. Run it only when the user asks to modernise a codebase, never for a named feature.

## Citing a rule in a review

The anti-AI-slop review ([anti-slop-review.md](anti-slop-review.md)) and the template check
([template-bank.md](template-bank.md)) may cite a platform rule when a finding rests on one. Write
the citation as the guide id and one sentence of conclusion in the reviewer's words:

```text
persistent-toast-notifications: something that needs handling now is not a toast
```

- Never copy the guide's wording into the finding, the review record or the repository. The guide is
  read live with `retrieve`; the citation only says which guide and what follows from it.
- Retrieve the guide in the same run before citing it. Do not cite an id from memory, and drop the
  citation when `retrieve` fails or the guide no longer says it.
- A project rule that overrides the guide is cited too, with the divergence: the finding follows the
  project.

## Adapting the vanilla guides

The guides use plain HTML, CSS and JS. Keep the modern feature and adapt it to the project's stack:

- Cast or spread newly shipped attributes (`popover`, `interestfor`, `commandfor`) instead of
  dropping them; do not merge type packages for them.
- Guard `window` and `HTMLElement` for server rendering and load a polyfill with a bare dynamic
  import in a client effect; never copy files out of `node_modules`.
- Call imperative methods such as `showModal()` on a ref of a node the framework does not manage,
  generate per-instance ids and `anchor-name` values, and keep `:root` and `@starting-style`
  top-level.

## Browser support and experimental features

- A feature that is Baseline widely available needs no fallback. Any other feature carries the
  fallback the guide gives, unless the user states a policy (a Baseline year, named browsers, "no
  polyfills"). Read the policy from the project's `AGENTS.md`, `CLAUDE.md` or `DESIGN.md`; when a
  project targets a restricted runtime (Electron, Tauri) or excludes a browser and none is written,
  suggest recording it there.
- Guides for Origin Trial APIs and volatile single-engine features are findable by `search` but
  gated on `retrieve`. Opening the gate (`set-allow-origin-trials`, `set-allow-volatile-features`,
  which write `.mwgrc` in the project or in `~/.mwgrc`) needs the user's yes, because those
  features can change or disappear.

## When it is not installed

`check-deps.cjs` reports the group as `WARN` and the profile as `INFO`; the result stays `OK`. Then:

1. Read [good-css.md](good-css.md) for styles and [web-interface-guidelines.md](web-interface-guidelines.md)
   for the interface rules.
2. Check the exact feature on MDN or web.dev and its Baseline status, and test the fallback in the
   target browser.
3. Write in `qa.md` that the companion was unavailable and which source decided the feature.

An installed skill that lost a command (`WARN`, a missing marker) is stale: use the installed
`SKILL.md`'s own instructions, update with `DISABLE_TELEMETRY=1 npx modern-web-guidance@latest update`,
and record it.
