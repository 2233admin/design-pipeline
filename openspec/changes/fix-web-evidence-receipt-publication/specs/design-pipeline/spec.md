## MODIFIED Requirements

### Requirement: Runtime evidence is explicit and adapter-neutral

Browser/tool adapters SHALL produce existing validated v1 receipts with adapter identity, capability probe, explicit status, artifact paths, hashes and redaction. The kernel SHALL run only an explicitly selected trusted local adapter with a bounded environment and timeout. The host SHALL exclusively write the bare receipt to staged `receipt.json` before publishing the evidence directory. Public capture SHALL expose that receipt through one existing CLI result envelope.

#### Scenario: Exact evidence is incomplete

- **WHEN** any required artifact or measurement is missing
- **THEN** the receipt SHALL report partial, blocked, or unknown
- **AND** the pipeline SHALL NOT replace missing evidence with visual inference.

#### Scenario: Captured evidence is consumed without manual envelope extraction

- **WHEN** capture succeeds with a valid complete or partial receipt
- **THEN** the published `receipt.json` SHALL be the bare v1 receipt returned under the public CLI's `receipt` member
- **AND** the existing `evidence check --require-files` command SHALL validate the receipt and its published artifacts directly
- **AND** `receipt.json` SHALL NOT be listed as a new artifact or hash key.

#### Scenario: An adapter occupies the host metadata filename

- **WHEN** the adapter creates a file or link at staged `receipt.json`
- **THEN** capture SHALL fail without overwriting that entry or publishing a successful evidence directory
- **AND** the owned temporary stage SHALL be removed without changing pre-existing final output.

#### Scenario: An artifact traverses a linked parent directory

- **WHEN** an artifact file or a parent below the evidence root is a symbolic link or junction
- **THEN** capture SHALL reject it before publication, even if its current bytes and hash resolve inside the stage
- **AND** the owned temporary stage SHALL be removed without publishing a receipt that loses its artifact after rename.


#### Scenario: Receipt persistence or directory publication fails

- **WHEN** validated receipt persistence or final directory publication fails
- **THEN** capture SHALL report failure, remove its owned stage, and preserve existing output
- **AND** no successful capture receipt SHALL be returned.
