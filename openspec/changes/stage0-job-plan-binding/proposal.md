# Change: Require Stage 0 job-plan binding

## Why
Public toolchain resolution can report ready without a Stage 0 job plan. A rewritten brief can also change a product video into a page without an explicit conflict.

## What Changes
- Require jobId, jobPlanSha256, jobPlanPath, and deliverableForm on every toolchain request.
- Derive deliverableForm from the original route query and cover both with the existing plan hash.
- Reject missing, partial, stale, invalid, or form-conflicting bindings before capability resolution or probing.
- Add generic English and Chinese product-promotion routing terms to the existing motion-graphics and HyperFrames registrations.
- Migrate maintained caller fixtures and public instructions. No compatibility bypass.

## Impact
Affected capability: design-pipeline. Affected surfaces: job route/plan, toolchain request/plan, public resolve/probe, and execution fixtures carrying the same job-plan hash. Existing plans without a form must be regenerated from the original query. OpenAlice showcase and its active change are excluded.
