# Proposal: Internalize Subject-First Design Craft

## Problem

The pipeline already rejects generic AI visual patterns and protects copy scope, but the reason
for choosing a carrier or visual technique can still remain implicit. That leaves two failure
modes: choosing a style label before understanding the task, or removing so much decoration that
the result becomes a title over an untreated asset.

## Decision

Adapt the useful parts of
[`victorzhang016-code/victor-design`](https://github.com/victorzhang016-code/victor-design):

- check the deliverable form and reader action before choosing a visual direction;
- ground visual decisions in the subject, audience, material, and viewing context;
- require a cause/effect explanation for major visual techniques;
- review both generic AI formula and under-designed output;
- treat copy as sourced fact, real voice, or an explicit structural role.

Integrate these principles into the existing `SKILL.md`, anti-slop, plain-language, and feedback
contracts. Do not copy the upstream style evidence, benchmark boards, Figma DOM Migrate plugin,
project-file templates, personal visual identity, or add runtime dependencies.

## Success criteria

- Form sanity is a routed step before visual direction selection.
- Anti-slop review explicitly checks both formulaic output and over-restraint.
- Copy and Issue/PR guidance prohibit invented facts, metrics, metadata, and personal experience.
- A focused structural test protects the routing contract.
- Existing package, OpenSpec, and QA workflows remain the source of truth.
