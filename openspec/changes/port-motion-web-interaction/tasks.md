# Tasks

- [x] w4 `verify interaction` measured probe (`briefs/w4-interaction-probe.md`). PR #59. The worker
      crashed twice when the Windows page file ran out. The supervisor added the `linear-response`
      fix (excursion-based overshoot, smoothed speed peak of at least 1.25x the median) after real
      browser runs showed a constant-speed out-and-back passing.
- [x] w5 web sub-workflow (`briefs/w5-web-workflow.md`). PR #58, finished by the supervisor from
      the crashed worker's tree.
- [x] w6 `response.spring-settle` primitive and `web-motion.md` (`briefs/w6-spring-guide.md`). PR #57.
- [x] Supervisor review of each PR; `node scripts/qa.cjs` on the merged line. End to end in
      headless Chrome on four pages (spring, linear, dead, fade): each gives the verdict its brief
      predicts.
