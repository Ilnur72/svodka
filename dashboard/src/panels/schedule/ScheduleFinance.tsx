import { exact, pctTxt } from "../../lib/format";
import type { SchedProject } from "../../lib/adapters/schedule";
import { Card } from "../../components/Card";
import { DataTable } from "../../components/DataTable";
import { Pill } from "../../components/Pill";
import { NoData, ProgressBar } from "./parts";

/**
 * Лойиҳанинг молиялаштириш жадвали.
 *
 * ═══ `isTotal` йиғиндига кирмайди ═══════════════════════════════════════
 *
 * Манбадаги биринчи қатор («Лойиҳани молиялаштириш статуси» / «Лойиҳа
 * статуси») — тоифа эмас, лойиҳанинг умумий ҳолати. Уни қолган олти тоифа
 * билан бир жадвалда, бир хил кўринишда қўйсак, ЖАМИ иккиланиб кетарди.
 * Шунинг учун у **жадвалдан ташқарида**, алоҳида блокда туради, ЖАМИ эса
 * фақат тоифалардан ҳисобланган `financeTotal` / `financePaid` дан келади
 * (бэкенд уни `isTotal` қаторисиз ҳисоблайди).
 *
 * Текширилган: Molybdenum Gydro FRRU'да тоифалар йиғиндиси 68 160 000 $
 * (`stats.financeTotal` билан айнан бир хил), манбадаги умумий қатор эса
 * 67 814 700 $ — иккита турли сон, шунинг учун иккиси аралаштирилмайди.
 *
 * ═══ Фақат иккита лойиҳада бор ══════════════════════════════════════════
 *
 * Бешта лойиҳадан фақат иккитасида (Molybdenum ва Tungsten Gydro FRRU)
 * молия жадвали киритилган. Қолган учтасида бу карточка умуман чизилмайди —
 * нол билан тўлдирилган жадвал «молиялаштириш йўқ» деган ёлғон хулосани
 * берарди.
 */

export function ScheduleFinance({ p }: { p: SchedProject }) {
  if (p.finance.length === 0) return null;

  const cats = p.finance.filter((f) => !f.isTotal);
  const totals = p.finance.filter((f) => f.isTotal);

  return (
    <Card
      title="Молиялаштириш"
      stripe="var(--s3)"
      sub={`${cats.length} тоифа · $`}
      note="Тоифалар йиғиндиси манбадаги умумий қатордан алоҳида кўрсатилган — булар иккита турли сон."
    >
      <DataTable
        caption={`${p.title} — молиялаштириш тоифалари бўйича режа ва тўланган сумма`}
        cols={[
          { t: "Тоифа", wrap: true },
          { t: "Жами, $", num: true },
          { t: "Тўланган, $", num: true },
          { t: "Тўланди", num: true },
        ]}
        rows={[
          ...cats.map((f) => ({
            key: String(f.id),
            cells: [
              f.category,
              f.total === null ? <NoData>—</NoData> : exact(f.total),
              f.paid === null ? <NoData>—</NoData> : exact(f.paid),
              f.pct === null ? <NoData>—</NoData> : pctTxt(f.pct),
            ],
          })),
          {
            key: "sum",
            cells: [
              <b key="k" className="[font-weight:650]">
                ЖАМИ (тоифалар)
              </b>,
              <b key="t" className="[font-weight:650]">
                {p.financeTotal === null ? "—" : exact(p.financeTotal)}
              </b>,
              <b key="p" className="[font-weight:650]">
                {p.financePaid === null ? "—" : exact(p.financePaid)}
              </b>,
              <b key="c" className="[font-weight:650]">
                {pctTxt(p.financePct)}
              </b>,
            ],
          },
        ]}
      />

      <div className="mt-2.5">
        <ProgressBar pct={p.financePct} color="var(--s3)" />
      </div>

      {/* Манбадаги умумий қатор — жадвалдан ташқарида, ўз кўринишида. */}
      <div className="mt-2.5 rounded-[6px] border border-hair bg-surface-2 px-3 py-2.5">
        <div className="text-[10.5px] [font-weight:650] tracking-[0.06em] text-ink-3 uppercase">
          Манбадаги умумий қатор
        </div>
        {totals.map((f) => (
          <div
            key={f.id}
            className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1"
          >
            <span className="min-w-0 flex-1 text-[12px] text-ink-2">{f.category}</span>
            <span className="font-mono text-[12px] tabular-nums">
              {f.paid === null ? <NoData>—</NoData> : exact(f.paid)}
              <span className="mx-1 text-ink-3">/</span>
              {f.total === null ? <NoData>—</NoData> : exact(f.total)}
              <span className="ml-1 font-sans text-[11px] text-ink-3">$</span>
            </span>
            <Pill>{f.pct === null ? "фоиз ҳисобланмади" : `тўланди ${pctTxt(f.pct)}`}</Pill>
          </div>
        ))}
        <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-3">
          Бу қатор ЖАМИ га қўшилмайди.
        </p>
      </div>
    </Card>
  );
}
