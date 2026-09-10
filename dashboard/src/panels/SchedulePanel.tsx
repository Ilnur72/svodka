import { useEffect, useMemo, useState } from "react";
import type { ProjectScheduleDashboard } from "../api/types";
import { getProjectSchedule } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { dateLabel, exact, nf, pctTxt } from "../lib/format";
import {
  SCHED_FILTER_OVERDUE,
  schedProjectByKey,
  schedResponsibles,
  schedStateCounts,
  schedTaskRefs,
  scheduleView,
  type SchedFilter,
  type SchedProject,
  type SchedTaskRef,
} from "../lib/adapters/schedule";
import { GRID } from "../components/layout";
import { Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { EmptyState, Loader } from "../components/states";
import { CostText, DaysChip, MixBar, NoData, ProgressBar, StateChip, dateSpan } from "./schedule/parts";
import { ScheduleFilterBar } from "./schedule/ScheduleFilterBar";
import { ScheduleProjectDetail } from "./schedule/ScheduleProjectDetail";

/**
 * «Лойиҳа графиклари» — 5 та инвестиция лойиҳасининг Gantt-графиги
 * (`/project-schedule/dashboard`), жами 589 иш ва 75 босқич.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: лойиҳа ва иш сони, ҳолатлар, ўртача бажарилиш, муддати
 *     ўтган, 30 кунда тугайдиган, жами қиймат.
 *  2. Фильтр қатори — ҳолат, лойиҳа, масъул, қидирув.
 *  3. Лойиҳалар — карточкалар; босилганда тафсилот (`#schedule/<калит>`).
 *  4. Ишлар рўйхати — кечикиш тартибида.
 *
 * ═══ Рўйхат «муддати ўтган» дан бошланади ═══════════════════════════════
 *
 * 242 та кечиккан иш — бу бўлимдаги энг муҳим хабар, 589 та ишнинг тўлиқ
 * рўйхати эса уни кўмиб юборарди. Шунинг учун бошланғич фильтр
 * `SCHED_FILTER_OVERDUE` ва бўлим сарлавҳаси фильтрга қараб ўзгаради —
 * «Барчаси» га ўтиш битта босишда.
 *
 * ═══ Фильтр битта, кўриниш иккита ═══════════════════════════════════════
 *
 * Фильтр ҳолати шу компонентда турибди ва **иккита жойга** бир вақтда
 * таъсир қилади: пастдаги ишлар рўйхатига ва тафсилот саҳифасидаги Gantt
 * графигига. Шунинг учун иккита экранда иккита турли сон кўринмайди.
 * Очиқ лойиҳа эса хэшда (`useHashSub`) — тафсилотдан қайтганда фильтр ўз
 * ҳолича қолади, чунки рўйхат қайта монтаж қилинмайди.
 *
 * ═══ Иккита лойиҳада қиймат йўқ ═════════════════════════════════════════
 *
 * Пирометаллургия лойиҳаларида (`totalCostUsd === null`) умумий қиймат
 * манбада кўрсатилмаган. Нолга айлантирилмайди: карточкада «маълумот йўқ»
 * туради, плиткада эса нечта лойиҳада йўқлиги очиқ ёзилади.
 *
 * ═══ Ҳолат ранги фақат ҳолат учун ═══════════════════════════════════════
 *
 * `--crit` ва `--warn` бу бўлимда фақат муддат ҳолатини билдиради (ўтган /
 * 30 кунда тугайди). Лойиҳанинг ўзи эса тоифа, шунинг учун карточкадаги
 * чап чизиқ `--s1…--s5` дан: 40% бажарилиш «ёмон» дегани эмас — лойиҳа
 * ўз графигининг ўртасида туриши мумкин.
 */

/** Лойиҳа ранги — тоифа сифатида, ҳолат баҳоси эмас. Тартиб адаптердан. */
const PROJECT_TOKENS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"];

/** Ишлар рўйхатида бир марта кўрсатиладиган қатор сони. */
const PAGE = 20;

export function SchedulePanel() {
  const q = useQuery("project-schedule", (s) => getProjectSchedule(s));
  return (
    <Loader q={q} height={380} notAvailableWhat="/project-schedule/dashboard">
      {(data) => <ScheduleBody data={data} />}
    </Loader>
  );
}

function ScheduleBody({ data }: { data: ProjectScheduleDashboard }) {
  const v = useMemo(() => scheduleView(data), [data]);
  const [filter, setFilter] = useState<SchedFilter>(SCHED_FILTER_OVERDUE);
  const [limit, setLimit] = useState(PAGE);

  const [sub, goSub] = useHashSub("schedule");
  const open = schedProjectByKey(v.projects, sub);

  const refs = useMemo(() => schedTaskRefs(v.projects, filter), [v.projects, filter]);
  const counts = useMemo(
    () => schedStateCounts(v.projects, filter.project),
    [v.projects, filter.project],
  );
  const resp = useMemo(
    () => schedResponsibles(v.projects, filter.project),
    [v.projects, filter.project],
  );

  // Мавжуд бўлмаган лойиҳага ҳавола (эскирган ёки нотўғри калит) хатога олиб
  // келмайди — манзил жимгина рўйхатга тушади. `replace`, чунки бундай ёзув
  // тарихда қолмаслиги керак.
  useEffect(() => {
    if (sub !== null && open === null) goSub(null, true);
  }, [sub, open, goSub]);

  // Фильтр ўзгарса рўйхат бошидан кўрсатилади: акс ҳолда янги, қисқа
  // натижада «яна N та» тугмаси сабабсиз очиқ қоларди.
  useEffect(() => setLimit(PAGE), [filter]);

  const t = v.totals;

  if (open) {
    const i = v.projects.findIndex((x) => x.key === open.key);
    return (
      <ScheduleProjectDetail
        p={open}
        index={i}
        count={v.projects.length}
        prev={i > 0 ? v.projects[i - 1] : null}
        next={i >= 0 && i < v.projects.length - 1 ? v.projects[i + 1] : null}
        onOpen={(k) => goSub(k)}
        onBack={() => goSub(null)}
        filter={filter}
        onFilter={setFilter}
        projects={v.projects}
        today={v.today}
      />
    );
  }

  const listTitle =
    filter.state === "overdue"
      ? "Муддати ўтган ишлар"
      : filter.state === "all"
        ? "Ишлар"
        : "Танланган ҳолатдаги ишлар";

  return (
    <>
      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section title="Лойиҳа графиклари" note={`${dateLabel(v.today)} ҳолатига`}>
        <div className={GRID.g4}>
          <StatTile
            label="Лойиҳалар"
            value={nf(t.projects)}
            unit="та"
            stripe="var(--s1)"
            foot={<Pill>{nf(t.groups)} босқич</Pill>}
          />
          <StatTile
            label="Жами ишлар"
            value={nf(t.tasks)}
            unit="та"
            stripe="var(--s4)"
            foot={
              <Pill>
                режа даври {t.planStart === null ? "—" : dateLabel(t.planStart)} —{" "}
                {t.planEnd === null ? "—" : dateLabel(t.planEnd)}
              </Pill>
            }
          />
          <StatTile
            label="Бажарилган"
            value={nf(t.done)}
            unit="та"
            stripe="var(--good)"
            foot={<Pill status="good">{pctTxt((t.done / (t.tasks || 1)) * 100)} ишлардан</Pill>}
          />
          <StatTile
            label="Жараёнда"
            value={nf(t.run)}
            unit="та"
            stripe="var(--s2)"
            foot={<Pill>бошланмаган {nf(t.todo)}</Pill>}
          />
        </div>

        <div className={`${GRID.g4} mt-3`}>
          <StatTile
            label="Ўртача бажарилиш"
            value={t.avgPct === null ? <NoData /> : pctTxt(t.avgPct)}
            stripe="var(--s1)"
            foot={<Pill>барча {nf(t.tasks)} иш бўйича</Pill>}
          />
          <StatTile
            label="Муддати ўтган"
            value={nf(t.overdue)}
            unit="та"
            stripe="var(--crit)"
            foot={
              <Pill status="crit">{pctTxt((t.overdue / (t.tasks || 1)) * 100)} ишлардан</Pill>
            }
          />
          <StatTile
            label={`${nf(v.dueSoonDays)} кунда тугайдиган`}
            value={nf(t.dueSoon)}
            unit="та"
            stripe="var(--warn)"
            foot={<Pill status="warn">режа муддати яқин</Pill>}
          />
          <StatTile
            label="Жами қиймат"
            value={<CostText cost={t.cost} />}
            stripe="var(--s3)"
            foot={
              <>
                <Pill>{nf(t.projects - t.costMissing)} лойиҳада кўрсатилган</Pill>
                {t.costMissing > 0 && <Pill status="warn">{nf(t.costMissing)} тада йўқ</Pill>}
              </>
            }
          />
        </div>
      </Section>

      {/* --- 2. фильтр ------------------------------------------------------ */}
      <Section title="Фильтр" note="ҳам лойиҳа графигига, ҳам пастдаги ишлар рўйхатига таъсир қилади">
        <ScheduleFilterBar
          filter={filter}
          onChange={setFilter}
          base={SCHED_FILTER_OVERDUE}
          projects={v.projects}
          responsibles={resp}
          stateCounts={counts}
        />
      </Section>

      {/* --- 3. лойиҳалар --------------------------------------------------- */}
      <Section title="Лойиҳалар" note="карточка босилганда график очилади">
        <div className={GRID.g3}>
          {v.projects.map((p, i) => (
            <ProjectCard
              key={p.key}
              p={p}
              token={PROJECT_TOKENS[i % PROJECT_TOKENS.length]}
              onOpen={() => goSub(p.key)}
            />
          ))}
        </div>
      </Section>

      {/* --- 4. ишлар рўйхати ------------------------------------------------ */}
      <Section
        title={listTitle}
        note={
          refs.length === 0
            ? undefined
            : `${nf(refs.length)} та · энг кеч қолганидан бошлаб`
        }
      >
        {refs.length === 0 ? (
          <EmptyState
            title="Танланган шартга мос иш топилмади"
            text="Ҳолат, лойиҳа, масъул ёки қидирув шартини ўзгартиринг."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-card border border-hair bg-surface shadow-card">
              {refs.slice(0, limit).map((r) => (
                <TaskRow key={`${r.project.key}-${r.task.id}`} r={r} onOpen={() => goSub(r.project.key)} />
              ))}
            </div>
            {refs.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="mt-2.5 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[13px] py-[7px] text-[12.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Яна {nf(refs.length - limit)} та кўрсатиш
              </button>
            )}
          </>
        )}
      </Section>

      {/* Манбанинг охирги янгиланиши — битта қисқа қатор. */}
      <p className="text-[11.5px] text-ink-3">
        Манба: 5 та Gantt-график xlsx файли
        {v.lastImportedAt !== null && ` · охирги импорт ${dateLabel(v.lastImportedAt.slice(0, 10))}`}
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* рўйхатдаги карточка                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Рўйхатдаги битта лойиҳа.
 *
 * Бутун карточка `<button>`: ичида бошқа босиладиган элемент йўқ, шунинг
 * учун сичқонча ва клавиатура учун битта аниқ мақсад қолади.
 */
function ProjectCard({
  p,
  token,
  onOpen,
}: {
  p: SchedProject;
  token: string;
  onOpen: () => void;
}) {
  const span = dateSpan(p.planStart, p.planEnd);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-3.5 text-left shadow-card hover:border-s1"
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: token }}
      />

      <h3 className="min-w-0 text-[13.5px] leading-[1.3] [font-weight:650] break-words">
        {p.title}
      </h3>

      {/* Тўлдиргич ранги лойиҳа рангига боғланмаган: бажарилиш — ўлчов,
          тоифа эмас. `--s4`/`--s5` ёруғ мавзуда оқимтир тус беради ва
          82% ли чизиқ деярли кўринмай қоларди; лойиҳани ажратиб турувчи
          ранг чапдаги 3px чизиқда қолади. */}
      <div className="mt-2.5">
        <ProgressBar pct={p.avgPct} />
      </div>

      <div className="mt-2.5 border-t border-grid pt-2.5">
        <MixBar p={p} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1 border-t border-grid pt-2.5 text-[11.5px]">
        <span className="text-ink-3">Режа даври</span>
        <span className="font-mono tabular-nums text-ink-2">
          {span === null ? <NoData>сана кўрсатилмаган</NoData> : span}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1 text-[11.5px]">
        <span className="text-ink-3">Қиймати</span>
        <span className="text-ink-2">
          <CostText cost={p.cost} />
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <DaysChip days={p.daysLeft} />
        {p.overdue > 0 && <Pill status="crit">муддати ўтган {nf(p.overdue)}</Pill>}
        {p.dueSoon > 0 && <Pill status="warn">30 кунда {nf(p.dueSoon)}</Pill>}
        {p.noDateCount > 0 && <Pill>сана йўқ {nf(p.noDateCount)}</Pill>}
        {p.finance.length > 0 && <Pill>молия жадвали бор</Pill>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-ink-3">
          {p.sourceFile}
        </span>
        <span className="text-[11px] font-semibold tracking-[0.06em] text-s1 uppercase">
          График →
        </span>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* ишлар рўйхатидаги қатор                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Битта иш — лойиҳаси ва босқичи ёнида.
 *
 * Қатор босилганда ўша лойиҳанинг графиги очилади: иш қаерда турганини
 * кўриш учун ягона жой — Gantt.
 */
function TaskRow({ r, onOpen }: { r: SchedTaskRef; onOpen: () => void }) {
  const { task: t, project: p } = r;
  const span = dateSpan(t.start, t.end);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-grid px-3.5 py-2.5 text-left first:border-t-0 hover:bg-surface-2"
    >
      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {t.no !== null && <span className="font-mono text-[10.5px] text-ink-3">{t.no}</span>}
          <span className="min-w-0 text-[12.5px] leading-[1.35] [font-weight:600] break-words">
            {t.name}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
          <span className="truncate">{p.title}</span>
          {t.group !== null && <span className="truncate">· {t.group}</span>}
          {t.responsible !== null && <span className="truncate">· {t.responsible}</span>}
        </div>
      </div>

      <div className="w-[190px] flex-none font-mono text-[11px] tabular-nums text-ink-2">
        {span === null ? <NoData>сана кўрсатилмаган</NoData> : span}
      </div>

      <div className="w-[150px] flex-none">
        <ProgressBar pct={t.pct} height={6} />
      </div>

      <div className="flex flex-none flex-wrap items-center gap-1.5">
        <StateChip t={t} />
        {t.daysToEnd !== null && t.daysToEnd < 0 && (
          <Pill status="crit">{nf(Math.abs(t.daysToEnd))} кун</Pill>
        )}
        {t.amount !== null && t.amount !== 0 && <Pill>{exact(t.amount)} $</Pill>}
      </div>
    </button>
  );
}
