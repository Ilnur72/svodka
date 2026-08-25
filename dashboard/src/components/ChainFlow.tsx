import { Fragment } from "react";
import type { ChainBandVM, ChainLinkVM, ChainStepVM, ChainTrackVM } from "../lib/adapters/chain";
import { CHAIN_PCT_MAX, CHAIN_PCT_REF_AT, bandTitle, chainWhyMute } from "../lib/adapters/chain";
import { exact, pctTxt, statusOf, stripeOf } from "../lib/format";
import { Card } from "./Card";
import { Pill } from "./Pill";

/**
 * «Цехлар занжири» — технологик оқимнинг чизилиши.
 *
 * Геометрия ҳақидаги қарорлар:
 *
 *  1. Юқори даража — **тасма** (даража), унинг ичида **йўлаклар**: тасма
 *     ичидаги мустақил оқимлар. Йўлак кичик (энг каттаси 6 тугун), шунинг
 *     учун кенг экранда чапдан ўнгга, тор экранда юқоридан пастга ўқилади.
 *  2. Стрелка карточка билан бир қаторда чизилади (`Elbow`), шунинг учун у
 *     карточка баландлигидан қатъи назар унинг **марказига** тушади —
 *     баландликларни ўлчаш керак эмас.
 *  3. Бир қатордаги бир нечта карточка — параллел тармоқлар: уларнинг
 *     тирсаклари умумий вертикал ўқ ҳосил қилади.
 *
 * Чизиқ услуби боғланиш ишончлилигини ташийди:
 *  · **тўлиқ** — `exact`: файлда алоҳида «передача» қатори бор ёки чиқиш ва
 *    кириш айнан бир хил номда;
 *  · **узуқ** — `probable`: файл матни боғланишни кўрсатади, лекин алоҳида
 *    қатор йўқ.
 *
 * Кириши аниқланмаган босқичга (`inputKnown: false`) чизиқ **умуман
 * тортилмайди** — манба файлнинг ўзи «не детализировано» деган. Бэкенд шунга
 * қарамай эҳтимолий манба кўрсатган бўлса, у йўқолмайди: карточка ичида
 * «эҳтимолий кириш» қатори бўлиб чиқади.
 */

/** Тирсак устуни кенглиги. */
const ELBOW_W = 30;

const dashFor = (c: "exact" | "probable" | null): string =>
  c === "probable" ? "border-dashed" : "border-solid";

function Elbow({
  index,
  count,
  confidence,
}: {
  index: number;
  count: number;
  confidence: "exact" | "probable" | null;
}) {
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
  const dashed = confidence === "probable";

  return (
    <div aria-hidden="true" className="relative hidden flex-none wide:block" style={{ width: ELBOW_W }}>
      {trunk && (
        <span
          className={"absolute left-1/2 w-0 border-l border-rule " + trunk + " " + dashFor(confidence)}
        />
      )}
      <span
        className={"absolute top-1/2 right-[6px] h-0 border-t border-rule " + dashFor(confidence)}
        style={{ left: count > 1 ? "50%" : 0 }}
      />
      <span
        className={
          "absolute top-1/2 right-0 h-[7px] w-[7px] -translate-y-1/2 rotate-45 border-t border-r border-rule " +
          (dashed ? "opacity-70" : "")
        }
      />
    </div>
  );
}

/** Тор экранда қаторлар орасидаги пастга қараган стрелка. */
function DownFlow({ fan, confidence }: { fan: number; confidence: "exact" | "probable" | null }) {
  return (
    <div className="flex flex-col items-center py-1.5 wide:hidden">
      <span
        aria-hidden="true"
        className={"h-4 w-0 border-l border-rule " + dashFor(confidence)}
      />
      <span
        aria-hidden="true"
        className="-mt-[4px] h-[7px] w-[7px] rotate-[135deg] border-t border-r border-rule"
      />
      {fan > 1 && <span className="mt-1.5 text-[11px] text-ink-3">{fan} та параллел тармоқ</span>}
    </div>
  );
}

/** Тасмалар орасидаги боғланиш — чизиқ эмас, номли чип. */
function CrossChip({ link }: { link: ChainLinkVM }) {
  const probable = link.confidence === "probable";
  return (
    <span
      className={
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-ink-2 " +
        (probable ? "border-dashed border-rule" : "border-solid border-hair bg-surface-2")
      }
      title={probable ? "эҳтимолий боғланиш" : "аниқ боғланиш"}
    >
      <span aria-hidden="true">→</span>
      <span className="truncate">{link.label}</span>
    </span>
  );
}

/** Босқичга бириктирилган ресурс сарфи — занжир тугуни эмас. */
function ResourceRow({ r }: { r: ChainStepVM }) {
  const pct = r.cell?.pct ?? null;
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-grid pt-1.5 text-[11px]">
      <span className="min-w-0 truncate text-ink-3">{r.resource ?? r.output}</span>
      <span className="flex flex-none items-baseline gap-2">
        <span className="font-mono tabular-nums text-ink-2">
          {r.cell?.fakt == null ? "—" : exact(r.cell.fakt)}
        </span>
        <span
          className="font-mono font-semibold tabular-nums"
          style={{ color: stripeOf(pct) }}
        >
          {pctTxt(pct)}
        </span>
      </span>
    </div>
  );
}

function StepCard({ step }: { step: ChainStepVM }) {
  const cell = step.cell;
  const pct = cell?.pct ?? null;
  const missing = !cell || cell.empty;
  const why = chainWhyMute(step);

  return (
    <Card
      className="h-full"
      title={
        <span className="flex items-start gap-2 leading-[1.3]">
          <span className="min-w-0">
            {step.hasLimit && (
              <span className="text-warn-ink" title="манбада чеклов қайд этилган">
                ⚠{" "}
              </span>
            )}
            {step.output}
          </span>
        </span>
      }
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: missing ? "var(--rule)" : stripeOf(cell.planless ? null : pct) }}
      />
      <div className="text-[11.5px] text-ink-3">
        {step.site} · {step.stage}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        {missing ? (
          <span className="text-[15px] [font-weight:600] text-ink-3">маълумот йўқ</span>
        ) : (
          <>
            <span className="font-mono text-[20px] leading-[1.05] [font-weight:640] tracking-[-0.02em] tabular-nums">
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
        {missing ? (
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
        {!step.inputKnown && <Pill status="warn">кириши аниқланмаган</Pill>}
      </div>

      {/* Бажарилиш устуни — фоиз ўқида; бирликлар турлича, абсолют сонлар
          битта шкалага қўйилмайди. */}
      {cell?.barPct != null && (
        <div className="relative mt-2.5 h-2.5 rounded-[3px] bg-sunken">
          <div
            className="absolute top-0 bottom-0 left-0 rounded-[3px]"
            style={{
              width: `${((cell.barPct / CHAIN_PCT_MAX) * 100).toFixed(2)}%`,
              background: stripeOf(pct),
            }}
          />
          <span
            aria-hidden="true"
            className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
            style={{ left: `calc(${CHAIN_PCT_REF_AT.toFixed(2)}% - 1px)` }}
          />
          {cell.anomaly && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-[3px] -translate-y-1/2 font-mono text-[10px] leading-none text-ink"
            >
              »
            </span>
          )}
        </div>
      )}

      {step.process && (
        <p className="mt-2 text-[11px] leading-[1.4] text-ink-3">{step.process}</p>
      )}

      {/* Кириш матни фақат кириши аниқланмаганда кўрсатилади: қолган
          ҳолларда уни кирувчи стрелканинг ўзи айтади. */}
      {!step.inputKnown && (
        <p className="mt-1.5 text-[11px] leading-[1.4] text-warn-ink">кириш: {step.input}</p>
      )}
      {step.probableInputs.length > 0 && (
        <p className="mt-1 text-[11px] leading-[1.4] text-ink-3">
          эҳтимолий кириш (чизиқ тортилмади): {step.probableInputs.join(" · ")}
        </p>
      )}

      {step.waste && (
        <p className="mt-1.5 text-[11px] leading-[1.4] text-ink-3">чиқинди: {step.waste}</p>
      )}

      {step.resources.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-3 uppercase">
            Ресурс сарфи
          </span>
          {step.resources.map((r) => (
            <ResourceRow key={r.id} r={r} />
          ))}
        </div>
      )}

      {why && (
        <div className="mt-2">
          <Pill>{why}</Pill>
        </div>
      )}

      {step.outCross.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-grid pt-2">
          {step.outCross.map((l) => (
            <CrossChip key={l.id} link={l} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RowBlock({ row, withElbow }: { row: ChainStepVM[]; withElbow: boolean }) {
  const n = row.length;
  // Қаторнинг кирувчи чизиқ услуби — қатордаги биринчи тугунники: бир
  // қатордаги тугунлар битта олдинги даражадан келади.
  const conf = row[0]?.inConfidence ?? null;

  return (
    <div
      className={
        "relative flex flex-col gap-3 wide:gap-2" +
        (n > 1 ? " mid:grid mid:grid-cols-2 mid:gap-3 wide:flex wide:flex-col" : "")
      }
    >
      {withElbow && n > 1 && (
        <span
          aria-hidden="true"
          className={"absolute top-1/2 left-0 hidden h-0 border-t border-rule wide:block " + dashFor(conf)}
          style={{ width: ELBOW_W / 2 }}
        />
      )}
      {row.map((s, i) => (
        <div key={s.id} className="flex items-stretch">
          {withElbow && <Elbow index={i} count={n} confidence={s.inConfidence} />}
          <div className="min-w-0 flex-1 wide:w-[250px] wide:flex-none">
            <StepCard step={s} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackFlow({ track }: { track: ChainTrackVM }) {
  return (
    <div className="flex flex-col wide:flex-row wide:items-center wide:overflow-x-auto wide:pb-1">
      {track.rows.map((row, i) => (
        <Fragment key={row[0]?.id ?? i}>
          {i > 0 && <DownFlow fan={row.length} confidence={row[0]?.inConfidence ?? null} />}
          <div className="wide:flex-none">
            <RowBlock row={row} withElbow={i > 0} />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function ChainBand({ band }: { band: ChainBandVM }) {
  return (
    <div className="rounded-card border border-hair bg-surface-2 px-3 pt-3 pb-3.5">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="text-[13px] [font-weight:650]">Даража {band.level}</h3>
        <span className="text-[11.5px] text-ink-3">
          {band.stepCount} босқич · {band.tracks.length} мустақил оқим
        </span>
      </div>
      {/* Даражанинг умумлашган номи манба файлда йўқ, шунинг учун бу ерда
          файлдаги «Уровень» қийматлари ўз ҳолича кўрсатилади. */}
      <p className="mb-2.5 text-[11.5px] leading-[1.45] text-ink-3">{bandTitle(band)}</p>

      <div className="flex flex-col gap-3">
        {band.tracks.map((t) => (
          <TrackFlow key={t.key} track={t} />
        ))}
      </div>
    </div>
  );
}

export function ChainLegend({
  counts,
}: {
  counts: { exact: number; probable: number; line: number; chip: number; suppressed: number };
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[11.5px] leading-[1.45] text-ink-2">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="inline-block h-0 w-[16px] flex-none border-t border-solid border-rule" />
          Аниқ боғланиш ({counts.exact})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="inline-block h-0 w-[16px] flex-none border-t border-dashed border-rule" />
          Эҳтимолий боғланиш ({counts.probable})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="font-mono">→</span>
          Даражалар орасидаги боғланиш чип билан ({counts.chip})
        </span>
      </div>
      <p className="text-ink-3">
        Кириши аниқланмаган босқичларга чизиқ тортилмайди — манба файлнинг ўзи «не
        детализировано» деб ёзган
        {counts.suppressed > 0 && (
          <>
            {" "}
            (шу сабабли {counts.suppressed} та боғланиш чизилмади; улар йўқолмайди —
            карточкада «эҳтимолий кириш» бўлиб қолади)
          </>
        )}
        . Бажарилиш устуни {CHAIN_PCT_MAX}% да тугайди: ундан катта фоиз кесилади (⚠ ва »),
        ҳақиқий сон карточкада тўлиқ ёзилади.
      </p>
    </div>
  );
}
