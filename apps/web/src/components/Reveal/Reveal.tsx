"use client";

import type { ReactNode } from "react";
import styles from "./Reveal.module.css";
import { useReveal } from "./useReveal";

interface RevealProps {
  /** composed onto the motion wrapper (e.g. a grid-cell or layout class) */
  className?: string;
  children: ReactNode;
}

/**
 * Motion wrapper: fades + lifts its children into place the first time they
 * scroll into view (reveal-once). The wrapper is a semantically-neutral `div`,
 * so callers keep their own headings/paragraphs/cards inside it.
 *
 * It also exposes its state as `data-shown` on the root, so descendants that
 * should *draw* on reveal (SVG strokes) can key off it from their own module
 * (`[data-shown="true"] .connector { … }`) — see Manifesto / DomainArchitecture.
 *
 * Under `prefers-reduced-motion` the children render in their final, visible
 * state with no transition (see Reveal.module.css).
 */
export function Reveal({ className, children }: RevealProps) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const cls = className ? `${styles.rv} ${className}` : styles.rv;

  return (
    <div ref={ref} data-shown={shown ? "true" : "false"} className={cls}>
      {children}
    </div>
  );
}
