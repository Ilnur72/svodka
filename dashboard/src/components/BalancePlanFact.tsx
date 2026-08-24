import type { BalanceGroupVM, BalanceStepVM } from "../lib/adapters/balance";
import { PCT_MAX, PCT_REF_AT, groupBranches, howNote } from "../lib/adapters/balance";
import { exact, inkTokenOf, pctTxt, stripeOf } from "../lib/format";
import { Card } from "./Card";
import { Pill } from "./Pill";
import { TableToggle } from "./TableToggle";

/**
 * Режа → Факт → бажарилиш фоизи, босқич кесимида.
 *
 * Устун **фоиз ўқида** (0…{@link PCT_MAX}%) — бу ягона тўғри умумий шкала,
 * чунки босқичлар турли ўлчов бирлигида (тыс.т, т, кг, м³) ва уларнинг
 * абсолют қийматларини битта ўққа қўйиб бўлмайди. Абсолют сонлар ҳар
 * қаторда ўз бирлиги билан матнда қолади.
 *
 * Аномал фоизлар (масалан молибден проволокаси 1000%) **яширилмайди**:
 * устун чегарада кесилади ва ⚠ билан белгиланади, ҳақиқий сон эса ўнгда
 * тўлиқ кўринади.
 */

function PlanFactRow({ step }: { step: BalanceStepVM }) {
  const cell = step.cell;
  const pct = cell?.pct ?? null;
  const missing = !cell || cell.empty;
  const provenance = cell ? howNote(cell.how) : null;

  const val = (v: number | null): string => (v === null ? "—" : `${exact(v)} ${step.unit}`);
  const title =
    `${step.title}\n${step.site}\nРежа: ${val(cell?.plan ?? null)}\nФакт: ${val(cell?.fakt ?? null)}` +
    `\nБажарилиш: ${cell?.planless ? "режа қўйилмаган" : pctTxt(pct)}` +
    (cell?.row ? `\nМанба сатри: №${cell.row}` : "");

  return (
    <div className="border-t border-grid py-2 first:border-t-0" title={title}>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="min-w-0">
          <span className="text-ink-2">{step.title}</span>
          <span className="font-mono text-ink-3">
            {" · "}
            {step.site}
            {cell?.row ? ` · №${cell.row}` : ""}
          </span>
        </span>
        <span className="flex flex-none items-baseline gap-3">
          <span className="hidden font-mono text-[11px] tabular-nums text-ink-3 sm:inline">
            режа {cell?.plan === null || cell === null ? "—" : exact(cell.plan)} · факт{" "}
            {cell?.fakt === null || cell === null ? "—" : exact(cell.fakt)} {step.unit}
          </span>
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: inkTokenOf(cell?.planless ? null : pct) }}
          >
            {cell?.anomaly && <span aria-hidden="true">⚠ </span>}
            {pctTxt(pct)}
          </span>
        </span>
      </div>

      <div className="relative mt-[9px] mb-[5px] h-3 rounded-[3px] bg-sunken">
        {cell?.barPct != null && (
          <div
            className="absolute top-0 bottom-0 left-0 rounded-[4px]"
            style={{
              width: `${((cell.barPct / PCT_MAX) * 100).toFixed(2)}%`,
              background: stripeOf(pct),
            }}
          />
        )}
        {/* 100% белгиси — устун шкаласидаги режа даражаси. */}
        <span
          aria-hidden="true"
          className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
          style={{ left: `calc(${PCT_REF_AT.toFixed(2)}% - 1px)` }}
        />
        {cell?.anomaly && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-[3px] -translate-y-1/2 font-mono text-[10px] leading-none text-ink"
          >
            »
          </span>
        )}
      </div>

      {(missing || cell?.planless || step.marchOnly || provenance) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
          {step.marchOnly && <Pill>эталон ой варағидан</Pill>}
          {missing && !step.marchOnly && <Pill>маълумот йўқ</Pill>}
          {cell?.planless && <Pill>режа қўйилмаган — фоиз ҳисобланмайди</Pill>}
          {provenance && <span>{provenance}</span>}
        </div>
      )}
    </div>
  );
}

export function BalancePlanFactLegend() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className="inline-block h-[3px] w-[11px] flex-none rounded-sm bg-good" />
        Бажарилиш фоизи (устун)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i
          aria-hidden="true"
          className="inline-block h-[13px] w-[3px] flex-none rounded-[1px] bg-ink"
        />
        100% белгиси
      </span>
      <span className="text-ink-3">
        ўқ {PCT_MAX}% да тугайди: ундан катта фоиз устунда кесилади (⚠ ва »), ҳақиқий сон ўнгда
        тўлиқ ёзилади
      </span>
    </div>
  );
}

export function BalancePlanFactGroup({ group }: { group: BalanceGroupVM }) {
  return (
    <Card title={group.title}>
      {groupBranches(group).map((b) => (
        <div key={b.key} className="mt-2 first:mt-0">
          {b.sub && <p className="mb-1 text-[12px] [font-weight:600] text-ink-2">{b.sub}</p>}
          {b.steps.map((s) => (
            <PlanFactRow key={s.id} step={s} />
          ))}
          <TableToggle
            caption={`${b.title} — режа ва факт`}
            cols={[
              { t: "№", num: true },
              { t: "Босқич", wrap: true },
              { t: "Сайт" },
              { t: "Бирлик" },
              { t: "Режа", num: true },
              { t: "Факт", num: true },
              { t: "Бажарилиш", num: true },
              { t: "Сатр", num: true },
            ]}
            rows={b.steps.map((s) => ({
              key: s.id,
              cells: [
                s.no,
                s.title,
                s.site,
                s.unit,
                s.cell?.plan == null ? "—" : exact(s.cell.plan),
                s.cell?.fakt == null ? "—" : exact(s.cell.fakt),
                s.cell?.planless ? "режасиз" : pctTxt(s.cell?.pct ?? null),
                s.cell?.row ?? "—",
              ],
            }))}
          />
        </div>
      ))}
    </Card>
  );
}
