import type { KpiRowVM } from "../lib/adapters/kpi";
import { KPI_PCT_MAX, KPI_PCT_REF_AT, kpiWhyMute } from "../lib/adapters/kpi";
import { exact, inkTokenOf, pctTxt, stripeOf } from "../lib/format";
import { Pill } from "./Pill";
import { TableToggle } from "./TableToggle";
import type { Col, Row } from "./DataTable";

/**
 * Кўрсаткичлар рўйхати — битта қатор = битта кўрсаткич.
 *
 * Икки хил қатор бор ва улар **аралаштирилмайди**:
 *
 *  · режали қатор — устун бажарилиш фоизи ўқида (0…{@link KPI_PCT_MAX}%).
 *    Бу ягона тўғри умумий шкала, чунки қаторлар турли бирликда (т, кг, м³,
 *    шт, соат) ва абсолют сонларини битта ўққа қўйиб бўлмайди;
 *  · режасиз қатор (ҳисоблагич, журнал) — устун умуман чизилмайди, чунки
 *    таққослайдиган база йўқ. Факт ўз бирлиги билан матнда туради.
 *
 * Аномал фоиз (масалан №27 «Молибденовая проволока» — 1000%) **яширилмайди**:
 * устун шкала чегарасида кесилиб ⚠ ва » билан белгиланади, ҳақиқий сон эса
 * ўнгда тўлиқ ёзилади. Фоиз бэкенддан келгани каби кўрсатилади — бу ерда
 * «фоиз режа/фактга ўхшамаса — бузуқ» деган текширув йўқ.
 *
 * Манба сатри рақами, `anchor` ва бэкенддаги mapping изоҳи экранга
 * чиқарилмайди — улар view-model'га умуман ўтмайди (`adapters/kpi.ts`).
 */

function ValueText({ row }: { row: KpiRowVM }) {
  const c = row.cell;
  if (!c || c.empty) return <span className="text-ink-3">маълумот йўқ</span>;
  return (
    <>
      <span className="font-mono tabular-nums">{exact(c.fakt)}</span>{" "}
      <span className="text-ink-3">{row.unit}</span>
    </>
  );
}

function RowNotes({ row }: { row: KpiRowVM }) {
  const why = kpiWhyMute(row);
  if (!why) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
      <Pill>{why}</Pill>
    </div>
  );
}

/**
 * Кўрсаткич номи. Манбада чеклов қайд этилган бўлса ёнида ⚠ туради —
 * `BalanceChain` даги босқич карточкаси билан бир хил усул. Бэкенддаги изоҳ
 * **матни** кўрсатилмайди: у ишлаб чиқувчи учун ёзилган ва mapping
 * тафсилотларини сақлайди; фойдаланувчига чекловнинг борлиги етарли,
 * тўлиқ рўйхат эса «Батафсил» жадвалида.
 */
function RowName({ row }: { row: KpiRowVM }) {
  return (
    <span className="min-w-0">
      {row.hasLimit && (
        <span className="text-warn-ink" title="манбада чеклов қайд этилган">
          ⚠{" "}
        </span>
      )}
      <span className="text-ink-2">{row.name}</span>
      <span className="text-ink-3"> · {row.site}</span>
    </span>
  );
}

/** Режали кўрсаткич: режа → факт → бажарилиш фоизи. */
function KpiBarRow({ row }: { row: KpiRowVM }) {
  const c = row.cell;
  const pct = c?.pct ?? null;

  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <RowName row={row} />
        <span className="flex flex-none items-baseline gap-3">
          <span className="hidden font-mono text-[11px] tabular-nums text-ink-3 sm:inline">
            режа {c?.plan == null ? "—" : exact(c.plan)} · факт{" "}
            {c?.fakt == null ? "—" : exact(c.fakt)} {row.unit}
          </span>
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: inkTokenOf(pct) }}
          >
            {c?.anomaly && <span aria-hidden="true">⚠ </span>}
            {pctTxt(pct)}
          </span>
        </span>
      </div>

      <div className="relative mt-[9px] mb-[5px] h-3 rounded-[3px] bg-sunken">
        {c?.barPct != null && (
          <div
            className="absolute top-0 bottom-0 left-0 rounded-[4px]"
            style={{
              width: `${((c.barPct / KPI_PCT_MAX) * 100).toFixed(2)}%`,
              background: stripeOf(pct),
            }}
          />
        )}
        {/* 100% белгиси — шкаладаги режа даражаси. */}
        <span
          aria-hidden="true"
          className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
          style={{ left: `calc(${KPI_PCT_REF_AT.toFixed(2)}% - 1px)` }}
        />
        {c?.anomaly && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-[3px] -translate-y-1/2 font-mono text-[10px] leading-none text-ink"
          >
            »
          </span>
        )}
      </div>

      <RowNotes row={row} />
    </div>
  );
}

/** Режасиз кўрсаткич (ҳисоблагич/журнал): устунсиз, фақат факт. */
function KpiFactRow({ row }: { row: KpiRowVM }) {
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <RowName row={row} />
        <span className="flex-none font-mono text-[12.5px] [font-weight:600] tabular-nums">
          <ValueText row={row} />
        </span>
      </div>
      <RowNotes row={row} />
    </div>
  );
}

export function KpiList({ rows }: { rows: KpiRowVM[] }) {
  if (rows.length === 0) {
    return <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">Маълумот йўқ.</div>;
  }
  // Ажратиш мезони — режанинг ўзи бор-йўқлиги, манба тури эмас: режаси
  // қўйилмаган қаторда (масалан «Остатки на складском хозяйстве») ҳам устун
  // маънога эга эмас, гарчи у ҳисоблагичдан ўқилмаса ҳам.
  const hasPlan = (r: KpiRowVM): boolean => (r.cell?.plan ?? 0) > 0;
  const planned = rows.filter(hasPlan);
  const counters = rows.filter((r) => !hasPlan(r));

  return (
    <div>
      {planned.map((r) => (
        <KpiBarRow key={r.no} row={r} />
      ))}
      {counters.length > 0 && planned.length > 0 && (
        <p className="mt-2.5 mb-0.5 border-t border-grid pt-2.5 text-[11.5px] text-ink-3">
          Қуйидагиларда режа қўйилмаган ёки умуман юритилмайди (ҳисоблагич, журнал) — бажарилиш
          устуни чизилмайди:
        </p>
      )}
      {counters.map((r) => (
        <KpiFactRow key={r.no} row={r} />
      ))}
    </div>
  );
}

/**
 * Рўйхатнинг жадвал кўриниши. Ҳар бир диаграмма ўз жадвалига эга бўлиши
 * лойиҳа қоидаси; бу ерда у бир вақтда «ҳеч нарса яширилмайди» кафолати ҳам:
 * аномал фоиз қисқартирилмайди, маълумоти йўқ катак эса «—» билан чиқади.
 */
const KPI_TABLE_COLS: Col[] = [
  { t: "Кўрсаткич", wrap: true },
  { t: "Категория" },
  { t: "Сех/участка" },
  { t: "Бирлик" },
  { t: "Режа", num: true },
  { t: "Факт", num: true },
  { t: "Бажарилиш", num: true },
  { t: "Изоҳ", wrap: true },
];

/**
 * Жадвал катаклари. Компонентдан ажратилган, чунки «ҳеч нарса яширилмайди»
 * кафолати айнан шу ерда бажарилади ва уни алоҳида текшириш мумкин бўлиши
 * керак: маълумоти йўқ катак нол эмас, «—» билан чиқади; аномал фоиз эса
 * (масалан 1000%) қисқартирилмайди — ўз ҳолича ёзилади.
 */
export function kpiTableRows(rows: KpiRowVM[]): Row[] {
  return rows.map((r) => {
    const c = r.cell;
    const why = kpiWhyMute(r);
    return {
      key: String(r.no),
      cells: [
        r.name,
        r.category,
        r.site,
        r.unit,
        c?.plan == null ? "—" : exact(c.plan),
        c?.fakt == null ? "—" : exact(c.fakt),
        pctTxt(c?.pct ?? null),
        [why, r.hasLimit ? "⚠ манбада чеклов қайд этилган" : null].filter(Boolean).join(" · ") ||
          "—",
      ],
    };
  });
}

export function KpiTable({ rows, caption }: { rows: KpiRowVM[]; caption: string }) {
  return <TableToggle caption={caption} cols={KPI_TABLE_COLS} rows={kpiTableRows(rows)} />;
}
