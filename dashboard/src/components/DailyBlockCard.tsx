import { Fragment } from "react";
import type { DailyBlockVM, DailyRowVM } from "../lib/adapters/daily";
import {
  DAILY_BAR_MAX,
  DAILY_BAR_REF,
  DAILY_STATUS_TOKEN,
} from "../lib/adapters/daily";
import { exact, nf, pctTxt } from "../lib/format";
import { DailyStatusDots } from "./DailyStatus";

/**
 * Битта йўналиш карточкаси — **зич жадвал**, карточкалар тўплами эмас.
 *
 * Саккиз блок бир экранга сиғиши керак, шунинг учун ҳар кўрсаткич битта
 * қатор: ном, режа, амалда, фарқ ва бажарилиш устуни. Ҳеч нарса «Батафсил»
 * ичига яширилмайди.
 *
 * ─── Уч хил устун тартиби ─────────────────────────────────────────────────
 *  · `flow`       — Кўрсаткич · Режа · Амалда · +/− · Бажарилиши
 *  · `stockSplit` — Маҳсулот · Омбор · Цех · Жами · Нисбат   (6-блок)
 *  · `stockTotal` — Хомашё/материал · Қолдиқ · Ҳолат          (7-блок)
 *
 * ─── Бўлим сарлавҳалари ва ички қаторлар ──────────────────────────────────
 * Манбадаги `section` қиймати ўзгарганда қаторлар устида **ажратувчи
 * сарлавҳа** чиқади (Участок №1, ВОЛЬФРАМ цикли, Чирчиқ заводида …). У
 * қиймат ташимайди, шунинг учун сонлар устунлари бўш қолади.
 *
 * `isSubset` («ш.ж.:» остидаги) қаторлар **чапдан сурилади** — улар устки
 * қаторнинг бир қисми ва йиғиндига қўшилмайди.
 *
 * ─── Қиймати йўқ қаторлар ─────────────────────────────────────────────────
 * `null` ҳеч қачон `0` эмас: сон ўрнида «—», қатор эса кулранг. Бажарилиш
 * устуни бундай қаторда умуман чизилмайди.
 */

const DASH = "—";

const num = (v: number | null): string => (v === null ? DASH : exact(v));

/** Фарқ устуни: ишора билан, нол бўлса «—» эмас, аниқ «0». */
function DiffCell({ v }: { v: number | null }) {
  if (v === null) return <span className="text-ink-3">{DASH}</span>;
  if (v === 0) return <span className="text-ink-3">0</span>;
  return (
    <span style={{ color: v > 0 ? "var(--good-ink)" : "var(--crit-ink)" }}>
      {v > 0 ? "+" : "−"}
      {exact(Math.abs(v))}
    </span>
  );
}

/**
 * Бажарилиш устуни: миниатюра устун + фоиз.
 *
 * Шкала `0…DAILY_BAR_MAX`, 100% да тик чизиқ — шунда «режага етдими» бир
 * қарашда кўринади. Ундан катта фоиз (масалан қуёш панеллари 449%) устунда
 * кесилади ва `›` билан белгиланади, **сон эса тўлиқ ёзилади**.
 */
function BarCell({ row }: { row: DailyRowVM }) {
  if (row.pct === null) return <span className="text-ink-3">{DASH}</span>;
  const w = Math.max(0, Math.min(row.pct, DAILY_BAR_MAX));
  const over = row.pct > DAILY_BAR_MAX;

  return (
    <span className="flex items-center justify-end gap-1.5">
      <span className="relative hidden h-[6px] w-[40px] flex-none overflow-hidden rounded-[3px] bg-sunken mid:block">
        <span
          className="absolute top-0 bottom-0 left-0 rounded-[3px]"
          style={{
            width: `${((w / DAILY_BAR_MAX) * 100).toFixed(1)}%`,
            background: DAILY_STATUS_TOKEN[row.status],
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-px bg-ink opacity-70"
          style={{ left: `${DAILY_BAR_REF.toFixed(1)}%` }}
        />
      </span>
      <span
        className="w-[64px] flex-none text-right font-mono tabular-nums"
        style={{ color: `var(--${row.status === "mute" ? "ink-3" : row.status + "-ink"})` }}
      >
        {over && <span aria-hidden="true">› </span>}
        {pctTxt(row.pct)}
      </span>
    </span>
  );
}

/** Қолдиқ нисбати (6-блок): омбор улуши. */
function RatioCell({ row }: { row: DailyRowVM }) {
  if (row.ratio === null) return <span className="text-ink-3">{DASH}</span>;
  return (
    <span className="flex items-center justify-end gap-1.5" title="омборда сақланаётган улуш">
      <span className="hidden h-[6px] w-[46px] flex-none overflow-hidden rounded-[3px] bg-sunken mid:block">
        <span
          className="block h-full rounded-[3px]"
          style={{ width: `${(row.ratio * 100).toFixed(1)}%`, background: DAILY_STATUS_TOKEN.good }}
        />
      </span>
      <span className="w-[38px] flex-none text-right font-mono tabular-nums text-ink-2">
        {nf(row.ratio * 100, 0)}%
      </span>
    </span>
  );
}

/**
 * Устун кенгликлари — **ўлчанган** энг узун қийматга қараб (20 кун × 3 ойна,
 * `clean()` дан кейин): режа 9 белги ≈ 63px, амалда 12 ≈ 83px, фарқ 13 ≈ 90px,
 * фоиз 10 ≈ 69px (`› 9 040,0%`). Ҳар бир катак `overflow-hidden` — жадвал
 * `table-fixed` бўлгани учун ундан узунроқ матн ҳам қўшни устунга **чиқа
 * олмайди**, кесилади ва тўлиқ қиймат `title` да қолади.
 */
const COLS: Record<DailyBlockVM["kind"], { t: string; w?: number }[]> = {
  flow: [
    { t: "Кўрсаткич" },
    { t: "Режа", w: 64 },
    { t: "Амалда", w: 84 },
    { t: "+/−", w: 90 },
    { t: "Бажарилиши", w: 116 },
  ],
  stockSplit: [
    { t: "Маҳсулот" },
    { t: "Омбор", w: 60 },
    { t: "Цех", w: 54 },
    { t: "Жами", w: 64 },
    { t: "Нисбат", w: 96 },
  ],
  stockTotal: [
    { t: "Хомашё/материал" },
    { t: "Қолдиқ", w: 76 },
    { t: "Ҳолат", w: 104 },
  ],
};

/** Сон катаклари: кесилади, лекин тўлиқ қиймат `title` да сақланади. */
const NUM_CELL = "overflow-hidden px-2 py-[3px] text-right font-mono whitespace-nowrap tabular-nums";

/**
 * Кўрсаткич номи ва **ўлчов бирлиги**.
 *
 * Ном икки қаторгача ўралади (`line-clamp-2`): манбада ўхшаш номли қаторлар
 * бор («… қазиб олиш- жами*», «… қазиб олиш-», «… қазиб олиш») ва бир қаторга
 * кесилса улар бир хил кўринарди.
 *
 * ─── Бирлик нега шу ерда ──────────────────────────────────────────────────
 * Бирлик **қаторга** тегишли, якка қийматга эмас — шунинг учун у ном билан
 * бирга туради, ҳар бир сон ёнида такрорланмайди. Сон устунлари ўлчанган энг
 * узун қийматга мослаб қўйилган (режа 64px, амалда 84px, фарқ 90px); уларга
 * бирлик қўшилса матн яна қўшни устунга чиқиб кетарди — айнан шу нуқсон
 * ҳозиргина тузатилган эди.
 *
 * Ном устуни ҳам тор (ном узунлиги p99 = 51 белги), шунинг учун бирлик ном
 * ичига қўшилмайди — акс ҳолда узун номларда у `line-clamp` дан ташқарида
 * қолиб кўринмас эди. У **алоҳида ихчам қаторда**, шунда ҳар доим кўринади
 * ва устунлар кенглиги ўзгармайди.
 */
function NameCell({ row }: { row: DailyRowVM }) {
  return (
    <span className={"flex flex-col " + (row.isSubset ? "pl-3.5" : "")}>
      <span
        className={
          "line-clamp-2 leading-[1.25] break-words " +
          (row.empty ? "text-ink-3 " : "text-ink-2 ") +
          (row.isTotal ? "[font-weight:600]" : "")
        }
        title={row.unit ? `${row.name} · ${row.unit}` : row.name}
      >
        {row.isSubset && <span className="text-ink-3">ш.ж.: </span>}
        {row.name}
      </span>
      {row.unit && (
        <span className="truncate text-[9.5px] leading-[1.15] text-ink-3" title={row.unit}>
          {row.mixedUnit && (
            <span className="text-warn-ink" title="манбада бирлик ўзгарган">
              ⚠{" "}
            </span>
          )}
          {row.unit}
        </span>
      )}
    </span>
  );
}

export function DailyBlockCard({ block }: { block: DailyBlockVM }) {
  const cols = COLS[block.kind];

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-card border border-hair bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-grid px-2.5 py-1.5">
        <span
          aria-hidden="true"
          className="inline-flex h-[17px] min-w-[17px] flex-none items-center justify-center rounded-[4px] bg-sunken px-1 font-mono text-[10.5px] text-ink-3"
        >
          {block.no}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[12px] [font-weight:650]" title={block.title}>
          {block.title}
        </h3>
        <DailyStatusDots counts={block.counts} />
      </div>

      {block.rows.length === 0 ? (
        <p className="px-2.5 py-5 text-center text-[11.5px] text-ink-3">
          Бу кунда маълумот йўқ — манба варағида бу йўналиш бўйича қатор
          тўлдирилмаган.
        </p>
      ) : (
      <table className="w-full table-fixed border-collapse text-[11.5px]">
        <caption className="sr-only">{block.title}</caption>
        <thead>
          <tr className="text-[10px] tracking-[0.04em] text-ink-3 uppercase">
            {cols.map((c, i) => (
              <th
                key={c.t}
                className={
                  "overflow-hidden border-b border-grid px-2 py-1 font-semibold whitespace-nowrap " +
                  (i === 0 ? "text-left" : "text-right")
                }
                style={c.w ? { width: c.w } : undefined}
              >
                {c.t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => {
            const prev = i > 0 ? block.rows[i - 1] : null;
            const newSection = row.section !== null && row.section !== (prev?.section ?? null);

            return (
              <Fragment key={row.id}>
                {newSection && (
                  <tr>
                    <td
                      colSpan={cols.length}
                      className="border-b border-grid bg-surface-2 px-2 py-[3px] text-[10.5px] [font-weight:600] text-ink-3"
                    >
                      {row.section}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-grid last:border-b-0">
                  <td className="min-w-0 px-2 py-[3px] align-top">
                    <NameCell row={row} />
                  </td>

                  {block.kind === "flow" && (
                    <>
                      <td className={NUM_CELL + " text-ink-3"} title={num(row.plan)}>
                        {num(row.plan)}
                      </td>
                      <td
                        className={NUM_CELL + (row.empty ? " text-ink-3" : " [font-weight:600]")}
                        title={num(row.fakt)}
                      >
                        {num(row.fakt)}
                      </td>
                      <td className={NUM_CELL} title={row.diff === null ? DASH : exact(row.diff)}>
                        <DiffCell v={row.diff} />
                      </td>
                      <td className="overflow-hidden px-2 py-[3px] text-right whitespace-nowrap">
                        <BarCell row={row} />
                      </td>
                    </>
                  )}

                  {block.kind === "stockSplit" && (
                    <>
                      <td className={NUM_CELL + " text-ink-3"} title={num(row.warehouse)}>
                        {num(row.warehouse)}
                      </td>
                      <td className={NUM_CELL + " text-ink-3"} title={num(row.workshop)}>
                        {num(row.workshop)}
                      </td>
                      <td
                        className={NUM_CELL + (row.empty ? " text-ink-3" : " [font-weight:600]")}
                        title={num(row.total)}
                      >
                        {num(row.total)}
                      </td>
                      <td className="overflow-hidden px-2 py-[3px] text-right whitespace-nowrap">
                        <RatioCell row={row} />
                      </td>
                    </>
                  )}

                  {block.kind === "stockTotal" && (
                    <>
                      <td
                        className={NUM_CELL + (row.empty ? " text-ink-3" : " [font-weight:600]")}
                        title={num(row.total)}
                      >
                        {num(row.total)}
                      </td>
                      <td className="overflow-hidden px-2 py-[3px] text-right whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10.5px]"
                          style={{
                            borderColor: DAILY_STATUS_TOKEN[row.status],
                            color: `var(--${row.status === "mute" ? "ink-3" : "good-ink"})`,
                          }}
                          title={row.note ?? undefined}
                        >
                          {row.status === "mute" ? "кўрсатилмаган" : "нормада"}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}
