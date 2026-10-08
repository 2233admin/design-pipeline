import { useLayoutEffect, useRef } from "react";

/**
 * Review aid: prints the screen center of every `[data-target]` element into
 * the frame, so cursor targets come from measurement, not guesses. Remotion
 * does not forward console output from stills, so the numbers go in the image.
 * The render page sits one million pixels up, which `top` corrects.
 */
export function TargetLog() {
  const ref = useRef<HTMLPreElement>(null);
  useLayoutEffect(() => {
    const top = document.querySelector("[data-remotion-canvas]")?.getBoundingClientRect().top ?? -1_000_000;
    const lines: string[] = [];
    for (const element of document.querySelectorAll("[data-target]")) {
      const box = element.getBoundingClientRect();
      lines.push(
        `${element.getAttribute("data-target")} x=${Math.round(box.x + box.width / 2)} y=${Math.round(box.y - top + box.height / 2)} w=${Math.round(box.width)} h=${Math.round(box.height)}`,
      );
    }
    if (ref.current) ref.current.textContent = lines.join("\n");
  });
  return (
    <pre
      ref={ref}
      style={{ position: "absolute", left: 10, top: 10, margin: 0, padding: 12, background: "#000", color: "#0f0", fontSize: 28, fontFamily: "monospace" }}
    />
  );
}
