# Fix web evidence receipt publication

Repair historical issue #69 using existing v1 receipts and the public capture/check commands.

- [Proposal](proposal.md): scope, standing authorization and compatibility correction.
- [Design](design.md): staged metadata publication and envelope boundary.
- [Specification delta](specs/design-pipeline/spec.md): portable receipt and failure scenarios.
- [Tasks](tasks.md): actual implementation and verification status.

No release, deployment, schema migration or shared dirty-checkout modification is authorized by this change. Verification evidence belongs in the maintenance PR and execution receipt; an unchecked gate is not accepted.
