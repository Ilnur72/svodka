import type { ReactNode } from "react";
import type { TexIconId } from "../../lib/adapters/texShema";

/**
 * «Технологик жараён» иконкалари — 24×24 чизиқли inline SVG, худди
 * `CompanyPanel.tsx` даги каби. Янги пакет қўшилмайди.
 *
 * Ранг ҳеч қачон **ёлғиз** маъно ташимайди: иконканинг ёнида доим матн
 * (босқич номи, плитка ёрлиғи) туради, ўзи эса `aria-hidden`.
 * Ранг `currentColor` дан келади — шунинг учун ёруғ ва қоронғи мавзуда
 * алоҳида қиймат керак эмас.
 */
const ICON_PATH: Record<TexIconId, ReactNode> = {
  factory: <path d="M3 20V9l5 3V9l5 3V9l5 3v8H3Zm4-4v2m5-2v2m5-2v2" />,
  flask: <path d="M9 3h6M10 3v6L4 20h16l-6-11V3M7.5 14h9" />,
  furnace: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 20v-5h10v5M8 8h8" />
    </>
  ),
  mine: <path d="M3 19 9 8l3 5 2-3 7 9H3Z" />,
  box: <path d="M3 8l9-4 9 4v9l-9 4-9-4V8Zm9 4 9-4M12 12v9m0-9L3 8" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  stack: <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Zm9 9-9 4.5L3 12m18 4.5L12 21l-9-4.5" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  h2: (
    <>
      <path d="M4 5v14M11 5v14M4 12h7" />
      <path d="M15 19h5m-5 0c0-3 5-3.5 5-6.5A2.5 2.5 0 0 0 15 10" />
    </>
  ),
  drop: <path d="M12 3s6 6.4 6 10.2A6 6 0 0 1 6 13.2C6 9.4 12 3 12 3Z" />,
  swap: <path d="M4 8h13l-3-3m6 11H7l3 3" />,
  thermo: (
    <>
      <path d="M10 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z" />
      <path d="M12 9v6" />
    </>
  ),
  ph: (
    <>
      <path d="M4 5v14M4 12h4a3.5 3.5 0 1 0 0-7H4" />
      <path d="M13 21V9m0 3h4a3 3 0 1 1 0 6h-4" />
    </>
  ),
  layers: <path d="m12 4 8 4-8 4-8-4 8-4Zm8 8-8 4-8-4m16 5-8 4-8-4" />,
  scale: (
    <>
      <path d="M12 4v16M6 20h12M4 9h16" />
      <path d="M4 9 1.5 15h5L4 9Zm16 0-2.5 6h5L20 9Z" />
    </>
  ),
  conveyor: (
    <>
      <circle cx="6" cy="16" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path d="M6 13h12M8 9h8l-1-4H9L8 9Z" />
    </>
  ),
  bubbles: (
    <>
      <path d="M4 14h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-3Z" />
      <circle cx="8" cy="8" r="2" />
      <circle cx="14" cy="6" r="1.6" />
      <circle cx="17" cy="10" r="1.2" />
    </>
  ),
  dry: (
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M12 2v2m0 10v2M5 9H3m18 0h-2M6.7 3.7 5.3 2.3m13.4 1.4 1.4-1.4M4 20h16" />
    </>
  ),
  reactor: (
    <>
      <path d="M7 4h10v13a5 5 0 0 1-10 0V4Z" />
      <path d="M9 2h6M9 12h8" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v7l-4-2v-5L3 5Z" />,
  crystal: <path d="m12 3 6 5-2 11H8L6 8l6-5Zm0 0v16M6 8h12" />,
  press: (
    <>
      <path d="M4 3h16v5H4zM4 21h16v-3H4z" />
      <path d="M12 8v6m-4 1h8v3H8z" />
    </>
  ),
  sieve: (
    <>
      <path d="M4 7h16v3a8 8 0 0 1-16 0V7Z" />
      <path d="M6 11h12M8 15h8" />
    </>
  ),
  mix: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M7 13c2-3 3 3 5 0s3 3 5 0" />
    </>
  ),
  mill: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  waste: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6m4-6v6" />,
  dot: <circle cx="12" cy="12" r="6" />,
};

export interface TexIconProps {
  id: TexIconId;
  size?: number;
  className?: string;
}

export function TexIcon({ id, size = 16, className }: TexIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"flex-none " + (className ?? "text-ink-3")}
    >
      {ICON_PATH[id]}
    </svg>
  );
}
