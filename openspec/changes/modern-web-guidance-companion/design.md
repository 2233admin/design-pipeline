# Design: modern-web-guidance-companion

## Decisions

- **Companion, not a vendored source.** The user chose "companion + routing" over a pinned local
  copy. The package of the upstream CLI is 16.5 MB, most of it embedding data for its search; the
  guides change with Baseline; and the CLI refuses stale skill versions on purpose. Copying the
  guides would freeze what the tool is built to keep current and add a second path to keep in sync.
  The pipeline therefore holds only a pointer (registry group, profile, lock entry) and a guide that
  says how to use it.
- **Level `optional`.** The skill needs network access for `npx` on first run, sends anonymous
  usage data unless `DISABLE_TELEMETRY=1`, and covers web work only. A film or poster job has no use
  for it. `optional` gives `WARN` on the group and `INFO` on the profile when absent, exit 0, which
  is how the PixiJS and GSAP suites behave.
- **Markers are the commands the guide teaches.** The profile checks that the installed `SKILL.md`
  still names `modern-web-guidance@latest search` and `retrieve`, and still has a browser-support
  policy section, because the guide's loop and its rule that a non-Baseline feature carries the
  guide's fallback depend on exactly those. The markers come from the installed file, never from
  the guide, so an installed skill that dropped one is reported stale (`WARN`) without failing.
- **One install command, two forms.** `npx modern-web-guidance@latest install` is an interactive
  wizard; an agent without a TTY needs the forwarded form. The wrapper hands every argument after
  `install` to `skills add` (except `--choose`), so the registry prints
  `DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest install` with the `-g -a <agent> -y`
  addition, and the guide explains the project scope (omit `-g`) and that the wizard's choice of
  agent and scope is the user's.
- **Ranking against what the project already says.** The upstream guides are platform correctness
  (API, fallback, gotcha), not visual rules. The guide states the order: the project's `DESIGN.md`,
  tokens and existing components decide how it looks; a retrieved guide decides which platform
  feature carries it and what fallback it needs; `good-css.md` keeps CSS taste and the web
  interface rules keep their audit. A guide never overrides a user rejection or a token. This keeps
  the ablation ruling (#372: references and the project design system before generic rule layers)
  intact, because no generic rule layer is added.
- **Record in `qa.md`, add nothing to a receipt.** The upstream skill asks for a
  `### Modern Web Guidance` section in the reply. The pipeline already has `qa.md` for
  implementation notes, so the consulted guide ids and adopted fallbacks go there; there is no new
  gate, receipt field or schema. Component Conformance and Visual Acceptance stay separate: a guide
  being applied is the first kind of evidence at most.
- **Privacy.** Search queries are among the collected telemetry. The guide repeats the upstream
  query rule (a platform capability in two to five words, no product, route, component or
  framework names) and names the opt-out, so a brief's content does not leave the machine through
  the query.
- **On demand, in three cases.** The upstream skill is worded to run on every web task. This
  pipeline consults it only when the work produces or reviews one concrete platform pattern in a web
  interface, or a review has to state a sourced platform rule; a change that only follows the
  repository's existing pattern, and non-interface work, skip it. The same rule sits in the guide,
  the route table and the job registry, so the three cannot drift apart without a test failing.
- **A route job with exclusions, not a new gate.** `route` is exclusive, so a scored job can take a
  brief from the `product-design` default. The keywords are narrow platform patterns (modal
  dialog, popover, tooltip, form validation, container queries, dark mode and their Chinese
  equivalents); words that other jobs already own (`animation`, `data table`, `dropdown`) are left to
  them. Priority 44 sits below `refine-intents` (45) and `motion-vocabulary` (46), so on equal scores
  those win, and `technique`, `component`, clone, graphics and video jobs keep their briefs by
  score or activation. The optional `excludeKeywords` list on a job zeroes its score when the brief
  says to follow the existing implementation or is backend, database, CI or Docker work. That list
  is the only dispatcher change; `route` keeps its result shape.
- **The project wins.** The guide ranks the project's `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, tokens,
  existing components and recorded rejections above any retrieved guide and tells the agent to note
  the divergence in `qa.md`. The shipped example is generic (a console that does not follow
  `prefers-reduced-motion`), with no private product name.
- **Telemetry off in every command.** The variable is written before the command, not left to a
  shell profile, in the guide, the registry install hint, the companion list and the install
  documents; PowerShell is named once. A test scans those files, so a command added later without the
  variable fails.
- **A review cites, never copies.** `anti-slop-review.md` and `template-bank.md` take a finding that
  rests on a platform rule as `<guide-id>: <one-line conclusion>`, after `retrieve` in the same run;
  nothing from the guide enters evidence, reports or the repository, which also keeps the Apache-2.0
  text out of the package.
- **Adapted reference, not catalog reference.** A catalog reference records a revision and nothing
  that proves what was read. The guide restates in this project's words what the upstream `SKILL.md`
  instructs, so it is an `adapted-reference`: frontmatter `sourceMeta` pins the revision, the
  `reviewedContentHash` over `skills/modern-web-guidance/SKILL.md` and `LICENSE`
  (`ordered UTF-8 sourceFiles with path-and-newline separators`, the scope the other adapted
  references use) and the license; `sources:update` recomputes the hash at a new revision and fails if
  a profile marker no longer matches. `reviewedPackage` (`modern-web-guidance@1.0.0`, what `npx`
  resolved) and `reviewedSkillVersion` (`2026_11_09-5bcc021b`, what `--skill-version` takes) are
  review-time facts no script moves; the changed hash is what flags a new upstream `SKILL.md` for
  review.
- **`legacy-scan` stays out.** It is a modernisation tool for a whole directory and covers about a
  fifth of the corpus. A task that names a feature does not call it; a user's explicit request to
  modernise a codebase may.

## Risks

- **The route job takes a brief from the default.** A brief that mentions a dialog now selects
  `modern-web-guidance` instead of `product-design`, so `prism route` does not run for it. The job
  carries the same two kernel steps as `refine-intents`; a brief that needs the design-system door
  as well names it (design system, token) and ties to the default or to a higher-priority job. The
  route tests pin the hits, the exclusions and the jobs that must still win.
- **`excludeKeywords` over-excludes.** `backend` or `database` in a mixed brief removes the job. The
  cost is one missed hint, not a wrong result: the guide's own rule decides whether to consult.

- **Upstream renames a command or section.** The markers go stale and `check-deps` reports `WARN`
  with the missing marker; `sources:update` moves the reviewed revision and the test reads the
  registry, so the bump PR shows the diff.
- **`npx` is blocked (offline or sandbox).** The guide gives the fallback path
  (`good-css.md`, web interface rules, MDN or web.dev for the exact feature) and says to record
  that the companion was unavailable.
