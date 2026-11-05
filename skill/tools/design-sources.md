# Design references, assets and tool discovery

Load this guide when a task needs visual references, a specific asset or a design operation.
Start with the visual question and the project's direction. The user's supplied work and
existing design system take precedence over a gallery's popularity or the examples below.

When production or review exposes a missing technique, follow
[active capability discovery](open-source-design.md). Search and test a fitting implementation
without waiting for the user to name a tool; this directory is one starting point for that work.

## Pick the relevant source category

The user-supplied [ignoredone design directory](https://www.ignoredone.space/index.php/designwebsite/)
groups UI references, images, fonts, mockups, inspiration, design tools and design resources.
Open the relevant category, then a specific work or tool. Keep the live directory as the
discovery index instead of copying its entire catalogue into the skill or loading every site.
The examples below were observed on 2026-10-07; availability and destinations can change.

| Need | Directory examples / selected destinations | Bring back to the task |
| --- | --- | --- |
| Frontend and interface references | Dribbble, Awwwards | The actual screen, hierarchy, density and interaction state; examine the working site when available |
| Graphic composition and editorial rhythm | [Annual Report Archive](https://annualreport.gallery/), Deck Gallery, Behance, Designspiration | A concrete grid, type/image relationship, crop, contrast or sequence that fits the real content |
| Motion and editing references | PVref (the directory links to [PVDex](https://pvdex.flux-ion.cn/)), UI Movement | The relevant passage, poses, spacing, transitions and audiovisual phrasing; a thumbnail cannot establish motion |
| Fonts and lettering | Fontshare, Google Fonts, font identification sites | Continue with [font selection](fonts.md), actual copy, family identity and the publisher's files |
| Images and mockups | unDraw, Pexels, Unsplash, ls.graphics, MockupWorld | The selected asset's source, dimensions, crop, transparency or editable layers and permitted use |
| Public-domain prints, plates and object photos for collage | [Material sources](#public-domain-collage-materials) below: Cleveland, Met, Rijksmuseum, Wikimedia Commons | A CC0 / public-domain file with its record in `materials/licenses.json`, cut into stickers, ink layers or plates |
| Graphic operations and lighting studies | [Space Type Generator](https://spacetypegenerator.com/index.html), Dithering Studio, light-reference, PhotoMosh | An observable type deformation, tonal pattern, light arrangement or compositing operation to study or reproduce |
| Textures, brushes, patterns and icons | Texturelabs, Brusheezy, Pattern Monster, iconfont | The material's scale, repetition, edges and interaction with the composition |

These are search starting points, not default styles, mandatory services or bundled tools.
PV/MAD references are useful when their visual mechanism fits; the same route serves still
graphics, illustration, layout, frontend and rendering tasks.

## Turn a source into a usable decision

1. Name the question: for example, how a title holds a frame, how a dense screen groups data,
   how light separates planes, or how an action leads into a cut. Open only relevant sources.
2. Follow the selected work to its creator, working page or publisher. Record its title/author,
   URL and the view, frame or time interval actually inspected in existing reference/design
   notes. Separate observed features from inferred construction and unknowns.
3. State the mechanism worth adapting, what needs to remain recognizable, and what changes
   for the project's content, language, dimensions and interaction. Build the smallest useful
   study in the existing renderer and inspect its actual output.

For static work, compare composition, value masses, typography, alignment, negative space and
material at the delivery size. For motion, inspect ordered frames and playback; connect to
[reference methods](art-motion/methods.md#read-a-reference-accurately) and
[animation thinking](../references/animation-thinking.md). A gallery label is not analysis.

Reuse [Canvas craft](visual-craft/README.md) and [Art Motion](art-motion/README.md) when they
already provide the needed operation; for frontend work keep the project's existing stack.
An external generator may be useful for a study, but listing it does not install its plugin,
import its code or make its exported work editable. Check the chosen tool's actual inputs,
output and terms before depending on it. Acquire selected reusable assets from their source
with their notices; a directory's “free” label alone does not establish intended-use rights.

If a link is marked unavailable, redirects, requires access or only shows a loading shell,
record that limitation and use an accessible equivalent or the supplied reference. Do not
describe unseen work as inspected, or turn an inaccessible site into a required dependency.

## Public-domain collage materials

Real material lifts collage, poster and card work more than repeated polishing of drawn shapes:
engravings, botanical and insect plates and museum object photos, cut out with a paper edge,
read as finished at the first pass where code-drawn substitutes did not (SHAFT-style study,
2026-11). The registry [`references/material-sources.json`](../references/material-sources.json)
lists each source's query route, the licence field that decides reuse, and the reachability
measured from this environment with date and evidence.

| Source | Measured 2026-11-05 | Route |
| --- | --- | --- |
| Cleveland Museum of Art Open Access | reachable | API search filtered to CC0; print-size images |
| The Met Open Access | reachable | v1.1 search (the v1 search answers 410, retired 2026-10-01); `isPublicDomain` decides |
| Rijksmuseum data services | reachable without a key | Linked Art search; the image's own rights statement (PD mark / CC0) decides; the old keyed API answers 410 |
| Wikimedia Commons | search rate-limited (429 on about half the requests) | fetch by exact `File:` name only; `LicenseShortName` must be public domain or CC0 |
| NYPL, Smithsonian, BHL | need a key (BHL and the NYPL site also challenge scripted clients) | owner downloads, then `materials add` |
| Old Book Illustrations | HTML only, no API | owner browses, reads each page's rights note, then `materials add` |
| Art Institute of Chicago | blocked (Cloudflare challenge) | owner downloads, then `materials add` |

A blocked, keyed or rate-limited source is reported as such with its fix; do not retry in loops,
rotate clients or script around a challenge. Re-measure before relying on the table:

```sh
node "<skill-root>/scripts/designer-pipeline.cjs" materials probe            # exit 2 when a source drifted
node "<skill-root>/scripts/designer-pipeline.cjs" materials search --query "key,pocket watch,butterfly,engraving" --limit 3
node "<skill-root>/scripts/designer-pipeline.cjs" materials fetch --project-root . --source met --id 199408 --name pocket-watch --use "collage: watch"
node "<skill-root>/scripts/designer-pipeline.cjs" materials add --project-root . --file materials/owner/scan-01.png \
  --license owner-scan --by "<owner>" --kind scan --use "paper texture"
node "<skill-root>/scripts/designer-pipeline.cjs" materials check --project-root .
```

Search terms are comma-separated and searched one by one; results are full-text matches, so pick
by looking, not by rank. `fetch` downloads only CC0 / public-domain records (an attribution or
non-commercial licence is refused with its evidence), converts to PNG at most `--width` (default
1200) on the long side, and writes the record into `materials/licenses.json` with source,
object id, title, author, work date, page and file URL, the licence field it was read from,
retrieval date, use and hash. Owner-supplied fonts, scans and photos go into the same file with
`materials add` (licence and author are required; `commercialUse` is only assumed for CC0 /
public domain, otherwise pass `--commercial-use` when the owner says so). The records use the
same `licenses.json` shape as film-edit footage. Cut the material with
[collage cutting](art-motion/assets-audio.md#cut-collage-material).

## Keep the existing evidence route

Supporting studies stay in the current task's notes and use existing
[comparison tools](visual-diagnostics/README.md). For a complete deliverable, carry selected
sources into the existing [reference contract](../references/reference-spec.md) and applicable
[direction preview](../references/direction-preview.md). Preserve source hashes and receipt
lineage when evidence is adopted. This guide adds no gate, source schema or fixed reference quota;
technical conformance and visual acceptance remain separate.
