"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** stagger delay in ms */
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

/**
 * Fades + rises its children into view once, when scrolled near.
 * Editorial restraint: a single, slow, settled motion — not bouncy.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- reveal-on-mount when already in view; the observer path is async */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IO support, or already in view at mount → reveal now (never leave
    // content stranded at opacity:0 behind a callback that may not fire).
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const Component = Tag as React.ElementType;
  return (
    <Component
      ref={ref}
      data-shown={shown}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
