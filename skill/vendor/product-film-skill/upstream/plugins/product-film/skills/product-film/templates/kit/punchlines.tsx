import { Easing } from "remotion";
import type { ReactNode } from "react";

import { clamp01 } from "./time";

/**
 * Punchlines, Apple style: big words landing one by one on the beat, with
 * nothing else on screen (except a brand element, if the film has one). Every
 * word keeps its slot from the start (opacity, not
 * unmount), so a centered line never re-centers while it builds. A brand name
 * lands with its logo (`logo`, rendered at 0.82em before the word).
 *
 *   const cards: Card[] = [
 *     { lines: [[{ text: "Meet", at: b(3, 1) }, { text: "Acme.", at: b(3, 2), accent: true }]], out: b(4, 1) - 0.1, y: 430, size: 156 },
 *   ];
 *   <Punchlines t={t} cards={cards} theme={{ font: '"Inter", sans-serif', color: "#fafafa", accent: "#ff4500" }} />
 */
export type Word = { text: string; at: number; accent?: boolean; logo?: ReactNode };
export type Card = { lines: Word[][]; out: number; y: number; size: number };
export type PunchlineTheme = { font: string; color: string; accent: string; weight?: number };

const land = Easing.bezier(0.22, 1, 0.36, 1);

export function Punchlines({ t, cards, theme }: { t: number; cards: readonly Card[]; theme: PunchlineTheme }) {
  return (
    <>
      {cards.map((card, index) => {
        const first = card.lines[0][0].at;
        if (t < first - 0.05 || t > card.out + 0.25) return null;
        const leave = clamp01((t - card.out) / 0.18);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: card.y,
              translate: "0 -50%",
              display: "grid",
              justifyItems: "center",
              fontFamily: theme.font,
              fontSize: card.size,
              fontWeight: theme.weight ?? 600,
              lineHeight: 1.08,
              color: theme.color,
              opacity: 1 - leave,
              filter: leave > 0 ? `blur(${leave * 12}px)` : undefined,
            }}
          >
            {card.lines.map((line, row) => (
              <div key={row} style={{ display: "flex", alignItems: "center", gap: "0.26em", whiteSpace: "nowrap" }}>
                {line.map((word) => {
                  const u = land(clamp01((t - word.at) / 0.3));
                  return (
                    <span
                      key={word.text}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2em",
                        color: word.accent ? theme.accent : undefined,
                        opacity: u,
                        filter: u < 1 ? `blur(${(1 - u) * 16}px)` : undefined,
                        translate: `0 ${(1 - u) * 36 - leave * 16}px`,
                      }}
                    >
                      {word.logo ? <span style={{ display: "inline-flex", width: "0.82em", height: "0.82em", flex: "none" }}>{word.logo}</span> : null}
                      {word.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
