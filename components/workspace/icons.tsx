/**
 * The in-house icon family — one 20×20 viewBox, one 1.5 stroke weight, round caps,
 * `currentColor`. Replaces the Unicode glyph soup (⚙ ⤴ ★ ⑂ ✓ ✕ →) that rendered
 * off-baseline at OS-variable weights. Size via the className (default 14px);
 * center with inline-flex + leading-none, never the text baseline. (Design audit.)
 */
import type { ReactNode } from "react";

type IconProps = { className?: string };
const base = "inline-block shrink-0";

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className={`${base} ${className ?? "h-[14px] w-[14px]"}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/** promote — mechanise (a gear): make the validated workflow run on its own. */
export function CogIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 2.6v2.2M10 15.2v2.2M2.6 10h2.2M15.2 10h2.2M4.8 4.8l1.6 1.6M13.6 13.6l1.6 1.6M15.2 4.8l-1.6 1.6M4.8 15.2l1.6-1.6" />
    </Svg>
  );
}

/** publish — share out (up arrow from a tray). */
export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 12.5V3.2" />
      <path d="M6.6 6.6 10 3.2l3.4 3.4" />
      <path d="M4.5 11v4.3a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V11" />
    </Svg>
  );
}

/** check — done / validated. */
export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.6l3.8 3.8L16 5.4" />
    </Svg>
  );
}

/** star — pinned to the deliverable. */
export function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`${base} ${className ?? "h-[13px] w-[13px]"}`} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 2.6l2.27 4.6 5.08.74-3.67 3.58.87 5.06L10 14.25 5.45 16.6l.87-5.06L2.65 7.96l5.08-.74z" />
    </svg>
  );
}

/** branch — a fork (an alternative line of inquiry). */
export function BranchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="5" r="1.9" />
      <circle cx="6" cy="15" r="1.9" />
      <circle cx="14" cy="6.5" r="1.9" />
      <path d="M6 6.9v6.2M6 10.2h3.4a2.6 2.6 0 0 0 2.6-2.6V8.4" />
    </Svg>
  );
}

/** x — remove / unpin. */
export function XIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </Svg>
  );
}

/** chevron right — a connector / "next". */
export function ChevronIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 4.8l5.2 5.2-5.2 5.2" />
    </Svg>
  );
}
