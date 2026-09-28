# Design pipeline delta

## Requirement: measured interaction
The pipeline SHALL verify declared web interactions by driving real input in a headless browser
and SHALL fail interactions that do not respond, do not settle, drift from their rest position, only
change opacity, or load resources from other origins.

## Requirement: web sub-workflow
Web work SHALL follow a sub-workflow whose guide lists each stage's commands, and SHALL not show a
draft before its interaction probe passes.
