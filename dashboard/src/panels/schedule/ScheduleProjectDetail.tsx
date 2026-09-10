import { dateLabel, exact, nf, pctTxt } from "../../lib/format";
import { usePalette } from "../../lib/theme";
import {
  SCHED_FILTER_EMPTY,
  schedGroups,
  schedResponsibles,
  schedStateCounts,
  type SchedFilter,
  type SchedProject,
} from "../../lib/adapters/schedule";
import { GRID } from "../../components/layout";
import { Card, Section } from "../../components/Card";
import { StatTile } from "../../components/StatTile";
import { Pill } from "../../components/Pill";
import { PercentRing } from "../../components/PercentRing";
import { CostText, DaysChip, MixBar, NoData, dateSpan } from "./parts";
import { ScheduleGantt } from "./ScheduleGantt";
import { ScheduleFinance } from "./ScheduleFinance";
import { ScheduleFilterBar } from "./ScheduleFilterBar";

/**
 * Битта лойиҳанинг тафсилот саҳифаси: кўрсаткичлар, Gantt-графиги ва
 * молиялаштириш жадвали.
 *
 * ═══ Иккита фоиз аралашмайди ════════════════════════════════════════════
 *
 * Манбада иккита турли фоиз бор ва улар ҳеч қаерда қўшилмайди:
 *
 *  - `avgPct` — лойиҳанинг **ишлари** бўйича ўртача бажарилиш (бэкенд
 *    ҳисоблайди, юқоридаги «Ўртача бажарилиш» плиткаси ҳам шундан);
 *  - `sourcePct` — xlsx'нинг илдиз қаторидаги фоиз, яъни манба муаллифи
 *    ёзиб қўйган баҳо.
 *
 * ТМК Chemicals'да улар сезиларли фарқ қилади (82,0% ва 72,0%), шунинг учун
 * ҳалқада ҳисобланган фоиз турибди, манбадаги эса ёнида чип бўлиб очиқ
 * ёзилади. Иккисининг ўртачаси олинмайди — бу турли ўлчов.
 *
 * ═══ Фильтр Gantt'га ҳам таъсир қилади ══════════════════════════════════
 *
 * Графикдаги қаторлар `schedGroups(p, filter)` дан келади: иши қолмаган
 * босқич умуман чизилмайди. Шунинг учун сарлавҳа остида «кўрсатилган / жами»
 * сони доим турибди — акс ҳолда фильтр ёқилганда график тўлиқ эмаслиги
 * билинмасди.
 */

const NAV_BTN =
  "cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-40";

export interface ScheduleProjectDetailProps {
  p: SchedProject;
  /** Фильтрланган рўйхатдаги ўрни (0 дан) — топилмаса `-1`. */
  index: number;
  count: number;
  prev: SchedProject | null;
  next: SchedProject | null;
  onOpen: (key: string) => void;
  onBack: () => void;
  filter: SchedFilter;
  onFilter: (f: SchedFilter) => void;
  /** Барча лойиҳалар — масъуллар рўйхатини лойиҳа кесимида олиш учун. */
  projects: SchedProject[];
  today: string;
}

export function ScheduleProjectDetail({
  p,
  index,
  count,
  prev,
  next,
  onOpen,
  onBack,
  filter,
  onFilter,
  projects,
  today,
}: ScheduleProjectDetailProps) {
  const pal = usePalette();

  // Тафсилотда фильтр фақат шу лойиҳага тегишли: манзилдаги лойиҳа
  // танлангани учун `project` майдони мажбурий равишда шу калит бўлади.
  const own: SchedFilter = { ...filter, project: p.key };
  const groups = schedGroups(p, own);
  const shown = groups.reduce((a, g) => a + g.tasks.length, 0);
  const counts = schedStateCounts(projects, p.key);
  const resp = schedResponsibles(projects, p.key);
  const span = dateSpan(p.planStart, p.planEnd);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={NAV_BTN}>
          ← Лойиҳалар рўйхати
        </button>
        <span className="flex-1" />
        {index >= 0 && (
          <span className="font-mono text-[11.5px] text-ink-3">
            {index + 1} / {count}
          </span>
        )}
        <button
          type="button"
          className={NAV_BTN}
          disabled={prev === null}
          onClick={() => prev && onOpen(prev.key)}
        >
          ← Олдинги
        </button>
        <button
          type="button"
          className={NAV_BTN}
          disabled={next === null}
          onClick={() => next && onOpen(next.key)}
        >
          Кейинги →
        </button>
      </div>

      <Section
        title={p.title}
        note={
          <>
            {p.sourceFile} · {p.sourceSheet}
            {p.importedAt !== null && ` · импорт ${dateLabel(p.importedAt.slice(0, 10))}`}
          </>
        }
      >
        <div className={GRID.g4}>
          <StatTile
            label="Ўртача бажарилиш"
            value={p.avgPct === null ? <NoData /> : pctTxt(p.avgPct)}
            stripe="var(--s1)"
            foot={
              p.sourcePct === null ? (
                <Pill>манбада фоиз йўқ</Pill>
              ) : (
                <Pill>манбадаги қаторда {pctTxt(p.sourcePct)}</Pill>
              )
            }
          />
          <StatTile
            label="Режа даври"
            value={
              span === null ? (
                <NoData />
              ) : (
                <span className="block text-[15.5px] leading-[1.35] [font-weight:640] tracking-normal">
                  {span}
                </span>
              )
            }
            stripe="var(--s4)"
            foot={p.totalDays !== null && <Pill>{nf(p.totalDays)} кун</Pill>}
          />
          <StatTile
            label="Муддатгача"
            value={
              p.daysLeft === null ? (
                <NoData />
              ) : p.daysLeft < 0 ? (
                <span style={{ color: "var(--crit-ink)" }}>{nf(Math.abs(p.daysLeft))}</span>
              ) : (
                nf(p.daysLeft)
              )
            }
            unit={p.daysLeft === null ? undefined : "кун"}
            stripe={p.daysLeft !== null && p.daysLeft < 0 ? "var(--crit)" : "var(--s2)"}
            foot={<DaysChip days={p.daysLeft} />}
          />
          <StatTile
            label="Жами қиймат"
            value={<CostText cost={p.cost} />}
            stripe="var(--s3)"
            foot={p.cost === null && <Pill status="warn">манбада кўрсатилмаган</Pill>}
          />
        </div>

        <div className={`${GRID.g23} mt-3`}>
          <Card title="Бажарилиш" sub={`${nf(p.taskCount)} иш · ${nf(p.groupCount)} босқич`}>
            <div className="mt-1">
              <PercentRing
                label="Ўртача бажарилиш"
                pct={p.avgPct ?? 0}
                color={pal.s1}
                note="лойиҳанинг барча ишлари бўйича ўртача — манбадаги илдиз қатор фоизи эмас"
              />
            </div>
            <div className="mt-3 border-t border-grid pt-2.5">
              <MixBar p={p} />
            </div>
          </Card>

          <Card title="Муддат ва тўлиқлик" sub="манбадаги ҳолат">
            <div className="mt-1 flex flex-wrap gap-1.5">
              {p.overdue > 0 ? (
                <Pill status="crit">муддати ўтган {nf(p.overdue)} иш</Pill>
              ) : (
                <Pill status="good">муддати ўтган иш йўқ</Pill>
              )}
              {p.dueSoon > 0 && <Pill status="warn">30 кунда тугайди {nf(p.dueSoon)}</Pill>}
              {p.noDateCount > 0 && <Pill>сана кўрсатилмаган {nf(p.noDateCount)} иш</Pill>}
              {p.excludedCount > 0 && (
                <Pill>манбада «Исключить = ДА» {nf(p.excludedCount)} иш</Pill>
              )}
              {p.finance.length === 0 && <Pill>молия жадвали киритилмаган</Pill>}
            </div>
            <div className="mt-2.5 border-t border-grid pt-2">
              <div className="flex flex-wrap justify-between gap-2 py-[5px] text-[12px]">
                <span className="text-ink-3">Вақт ўқи</span>
                <span className="font-mono tabular-nums text-ink-2">
                  {p.axis.days === 0
                    ? "сана кўрсатилмаган"
                    : `${dateLabel(p.axis.start)} — ${dateLabel(p.axis.end)} · ${nf(p.axis.days)} кун`}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-grid py-[5px] text-[12px]">
                <span className="text-ink-3">Ҳисоб санаси</span>
                <span className="font-mono tabular-nums text-ink-2">{dateLabel(today)}</span>
              </div>
              {/* Ишлардаги «Молиявий ҳолати» устунининг йиғиндиси. Плитка
                  изоҳида эмас, шу ерда: бэкенд уни `float` билан қўшгани
                  учун сон узун чиқади (қаранг: ҳисобот, BACKEND ТАЛАБИ) ва
                  тор изоҳда икки қаторга бўлиниб кетарди. Яхлитланмайди —
                  экранда API берган қиймат турибди. */}
              {p.taskAmount > 0 && (
                <div className="flex flex-wrap justify-between gap-2 border-t border-grid py-[5px] text-[12px]">
                  <span className="text-ink-3">Ишлардаги молиявий ҳолати</span>
                  <span className="font-mono tabular-nums text-ink-2">
                    {exact(p.taskAmount)} <span className="font-sans text-ink-3">$</span>
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="График">
        <div className="mb-2.5">
          <ScheduleFilterBar
            filter={own}
            onChange={onFilter}
            base={{ ...SCHED_FILTER_EMPTY, project: p.key }}
            projects={null}
            responsibles={resp}
            stateCounts={counts}
          />
        </div>
        <ScheduleGantt axis={p.axis} groups={groups} shown={shown} total={p.taskCount} />
      </Section>

      {p.finance.length > 0 && (
        <Section title="Молиялаштириш">
          <ScheduleFinance p={p} />
        </Section>
      )}
    </>
  );
}
