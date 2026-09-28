# Add a static composition gate

Film gates check time; nothing checks the frame itself. A real HyperFrames render passed every
film gate while its frames were bottom-heavy, dark-on-dark and left the top third empty, and the
repository computed no real contrast anywhere (palette foundations only declare luminance order).

Add a composition gate that measures any rendered PNG, optionally with DOM text elements, and
reports composition failures with concrete fixes. It is the first capability delivered under the
`broaden-to-agent-art-literacy` model beyond film, and it is runtime-agnostic (browser,
HyperFrames or Blender output).
