import { useId, useState } from "react";
import type { DailyBlockVM, DailyMetricVM, DailyWindowVM } from "../lib/adapters/daily";
import { DAILY_STATUS_LABEL } from "../lib/adapters/daily";
import { exact, pctTxt, inkTokenOf } from "../lib/format";
import { Card } from "./Card";
import { Pill } from "./Pill";
import { DataTable, type Col, type Row } from "./DataTable";
import { DailyStatusBar, DailyStatusPill } from "./DailyStatus";

/**
 * Битта йўналиш (блок) карточкаси.
 *
 * Асосий экранда **бош қаторлар** дарҳол кўринади (манбадаги «… жами»
 * қаторлари, улар бўлмаса қисм бўлмаган қаторлар) — раҳбар блокни очмасдан
 * ҳам асосий рақамни кўради. Қолган қаторлар «Батафсил» ичида: 8 йўналишда
 * 89 кўрсаткич бор, ҳаммасини бирданига чиқариш экранни ўқилмас қиларди.
 *
 * Уч устун — «Кунлик», «Ой бошидан», «Йил бошидан» — манбадаги уч устуннинг
 * ўзи. Улар **аралаштирилмайди**: кунлик қиймат йўқ бўлса «—» туради ва ой
 * қийматидан ҳисоблаб чиқарилмайди.
 */

const DASH = "—";

/** Битта ойна: факт катта, режа ва фоиз кичик. `null` ҳеч қачон `0` эмас. */
function WindowCell({ w, unit }: { w: DailyWindowVM | null; unit: string | null }) {
  if (!w || (w.fakt === null && w.plan === null)) {
    return <span className="text-[12px] text-ink-3">{DASH}</span>;
  }
  return (
    <span className="flex flex-col">
      <span className="font-mono text-[13px] [font-weight:600] tabular-nums">
        {w.fakt === null ? DASH : exact(w.fakt)}
        {unit && w.fakt !== null && (
          <span className="ml-1 text-[10.5px] font-normal text-ink-3">{unit}</span>
        )}
      </span>
      <span className="font-mono text-[10.5px] tabular-nums text-ink-3">
        режа {w.plan === null ? DASH : exact(w.plan)}
        {w.pct !== null && (
          <>
            {" · "}
            <span style={{ color: inkTokenOf(w.pct) }}>{pctTxt(w.pct)}</span>
          </>
        )}
      </span>
    </span>
  );
}

function StockCell({ label, v, unit }: { label: string; v: number | null; unit: string | null }) {
  return (
    <span className="flex flex-col">
      <span className="font-mono text-[13px] [font-weight:600] tabular-nums">
        {v === null ? DASH : exact(v)}
        {unit && v !== null && (
          <span className="ml-1 text-[10.5px] font-normal text-ink-3">{unit}</span>
        )}
      </span>
      <span className="text-[10.5px] text-ink-3">{label}</span>
    </span>
  );
}

const WINDOW_LABEL: Record<string, string> = {
  day: "кунлик",
  month: "ой бошидан",
  year: "йил бошидан",
};

function MetricRow({ m }: { m: DailyMetricVM }) {
  const cols =
    m.kind === "flow"
      ? "mid:grid-cols-[minmax(0,1fr)_repeat(3,minmax(96px,auto))_minmax(150px,auto)]"
      : "mid:grid-cols-[minmax(0,1fr)_repeat(3,minmax(96px,auto))_minmax(150px,auto)]";

  return (
    <div
      className={
        "grid grid-cols-2 gap-x-3 gap-y-2 border-t border-grid py-2.5 first:border-t-0 mid:items-center " +
        cols
      }
    >
      <span className="col-span-2 min-w-0 mid:col-span-1">
        <span className="block text-[12.5px] leading-[1.35] text-ink-2">
          {m.isTotal && <span className="text-ink-3">жами · </span>}
          {m.isSubset && <span className="text-ink-3">шундан · </span>}
          {m.name}
        </span>
        {(m.section || m.parent || m.mixedUnit || m.sectionMissing) && (
          <span className="mt-px block text-[11px] text-ink-3">
            {[m.section, m.parent].filter(Boolean).join(" · ")}
            {m.mixedUnit && " · манбада бирлик ўзгарган"}
            {m.sectionMissing && " · манбада бўлим кўрсатилмаган"}
          </span>
        )}
      </span>

      {m.kind === "flow" ? (
        <>
          <WindowCell w={m.day} unit={m.unit} />
          <WindowCell w={m.month} unit={m.unit} />
          <WindowCell w={m.year} unit={m.unit} />
        </>
      ) : (
        <>
          <StockCell label="омборда" v={m.warehouse} unit={m.unit} />
          <StockCell label="цехда" v={m.workshop} unit={m.unit} />
          <StockCell label="қолдиқ" v={m.total} unit={m.unit} />
        </>
      )}

      <span className="col-span-2 flex flex-wrap items-center gap-1.5 mid:col-span-1">
        <DailyStatusPill status={m.status} />
        {m.statusWindow && (
          <span className="text-[10.5px] text-ink-3">{WINDOW_LABEL[m.statusWindow]}</span>
        )}
        {m.problemNote && <Pill status="crit">{m.problemNote}</Pill>}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* жадвал                                                                     */
/* -------------------------------------------------------------------------- */

const num = (v: number | null): string => (v === null ? DASH : exact(v));

function tableOf(block: DailyBlockVM): { cols: Col[]; rows: Row[] } {
  if (block.layout === "triple") {
    return {
      cols: [
        { t: "Кўрсаткич", wrap: true },
        { t: "Бўлим", wrap: true },
        { t: "Бирлик" },
        { t: "Кунлик режа", num: true },
        { t: "Кунлик факт", num: true },
        { t: "Кунлик %", num: true },
        { t: "Ой бошидан факт", num: true },
        { t: "Ой %", num: true },
        { t: "Йил бошидан факт", num: true },
        { t: "Йил %", num: true },
        { t: "Ҳолат", wrap: true },
      ],
      rows: block.metrics.map((m) => ({
        key: m.id,
        cells: [
          m.name,
          [m.section, m.parent].filter(Boolean).join(" · ") || DASH,
          m.unit ?? DASH,
          num(m.day?.plan ?? null),
          num(m.day?.fakt ?? null),
          pctTxt(m.day?.pct ?? null),
          num(m.month?.fakt ?? null),
          pctTxt(m.month?.pct ?? null),
          num(m.year?.fakt ?? null),
          pctTxt(m.year?.pct ?? null),
          DAILY_STATUS_LABEL[m.status],
        ],
      })),
    };
  }

  if (block.layout === "stock") {
    return {
      cols: [
        { t: "Кўрсаткич", wrap: true },
        { t: "Бирлик" },
        { t: "Омборда", num: true },
        { t: "Цехда", num: true },
        { t: "Ўзгариш", num: true },
        { t: "Ҳолат", wrap: true },
      ],
      rows: block.metrics.map((m) => ({
        key: m.id,
        cells: [
          m.name,
          m.unit ?? DASH,
          num(m.warehouse),
          num(m.workshop),
          m.delta === null ? DASH : (m.delta > 0 ? "+" : "") + exact(m.delta),
          DAILY_STATUS_LABEL[m.status],
        ],
      })),
    };
  }

  return {
    cols: [
      { t: "Кўрсаткич", wrap: true },
      { t: "Бирлик" },
      { t: "Қолдиқ миқдори", num: true },
      { t: "Ўзгариш", num: true },
      { t: "Муаммо", wrap: true },
      { t: "Ҳолат", wrap: true },
    ],
    rows: block.metrics.map((m) => ({
      key: m.id,
      cells: [
        m.name,
        m.unit ?? DASH,
        num(m.total),
        m.delta === null ? DASH : (m.delta > 0 ? "+" : "") + exact(m.delta),
        m.problemNote ?? DASH,
        DAILY_STATUS_LABEL[m.status],
      ],
    })),
  };
}

export function DailyBlockCard({ block }: { block: DailyBlockVM }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `db-${uid}`;
  const rest = block.metrics.length - block.headline.length;
  const table = tableOf(block);

  return (
    <Card
      title={
        <span className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-sunken px-1 font-mono text-[11px] text-ink-3"
          >
            {block.no}
          </span>
          <span className="min-w-0">{block.title}</span>
        </span>
      }
      sub={`${block.metrics.length} кўрсаткич`}
    >
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <DailyStatusPill status={block.verdict} />
        {block.worst && block.worst.status !== block.verdict && (
          <span className="text-[11.5px] text-ink-3">
            энг оғири: {block.worst.name} — {DAILY_STATUS_LABEL[block.worst.status].toLowerCase()}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <DailyStatusBar counts={block.counts} withLegend={false} />
      </div>

      <div className="mt-2.5">
        {block.headline.map((m) => (
          <MetricRow key={m.id} m={m} />
        ))}
      </div>

      {rest > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="mt-2.5 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
          >
            {open ? "Батафсилни яшириш" : `Батафсил — яна ${rest} та кўрсаткич`}
          </button>
          <div id={panelId} hidden={!open} className="mt-2.5">
            {open && (
              <DataTable cols={table.cols} rows={table.rows} caption={`${block.title} — тўлиқ рўйхат`} />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
