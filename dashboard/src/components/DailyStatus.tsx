import type { Status } from "../types";
import type { DailyCounts } from "../lib/adapters/daily";
import {
  DAILY_STATUS_LABEL,
  DAILY_STATUS_ORDER,
  DAILY_STATUS_TOKEN,
  DAILY_THRESHOLDS,
} from "../lib/adapters/daily";
import { nf } from "../lib/format";

/**
 * Кунлик сводкадаги ҳолат белгилари.
 *
 * Ранг ҳеч қачон ёлғиз маъно ташимайди: нуқта ёнида доим сон туради, экран
 * ўқувчи учун `title`/`aria-label` да ҳолат номи ёзилади, пастдаги легендада
 * эса чегараларнинг ўзи кўрсатилади.
 *
 * «Маълумот йўқ» бўш доира (`○`) билан — у ҳам ранг, ҳам шакл бўйича
 * фарқланади, шунинг учун ранг кўрмайдиган фойдаланувчи ҳам ажрата олади.
 */

function Dot({ status }: { status: Status }) {
  const hollow = status === "mute";
  return (
    <i
      aria-hidden="true"
      className={"inline-block h-[7px] w-[7px] flex-none rounded-full " + (hollow ? "border" : "")}
      style={
        hollow
          ? { borderColor: DAILY_STATUS_TOKEN.mute }
          : { background: DAILY_STATUS_TOKEN[status] }
      }
    />
  );
}

/** Ҳолатлар саноғи — бир қаторда, нуқта + сон. */
export function DailyStatusDots({
  counts,
  withLabels = false,
}: {
  counts: DailyCounts;
  /** Юқори қаторда ном ҳам ёзилади; карточка сарлавҳасида фақат сон. */
  withLabels?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex flex-none items-center " + (withLabels ? "gap-x-3.5" : "gap-x-2")
      }
      aria-label={DAILY_STATUS_ORDER.map((s) => `${DAILY_STATUS_LABEL[s]}: ${counts[s]}`).join(", ")}
    >
      {DAILY_STATUS_ORDER.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1"
          title={`${DAILY_STATUS_LABEL[s]}: ${counts[s]}`}
        >
          <Dot status={s} />
          {withLabels && <span className="text-[11.5px] text-ink-2">{DAILY_STATUS_LABEL[s]}</span>}
          <b className="font-mono text-[11.5px] tabular-nums">{nf(counts[s], 0)}</b>
        </span>
      ))}
    </span>
  );
}

/** Пастдаги легенда: чегаралар ва устун ўқилиши. */
export function DailyLegend({ source }: { source?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 border-t border-grid pt-2 text-[11px] text-ink-3">
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <Dot status="crit" />
          {DAILY_STATUS_LABEL.crit} &lt; {DAILY_THRESHOLDS.attention}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot status="warn" />
          {DAILY_STATUS_LABEL.warn} {DAILY_THRESHOLDS.attention}–{DAILY_THRESHOLDS.norm - 0.1}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot status="good" />
          {DAILY_STATUS_LABEL.good} ≥ {DAILY_THRESHOLDS.norm}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot status="mute" />
          Режа/маълумот йўқ
        </span>
        <span>Фоиз = амалда / режа · тик чизиқ = 100%</span>
      </span>
      {source && <span>Манба: {source}</span>}
    </div>
  );
}
