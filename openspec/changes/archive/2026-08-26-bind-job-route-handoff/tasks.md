# Tasks

Do not start section 1 until the DRAFT is reviewed. Open questions live in `design.md`.

## 1. Job plan artifact

- [x] 1.1 Add `job-plan.schema.json` and persist helper in `job-route-core.cjs` (`planSha256`, frozen admission)
- [x] 1.2 Teach `route --write --output` to write only `ready` routes; clarification/blocked fail closed
- [x] 1.3 Add tests in `tests/job-route.test.cjs` for write, hash stability, and refused clarification writes

## 2. Toolchain and execution bind

- [x] 2.1 Accept optional `jobPlanSha256` / `jobId` on toolchain request; copy them onto the plan; never assign job id to `primaryRouteId`
- [x] 2.2 Reject hash, schema, and job-id drift in `toolchain resolve`
- [x] 2.3 Accept optional `jobPlanSha256` on execution request; require it to match the toolchain plan when either side has one
- [x] 2.4 Add tests in `tests/toolchain-routing.test.cjs` and `tests/execution-target-routing.test.cjs` for match, omit, and mismatch

## 3. Stage 0 contract

- [x] 3.1 Point SKILL.md Stage 0 at classify → `--write` → consume; keep catalogs as escape hatches
- [x] 3.2 Register schema in `package-resources.json`; cover `--write` in skill-cli-handoff
- [x] 3.3 Run `tests/job-route.test.cjs`, toolchain/execution routing tests, and `node scripts/qa.cjs`
