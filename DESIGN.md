---
version: alpha
name: Design Pipeline
description: Visual presentation of the repository's CLI and Markdown documentation
omitted:
  - section: colors
    reason: The terminal and Markdown renderer own their accessible color themes.
  - section: typography
    reason: The host owns font families, sizes and zoom; the repository uses semantic Markdown.
  - section: spacing
    reason: The host lays out text; this repository defines no shared pixel spacing scale.
  - section: rounded
    reason: The repository has no shared graphical control or container theme.
  - section: components
    reason: Documentation elements inherit the host renderer rather than custom component tokens.
---

# Design Pipeline

## Overview

Design Pipeline's own surface is a command-line tool and a set of Markdown documents for designers,
developers and agents. Presentation should be calm, readable and easy to inspect: a clear result,
the evidence needed to assess it, and the next action when one is needed.

This document follows the [Google DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md).
It describes this repository's presentation. Each target product owns its visual identity; studies,
reference collections and example films do not establish a shared house style.

## Colors

The host theme supplies foreground, background, links and code highlighting. No fixed palette is
authored here, so color tokens are intentionally omitted. Statuses must remain understandable in
plain text: a failed check names the failure and its remedy; a passed check names what was checked.
Color may reinforce a label, but must never carry the result alone.

## Typography

Use semantic Markdown headings for hierarchy, ordinary paragraphs for explanations, and inline
code for paths, identifiers and exact commands. Use fenced blocks for runnable examples. Let the
reader's renderer choose font metrics and support zoom. Keep headings short and descriptive;
avoid decorative Unicode alphabets, visual ASCII banners and paragraphs presented as headings.

## Layout

Lead with the useful result. Put the command or example beside the explanation it serves. Use
lists for steps and tables for genuine comparisons; long narrative belongs in prose. Keep one
canonical explanation per concern and link to it from short entry documents.

Documents should read in a single column without a fixed viewport. Wide evidence images need a
caption and a link to their original; side-by-side comparisons should retain legible labels when
stacked on narrow screens. Keep release history, research and verification reports out of the
root entry documents; their locations are indexed in [docs/README.md](docs/README.md).

## Elevation & Depth

The CLI and Markdown surfaces are flat. Establish hierarchy with headings, whitespace, grouping
and labels. The repository defines no decorative shadows, glass layers or perspective effects.

## Shapes

Code blocks, tables and image frames inherit the renderer's treatment. No border-radius system
or fixed canvas shape is specified. Embedded studies choose shapes for their own subject.

## Components

- **Command examples:** a language-labelled code block with necessary context and copyable syntax.
- **Results and findings:** an explicit status, a concrete observation and a relevant evidence link.
- **Comparison tables:** short parallel fields, meaningful headers and visible missing values.
- **Evidence figures:** an image or preview with a descriptive caption, source and useful dimensions.
- **Navigation links:** descriptive labels pointing to the canonical guide rather than duplicated text.

These are content presentation patterns. Workflow stages, receipts and validators are engineering
contracts documented in [openspec/project.md](openspec/project.md), not visual component tokens.

## Do's and Don'ts

### Do

- Preserve native text selection, document semantics, readable contrast and host zoom.
- Let evidence carry the visual claim; keep technical checks and creative acceptance distinct.
- Use the static presentation defined in [MOTION.md](MOTION.md) for repository documentation.
- Give target products their own design tokens, composition and motion decisions.

### Don't

- Do not invent color or spacing tokens for surfaces whose rendering belongs to the host.
- Do not use a screenshot as the only form of documentation or meaning-bearing text.
- Do not turn an example's palette, dimensions or character into a global design requirement.
- Do not replace visual guidance with installation instructions, process lists or test reports.

## Product Context

This is a local provenance extension to the Google format. The project improves agents' ability
to design interfaces, graphics, images, motion and films. Individual tools can support an existing
workflow; complete deliverables use the documented design and verification contracts. The package
itself is host-rendered and does not prescribe an aesthetic to those deliverables.

## Source Decisions

### Adopted

- Adopted Google's visual-system format, official section order and reasoned `omitted` token groups.
- Adopted the repository's existing host-rendered CLI, semantic Markdown and static motion posture.
- Adopted project-specific identity and attributed visual evidence; the foundation requirement is
  recorded in [enforce-design-foundation](openspec/changes/archive/2026-08-23-enforce-design-foundation/proposal.md).
- Recorded this clarification in [organize-repository-docs](openspec/changes/organize-repository-docs/proposal.md).

### Rejected

- Rejected treating workflow machinery as a visual component system.
- Rejected fabricated theme values, a mandatory canvas size or a reference character for all tools.
- Rejected replacing a target product's authored design with a generic or upstream example.
