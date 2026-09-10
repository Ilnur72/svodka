import { useRef } from "react";
import { nf, pctTxt } from "../../lib/format";
import { useElementWidth } from "../../lib/useElementWidth";
import type { SchedAxis, SchedGroup, SchedTask } from "../../lib/adapters/schedule";
import { GRID } from "../../components/layout";
import { ChartLegend } from "../../components/ChartLegend";
import { EmptyState } from "../../components/states";
import { GANTT_LEGEND, FinishedChip, NoData, barToken, dateSpan } from "./parts";

/**
 * Лойиҳанинг Gantt-графиги.
 *
 * ═══ Ўқ адаптерда ҳисобланган ═══════════════════════════════════════════
 *
 * Бу компонент **сана ҳисобламайди**. `SchedAxis` да ой белгилари (`ticks`),
 * «бугун» чизиғининг ўрни ва ҳар бир иш чизиғининг улуши (`SchedBar.left` /
 * `width`, 0…1) аллақачон тайёр — бу ерда фақат улуш фоизга айланиб
 * `left`/`width` га ёзилади. Шунинг учун ой чизиқлари ва иш чизиқлари
 * доим битта шкалада: иккита жойда иккита ҳисоб-китоб йўқ.
 *
 * ═══ Нима учун Recharts эмас ════════════════════════════════════════════
 *
 * Recharts'да Gantt тури йўқ, мавжуд турларидан ясаш эса ётқизилган
 * `BarChart` ни «бўш сегмент + тўлдирилган сегмент» билан алдашни талаб
 * қиларди — 164 қаторли (ТМК Chemicals) графикда бу ҳар бир қатор учун
 * иккита сунъий серия берарди ва ой ўқи қаторлар билан мос тушмасди.
 * Шу сабабли қаторлар оддий CSS grid билан чизилади: ўқ сарлавҳаси ва ҳар
 * бир қатор **айнан бир хил** `GRID.gantt` шаблонида — чизиқлар шунда
 * пиксельма-пиксель мос тушади.
 *
 * ═══ Сана йўқ иш йўқолмайди ═════════════════════════════════════════════
 *
 * 12 та ишда режа санаси умуман кўрсатилмаган (`bar === null`). Улар вақт
 * ўқида чизилмайди — қаерга чизиш маълум эмас — лекин рўйхатдан **тушиб
 * қолмайди**: ўз босқичида, ўз ўрнида, «сана кўрсатилмаган» ёзуви билан
 * туради.
 *
 * ═══ Бир кунлик иш кўринмай кетмайди ════════════════════════════════════
 *
 * 33 ойлик ўқда бир кунлик ишнинг улуши 0,001 — уни фоизга айлантирсак
 * чизиқ умуман кўринмасди. Шунинг учун чизиқнинг энг кичик кенглиги
 * чекланган (`MIN_W`): ўрни ҳақиқий, кенглиги эса кўринадиган.
 */

/** Чизиқнинг энг кичик кенглиги, % — бир кунлик иш ҳам кўриниб турсин. */
const MIN_W = 0.7;

/**
 * Битта ой ёрлиғи учун зарур энг кичик жой, px (`Дек 25` ≈ 38px + оралиқ).
 * Ундан тор бўлса ёрлиқлар сийраклаштирилади — **чизиқлар эса ўз ўрнида
 * қолади**, шунинг учун шкала ўзгармайди, фақат ёзув камаяди.
 */
const TICK_MIN_PX = 46;

const at = (v: number): string => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(3)}%`;

/**
 * Қатор фони: ой чизиқлари ва «бугун». Ҳар бир қаторда қайта чизилади —
 * шаблон бир хил бўлгани учун улар устун бўлиб қўшилиб кўринади, лекин
 * қатор баландлигидан чиқиб кетмайди (скролл ичида ҳам тўғри туради).
 */
function TrackBg({ axis }: { axis: SchedAxis }) {
  return (
    <>
      {axis.ticks.map((t) => (
        <span
          key={t.at}
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-grid"
          style={{ left: at(t.at) }}
        />
      ))}
      {axis.today !== null && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px"
          style={{
            left: at(axis.today),
            background: "color-mix(in srgb, var(--crit) 55%, transparent)",
          }}
        />
      )}
    </>
  );
}

/**
 * Битта чизиқ: режа даври сустроқ тусда, бажарилган қисми тўлиқ рангда.
 * Тўлдиргич 100% да тўхтайди — фоиз матни қаторнинг чап устунида тўлиқ
 * ёзилади, шунинг учун бу ерда қиймат йўқолмайди.
 */
function Bar({ t, thick }: { t: SchedTask; thick: boolean }) {
  if (t.bar === null) return null;
  const token = barToken(t);
  const fill = t.pct === null ? 0 : Math.max(0, Math.min(100, t.pct));
  return (
    <span
      className={"absolute rounded-[2px] " + (thick ? "inset-y-[1px]" : "inset-y-[2px]")}
      style={{
        left: at(t.bar.left),
        width: `${Math.max(t.bar.width * 100, MIN_W).toFixed(3)}%`,
        background: `color-mix(in srgb, ${token} 24%, transparent)`,
        border: `1px solid color-mix(in srgb, ${token} 45%, transparent)`,
      }}
    >
      {fill > 0 && (
        <span
          className="absolute inset-y-0 left-0 rounded-[2px]"
          style={{ width: `${fill.toFixed(2)}%`, background: token }}
        />
      )}
    </span>
  );
}

/** Ҳар бир қаторнинг ўнг устуни — фон, чизиқ ёки «сана кўрсатилмаган». */
function Track({
  t,
  axis,
  thick,
  title,
}: {
  t: SchedTask;
  axis: SchedAxis;
  thick?: boolean;
  title: string;
}) {
  return (
    <div
      title={title}
      className={
        "relative min-w-0 overflow-hidden rounded-[3px] bg-surface-2 " +
        (thick ? "h-[18px]" : "h-[15px]")
      }
    >
      <TrackBg axis={axis} />
      {t.bar === null ? (
        <span className="absolute inset-0 flex items-center px-2 text-[10px] leading-none">
          <NoData>сана кўрсатилмаган</NoData>
        </span>
      ) : (
        <Bar t={t} thick={thick === true} />
      )}
    </div>
  );
}

/**
 * Иш ва босқич қаторлари учун умумий чап устун.
 *
 * `bare` — ўнг устунда чизиқ умуман чизилмайдиган ҳолат (лойиҳада бирорта
 * ҳам сана йўқ). Фақат шунда «сана кўрсатилмаган» ёзуви шу ерда чиқади:
 * акс ҳолда у ўнгдаги чизиқ ўрнида турибди ва иккита жойда такрорланарди.
 */
function RowLabel({ t, group, bare }: { t: SchedTask; group: boolean; bare: boolean }) {
  const span = dateSpan(t.start, t.end);
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-1.5">
        {t.no !== null && (
          <span className="flex-none font-mono text-[10px] text-ink-3">{t.no}</span>
        )}
        <span
          className={
            "min-w-0 flex-1 truncate " +
            (group ? "text-[12px] [font-weight:650]" : "text-[11.5px] text-ink-2")
          }
        >
          {t.name}
        </span>
        <span className="flex-none font-mono text-[10.5px] tabular-nums text-ink-3">
          {t.pct === null ? "—" : pctTxt(t.pct)}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        {span !== null ? (
          <span className="truncate font-mono text-[10px] text-ink-3">{span}</span>
        ) : (
          bare && <span className="truncate font-mono text-[10px] text-ink-3">сана кўрсатилмаган</span>
        )}
        {t.responsible !== null && (
          <span className="truncate text-[10px] text-ink-3">· {t.responsible}</span>
        )}
        {/* Якунланган ишнинг муддат билан таққослови — ўз қаторини
            эгалламайди: 143 қаторли графикда бу графикни икки баравар
            узайтирарди. */}
        <FinishedChip t={t} />
        {/* `excluded` фақат ишларда кўрсатилади. Манбадаги «Исключить = ДА»
            58 қаторнинг ҳаммаси йиғма қатор (4 илдиз + 54 босқич), яъни у
            ерда белги «ҳисобдан чиқарилган» эмас, «бу қатор — йиғинди»
            дегани: босқич сарлавҳасида уни ёзиш шовқиндан бошқа нарса
            эмас (қаранг: adapters/schedule.ts). */}
        {t.excluded && !group && (
          <span className="font-mono text-[10px] text-ink-3">манбада «Исключить = ДА»</span>
        )}
      </div>
    </div>
  );
}

export interface ScheduleGanttProps {
  axis: SchedAxis;
  groups: SchedGroup[];
  /** Фильтрдан ўтган иш сони / жами — сарлавҳа остидаги қатор учун. */
  shown: number;
  total: number;
}

export function ScheduleGantt({ axis, groups, shown, total }: ScheduleGanttProps) {
  const headRef = useRef<HTMLDivElement>(null);
  const headW = useElementWidth(headRef);

  // Тор экранда 11 та ой ёрлиғи бир-бирига тегиб кетади (760px да ўқ учун
  // ~410px қолади). Шунда ҳар иккинчиси (керак бўлса ҳар учинчиси)
  // ёзилади — ой чизиқлари барибир ҳаммаси чизилади.
  const every =
    headW === 0 || axis.ticks.length === 0
      ? 1
      : Math.max(1, Math.ceil((axis.ticks.length * TICK_MIN_PX) / headW));

  if (groups.length === 0) {
    return (
      <EmptyState
        title="Танланган шартга мос иш топилмади"
        text="Ҳолат, масъул ёки қидирув шартини ўзгартиринг."
      />
    );
  }

  // Ҳеч бир қаторда сана бўлмаса ўқ ясалмаган (`days === 0`) — бу ҳолда
  // чизиқлар ҳам, ой белгилари ҳам маънога эга бўлмайди, шунинг учун
  // фақат рўйхат чизилади.
  const noAxis = axis.days === 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ChartLegend items={GANTT_LEGEND} />
        <span className="flex-1" />
        <span className="mb-2 font-mono text-[11px] text-ink-3">
          {nf(shown)} / {nf(total)} иш
        </span>
      </div>

      <div className="max-h-[72vh] overflow-y-auto rounded-[6px] border border-hair">
        {/* Ой ўқи — скролл ичида ёпишқоқ: 164 қаторли графикда пастга
            тушганда ҳам қайси ой кўрилаётгани кўриниб туради. */}
        <div className="sticky top-0 z-10 border-b border-hair bg-surface px-2.5 pt-2 pb-1.5">
          <div className={GRID.gantt}>
            <span className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              Босқич ва ишлар
            </span>
            {/* Икки қатор: ойлар тепада, «бугун» пастда. Бир қаторда
                турганда улар бир-бирининг устига чиқиб кетарди — «бугун»
                ҳамиша қандайдир ой белгисига яқин туради. */}
            <div ref={headRef} className="relative h-[26px] min-w-0">
              {noAxis ? (
                <span className="text-[10.5px] text-ink-3">вақт ўқи йўқ — сана кўрсатилмаган</span>
              ) : (
                <>
                  {axis.ticks.map((t, i) => (
                    <span
                      key={t.at}
                      hidden={i % every !== 0}
                      className="absolute top-0 font-mono text-[10px] whitespace-nowrap text-ink-3"
                      style={{
                        left: at(t.at),
                        // Четдаги белги ўқдан чиқиб кетмаслиги учун
                        // силжиш четга қараб ўзгаради.
                        transform:
                          t.at < 0.06
                            ? "none"
                            : t.at > 0.94
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                      }}
                    >
                      {t.label}
                    </span>
                  ))}
                  {axis.today !== null && (
                    <span
                      className="absolute bottom-0 font-mono text-[10px] whitespace-nowrap"
                      style={{
                        left: at(axis.today),
                        transform: axis.today > 0.9 ? "translateX(-100%)" : "translateX(-50%)",
                        color: "var(--crit-ink)",
                      }}
                    >
                      ▼ бугун
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-2.5 py-1.5">
          {groups.map((g) => (
            <div key={g.row.id} className="border-t border-grid pt-1.5 pb-2 first:border-t-0">
              {/* Босқич сарлавҳаси — ўз чизиғи ва ўз фоизи билан. Бу
                  йиғма қатор, шунинг учун унинг чизиғи қалинроқ. */}
              <div className={GRID.gantt + " items-center"}>
                <RowLabel t={g.row} group bare={noAxis} />
                {noAxis ? (
                  <span />
                ) : (
                  <Track
                    t={g.row}
                    axis={axis}
                    thick
                    title={`${g.row.name} · ${dateSpan(g.row.start, g.row.end) ?? "сана кўрсатилмаган"} · ${
                      g.row.pct === null ? "фоиз кўрсатилмаган" : pctTxt(g.row.pct)
                    }`}
                  />
                )}
              </div>

              <div className="mt-1 pl-3">
                {g.tasks.map((t) => (
                  <div key={t.id} className={GRID.gantt + " items-center py-[2px]"}>
                    <RowLabel t={t} group={false} bare={noAxis} />
                    {noAxis ? (
                      <span />
                    ) : (
                      <Track
                        t={t}
                        axis={axis}
                        title={`${t.name} · ${dateSpan(t.start, t.end) ?? "сана кўрсатилмаган"} · ${
                          t.pct === null ? "фоиз кўрсатилмаган" : pctTxt(t.pct)
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
