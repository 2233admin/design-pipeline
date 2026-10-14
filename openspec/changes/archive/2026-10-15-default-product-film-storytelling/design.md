# Design

The missing decision is film grammar, downstream of runtime selection. Keep the existing
HyperFrames route and paused GSAP timeline. Add one project-owned reference containing intake,
shot planning, an early moving proof, and separate technical/creative review. Point to it from
the front door, stages, and HyperFrames. It is pipeline policy, not an upstream HyperFrames rule.

Film direction: a cursor becomes a prompt node; its outgoing connection leads the camera to an
ASCII image; structure resolves into color; pulling back reveals a connected storyboard; the
same connection contracts to the brand. The product action supplies the transitions. Typography
punctuates the action rather than explaining a succession of static panels.

Use a single Canvas 2D world embedded in HTML with a deterministic GSAP-controlled clock. Reuse
the original locally generated landscape and vendored GSAP. All shot geometry, image reveal, and
camera movement derive from timeline time. A single moving proof is built before all polish.

The default is motion-led narrative; it does not mandate a one-take film or a fixed visual style.
Product demonstrations, montage, match cuts and continuous transformations are all valid when
their cuts/actions advance the product story. Explicit presentation requests remain separate.
