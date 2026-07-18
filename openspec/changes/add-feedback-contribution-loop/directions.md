# Directions

## A. Add more hard-coded checks

This is the smallest code diff, but every companion update would still require editing JavaScript and tests. It does not create a reusable contribution surface.

## B. Data-driven registry plus local feedback queue — selected

Keep the package dependency-free, move compatibility knowledge into JSON, and add a synchronous local recorder that creates redacted contribution drafts. This makes routine companion updates data changes and gives downstream users a safe path to report gaps.

## C. Background watcher with automatic GitHub publication

This feels more “real-time,” but it adds credentials, network polling, privacy risk, process lifecycle problems, and surprise external side effects.

## Decision

Use direction B. “Real-time” means capture happens in the same command that detects the gap. Publishing remains explicit.
