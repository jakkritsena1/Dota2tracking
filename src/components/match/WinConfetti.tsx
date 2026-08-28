"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * Fires once per mount when the tracked match was a win. Two bursts from
 * the bottom corners (not the center) so it doesn't cover the score
 * header text it's celebrating.
 */
export default function WinConfetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#2ACB4F", "#F5B942", "#4C9BE8"];
    const shared: confetti.Options = { colors, ticks: 200, gravity: 1, scalar: 0.9 };

    confetti({ ...shared, particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.9 } });
    confetti({ ...shared, particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.9 } });

    const timer = setTimeout(() => {
      confetti({ ...shared, particleCount: 40, angle: 90, spread: 70, origin: { x: 0.5, y: 0.85 } });
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
