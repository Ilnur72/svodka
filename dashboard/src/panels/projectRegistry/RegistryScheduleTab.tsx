import { useEffect, useMemo, type ReactNode } from "react";
import type { ProjectScheduleDashboard } from "../../api/types";
import { getProjectSchedule } from "../../api/endpoints";
import { useQuery } from "../../lib/useQuery";
import { dateLabel, exact, nf, pctTxt } from "../../lib/format";
import { usePalette } from "../../lib/theme";
import type { RegProject } from "../../lib/adapters/projectRegistry";
import {
  SCHED_FILTER_EMPTY,
  schedGroups,
  schedProjectByKey,
  scheduleView,
  type SchedProject,
} from "../../lib/adapters/schedule";
import { PROOF_LABEL, type RegistryScheduleLink } from "../../lib/registryScheduleLinks";
import { GRID } from "../../components/layout";
import { Card, Section } from "../../components/Card";
import { Pill } from "../../components/Pill";
import { PercentRing } from "../../components/PercentRing";
import { StatTile } from "../../components/StatTile";
import { EmptyState, Loader } from "../../components/states";
import { CostText, DaysChip, MixBar, NoData, dateSpan } from "../schedule/parts";
import { ScheduleFinance } from "../schedule/ScheduleFinance";
import { ScheduleGantt } from "../schedule/ScheduleGantt";
import { Muted } from "./parts";

/**
 * Реестр лойиҳасининг қурилиш мониторинги графиги — тафсилот ойнасининг
 * иккинчи таби.
 *
 * ═══ Сўров қачон юборилади ══════════════════════════════════════════════
 *
 * Компонент таб БИРИНЧИ МАРТА очилгандагина монтаж қилинади (қаранг:
 * `RegistryProjectDetail` → `schedSeen`). Шунинг учун бу ерда `enabled`
 * байроғи йўқ: монтажнинг ўзи — «фойдаланувчи графикни сўради» дегани.
 * Акс ҳолда ҳар бир реестр лойиҳаси очилганда 6 та график, 750 та иш ва
 * 14 та молия қаторидан иборат оғир жавоб тортиб олинарди.
 *
 * Сўров калити `SchedulePanel` билан БИР ХИЛ — `"project-schedule"`, айнан
 * бир хил `getProjectSchedule()` функцияси билан. Иккита жойда иккита
 * турли шакл пайдо бўлишининг олди шу билан олинади.
 *
 * ═══ Нега `ScheduleProjectDetail` ўзи ишлатилмайди ══════════════════════
 *
 * У бутун бир САҲИФА учун ясалган: юқорисида «← Лойиҳалар рўйхати ·
 * Олдинги · Кейинги» навигацияси ва фильтр қатори (`ScheduleFilterBar`)
 * бор, фильтр ҳолати эса `SchedulePanel` да туради. Ойна ичида бу
 * тугмалар боришга жой топа олмайди — уларга `() => {}` бериш экранда
 * ўлик тугмалар қолдирарди. Шунинг учун бу ерда ўша саҳифанинг
 * БЎЛАКЛАРИ йиғилади: `parts.tsx` (ҳолат чиплари, `MixBar`, `CostText`),
 * `ScheduleGantt` ва `ScheduleFinance` — иккита экранда бир хил маъно бир
 * хил кўринишда қолади.
 *
 * ═══ Иккита манба ёнма-ён ═══════════════════════════════════════════════
 *
 * Реестрдаги қиймат (инвестиция дастури) ва графикдаги қиймат (қурилиш
 * мониторинги) кўпинча мос келмайди — масалан вольфрам гидрометаллургияси
 * 1-босқичида 80 млн $ ва 66 672 346 $. Бу МАНБАЛАРДАГИ фарқ: иккиси
 * бир-бирига мослаштирилмайди, бири иккинчиси билан алмаштирилмайди.
 * «Иккита манба» карточкасида иккови ҳам манбаси белгиланган ҳолда
 * ёзилади (қаранг: `lib/registryScheduleLinks.ts`).
 */

/** График қаторлари ойна ичида — экраннинг ярмидан ошмасин. */
const GANTT_MAX_H = "max-h-[56vh]";

export interface RegistryScheduleTabProps {
  p: RegProject;
  link: RegistryScheduleLink;
  /** Таб айни пайтда очиқми — ёпиқ бўлса мазмун ЧИЗИЛМАЙДИ (қуйидаги изоҳ). */
  active: boolean;
}

/**
 * Компонент таб ёпилганда ҳам монтаж қилинган ҳолда қолади (сўров
 * такрорланмаслиги учун), лекин мазмунини чизмайди.
 *
 * ⚠️ `hidden` нинг ўзи етарли эмас: у `display: none` беради, Recharts'нинг
 * `ResponsiveContainer` и эса ўлчамни `ResizeObserver` билан ўқийди ва 0×0
 * кўрганда консолга «The width(0) and height(0) of chart should be greater
 * than 0» огоҳлантиришини ёзади (ҳалқа — `PercentRing`). Шунинг учун ёпиқ
 * табда `null` қайтарилади: `useQuery` ҳолати эса компонентда сақланиб
 * қолади, яъни табга қайтганда сўров қайта юборилмайди.
 */
export function RegistryScheduleTab({ p, link, active }: RegistryScheduleTabProps) {
  const q = useQuery("project-schedule", (s) => getProjectSchedule(s));
  if (!active) return null;
  return (
    <Loader q={q} height={320} notAvailableWhat="/project-schedule/dashboard">
      {(data) => <Body p={p} link={link} data={data} />}
    </Loader>
  );
}

function Body({
  p,
  link,
  data,
}: {
  p: RegProject;
  link: RegistryScheduleLink;
  data: ProjectScheduleDashboard;
}) {
  const v = useMemo(() => scheduleView(data), [data]);
  const sp = schedProjectByKey(v.projects, link.scheduleKey);

  // Таб реестр калити бўйича чизилган, аммо графикнинг ўз калити жавобда
  // топилмади — яъни мониторинг файли қайта номланган ёки олиб ташланган.
  // Экранда сабаби ёзилади, dev режимида эса консолга ҳам тушади.
  useEffect(() => {
    if (import.meta.env.DEV && sp === null) {
      console.warn(
        `[RegistryScheduleTab] «${link.scheduleKey}» калитли график /project-schedule/dashboard жавобида йўқ (реестр id ${link.registryId}).`,
      );
    }
  }, [sp, link]);

  if (sp === null) {
    return (
      <EmptyState
        title="График серверда топилмади"
        text={
          <>
            Бу лойиҳа <b className="font-mono font-semibold">{link.scheduleKey}</b> калитли
            мониторинг графигига уланган, лекин сервер жавобида шундай калит йўқ. Эҳтимол
            манба файл қайта номланган. Реестр маълумоти биринчи табда ўз ҳолича турибди.
          </>
        }
      />
    );
  }

  const groups = schedGroups(sp, { ...SCHED_FILTER_EMPTY, project: sp.key });
  const shown = groups.reduce((a, g) => a + g.tasks.length, 0);
  const span = dateSpan(sp.planStart, sp.planEnd);

  return (
    <>
      {/* --- 1. графикнинг сарлавҳаси ва жуфтликнинг далили ---------------- */}
      <Card
        className="mb-3"
        stripe="var(--s1)"
        title={sp.title}
        sub={`${nf(sp.taskCount)} иш · ${nf(sp.groupCount)} босқич`}
      >
        <p className="mt-1 border-t border-grid pt-2 font-mono text-[11.5px] leading-[1.5] text-ink-3">
          {sp.sourceFile} · {sp.sourceSheet}
          {sp.importedAt !== null && ` · импорт ${dateLabel(sp.importedAt.slice(0, 10))}`}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
          <Pill status={PROOF_LABEL[link.proof].status}>{PROOF_LABEL[link.proof].text}</Pill>
          <span className="min-w-[220px] flex-1 text-[11.5px] leading-[1.5] text-ink-3">
            {link.proofText}
          </span>
        </div>
      </Card>

      {/* --- 2. тўртта плитка — «Лойиҳа графиклари» дагидек ---------------- */}
      <div className={GRID.g4}>
        <StatTile
          label="Ўртача бажарилиш"
          value={sp.avgPct === null ? <NoData /> : pctTxt(sp.avgPct)}
          stripe="var(--s1)"
          foot={
            sp.sourcePct === null ? (
              <Pill>манбада фоиз йўқ</Pill>
            ) : (
              <Pill>манбадаги қаторда {pctTxt(sp.sourcePct)}</Pill>
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
          foot={sp.totalDays !== null && <Pill>{nf(sp.totalDays)} кун</Pill>}
        />
        <StatTile
          label="Муддатгача"
          value={
            sp.daysLeft === null ? (
              <NoData />
            ) : sp.daysLeft < 0 ? (
              <span style={{ color: "var(--crit-ink)" }}>{nf(Math.abs(sp.daysLeft))}</span>
            ) : (
              nf(sp.daysLeft)
            )
          }
          unit={sp.daysLeft === null ? undefined : "кун"}
          stripe={sp.daysLeft !== null && sp.daysLeft < 0 ? "var(--crit)" : "var(--s2)"}
          foot={<DaysChip days={sp.daysLeft} />}
        />
        <StatTile
          label="График бўйича қиймат"
          value={<CostText cost={sp.cost} />}
          stripe="var(--s3)"
          foot={
            sp.cost === null ? (
              <Pill status="warn">мониторинг файлида кўрсатилмаган</Pill>
            ) : (
              <Pill>қурилиш мониторингидан</Pill>
            )
          }
        />
      </div>

      {/* --- 3. бажарилиш ва иккита манба --------------------------------- */}
      <div className={`${GRID.g23} mt-3`}>
        <Card title="Бажарилиш" sub={`${nf(sp.taskCount)} иш · ${nf(sp.groupCount)} босқич`}>
          <ProgressRing p={sp} />
          <div className="mt-3 border-t border-grid pt-2.5">
            <MixBar p={sp} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-grid pt-2.5">
            {sp.overdue > 0 ? (
              <Pill status="crit">муддати ўтган {nf(sp.overdue)} иш</Pill>
            ) : (
              <Pill status="good">муддати ўтган иш йўқ</Pill>
            )}
            {sp.dueSoon > 0 && <Pill status="warn">30 кунда тугайди {nf(sp.dueSoon)}</Pill>}
            {sp.noDateCount > 0 && <Pill>сана кўрсатилмаган {nf(sp.noDateCount)} иш</Pill>}
            {sp.finance.length === 0 && <Pill>молия жадвали киритилмаган</Pill>}
          </div>
        </Card>

        <SourceCompare p={p} sp={sp} />
      </div>

      {/* --- 4. график ----------------------------------------------------- */}
      <Section
        className="mt-3"
        title="График"
        note="ойнада фильтр йўқ — графикнинг барча босқичи ва иши кўрсатилади"
      >
        <ScheduleGantt
          axis={sp.axis}
          groups={groups}
          shown={shown}
          total={sp.taskCount}
          maxH={GANTT_MAX_H}
        />
      </Section>

      {/* --- 5. молиялаштириш — фақат киритилган бўлса ---------------------- */}
      {sp.finance.length > 0 && (
        <Section title="Молиялаштириш">
          <ScheduleFinance p={sp} />
        </Section>
      )}

      <p className="border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
        Манба: {sp.sourceFile}
        {v.lastImportedAt !== null &&
          ` · охирги импорт ${dateLabel(v.lastImportedAt.slice(0, 10))}`}
        {" · "}
        <a
          href={`#schedule/${encodeURIComponent(sp.key)}`}
          className="font-semibold text-s1 underline underline-offset-2"
        >
          «Лойиҳа графиклари» бўлимида очиш →
        </a>
      </p>
    </>
  );
}

/**
 * Ўртача бажарилиш ҳалқаси. Фоиз кўрсатилмаган бўлса ҳалқа НОЛ билан
 * чизилмайди — у «иш бошланмаган» деган ёлғон хулоса берарди.
 */
function ProgressRing({ p }: { p: SchedProject }) {
  // Recharts `var(--s1)` ни тушунмайди — ранг палитрадан олинади.
  const pal = usePalette();
  if (p.avgPct === null) {
    return (
      <p className="mt-1 border-t border-grid pt-2 text-[11.5px] leading-[1.5] text-ink-3">
        Графикдаги ишларнинг бирортасида ҳам бажарилиш фоизи кўрсатилмаган, шунинг учун
        ҳалқа чизилмади.
      </p>
    );
  }
  return (
    <div className="mt-1">
      <PercentRing
        label="Ўртача бажарилиш"
        pct={p.avgPct}
        color={pal.s1}
        note="графикнинг барча ишлари бўйича ўртача — манбадаги илдиз қатор фоизи эмас"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* иккита манба                                                               */
/* -------------------------------------------------------------------------- */

/** Битта ўлчовнинг иккита манбадаги қиймати — ёнма-ён, аралаштирилмасдан. */
function SourceLine({ from, children }: { from: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px]">
      <span className="w-[210px] flex-none text-ink-3">{from}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

function CompareBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <div className="text-[10.5px] [font-weight:650] tracking-[0.06em] text-ink-3 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Реестр ва график — иккита ҳужжат, иккита сон.
 *
 * Сонлар ҲИСОБЛАНМАЙДИ ва бир-бирига келтирилмайди: фарқи ҳам
 * кўрсатилмайди, чунки «фарқ» деган сон улар бир хил ўлчов эканини
 * даъво қиларди. Ягона ҳисобланган қиймат — графикдаги долларни млн га
 * ўтказиш, у очиқ «ҳисобланган» деб белгиланади ва `nf(v, 2)` билан
 * ёзилади; манбадаги сонлар эса `exact()` билан, яхлитланмай туради.
 */
function SourceCompare({ p, sp }: { p: RegProject; sp: SchedProject }) {
  return (
    <Card
      title="Иккита манба"
      sub="реестр · қурилиш мониторинги"
      note="Реестрдаги сон «Инвестиция дастури» файлидан, графикдаги сон қурилиш мониторинги файлидан олинади. Улар мослаштирилмайди ва тузатилмайди — фарқ бўлса, иккови ҳам ўз манбаси билан турибди."
    >
      <CompareBlock title="Лойиҳа қиймати">
        <SourceLine from="Реестр · инвестиция дастури">
          {p.totalCost === null ? (
            <Muted />
          ) : (
            <>
              <span className="font-mono tabular-nums">{exact(p.totalCost)}</span>
              <span className="ml-1 text-[11px] text-ink-3">млн $</span>
            </>
          )}
        </SourceLine>
        <SourceLine from="График · қурилиш мониторинги">
          {sp.cost === null ? (
            <Muted />
          ) : (
            <>
              <span className="font-mono tabular-nums">{exact(sp.cost)}</span>
              <span className="ml-1 text-[11px] text-ink-3">$</span>
              {/* Ўлчов бирлиги ҳар хил бўлгани учун ўқиш оғир — доллар
                  млн га ўтказиб ёнига ёзилади ва «ҳисобланган» деб
                  белгиланади. Бу таққослаш эмас, фақат бирлик. */}
              <span className="ml-2 text-[11px] text-ink-3">
                = {nf(sp.cost / 1e6, 2)} млн $ (ҳисобланган)
              </span>
            </>
          )}
        </SourceLine>
      </CompareBlock>

      <CompareBlock title="Муддат">
        <SourceLine from="Реестр · амалга ошириш муддати">
          {p.deadline === null ? <Muted /> : p.deadline}
        </SourceLine>
        <SourceLine from="График · манбадаги тугаш санаси">
          {sp.deadline === null ? (
            <Muted />
          ) : (
            <span className="font-mono tabular-nums">{dateLabel(sp.deadline)}</span>
          )}
        </SourceLine>
      </CompareBlock>

      <CompareBlock title="Бажарилиш">
        <SourceLine from="Реестр · бажарилиш устуни">
          {p.progressPercent === null ? (
            <Muted />
          ) : (
            <span className="font-mono tabular-nums">{pctTxt(p.progressPercent)}</span>
          )}
        </SourceLine>
        <SourceLine from="График · ишлар бўйича ўртача">
          {sp.avgPct === null ? (
            <Muted />
          ) : (
            <span className="font-mono tabular-nums">{pctTxt(sp.avgPct)}</span>
          )}
        </SourceLine>
      </CompareBlock>
    </Card>
  );
}
