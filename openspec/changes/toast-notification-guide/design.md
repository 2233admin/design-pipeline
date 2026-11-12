# Design: toast-notification-guide

## Decisions

- **A reference with a judgment flow, not a rule layer.** The owner's prompt is a procedure (read,
  classify, report, stop, optionally restyle, build) plus a style specification. The package already
  holds the accessibility and motion rules it touches (UC-06, UC-10, UC-19, TR-06, TR-08, TR-09), so
  the guide keeps the procedure and the kubai numbers and links to those rules instead of restating
  them. Generic rule layers wait for the ablation result (#372): references and the project's design
  system come before generic UI rules.
- **Both halves, numbers as defaults.** Chosen by the owner when asked. Sections 0 to 3 (judgment)
  and section 4 (restyle) ship together. Section 4 says every value is a default that lands on the
  project's tokens and corner scale, and offers four options (toast, notifications, both, neither)
  that the owner picks after the report table.
- **A job, because that is the extension point.** `route` is how a brief reaches knowledge
  (`Job Dispatcher` in the glossary): a new capability registers as a job and adds no peer search.
  The job `toast-notification` is `scored` with priority 44, below `refine-intents` (45) and
  `motion-vocabulary` (46), above `technique` and `component` (40). Consequences, each held by a
  test: a naming question ("what's it called when toasts stack") stays with `motion-vocabulary`;
  "polish the toast" stays with `refine-intents` (one keyword each, higher priority wins); "polish
  the toast notification" goes to this job (two keywords against one); a brief with `gsap` and
  `animation` goes to `technique`; explicit jobs always win. The primary step is the kernel's
  `toolchain resolve`, so the route adds no step.
- **Keywords avoid generic collisions.** Matching is by substring, so a generic word takes unrelated
  briefs. The English list is `toast`, `snackbar`, `snack bar`, `notification`, `unread badge`,
  `unread count`, `undo prompt` and `progress prompt`; not `badge` (the enamel badge example),
  `undo` (text editors) or `reminder` (a scheduled-task feature). The Chinese list is compound:
  轻提示, 提示条, 撤销提示, 进度提示, 未读角标, 未读消息, 小红点, 通知中心, 消息通知, 站内通知, 推送通知,
  通知栏, 通知列表 and 消息提醒. The first version had bare 通知 and 提醒; the eval prompt
  `quick-chinese-profile-page` ("…通知开关、保存按钮…无动画", expected job `technique`) then
  dispatched here, so `tests/skill-evals.test.cjs` failed. 通知 also means "announcement"
  (放假通知), 提醒 means "to remind", and 红点 is a design award, so the bare words are out and a
  test pins both the compounds and the absence of the bare words.
- **Package rules win over kubai values, and the guide says which.** A kubai default is not
  silently changed. The "Where the package wins" table lists each conflict with the governing rule
  and the value to use:
  - status toast 3 to 5 seconds against UC-19's 5-second floor for timed toasts;
  - an action toast that counts down against UC-19 (action toasts stay until dismissed; a toast is
    never the only carrier of undo). The guide allows the countdown only when the same change can be
    undone elsewhere, otherwise the toast stays or the answer is "neither" and the action is
    confirmed first;
  - leave on ease-in against the Precedence exit-easing rule (project exit token, else ease-out);
  - 380/400 ms responses to input against the 300 ms rule, and 500/560/900 ms arrivals and sheen,
    which stand with a recorded reason;
  - a hover-only stack against TR-08, a queue of toasts against TR-06, a border beside a shadow
    against "ring first" and UC-22, an unellipsed in-progress line against UC-39.
  Values that already agree are listed too, so a reviewer does not have to re-derive them.
- **No `sources.lock.json` entry.** The lock records upstream git repositories under the policy
  `track-upstream-head`; every kind but `npm` needs a repository and a full commit id, and the
  `release` kind follows semver tags. The kubai prompt is text the owner supplied, with no
  repository, revision or licence file. A new lock kind would be a second provenance mechanism, so
  the credit lives in the guide's Provenance section and in `THIRD_PARTY_NOTICES.md`, where the
  other owner-supplied and concept-distillation sources already live. The guide states plainly what
  is and is not bundled.
- **Ablation layer.** The guide joins `ui-craft` in `evals/ablation/layers.json`, as `refine-intents`
  did after review of #363, so `full-minus-ui-craft` removes the guide and its routing rows and #372
  can measure what it adds.
- **Motion vocabulary is linked by id, not edited.** The guide names term ids (`orchestration`,
  `blur`, `crossfade`, `layout-animation`, `swipe-to-dismiss`, `interruptible-animation`,
  `reduced-motion`, and the anti-pattern `layered-entry`) for `motion.md`, and a test checks they
  exist. Adding `local.guides` links to `motion-vocabulary.json` needs the catalog records
  regenerated, which touches a very large generated file for little gain now.

## File ownership

- New, hand-edited: `skill/references/toast-notification.md`,
  `tests/toast-notification-guide.test.cjs`.
- Edited additively: `skill/references/job-registry.json` (one job), `SKILL.md`,
  `capability-routing.md`, `feature-routes.md` (one row or paragraph each),
  `package-resources.json`, `evals/ablation/layers.json`, `scripts/test-manifest.json`,
  `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`, `docs/features.md`.
- Untouched: `sources.lock.json`, the dispatcher source, the job schema, `motion-vocabulary.json`,
  any CLI table or flag list.

## Compatibility

- Routing: briefs that contain a new keyword and no stronger match now select
  `toast-notification` instead of the default job. A brief that matched another scored job with an
  equal score and a higher priority is unchanged; one with an equal score and a lower priority
  (`technique`, `component`, both 40) now goes to this job, which is the intended specialization.
- No stored artifact, receipt or state file reads the new job id, so there is no migration.
