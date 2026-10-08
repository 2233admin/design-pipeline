import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

/**
 * Review stills: bundles once, then renders each frame as a PNG (at the
 * composition's preview fps, 60 by default). Much faster than one
 * `npx remotion still` per frame, which re-bundles every time.
 *
 *   bun scripts/stills.ts <out dir> <frame>... --composition MyFilm [--debug] [--props '{"fps":60}']
 *
 * `--debug` passes `debug: true`, so a TargetLog prints every [data-target] box into the frame.
 * Uses ../webpack-override.ts when the project has one (Tailwind, path aliases).
 */
const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
};
const composition = flag("--composition");
const extraProps = JSON.parse(flag("--props") ?? "{}");
const debug = args.includes("--debug");
const [dir, ...frames] = args.filter((arg) => arg !== "--debug");
if (!dir || frames.length === 0 || !composition) throw new Error("Usage: bun scripts/stills.ts <out dir> <frame>... --composition <Id> [--debug] [--props '{}']");

const root = resolve(import.meta.dirname, "..");
const out = resolve(dir);
mkdirSync(out, { recursive: true });
const webpackOverride = await import(join(root, "webpack-override.ts")).then((module) => module.webpackOverride).catch(() => undefined);
const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts"), webpackOverride, publicDir: join(root, "public") });
const inputProps = { fps: 60, ...extraProps, debug };
const selected = await selectComposition({ serveUrl, id: composition, inputProps });
for (const frame of frames) {
  const output = join(out, `f${frame}.png`);
  await renderStill({ serveUrl, composition: selected, inputProps, frame: Number(frame), output, overwrite: true });
  console.log(output);
}
