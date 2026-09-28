---
version: "1.0"
name: Motion Studies
description: A visual HTML exhibition of design-pipeline animation
---

# Motion Studies

## Product Context
A project owner opens a local page to judge visible motion and composition. The page is the
demonstration, with no testing controls beyond pause and links to the studies.

## Overview
An editorial motion exhibition: warm paper, oversized type, a blue orbital sculpture, and three
distinct studies. Animation clarifies rhythm, spatial relationships, and progressive composition.

## Colors
Paper #f3f2ed; ink #20221f; ultramarine #2547ed; lime #dafa78; secondary ink #62665f.
Use ink on paper and paper on blue. Lime accents do not carry small text on white.

## Typography
Use system sans and available Chinese UI fonts. Large display headings use tight Latin tracking,
while Chinese body text has generous line height. Monospaced labels identify study numbers.

## Layout
Maximum content width 1440px with fluid side gutters. Hero pairs title and sculpture; numbered
studies alternate full-width type and paired compositions. Collapse at 760px with no horizontal
overflow. No repeated dashboard cards.

## Components
Wordmark, anchor navigation, pause button, orbit stage, kinetic type ribbon, scroll composition,
pointer poster, footer. Controls have visible focus and at least 44px touch areas.

## Do's and Don'ts
Keep copy legible at rest. Use transforms and opacity. Do not autoplay audio, hide essential
content for entrances, or depend on a remote asset.

## Source Decisions
Adopted: project motion primitives and CSS platform interpolation. Rejected: external animation
libraries, copied showcase templates, and a testing-dashboard layout.
