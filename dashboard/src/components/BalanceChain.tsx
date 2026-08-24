import { Fragment } from "react";
import type {
  BalanceBranchVM,
  BalanceGroupVM,
  BalanceLevelVM,
  BalanceStepVM,
} from "../lib/adapters/balance";
import { howNote } from "../lib/adapters/balance";
import { exact, monthLabel, pctTxt, statusOf, stripeOf } from "../lib/format";
import { Card } from "./Card";
import { Pill } from "./Pill";

/**
 * Технологик занжир: хомашёдан тайёр маҳсулотгача. Ҳар бир босқич —
 * **алоҳида карточка**, карточкалар ўзаро стрелка билан боғланган.
 *
 * Геометрия ҳақида икки қарор:
 *
 *  1. Стрелка карточканинг ўзи билан бир қаторда чизилади (`Elbow`), шунинг
 *     учун у карточка баландлигидан қатъи назар унинг **марказига** аниқ
 *     тушади — баландликларни ўлчаш ёки мажбурий тенглаштириш керак эмас.
 *  2. Бир хил `no` ли босқичлар — параллел тармоқлар: уларнинг тирсаклари
 *     умумий вертикал ўқ ҳосил қилади (оралиқдаги `gap-2` устидан
 *     `-top-2/-bottom-2` билан ўтади), яъни олдинги даражадан келган битта
 *     чизиқ ҳаммасига бўлинади.
 *
 * Кенг экранда занжир чапдан ўнгга оқади, тор экранда — юқоридан пастга
 * (тирсаклар яширилади, ўрнига пастга қараган стрелка чиқади).
 */

/** Тирсак устуни кенглиги ва унинг ярми — кириш чизиғи шунга уланади. */
const ELBOW_W = 34;

function Elbow({ index, count }: { index: number; count: number }) {
  // Вертикал ўқ: биринчисида марказдан пастга, охиргисида юқоридан марказга,
  // ўртадагиларда тўлиқ — оралиқдаги бўшлиқ устидан ўтиб уланади.
  const trunk =
    count === 1
      ? null
      : index === 0
        ? "top-1/2 -bottom-2"
        : index === count - 1
          ? "-top-2 bottom-1/2"
          : "-top-2 -bottom-2";

  return (
    <div aria-hidden="true" className="relative hidden flex-none wide:block" style={{ width: ELBOW_W }}>
      {trunk && <span className={"absolute left-1/2 w-px bg-rule " + trunk} />}
      <span
        className="absolute top-1/2 right-[6px] h-px bg-rule"
        style={{ left: count > 1 ? "50%" : 0 }}
      />
      <span className="absolute top-1/2 right-0 h-[7px] w-[7px] -translate-y-1/2 rotate-45 border-t border-r border-rule" />
    </div>
  );
}

/** Тор экранда даражалар орасидаги пастга қараган стрелка. */
function DownFlow({ fan }: { fan: number }) {
  return (
    <div className="flex flex-col items-center py-1.5 wide:hidden">
      <span aria-hidden="true" className="h-4 w-px bg-rule" />
      <span
        aria-hidden="true"
        className="-mt-[4px] h-[7px] w-[7px] rotate-[135deg] border-t border-r border-rule"
      />
      {fan > 1 && <span className="mt-1.5 text-[11px] text-ink-3">{fan} та параллел тармоқ</span>}
    </div>
  );
}

function StepCard({ step, reference }: { step: BalanceStepVM; reference: string }) {
  const cell = step.cell;
  const pct = cell?.pct ?? null;
  const missing = !cell || cell.empty;
  const provenance = cell ? howNote(cell.how) : null;

  const val = (v: number | null): string => (v === null ? "—" : `${exact(v)} ${step.unit}`);
  const title =
    `${step.title}\n${step.site}\nРежа: ${val(cell?.plan ?? null)}\nФакт: ${val(cell?.fakt ?? null)}` +
    `\nБажарилиш: ${cell?.planless ? "режа қўйилмаган" : pctTxt(pct)}` +
    (cell?.row ? `\nМанба сатри: №${cell.row}` : "") +
    (provenance ? `\n${provenance}` : "") +
    (step.note ? `\n⚠ ${step.note}` : "");

  return (
    <Card
      className="h-full"
      title={
        <span className="flex items-start gap-2 leading-[1.3]">
          <span
            aria-hidden="true"
            className="mt-px inline-flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-sunken px-1 font-mono text-[11px] text-ink-3"
          >
            {step.no}
          </span>
          <span className="min-w-0">
            {step.note && (
              <span className="text-warn-ink" title={step.note}>
                ⚠{" "}
              </span>
            )}
            {step.title}
          </span>
        </span>
      }
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: missing ? "var(--rule)" : stripeOf(cell?.planless ? null : pct) }}
      />
      <div className="text-[11.5px] text-ink-3">{step.site}</div>

      <div className="mt-2 flex items-baseline gap-1.5" title={title}>
        {missing ? (
          <span className="text-[15px] [font-weight:600] text-ink-3">маълумот йўқ</span>
        ) : (
          <>
            <span className="font-mono text-[21px] leading-[1.05] [font-weight:640] tracking-[-0.02em] tabular-nums">
              {exact(cell.fakt)}
            </span>
            <span className="text-[12px] font-medium text-ink-3">{step.unit}</span>
          </>
        )}
      </div>

      {!missing && (
        <div className="mt-0.5 font-mono text-[11.5px] tabular-nums text-ink-3">
          режа {cell.plan === null ? "—" : exact(cell.plan)} {step.unit}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {step.marchOnly ? (
          <Pill>манба: {monthLabel(reference)} варағи</Pill>
        ) : missing ? (
          <Pill>қиймат йўқ</Pill>
        ) : cell.planless ? (
          <Pill>режасиз</Pill>
        ) : pct === null ? (
          <Pill>бажарилиш —</Pill>
        ) : (
          <Pill status={statusOf(pct)}>
            {cell.anomaly && <span aria-hidden="true">⚠</span>}
            {pctTxt(pct)}
          </Pill>
        )}
        {cell?.row ? <span className="font-mono text-[11px] text-ink-3">№{cell.row}</span> : null}
      </div>

      {provenance && <p className="mt-1.5 text-[11px] leading-[1.4] text-ink-3">{provenance}</p>}
      {step.note && <p className="mt-1.5 text-[11px] leading-[1.4] text-ink-3">⚠ {step.note}</p>}
    </Card>
  );
}

function LevelBlock({
  level,
  reference,
  withElbow,
}: {
  level: BalanceLevelVM;
  reference: string;
  withElbow: boolean;
}) {
  const n = level.steps.length;
  return (
    <div
      className={
        "relative flex flex-col gap-3 wide:gap-2" +
        // Тор экранда параллел тармоқлар икки устунга ёйилади; кенг экранда
        // улар яна битта устунга қайтади — тирсаклар шунда ишлайди.
        // `wide:` медиа сўрови `mid:` дан кейин турганигина учун флексни
        // қайтариш учун қўшимча белги керак эмас.
        (n > 1 ? " mid:grid mid:grid-cols-2 mid:gap-3 wide:flex wide:flex-col" : "")
      }
    >
      {/* Олдинги даражадан келган чизиқнинг тирсакка уланиш жойи. */}
      {withElbow && n > 1 && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 hidden h-px bg-rule wide:block"
          style={{ width: ELBOW_W / 2 }}
        />
      )}
      {level.steps.map((s, i) => (
        <div key={s.id} className="flex items-stretch">
          {withElbow && <Elbow index={i} count={n} />}
          <div className="min-w-0 flex-1 wide:w-[238px] wide:flex-none">
            <StepCard step={s} reference={reference} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BranchFlow({ branch, reference }: { branch: BalanceBranchVM; reference: string }) {
  const flow = branch.levels.filter((l) => !l.aside);
  const aside = branch.levels.filter((l) => l.aside);

  return (
    <div>
      {branch.sub && (
        <p className="mb-2 text-[12px] [font-weight:600] text-ink-2">{branch.sub}</p>
      )}

      {/* Кенг экранда чапдан ўнгга; даражалар марказ бўйича текисланади,
          шунда битта карточкали даража кўп тармоқли даражанинг марказига
          тўғри келади ва стрелка узилмайди. */}
      <div className="flex flex-col wide:flex-row wide:items-center wide:overflow-x-auto wide:pb-1">
        {flow.map((level, i) => (
          <Fragment key={level.no}>
            {i > 0 && <DownFlow fan={level.steps.length} />}
            <div className="wide:flex-none">
              <LevelBlock level={level} reference={reference} withElbow={i > 0} />
            </div>
          </Fragment>
        ))}
      </div>

      {aside.length > 0 && (
        <div className="mt-3 border-t border-grid pt-3">
          <p className="mb-2 text-[11.5px] text-ink-3">
            Занжирда ўрни белгиланмаган қаторлар (справочно) — йўлга қўшилмайди:
          </p>
          {aside.map((level) => (
            <LevelBlock key={level.no} level={level} reference={reference} withElbow={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Тармоқларнинг якуний тугунда бирлашиши. Чизиқлар `justify-around` билан
 * жойлашади — шунда номлар ва вертикал чизиқлар ҳисоб-китобсиз бир хил
 * нуқтада туради; горизонтал ўқ биринчи ва охирги чизиқни туташтиради.
 */
function MergeJoin({ from }: { from: string[] }) {
  const n = from.length;
  return (
    <div className="pt-2">
      {/* `flex-1` — ҳар бир устун тенг кенгликда, шунинг учун ном ва унинг
          остидаги чизиқ ҳисоб-китобсиз бир хил вертикалда туради. */}
      <div className="flex">
        {from.map((name) => (
          <span key={name} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-3">
            {name}
          </span>
        ))}
      </div>
      <div aria-hidden="true">
        <div className="flex">
          {from.map((name) => (
            <span key={name} className="flex flex-1 justify-center">
              <span className="h-3 w-px bg-rule" />
            </span>
          ))}
        </div>
        {n > 1 && (
          <div className="mx-auto h-px bg-rule" style={{ width: `${((n - 1) / n) * 100}%` }} />
        )}
        <div className="mx-auto h-3 w-px bg-rule" />
        <div className="mx-auto -mt-[4px] h-[7px] w-[7px] rotate-[135deg] border-t border-r border-rule" />
      </div>
    </div>
  );
}

export function BalanceChainGroup({
  group,
  reference,
}: {
  group: BalanceGroupVM;
  reference: string;
}) {
  return (
    <div className="rounded-card border border-hair bg-surface-2 px-3 pt-3 pb-3.5">
      <h3 className="mb-2.5 text-[13px] [font-weight:650]">{group.title}</h3>

      <div className="flex flex-col gap-3">
        {group.branches.map((b) => (
          <BranchFlow key={b.key} branch={b} reference={reference} />
        ))}
      </div>

      {group.merge && (
        <>
          <MergeJoin from={group.branches.map((b) => b.sub ?? b.title)} />
          <p className="mt-1.5 mb-2 text-center text-[11.5px] text-ink-3">
            {group.branches.length} та мустақил тармоқ шу тугунда бирлашади
          </p>
          <div className="wide:mx-auto wide:max-w-[300px]">
            <BranchFlow branch={group.merge} reference={reference} />
          </div>
        </>
      )}
    </div>
  );
}
