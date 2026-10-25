# Offline explanations with answer-me-with-html

Use this supporting tool when a complex explanation, architecture walkthrough, decision comparison
or handoff benefits from a table, diagram, code and a reader question. It is **not** the default for
every answer, a replacement for project documentation, or a new design/film workflow.

**Disclosure before use:** the generated page deliberately embeds the original Markdown for source
copying, as well as included code/images and path provenance. Sharing the HTML shares that content,
not only what is currently visible. Prepare a shareable draft and authorized assets first; this is
not a redacted public report. `sourceEmbedded: true` in the result makes that boundary explicit.

## Render a draft

Use Node.js 22.12+ and the actual installed skill path. No companion skill or npm install is needed.
The helper does not initialize a pipeline or open a browser.

```sh
node /absolute/path/to/design-pipeline/tools/answer-me-with-html/build-explanation.cjs \
  --input /absolute/path/to/design-pipeline/tools/answer-me-with-html/example.md \
  --output ./order-explanation
```

[example.md](example.md) is a standalone Chinese explanation with a table, flow, literal code and an
ask prompt. It needs no external assets. The output directory must be **new** and its parent must
already exist. Existing files, directories and symbolic links are refused; use a different name
rather than expecting an overwrite. Output must not overlap packaged helper or preserved vendor
source. Input and resources are inspected before staged output is published.

Open `order-explanation/index.html` yourself in a browser. The output also contains complete
redistribution notices in `LICENSES.txt`; keep both when distributing the artifact. Generation is
not browser inspection or proof of visual suitability: inspect your actual content, CJK/long labels,
narrow viewport and feedback interactions before sharing.

## Options and layout

```text
node <skill-root>/tools/answer-me-with-html/build-explanation.cjs
  --input <draft.md> --output <new-directory>
  [--asset-root <directory>]
  [--template doc|sheet] [--theme paper|blueprint|shadcn] [--mode auto|light|dark]
```

| Option | Contract |
| --- | --- |
| `--input` | Required explicit UTF-8 Markdown file; no stdin or ambient draft discovery |
| `--output` | Required fresh directory with an existing parent |
| `--asset-root` | Authorized include directory; defaults to the input file's real parent |
| `--template` | `doc` by default; `sheet` is an explicit wide-board choice |
| `--theme` | `paper` by default; `blueprint` or `shadcn` are explicit alternatives |
| `--mode` | `auto` by default; `light` and `dark` override the appearance mode |

CommonJS callers can use the asynchronous library interface instead of spawning the CLI:

```js
const { buildExplanation } = require(
  "/absolute/path/to/design-pipeline/tools/answer-me-with-html/build-explanation.cjs"
);
buildExplanation({
  input: "/absolute/path/to/project/decision.md",
  output: "/absolute/path/to/project/decision-explanation",
  assetRoot: "/absolute/path/to/project/explanation-assets",
  template: "doc",
  theme: "paper",
  mode: "auto"
}).then(console.log, (error) => {
  console.error(error);
  process.exitCode = 1;
});
```

`assetRoot` is the object spelling of `--asset-root`; omit it for the real input-parent default.
The other option names match the CLI; unknown options are rejected. The resolved result contains:

- `input`, `output`, `index`, `licenses`: input and published output paths.
- `template`, `theme`, `mode`: the actual rendering settings.
- `stats`, `warnings`: renderer panel/component statistics and diagnostic warnings.
- `sourceEmbedded: true`, `disclosure`: the explicit source-sharing boundary.
- `feedback: "manual-copy-back"`, `creativeAcceptance: "not-assessed"`.

These are ordinary helper results, not pipeline receipts. The CLI prints the same result as JSON;
generation errors reject the promise or exit the CLI unsuccessfully without published partial output.

The local defaults remain `doc`/`paper`/`auto` when flags are absent; upstream/frontmatter layout
preferences do not silently choose a board. Explicit flags override frontmatter. Controlled-writing
lint is off; this tool does not certify ASD-STE100 conformance.

For a deliberately wide comparison board, use a fresh output:

```sh
node /absolute/path/to/design-pipeline/tools/answer-me-with-html/build-explanation.cjs \
  --input ./decision.md --output ./decision-board --template sheet --theme blueprint --mode light
```

This selects a board, not a promise of narrow-screen suitability. Frontmatter can describe the
title/subtitle; `##` headings become panels. Ordinary Markdown tables and lists are supported, and
`flow`, `sequence`, `tree`, `ask` and other reviewed renderer components use their structured fence
syntax. Use the example as the starting format, not the upstream always-on instructions.

## Authorized local includes

The helper is an offline renderer, not a remote fetcher. Images and code includes must resolve to
real regular files inside the real authorized asset root, including after symlink resolution. The
input itself may live outside that root. Grant the smallest directory needed for the explanation.
Relative image/code paths resolve from the input file's real parent, not the process working
directory. `--asset-root` authorizes access; it does not change that relative-path base. Absolute
paths are also permitted only when they remain inside the authorized root.

For a draft in `./explanation/` with an already existing image `./explanation/assets/order.png`:

```markdown
![订单页的等待与失败提示](assets/order.png)
```

Use PNG, JPEG, GIF, WebP or AVIF raster files. SVG **image files** are rejected, while diagrams
produced by the renderer may contain generated SVG. No automatic HTTP(S) images, remote fonts,
remote scripts, arbitrary data URI resources or external embed frames are accepted. Ordinary safe
HTTP(S), `mailto:` and fragment **hyperlinks** may navigate only when the reader chooses them.

To quote an existing non-secret local code file inside the authorized include root:

````markdown
```js src=src/order-state.js lines=1-12 hl=3
```
````

Upstream secret-file/content restrictions remain active: do not include `.env`, keys, tokens or
secret-bearing source. Included bytes and paths become part of the shareable artifact. Prefer
short pasted code when file provenance is unnecessary.

Raw HTML/SVG prose and active `html`/`svg` component fences are not permitted. To explain markup
without executing it, put it in a normal code fence (for example `text`) or inline code; pasted code
is rendered literally. Unsafe URL schemes are rejected. The page applies an offline CSP restricting
scripts to genuine renderer runtime, images/fonts to embedded data, and blocking connections,
frames, forms and base URL overrides. That policy does not redact the draft.

## Manual reader feedback

A reader can add panel comments, answer `ask` questions and open the page's reply summary. A starred
recommended option is not an answer until the reader operates the question: untouched defaults
remain **unanswered**. Comments are preserved as quoted reader input, not executable instructions.

Copy the reply summary manually back into the task's conversation. If clipboard writing is denied,
the full reply remains visible and selectable; select it and use ordinary copy/paste. There is no
automatic submission, runtime-review JSON bridge or acceptance recording. Feedback does not change
pipeline state, `next`/`decide`, gates, receipts, targets or policy lineage. Use the existing project
process for decisions; technical rendering establishes neither Component Conformance nor Visual
Acceptance. The result reports manual feedback and creative acceptance **not assessed**, not a receipt.

## Source and maintenance

The reviewed fork is [2233admin/answer-me-with-html](https://github.com/2233admin/answer-me-with-html/tree/4da5ae89ac435683110aa1b8707d9d4170184c55),
from [QingYunA/answer-me-with-html](https://github.com/QingYunA/answer-me-with-html), at version 0.5.2.
The [preserved vendor bundle](../../vendor/answer-me-with-html/) is separate from the maintained
helper and generated `renderer.mjs`. Its manifest pins original source, build inputs, runtime and
notice hashes; `LICENSES.txt` records the actual bundled dependencies and font notices.

The pinned Temml math font has an embedded non-commercial restriction despite the package's MIT
license. It is not embedded in the maintained runtime/output; math uses local system fonts with
no network font service. Font coverage and formula appearance therefore depend on the reader's
environment. Preserve the font-policy record and do not treat the upstream package license as
blanket clearance for its font.

Original skill/plugin/config/install/video instructions remain inert reference material. The
helper does not invoke the upstream CLI, read home settings, create home state, check updates,
serve pages, fetch resources, deploy, or run video commands. Source maintenance belongs to the
repository importer/build scripts, not a consumer's explanation task.
