"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades + slides a section in as it scrolls into view.
 *
 * Built on a plain IntersectionObserver + CSS transition instead of
 * framer-motion's `whileInView` — that prop turned out not to apply its
 * `initial` style to off-screen elements at all in this project's setup
 * (confirmed directly: an element below the fold kept no inline style
 * whatsoever, before or after scrolling into view, so the reveal never
 * visibly fired). This hand-rolled version was verified working end to
 * end — hidden below the fold, transitions in once actually scrolled to.
 *
 * `once` (default) so revisiting a section already seen this page-load
 * doesn't replay the animation — that reads as flickery, not polished.
 * Respects prefers-reduced-motion by skipping straight to visible.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <div
      ref={ref}
      className={cn(
        !reduceMotion && "transition-[opacity,transform] duration-500 ease-out",
        !reduceMotion && (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"),
        className,
      )}
      style={!reduceMotion ? { transitionDelay: `${delay * 1000}ms` } : undefined}
    >
      {children}
    </div>
  );
}
