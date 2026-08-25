import type { DailyCounts, DailyStatus } from "../lib/adapters/daily";
import { DAILY_STATUS_LABEL, DAILY_STATUS_TONE, PCT_ABOVE, PCT_NORMAL, PCT_PROBLEM } from "../lib/adapters/daily";
import { nf } from "../lib/format";
import { Pill } from "./Pill";

/**
 * «Ҳолат» устунининг кўрсатилиши: чип, тақсимот чизиғи ва легенда.
 *
 * Етти ҳолат лойиҳадаги тўртта ранг оҳангига келтирилади (`DAILY_STATUS_TONE`),
 * лекин **ном ҳар доим ёзилади** — ранг ягона маъно ташувчиси эмас. Чегаралар
 * легендада очиқ кўрсатилади, чунки улар ҳисоблаб чиқилган қиймат эмас, балки
 * танланган чегара: фойдаланувчи нимага асосланганини кўриши керак.
 */

const TONE_TOKEN: Record<string, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  mute: "var(--rule)",
};

/** Тақсимот чизиғида ҳолатлар шу тартибда туради: яхшидан оғирга. */
const ORDER: DailyStatus[] = [
  "abovePlan",
  "normal",
  "stockOk",
  "belowPlan",
  "stockLow",
  "problem",
  "noData",
];

export function DailyStatusPill({ status }: { status: DailyStatus }) {
  return <Pill status={DAILY_STATUS_TONE[status]}>{DAILY_STATUS_LABEL[status]}</Pill>;
}

export function DailyStatusBar({
  counts,
  height = 10,
  withLegend = true,
}: {
  counts: DailyCounts;
  height?: number;
  withLegend?: boolean;
}) {
  const total = counts.total || 1;
  const shown = ORDER.filter((s) => counts[s] > 0);

  return (
    <div>
      <div
        className="flex gap-px overflow-hidden rounded-[3px] bg-sunken"
        style={{ height }}
        role="img"
        aria-label={shown.map((s) => `${DAILY_STATUS_LABEL[s]}: ${counts[s]}`).join(", ")}
      >
        {shown.map((s) => (
          <span
            key={s}
            title={`${DAILY_STATUS_LABEL[s]}: ${counts[s]} та (${nf((counts[s] / total) * 100, 1)}%)`}
            style={{
              width: `${((counts[s] / total) * 100).toFixed(3)}%`,
              background: TONE_TOKEN[DAILY_STATUS_TONE[s]],
            }}
          />
        ))}
      </div>

      {withLegend && (
        <div className="mt-[7px] flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-2">
          {shown.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <i
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: TONE_TOKEN[DAILY_STATUS_TONE[s]] }}
              />
              {DAILY_STATUS_LABEL[s]}
              <b className="font-mono tabular-nums">{counts[s]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Чегаралар қаердан келгани — экранда очиқ ёзилади. */
export function DailyStatusLegend() {
  return (
    <div className="flex flex-col gap-1.5 text-[11.5px] leading-[1.45] text-ink-3">
      <p>
        <b className="font-semibold text-ink-2">Оқим кўрсаткичлари</b> — бажарилиш фоизи бўйича:{" "}
        <b className="font-semibold text-good-ink">Режадан юқори</b> ≥ {PCT_ABOVE}% ·{" "}
        <b className="font-semibold text-good-ink">Нормада</b> {PCT_NORMAL}–{PCT_ABOVE}% ·{" "}
        <b className="font-semibold text-warn-ink">Режадан паст</b> {PCT_PROBLEM}–{PCT_NORMAL}% ·{" "}
        <b className="font-semibold text-crit-ink">Муаммоли</b> &lt; {PCT_PROBLEM}%. Фоиз аввал
        кунлик устундан олинади; манбада кунлик фоиз бўлмаса — ой бошидан, сўнг йил бошидан
        (қатор ёнида қайси устун ишлатилгани ёзилади).
      </p>
      <p>
        <b className="font-semibold text-ink-2">Қолдиқлар</b> — миқдор бўйича:{" "}
        <b className="font-semibold text-warn-ink">Қолдиқ кам</b> — қолдиқ 0 ·{" "}
        <b className="font-semibold text-good-ink">Қолдиқ етарли</b> — қолдиқ мавжуд ·{" "}
        <b className="font-semibold text-crit-ink">Муаммоли</b> — манбадаги «Муаммо» устуни
        тўлдирилган. Манбада минимал норма йўқ, шунинг учун «Қолдиқ етарли» фақат «қолдиқ бор»
        деганини билдиради — етарлилик даражаси ҳисобланмайди.
      </p>
      <p>
        <b className="font-semibold text-ink-2">Маълумот мавжуд эмас</b> — манбада шу кун учун
        қиймат ёки режа йўқ. Бундай катак ҳеч қачон <b className="font-semibold">0</b> деб
        кўрсатилмайди ва ой/йил устунидан ҳисоблаб чиқарилмайди.
      </p>
    </div>
  );
}
