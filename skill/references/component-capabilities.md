# Framework-Agnostic Component Capabilities

The component layer starts from stable product behavior, not from a framework or library name.
`component-capabilities.json` defines the governed vocabulary; `component-providers.json` maps that
vocabulary to project-owned implementations and optional framework providers.

## Public lifecycle

```text
designer-pipeline component decompose --query "filterable paginated multi-select data table"
designer-pipeline component providers --root <project> --framework vue
designer-pipeline component resolve --root <project> --artifact component-request.json
designer-pipeline component inventory --root <project> --framework vue --write --output component-inventory.json
designer-pipeline component bind --root <project> --artifact component-resolution.json --inventory component-inventory.json
designer-pipeline component decide --root <project> --artifact component-binding-plan.json --inventory component-inventory.json
designer-pipeline component verify --root <project> --artifact component-resolution.json --receipt component-receipt.json
```

`decompose` produces framework-neutral capability IR and adds governed dependencies such as focus,
keyboard, state, and ARIA behavior. `providers` only probes an existing project; it never installs a
package. `resolve` prefers explicitly requested and already installed providers, then preserves the
project-owned DOM route as a complete fallback. Candidate packages remain recommendations and
require an explicit adoption decision. `verify` checks behavior evidence against the resolution,
not whether a particular framework API was called.

## Provider boundary

Vuetify0 is a Vue/Nuxt provider, React Aria is a React provider, and Ark UI spans several
frameworks. None is the component model. New providers must map to existing capability IDs, declare
their framework/package boundary, and pass adapter admission review. Add a capability ID only when
the behavior cannot be expressed by the existing vocabulary.

## Phase boundary

Phase 1 governs capability decomposition, provider probing/resolution, and verification receipts.
Framework-specific code generation, official MCP/document discovery, and automatic browser
evidence capture remain later phases in the persistent initiative.

Project inventory never infers capability from a filename or implementation guess. Reuse requires
an explicit project `component-capabilities.json` declaration. Binding emits a plan and an empty
`generatedFiles` list; decision records `reuse`, `adopt`, `substitute`, or `custom` per capability.
