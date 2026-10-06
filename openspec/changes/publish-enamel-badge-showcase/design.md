# Design

## Scope and ownership

The isolated publication branch owns examples/enamel-badge and two root documentation additions. The original ignored study and unrelated working-tree changes remain separate. The artistic renderer retains the latest study parameters.

## Runtime and publication

Vendor only the two Three.js r180 build modules and transitive addon imports required by this page. All runtime requests are relative and local. A small Node static server supports local use without installation. Publish the same example bytes in an isolated gh-pages branch with a .nojekyll marker; GitHub's native branch deployment needs no new Actions workflow.

## Sources and limits

Retain MIT notices for Three, Drei and Scott Sun, and the upstream SMAA v2.8 license. The Poly Haven HDR is CC0. Publish only newly rendered previews. Rename the manually estimated pose table demo-motion.json and describe it as a demonstration, not recovered source motion. No source video, screenshots, audio, machine paths or private receipts are included.

The example uses PBR base materials plus approximate rasterized optics, not path tracing. Glass uses one receiver plane and lacks side-wall intersection, internal bounces and multi-depth occlusion. Human feedback found it viewable but glass remains imperfect. Technical checks and publication authorization do not assert reference fidelity or general model improvement.

## Verification

Check the dependency closure, licenses, source syntax and static-server traversal handling, then inspect actual desktop and narrow browser output, controls and shader diagnostics. Run the branch's existing repository QA and strict change validation. Confirm the deployed public URL renders the same sample before reporting completion.
