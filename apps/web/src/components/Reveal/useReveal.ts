"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Scroll-driven reveal. Returns a ref to attach to an element and a `shown` flag
 * that flips `true` the first time the element scrolls into view, after which it
 * is unobserved (reveal-once). Mirrors the IntersectionObserver from the Chosen
 * "camadas" prototype: `threshold 0.16` and a `rootMargin` that trims the bottom
 * 7% so the reveal fires a touch before the element is fully on screen.
 *
 * Degrades safely: where IntersectionObserver is missing (SSR, jsdom, ancient
 * engines) `shown` flips `true` on mount so the content is never trapped hidden.
 */
export function useReveal<T extends Element>(): {
  ref: RefObject<T | null>;
  shown: boolean;
} {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -7% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}
