import type { Status } from "../types";
import type { KpiCounts } from "../lib/adapters/kpi";
import { KPI_STATUS_LABEL, KPI_STATUS_TOKEN } from "../lib/adapters/kpi";
import { nf } from "../lib/format";

/**
 * Кўрсаткичлар ҳолатининг тақсимоти — битта тор чизиқда.
 *
 * Бу **сано** диаграммаси (нечта кўрсаткич), миқдор эмас: турли ўлчов
 * бирлигидаги қийматлар ҳеч қачон битта шкалага қўйилмайди, санолар эса
 * бирликсиз ва ўзаро қўшилади.
 *
 * Ранг ягона маъно ташувчиси эмас — ҳар бир бўлак ёнида сони ёзилади ва
 * `title` да ҳолатнинг ўқиладиган номи туради.
 */

const ORDER: Status[] = ["good", "warn", "crit", "mute"];

const SHORT: Record<Status, string> = {
  good: "бажарилган",
  warn: "диққат",
  crit: "муаммо",
  mute: "баҳоланмайди",
};

export interface StatusMixProps {
  counts: KpiCounts;
  /** Чизиқ баландлиги; тор жойларда пасайтирилади. */
  height?: number;
  /** Остидаги санолар қаторини кўрсатиш. */
  withLegend?: boolean;
}

export function StatusMix({ counts, height = 10, withLegend = true }: StatusMixProps) {
  const total = counts.total || 1;

  return (
    <div>
      <div
        className="flex gap-px overflow-hidden rounded-[3px] bg-sunken"
        style={{ height }}
        role="img"
        aria-label={ORDER.filter((s) => counts[s] > 0)
          .map((s) => `${SHORT[s]}: ${counts[s]}`)
          .join(", ")}
      >
        {ORDER.map((s) =>
          counts[s] > 0 ? (
            <span
              key={s}
              title={`${KPI_STATUS_LABEL[s]}: ${counts[s]} та (${nf((counts[s] / total) * 100, 1)}%)`}
              style={{
                width: `${((counts[s] / total) * 100).toFixed(3)}%`,
                background: KPI_STATUS_TOKEN[s],
              }}
            />
          ) : null,
        )}
      </div>

      {withLegend && (
        <div className="mt-[7px] flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-2">
          {ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <i
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: KPI_STATUS_TOKEN[s] }}
              />
              {SHORT[s]}
              <b className="font-mono tabular-nums">{counts[s]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Умумий изоҳ — чегаралар қаерда экани бир жойда ёзилади. */
export function StatusMixLegend() {
  return (
    <p className="text-[11.5px] leading-[1.45] text-ink-3">
      Чегаралар: <b className="font-semibold text-good-ink">бажарилган</b> ≥ 100% ·{" "}
      <b className="font-semibold text-warn-ink">диққат</b> 85–99% ·{" "}
      <b className="font-semibold text-crit-ink">муаммо</b> &lt; 85%. «Баҳоланмайди» — режа
      юритилмайдиган (ҳисоблагич, журнал), режаси қўйилмаган ёки маълумоти йўқ кўрсаткичлар;
      улар нол деб қаралмайди.
    </p>
  );
}
