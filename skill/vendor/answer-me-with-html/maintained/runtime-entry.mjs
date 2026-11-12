// Maintained library entry; original upstream files remain unchanged.
import { renderDoc as upstreamRenderDoc } from '../upstream/src/render.js';
import { RUNTIME_JS, RTL_JS, DELTA_JS } from '../upstream/src/assets.js';
import { useTemml, mayHaveMath } from '../upstream/src/math.js';
import { loadTemml } from 'answer-html-lazy-temml';
export { parseDoc } from '../upstream/src/parse.js';
export { parseCodeArgs, readSlice } from '../upstream/src/code.js';
export { wrapSpacedImages } from '../upstream/src/markdown.js';
export { lexer, walkTokens } from 'marked';
export { hasDelta } from '../upstream/src/render.js';
export const runtimeAssets = Object.freeze({ RUNTIME_JS, RTL_JS, DELTA_JS });
export const version = '0.5.2';
export function renderDoc(source, overrides = {}, defaults = {}, { baseDir, codeDir, knownImages, knownCode } = {}) {
  if (mayHaveMath(String(source))) useTemml(loadTemml());
  return upstreamRenderDoc(source, overrides, defaults, { baseDir, codeDir, knownImages, knownCode });
}
