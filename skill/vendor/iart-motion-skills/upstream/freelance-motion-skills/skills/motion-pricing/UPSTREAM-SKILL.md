---
name: motion-pricing
description: This skill should be used when the user asks to "quote a motion project", "estimate this animation job", "how much should I charge for this video", "what's my day rate", "build a quote", "price a 30-second explainer", or "is this estimate fair". It explains motion-design pricing models, the day-rate math, the cost drivers, and outputs a line-itemed quote with a worked example.
version: 0.1.0
---

# Motion Pricing

Produce a defensible quote for a motion design project: choose a pricing model, run the day-rate math, account for the real cost drivers, and output a clean line-itemed estimate the client can approve.

## When to use

Use when pricing any motion/animation project, sanity-checking an existing number, setting or revisiting a day rate, or explaining to a client why a price is what it is. The output is a structured quote plus the reasoning behind each line.

## Decision tree — which pricing model

```
Is the brief locked (scope, deliverables, revision cap all defined)?
├─ NO  → bill DAY RATE (or refuse to fix-quote until the brief is locked).
│        Exploratory/discovery/retainer work is day-rate by nature.
└─ YES → Is the work a repeatable style or a series (many similar units)?
         ├─ YES → estimate in days, sanity-check PER-FINISHED-MINUTE,
         │        present as fixed per-project.
         └─ NO  → Is it tied to large campaign / broadcast / paid spend
                  where the deliverable's value >> its production cost?
                  ├─ YES → estimate in days for the floor, then apply
                  │        VALUE-BASED usage uplift on top.
                  └─ NO  → estimate in days, present FIXED PER-PROJECT
                           with a revision cap. ← the default path.
```

Always estimate internally in **days** (the only honest unit of effort), whatever you bill on. The model above only decides what the *client sees*.

## Step 1 — Pick a pricing model

| Model | Bill on | Best for | Watch out |
|---|---|---|---|
| **Day rate** | Days of work | Open-ended, exploratory, or retainer work | Penalises speed; client may haggle days |
| **Per-project (fixed)** | Whole deliverable | Well-scoped jobs with a locked brief | Scope creep eats margin — needs a revision cap |
| **Per-finished-minute** | Final runtime | Explainers, series, repeatable style | Ignores complexity differences minute-to-minute |
| **Value-based** | Outcome/usage to client | High-leverage brand/ad work | Requires knowing the client's stakes |

Default approach: estimate internally in **days** (the only honest unit of effort), then present to the client as a **fixed per-project** price with a revision cap. Use per-finished-minute only as a cross-check or for series work, and value-based when the deliverable is tied to a large campaign or broadcast spend.

### Rate model × project type (worked numbers @ £600/day)

Illustrative only — anchors, not prices. See references/rate-card.md for full ranges and localize before quoting.

| Project type | Internal estimate | Present as | Example total |
|---|---|---|---|
| 30s flat-2D explainer (organic) | ~16 days | Fixed per-project + 2-round cap | ~£9,600 |
| Same explainer, paid + broadcast, rush | ~16 days × uplifts | Fixed + usage uplift + rush | ~£20,600 |
| 6× 6s social bumper series | ~9 days | Per-finished-minute cross-check | ~£5,400 (~£900 ea) |
| Brand discovery / open-ended R&D | unknown | Day rate | £600 × days billed |
| National TV ad (3D hero) | ~40 days floor | Value-based on media spend | day-floor + large usage uplift |
| Animated logo sting | ~3-5 days | Fixed per-project | £1,800-3,000 |

## Step 2 — Set the day rate

Day rate is derived, not guessed:

```
Target annual income (incl. salary you want + profit)
+ Annual business costs (software, hardware, rent, insurance, tax set-aside, pension)
= Total revenue needed
÷ Billable days per year
= DAY RATE
```

Billable days reality check: a year has ~260 weekdays. Subtract holiday, sick, admin, marketing, and unsold gaps. Most solo motion designers bill **120-150 days/year**, not 260. Dividing by 260 produces a rate that loses money.

Worked rate example:
- Target income £55,000 + costs £20,000 = £75,000 needed.
- Billable days: 130.
- Day rate = 75,000 ÷ 130 = **£577 → round to £600/day**.

## Step 3 — Apply the cost drivers

Estimate days by walking the drivers. Each pushes the day count up:

1. **Duration** — more finished seconds = more animation days (non-linear; a 60s film is more than 2× a 30s).
2. **Complexity / style** — flat 2D < detailed 2D < character animation < 3D < 3D with simulation. Style sets the per-second day cost.
3. **Asset creation** — design/illustration, 3D modelling, rigging, sound design, voiceover, music licensing. Each is a separate line, not "included."
4. **Revision rounds** — price in a fixed number (e.g. 2). Each extra round is roughly 10-20% of the animation effort.
5. **Rush** — compressed timeline or weekend work adds a 25-50% surcharge.
6. **Usage / licensing rights** — broadcast, paid media, perpetual, or exclusive usage multiplies the base. Organic social is cheapest; national TV/OOH and buyouts are highest.

## Step 4 — Build the line-itemed quote

```
QUOTE — [Project]                          Date: ___  Valid 30 days
Studio/Freelancer: ___        Client: ___

SCOPE
  Deliverables: [count × duration × format]
  Style: [flat 2D / character / 3D ...]
  Revisions included: [N rounds]
  Usage: [organic social / paid / broadcast / buyout]

LINE ITEMS                                  Days     Amount
  Concept & creative direction              __       ____
  Script / storyboard / animatic            __       ____
  Design & illustration (asset creation)    __       ____
  3D modelling / rigging (if any)           __       ____
  Animation                                 __       ____
  Sound design / music / VO                 __       ____
  Revisions (N rounds, included)            __       ____
  Project management                        __       ____
                                          --------  --------
  SUBTOTAL (production)                     __       ____

  Rush surcharge (if applicable)   +__%             ____
  Usage / licensing uplift         +__%             ____
                                          --------  --------
  TOTAL                                              ____
  (+ tax as applicable)

PAYMENT
  [50% to book / 50% on delivery]  — kill fee: __% of total
EXCLUSIONS
  Stock/music licences billed at cost · extra revision rounds at [rate]
  · additional cutdowns at [rate each] · scope changes via change order
```

## Step 5 — Cross-check and sanity-test

- Divide total by finished minutes — is the per-minute figure sane for the style? (See ranges below.)
- Is every asset a line, or did "design" get absorbed into "animation"?
- Are revisions capped and priced? Unlimited revisions = unlimited cost.
- Does usage match price? National broadcast at organic-social pricing is a money loser.
- Add 10-15% contingency for ambitious or vaguely-briefed jobs.

## 2026 ballpark ranges (localize before quoting)

These are rough Western-market starting points; rates vary widely by region, seniority, and client tier. Always adjust to local market and your own day rate.

| Item | Ballpark (2026, USD/GBP/EUR similar order) |
|---|---|
| Freelance mid day rate | 400-750 / day |
| Senior / specialist day rate | 750-1,500 / day |
| Simple flat 2D explainer | 1,000-3,000 / finished minute |
| Detailed / character 2D | 3,000-8,000 / finished minute |
| 3D motion | 8,000-20,000+ / finished minute |
| 6s social bumper (simple) | 500-2,000 each |
| Rush surcharge | +25-50% |
| Broadcast/paid usage uplift | +25-200% over organic base |

Caveat: treat every number as a starting anchor, not a fixed price. Localize to currency, region, and the client's tier, and reconcile against the day-rate math in Step 2.

## Worked examples

**GOOD — driver-built, defensible:**
> 30s flat-2D explainer, organic social, brand assets exist, clear brief.
> Concept 1d · board 2d · design 3d · animation 5d · cutdowns 1.5d · sound 1d · revisions 1.5d · PM 1d = **16 days × £600 = £9,600**. No rush, organic = +0%. Per-minute cross-check flags short-form is costly per second — day math stands.

Every line is a day estimate tied to a driver, revisions are capped, usage matches price. The client sees one fixed number; the day math stays internal. Full walkthrough in references/worked-example.md.

**ANTI-PATTERN — the "gut number" quote:**
> "A 30-second animation? Call it £3,000, sounds about right."

Why it fails: no day math (£3,000 ÷ £600 = 5 days for a job that's really 16 — a £6,600 loss), "design" silently absorbed into "animation," revisions uncapped, and the same number whether it runs on Instagram or national TV. Gut numbers either lose money or get undercut by someone who did the math. Always build up from days and drivers, then sanity-check.

## Common mistakes

| Symptom | Why it happens | Fix |
|---|---|---|
| Quote loses money on delivery | Divided target income by ~260 days, not ~130 billable | Use realistic billable days in the worksheet |
| Scope creep eats the margin | Fixed-quoted an unlocked brief | Don't fix-quote until the brief is locked; cap revisions |
| Design work "disappeared" | Folded asset creation into the animation line | Make every asset (design, 3D, sound, VO) its own line |
| Endless revisions, flat fee | No revision cap stated | Cap rounds (2); price extras at day rate, in writing |
| Underpriced broadcast/paid job | Quoted national usage at organic-social rate | Apply usage uplift over the base; usage is real value |
| Rush job at normal price | Absorbed the compressed timeline silently | Add +25-50% rush surcharge and say why |
| Client haggles the day count | Showed the internal day breakdown | Present a fixed total; keep day math internal unless billing by day |

## Deliverable spec — what a good quote contains

The output is a line-itemed quote document (template in references/quote-template.md) plus the internal day-math reasoning. A good quote:
- States scope: deliverables (count × duration × format), style, revisions included, and usage/term.
- Shows a clear total the client approves (day breakdown stays internal unless billing by day).
- Names rush and usage uplifts explicitly when they apply.
- Lists payment terms (deposit, balance-before-handover, kill fee) and exclusions.
- Has a validity window (30 days) and an acceptance line.

### Before you finish — checklist
- [ ] Estimated in days, reconciled to the day-rate worksheet.
- [ ] Every asset (design, 3D, rigging, sound, VO) is its own line.
- [ ] Revisions capped, with extra-round pricing stated.
- [ ] Usage/term matches the price (organic vs paid vs broadcast vs buyout).
- [ ] Rush surcharge applied if the timeline is compressed.
- [ ] Per-finished-minute cross-check run; total is sane for the style.
- [ ] Contingency (10-15%) added for vague/ambitious briefs.
- [ ] Payment terms, exclusions, validity window, and acceptance line present.

## Quick reference

| Question | Answer |
|---|---|
| What unit do I estimate in? | Days of effort, always |
| What do I show the client? | Fixed per-project price + revision cap |
| How do I get my day rate? | (income + costs) ÷ billable days (~130) |
| Is design "included" in animation? | No — separate line |
| How many revisions to include? | 2, then charge per extra round |
| Client wants it in half the time? | +25-50% rush |
| It's running on national TV? | Add usage uplift over the base |

## Reference files

- `references/quote-template.md` — full quote template, payment-terms language, exclusions, and a kill-fee clause.
- `references/worked-example.md` — a complete worked estimate from brief to total, showing the day math and driver reasoning.
- `references/rate-card.md` — expanded 2026 ranges by deliverable type and the day-rate worksheet.
