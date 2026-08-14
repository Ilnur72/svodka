import type { ReactNode } from "react";
import { MASK_TEXT, MASK_TEXT_LONG, unverifiedReason } from "../lib/dataQuality";
import { Banner } from "./Banner";
import { EmptyState } from "./states";

/**
 * Текширилмаган бўлимларда сон қиймат ўрнида турадиган чип.
 *
 * `UNVERIFIED` да бўлмаган бўлим учун ҳеч нарса қилмайди — болани ўзини
 * қайтаради. Шу сабабли панелларда шартли тармоқланиш керак эмас: қиймат
 * `<Masked area="…">{nf(x)}</Masked>` кўринишида ёзилаверади.
 */
export function Masked({ area, children }: { area: string; children?: ReactNode }) {
  const reason = unverifiedReason(area);
  if (!reason) return <>{children}</>;
  return (
    <span
      title={reason}
      className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-sunken px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[-0.01em] text-ink-3"
    >
      <span aria-hidden="true">⌛</span>
      {MASK_TEXT}
    </span>
  );
}

/** Катта рақам ўрнида (StatTile) — чипдан кўра йирикроқ матн. */
export function MaskedValue({ area, children }: { area: string; children?: ReactNode }) {
  const reason = unverifiedReason(area);
  if (!reason) return <>{children}</>;
  return (
    <span
      title={reason}
      className="inline-block text-[15px] leading-[1.6] font-medium tracking-normal text-ink-3"
    >
      {MASK_TEXT_LONG}
    </span>
  );
}

/** Бўлим тепасидаги қизил баннер: нима учун рақамлар яширилган. */
export function UnverifiedBanner({ area, extra }: { area: string; extra?: ReactNode }) {
  const reason = unverifiedReason(area);
  if (!reason) return null;
  return (
    <Banner tone="crit">
      <b>Маълумот текширилмоқда — сон қийматлар кўрсатилмаяпти.</b> {reason} Бўлим тузилиши,
      воқеалар рўйхати ва саналар манбадаги кўринишида қолдирилган.{extra ? <> {extra}</> : null}
    </Banner>
  );
}

/**
 * Текширилмаган бўлимда диаграмма ўрнида турадиган изоҳ: нотўғри шакл ҳам
 * ёлғон маълумот, шунинг учун график умуман чизилмайди.
 */
export function MaskedChart({ area, what }: { area: string; what: string }) {
  const reason = unverifiedReason(area);
  if (!reason) return null;
  return (
    <EmptyState
      title="Диаграмма чизилмади"
      text={
        <>
          {what} — манба қийматлари текширилмагани учун график кўрсатилмаяпти: нотўғри шакл ҳам
          нотўғри хулосага олиб келади. {reason}
        </>
      }
    />
  );
}
