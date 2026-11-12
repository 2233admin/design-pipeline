# Impeccable Product Design Surface

This is the product-design integration of [Impeccable](https://github.com/pbakaus/impeccable).
It imports the upstream capability surface, not its Neo Kinpaku visual skin.

The machine-readable contract is `impeccable-product-design.json`. It is the coverage authority:
all 23 core commands are mapped to a product-design stage, durable artifacts, and observable
evidence. The pipeline still uses its own `PRODUCT.md`, `DESIGN.md`, `MOTION.md`, change artifacts,
and QA receipts as source of truth.

## Product-design stages

| Stage | Product question | Durable outputs |
| --- | --- | --- |
| Product truth | Who is this for, what job matters, and what must remain true? | `PRODUCT.md`, `brief.md` |
| Surface and flow shaping | What should the visitor understand, do, feel, and recover from? | `directions.md`, `brief.md`, `tasks.md` |
| Design authority | What reusable visual, content, layout, and component rules make the product coherent? | `DESIGN.md`, `design.md`, tokens |
| Experience quality | Is the experience specific, understandable, complete, and resilient? | critique, state matrix, `qa.md` |
| Implementation evidence | Does the real surface work across devices, states, motion, and performance budgets? | `MOTION.md`, `motion.md`, browser receipts, `qa.md` |

## Full command coverage

The command names remain useful as product-design verbs even when the upstream executable is not
installed:

- Build: `shape`, `init`, `document`, `extract`
- Evaluate: `critique`, `audit`
- Refine: `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`
- Enhance: `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`
- Fix: `clarify`, `adapt`, `optimize`
- Iterate: `live`, `generate`

Upstream lists 24 commands (README "24 commands" and the SKILL.md command table at the locked
revision); the 24th, `craft`, is a deprecated alias, so 23 are core commands and all 23 are mapped.
The deprecated `craft` alias maps to `shape` plus `new-work`; `teach` maps to `init`. They do not
create a second workflow.

Every command carries a `guide`: `<file>#<anchor>` relative to `references/`, the heading to open
for that intent. `critique`, `polish`, `distill` and `quieter` point at their sections of
[refine-intents.md](refine-intents.md), which `designer-pipeline route` reaches through the
`refine-intents` job. A command without a guide of its own points at the nearest existing rule.

## What “product design” means here

- `shape` and `init` capture product truth before visual decisions.
- `document` and `extract` preserve or recover the reusable design authority.
- `critique`, `audit`, `harden`, and `polish` are separate judgments: product clarity, measurable
  implementation quality, production edge cases, and scoped repair.
- `bolder`, `quieter`, `distill`, `delight`, and `overdrive` change expression only after the
  product job and direction are explicit; they never replace product truth with a skin.
- `onboard` and `clarify` treat activation, copy, labels, and recovery as product behavior.
- `animate`, `adapt`, `optimize`, `live`, and `generate` (variants of one named element in the live
  browser) are implementation evidence routes, not decoration.
- The comp round of new work (upstream `visualize.md`, no longer a command of its own) tests
  composition and asset needs; it never replaces semantic UI, real states, or accessible
  implementation.

## Boundaries

`hooks`, `doctor`, `routing`, `pin`, and native-platform references are supporting capabilities.
They enforce, maintain, select, or specialize the product-design workflow; they are not additional
visual themes. A missing browser, image generator, or optional runtime lowers the evidence path and
is recorded as a limitation, not silently replaced with a screenshot claim.

## Upstream reference files

`upstreamReferences` in the JSON records every reference file the locked revision ships beyond the
command guides, each as adopted, partly adopted, mapped or not adopted with its reason:
`craft-floor` and the three `mode-*` files are merged into [impeccable-contract.md](impeccable-contract.md)
(craft floor and mode rules); `visualize` is the comp round; `component-review` contributes one rule
(the owner answers a review, a waiting review is pending); `doctor`, `hooks`, `routing` and
`region-map` need the impeccable CLI or write persistent configuration and are not adopted.
`notAdopted` lists the CLI and cloud features left out on purpose: agents engine, rule packs, login
and account commands, critique history upload, DESIGN.md viewer sync, Loop and the audit report
store (the audit report goes to `qa.md`).
