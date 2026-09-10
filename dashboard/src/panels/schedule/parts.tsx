import type { ReactNode } from "react";
import { dateLabel, exact, nf, pctTxt } from "../../lib/format";
import {
  NO_DATA,
  SCHED_STATE_LABEL,
  SCHED_STATE_TOKEN,
  type SchedProject,
  type SchedTask,
} from "../../lib/adapters/schedule";
import { Pill } from "../../components/Pill";

/**
 * «Лойиҳа графиклари» бўлимининг иккита кўринишида (лойиҳалар рўйхати ва
 * битта лойиҳанинг тафсилоти) бир хил ишлатиладиган бўлаклар.
 *
 * Улар шу ерда туради, чунки битта маъно иккита экранда бир хил кўриниши
 * шарт: ҳолат ранги битта манбадан (`SCHED_STATE_TOKEN`) келади, «сана
 * кўрсатилмаган» ҳамма жойда бир хил ёзилади, муддат ўтгани ҳамма жойда
 * бир хил чипга айланади.
 */

/** Манбада катак тўлдирилмаган жой — ҳамма жойда бир хил матн ва бир хил тус. */
export function NoData({ children = NO_DATA }: { children?: ReactNode }) {
  return <span className="font-sans font-medium tracking-normal text-ink-3">{children}</span>;
}

/**
 * Ишнинг ранг токени.
 *
 * Муддати ўтган ва яқин 30 кунда тугайдиган иш — **ҳақиқий ҳолат баҳоси**,
 * шунинг учун улар `--crit` ва `--warn` олади. Қолганида баҳо йўқ:
 * бажарилган — `--good`, жараёнда — нейтрал `--s1`, бошланмаган — `--rule`.
 * Зиддият чиқмайди: муддати ўтган иш таърифи бўйича 100% эмас.
 */
export const barToken = (t: SchedTask): string =>
  t.overdue ? "var(--crit)" : t.dueSoon ? "var(--warn)" : SCHED_STATE_TOKEN[t.state];

/** Вақт ўқи ва қаторлар остидаги ранг изоҳи — ҳар иккала кўринишда бир хил. */
export const GANTT_LEGEND: { name: string; color: string }[] = [
  { name: "бажарилган", color: SCHED_STATE_TOKEN.done },
  { name: "жараёнда", color: SCHED_STATE_TOKEN.run },
  { name: "бошланмаган", color: SCHED_STATE_TOKEN.todo },
  { name: "30 кунда тугайди", color: "var(--warn)" },
  { name: "муддати ўтган", color: "var(--crit)" },
];

/** `"2025-12-01" … "2026-12-30"` → ўқиладиган давр. Сана йўқ бўлса `null`. */
export function dateSpan(start: string | null, end: string | null): string | null {
  if (start === null && end === null) return null;
  if (start === null) return `… ${dateLabel(end as string)}`;
  if (end === null) return `${dateLabel(start)} …`;
  return `${dateLabel(start)} — ${dateLabel(end)}`;
}

/** Ишнинг ҳолат чипи: муддат ҳолати ҳолат номидан устун туради. */
export function StateChip({ t }: { t: SchedTask }) {
  if (t.overdue) return <Pill status="crit">муддати ўтган</Pill>;
  if (t.dueSoon) return <Pill status="warn">30 кунда тугайди</Pill>;
  return <Pill status={t.state === "done" ? "good" : "mute"}>{SCHED_STATE_LABEL[t.state]}</Pill>;
}

/**
 * `planEnd` гача қолган кун. Манфий бўлса «муддат ўтган» — шунинг учун
 * ишорали сон эмас, ўқиладиган матн чиқади.
 */
export function DaysChip({ days }: { days: number | null }) {
  if (days === null) return <Pill>муддат кўрсатилмаган</Pill>;
  if (days < 0) return <Pill status="crit">муддат ўтган {nf(Math.abs(days))} кун</Pill>;
  return <Pill status={days <= 30 ? "warn" : "mute"}>{nf(days)} кун қолди</Pill>;
}

/**
 * Якунланган ишнинг муддат билан таққослови — фақат `actualEnd` бор бўлганда.
 * Манбадаги «Фарқ» устунининг иккинчи (`TODAY()` қолдиғи) маъноси бу ерга
 * умуман келмайди: адаптер уни аллақачон `null` га айлантирган.
 */
export function FinishedChip({ t }: { t: SchedTask }) {
  if (t.actualEnd === null) return null;
  const d = t.finishedDiff;
  if (d === null || d === 0) return <Pill status="good">муддатида якунланди</Pill>;
  return d > 0 ? (
    <Pill status="good">муддатдан {nf(d)} кун олдин</Pill>
  ) : (
    <Pill status="warn">{nf(Math.abs(d))} кун кечикиб</Pill>
  );
}

/**
 * Бажарилиш чизиғи.
 *
 * Тўлдиргич 100% да тўхтайди, фоиз матни эса ҳақиқий қийматни кўрсатади.
 * Фоиз кўрсатилмаган иш нолга айлантирилмайди — чизиқ нейтрал рангда бўш
 * қолади ва ёнида «маълумот йўқ» ёзилади.
 */
export function ProgressBar({
  pct,
  color = "var(--s1)",
  height = 8,
}: {
  pct: number | null;
  color?: string;
  height?: number;
}) {
  const fill = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <span
        className="relative min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken"
        style={{ height }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-[3px]"
          style={{ width: `${fill.toFixed(2)}%`, background: pct === null ? "var(--rule)" : color }}
        />
      </span>
      <span className="w-[52px] flex-none text-right font-mono text-[11.5px] tabular-nums">
        {pct === null ? <NoData>—</NoData> : pctTxt(pct)}
      </span>
    </div>
  );
}

/**
 * Таркиб: бажарилган / жараёнда / бошланмаган. Учтасининг йиғиндиси
 * лойиҳанинг иш сони билан тенг, шунинг учун улар битта чизиқда — бу
 * ҳақиқий бутуннинг қисмлари, турли ўлчов эмас.
 */
export function MixBar({ p }: { p: SchedProject }) {
  const total = p.done + p.run + p.todo;
  if (total === 0) return null;
  const parts: { k: string; v: number; c: string; label: string }[] = [
    { k: "done", v: p.done, c: SCHED_STATE_TOKEN.done, label: "бажарилган" },
    { k: "run", v: p.run, c: SCHED_STATE_TOKEN.run, label: "жараёнда" },
    { k: "todo", v: p.todo, c: SCHED_STATE_TOKEN.todo, label: "бошланмаган" },
  ];
  return (
    <div>
      <div className="flex h-[7px] gap-px overflow-hidden rounded-[3px]">
        {parts
          .filter((x) => x.v > 0)
          .map((x) => (
            <span
              key={x.k}
              title={`${x.label}: ${nf(x.v)}`}
              style={{ width: `${((x.v / total) * 100).toFixed(3)}%`, background: x.c }}
            />
          ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-2">
        {parts.map((x) => (
          <span key={x.k} className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-none rounded-sm"
              style={{ background: x.c }}
            />
            {x.label}
            <b className="font-mono tabular-nums">{nf(x.v)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Лойиҳа қиймати ($) — кўрсатилмаган бўлса нол эмас, «маълумот йўқ». */
export function CostText({ cost }: { cost: number | null }) {
  if (cost === null) return <NoData />;
  return (
    <>
      <span className="font-mono tabular-nums">{exact(cost)}</span>
      <span className="ml-1 text-[11px] font-medium text-ink-3">$</span>
    </>
  );
}
