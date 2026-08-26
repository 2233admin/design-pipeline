---
reviewer: web-reality
reviewed: ARCHITECTURE-SPINE.md
reviewed_at: 2026-08-23
mode: validate-only
---

# BMAD Architecture Web / Reality Check

## Verdict

**CONDITIONAL PASS.** The runtime boundary, Node/uv assumptions, DesignMD discovery names, and five resource kinds are consistent with current public reality. The spine should not be promoted to an implementation baseline until the two high-severity divergences are resolved in the next spec/implementation pass: robots enforcement and symlink-safe path containment. The Figma/Penpot intake boundary also needs a provider-specific clarification before stories are frozen.

The review did not modify `ARCHITECTURE-SPINE.md`.

## Verification performed

- Read the spine, reviewer gate, DesignMD ingestion/adapter code, CLI command surface, and local runtime versions.
- Ran the BMAD mechanical lint:
  `uv run --no-cache .agents/skills/bmad-architecture/scripts/lint_spine.py --workspace _bmad-output/planning-artifacts/architecture/architecture-design-pipeline-2026-08-23`
  Result: `ok: true`, `total_findings: 0`.
- Local runtime probe: Node `v26.3.1`; uv `0.10.8`.
- Checked current first-party DesignMD pages and official Node, uv, Figma, and Penpot documentation.

## Findings

### R-001 — HIGH — AD-3 requires robots enforcement that the crawler does not implement

**Evidence**

- The spine makes this an adopted rule at `ARCHITECTURE-SPINE.md:53-57`: sync “must honor `robots.txt`.”
- `skill/scripts/designmd-core.cjs:186-207` seeds `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt`, bounds pages/concurrency, and follows same-origin links, but contains no `robots.txt` fetch, parser, cache, or allow/deny decision.
- DesignMD’s own AI policy explicitly says “Respect robots.txt” and “Do not scrape at high frequency,” while naming `/llms-full.txt` and `/sitemap.xml` as the full index/discovery sources: [DesignMD AI Use Policy](https://designmd.directory/ai.txt).

**Impact**

The architecture claims a compliance and crawl-safety invariant that the current runtime can violate. A controlled test fetcher can pass while a real sync still requests disallowed URLs.

**Recommendation**

Implement a small source-policy gate before enqueueing pages: retrieve and evaluate the source origin’s `robots.txt`, apply the crawler user-agent, record policy revision/fetch time, and emit `blocked`/`partial` with per-URL reasons. Decide explicitly whether an unavailable or malformed policy fails closed for external sources. Add hermetic allow/deny fixtures and one live smoke check against DesignMD. Keep rate/concurrency limits in the same policy object.

**Disposition:** fix before declaring AD-3 implemented; the spine text itself is directionally correct.

### R-002 — HIGH — AD-5 claims symlink containment that the persisted reader does not prove

**Evidence**

- The spine states at `ARCHITECTURE-SPINE.md:65-69` that symlink-based escape is rejected before every read/write.
- `skill/scripts/designmd-core.cjs:268-276` rejects absolute paths and lexical `..` escapes with `path.resolve`/`path.relative`, then reads the result. It does not inspect symlinks or compare `realpath` values.
- `fs.readFileSync` follows a symlink placed under the catalog root, so a malicious or corrupted snapshot can still read outside the root despite passing the lexical check.

**Impact**

This is a trust-boundary overclaim. The current test covers `../outside.txt`, but not a symlinked `contentPath`; the security invariant is therefore not true for all persisted readers.

**Recommendation**

At read and write boundaries, reject symlink components (or compare `realpath(root)` with `realpath(target)` after existence checks) and validate the resolved target remains inside the resolved root. Add a Windows-compatible junction/symlink fixture where permissions allow it; otherwise add a platform-marked test and a direct `lstat` unit test. Treat failure as `invalid`.

**Disposition:** fix before marking AD-5 complete. Do not weaken the spine rule.

### R-003 — MEDIUM — Figma “JSON/SVG/PNG/tokens” mixes local exports with API/plugin-produced data

**Evidence**

- The spine says at `ARCHITECTURE-SPINE.md:71-75` that the first adapter path is “Figma JSON/SVG/PNG/tokens” while requiring no API/login/writeback.
- Figma’s official export documentation distinguishes image/SVG/PDF exports from REST API JSON: [Figma plugin ExportSettings](https://developers.figma.com/docs/plugins/api/ExportSettings/).
- The current `skill/scripts/adapter-core.cjs:91-109` validates only a provider-neutral receipt; it does not implement a Figma importer or establish how JSON/tokens are obtained.

**Impact**

Stories could assume that all four inputs are ordinary local files. PNG/SVG are straightforward local artifacts; JSON/tokens may instead require a Figma plugin, REST/API access, or a separately generated local export. That changes credentials, host control, provenance, and test fixtures.

**Recommendation**

Make the receipt source explicit, for example `source.mode: local-file | controlled-plugin-export | api-export`, and bind the producer/version to the hash. Keep v1 local-file and controlled-plugin-export only if the product requires no login/API. Otherwise defer JSON/tokens and state the exact allowed Figma export contract in `bmad-spec`.

**Disposition:** clarify in the next spec; no spine edit required for this review.

### R-004 — MEDIUM — Penpot cannot be treated as a transparent reuse of the Figma input contract

**Evidence**

- The spine says “Penpot reuses the contract” at `ARCHITECTURE-SPINE.md:75` and defers exact mappings at `ARCHITECTURE-SPINE.md:200`.
- Penpot’s official native file is a versioned `.penpot` ZIP containing JSON metadata and binary assets: [Penpot file format](https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/).
- Penpot layer exports expose PNG/JPEG/WEBP/SVG/PDF, and its plugin export API has its own settings: [Penpot exporting layers](https://help.penpot.app/user-guide/export-import/exporting-layers/), [Penpot plugin Export API](https://doc.plugins.penpot.app/interfaces/Export).

**Impact**

“Reuse the contract” is valid for a normalized receipt, but not for the provider input format or fidelity semantics. Without an explicit provider manifest, archive safety and version handling are underspecified.

**Recommendation**

Define Penpot intake as either (a) local `.penpot` archive plus safe ZIP extraction and manifest/version validation, or (b) exported raster/vector assets only. Add provider-specific source format and mapping loss fields while keeping the receipt provider-neutral. Do not imply Figma JSON compatibility.

**Disposition:** defer exact implementation to `bmad-spec` and stories, but make the input boundary explicit before implementation.

### R-005 — MEDIUM — “All DesignMD tools” needs a precise completeness definition

**Evidence**

- DesignMD’s homepage currently exposes Templates, Examples, Skills, Guides, Tools, and CLI navigation; it describes the directory as visual references, skills, and source templates: [DesignMD homepage](https://designmd.directory/).
- The Tools page is a directory of extractors, Figma plugins, AI design studios, skills/prompts, and inspiration/reference. Its cards point to external GitHub, Figma, and other sites rather than being all first-party content: [DesignMD Tools & Resources](https://designmd.directory/tools).
- The current crawler only enqueues same-origin classified pages at `skill/scripts/designmd-core.cjs:206-207`; external URLs are retained only when they match the limited source-host extraction list.
- The spine already defers individual external tool records at `ARCHITECTURE-SPINE.md:203`, which is consistent with the implementation but narrower than an interpretation of “ingest every tool.”

**Impact**

The five `kind` values are correct for DesignMD’s first-party directory categories, but a catalog count could be mistaken for a complete inventory of every external tool linked from the Tools page. Commercial template bundles and gated downloads also cannot be treated as freely ingestible content.

**Recommendation**

Define “complete” as complete first-party DesignMD catalog pages plus external references/provenance, not recursive ingestion of every linked provider. Add a distinct reference status/type or an explicit `externalReferences` field, and preserve license/gating metadata. Only fetch an external provider after a separate source admission decision.

**Disposition:** clarify acceptance criteria; current reference-only behavior is the safe default.

### R-006 — LOW — Node “current verification” is an environment observation, not a public release pin

**Evidence**

- The spine records `Node.js | 22+ support floor; current verification 26.3.1` at `ARCHITECTURE-SPINE.md:148`.
- Local probe returned `v26.3.1`.
- Node’s official release page currently lists v22 and v24 as LTS and v26 as Current, with the page footer showing a newer v26 release than the local probe: [Node.js Releases](https://nodejs.org/en/about/previous-releases).

**Impact**

The support floor is reasonable and current, but “current verification” can age silently and should not be read as the supported release pin.

**Recommendation**

Rename the field to `validated local runtime` or record the probe date. Keep the support policy as `Node >=22`; production guidance should prefer an Active/Maintenance LTS line, consistent with Node’s official guidance.

**Disposition:** documentation cleanup; not a release blocker.

## Confirmed as reality-consistent

### Node and uv

- Node 22 is listed as LTS, Node 24 as LTS, and Node 26 as Current by the official Node release page. The `Node >=22` support floor is therefore valid for the stated runtime boundary.
- Official uv documentation confirms `uv run` runs commands/scripts in a managed Python environment and can provision the interpreter; this matches the BMAD-only Python/uv boundary: [uv CLI reference](https://docs.astral.sh/uv/reference/cli/), [uv running commands](https://docs.astral.sh/uv/concepts/projects/run/).
- No evidence was found that the product runtime requires MCP. The inspected public surface and local code remain Skill + CLI + filesystem; network is used for optional ingestion.

### DesignMD discovery and resource kinds

- The official site exposes the expected first-party sections and links to `llms.txt`, `ai.txt`, and `sitemap.xml` from its navigation: [DesignMD homepage](https://designmd.directory/).
- `llms.txt` documents `/templates`, `/skills`, `/library`, `/guides`, and `/tools` as canonical sections and points to `llms-full.txt`: [DesignMD llms.txt](https://designmd.directory/llms.txt).
- `ai.txt` identifies public pages, explicitly permits public discovery, names `llms-full.txt` and `sitemap.xml`, and requires robots/rate discipline: [DesignMD ai.txt](https://designmd.directory/ai.txt).
- The spine’s five kinds—skill, template, example, guide, tool—match the site’s current public categories. The implementation’s discovery seeds include the three named machine-readable entries.

### Design-tool boundary

- Figma’s official docs confirm PNG and SVG are real export formats; the docs also make clear that export behavior has format-specific fidelity constraints such as outlined text and strokes-as-fills: [Figma export formats](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs).
- Penpot’s official docs confirm local `.penpot` files are inspectable ZIP/JSON artifacts and that PNG/SVG/PDF-style layer exports exist. This supports an export-first, local-artifact architecture, provided provider-specific input and fidelity rules are added: [Penpot `.penpot` format](https://help.penpot.app/user-guide/export-import/penpot-file-format/).

## Recommended follow-up order

1. Implement and test robots policy; keep AD-3 as an enforcement invariant.
2. Close the symlink/junction containment gap in persisted catalog reads/writes; keep AD-5 unchanged.
3. In `bmad-spec`, freeze source-mode and provider-specific input envelopes for Figma and Penpot.
4. Define DesignMD completeness as first-party catalog completeness plus governed external references.
5. Continue with importer stories only after representative Figma/Penpot fixtures and fidelity thresholds exist.

## Sources

All web sources were checked on 2026-08-23 and are linked inline above. Primary sources used:

- https://nodejs.org/en/about/previous-releases
- https://docs.astral.sh/uv/reference/cli/
- https://docs.astral.sh/uv/concepts/projects/run/
- https://designmd.directory/
- https://designmd.directory/llms.txt
- https://designmd.directory/ai.txt
- https://designmd.directory/tools
- https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs
- https://developers.figma.com/docs/plugins/api/ExportSettings/
- https://help.penpot.app/user-guide/export-import/penpot-file-format/
- https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/
- https://help.penpot.app/user-guide/export-import/exporting-layers/
- https://doc.plugins.penpot.app/interfaces/Export
