import { useMemo, type ReactNode } from "react";
import type { PanelProps } from "../types";
import type { QueryResult } from "../lib/useQuery";
import {
  getChain,
  getDashboard,
  getElectricityByType,
  getFinanceReport,
  getKpi,
  getMobplan,
  getSalesMonthly,
  getSalesProducts,
} from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { monthOf } from "../lib/period";
import { monthLabel, pctTxt, statusOf } from "../lib/format";
import {
  COMPANY_PLANT,
  NO_DATA,
  companyChain,
  companyEnergy,
  companyMonthRange,
  companyProduction,
  companyProjects,
  companyRevenue,
  companySales,
  companyStaff,
  companyTrendRange,
  type CompanyDelta,
  type CompanyFlow,
  type CompanyProject,
  type CompanyRow,
  type CompanySite,
  type CompanyTile,
  type CompanyWorkshop,
} from "../lib/adapters/company";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Sparkline } from "../components/Sparkline";
import { KeyValueList } from "../components/KeyValueList";
import { Loader, RetryButton } from "../components/states";

/**
 * «Корхона» — бутун корхонанинг бир экранли кўриниши.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Юқори қатор — корхона плиткалари: ходимлар · тайёр маҳсулот · тушум ·
 *     реализация · хомашё · электр · сув · CO₂. Ҳар бирида жорий ой қиймати,
 *     олдинги ойга нисбатан ўзгариш ва охирги етти ой спарклайни (бўлса).
 *  2. Учта устун — хомашё базаси → қайта ишлаш → бозор. Ҳар бирида: устун
 *     жами (кичик плиткалар), фаолиятдаги объектлар (карточкалар: ном, тури,
 *     2–3 та катта кўрсаткич блоки) ва қурилаётган объектлар (реестр
 *     карточкалари).
 *  3. Хомашё оқими — занжирнинг тўртта асосий йўли, қисқа.
 *
 * ═══ Манбалар алоҳида юкланади ══════════════════════════════════════════
 *
 * Саккиз манбанинг ҳар бири ўз `useQuery` билан: биттасининг 404 бўлиши ёки
 * хатоси бошқа плитка ва карточкаларни тўхтатмайди. Плитка ўз манбасининг
 * ҳолатини (юкланмоқда · серверда йўқ · хато) ўзи чизади; устун ичидаги
 * карточкалар эса `Loader` билан.
 *
 * ═══ Манбада йўқ кўрсаткич ══════════════════════════════════════════════
 *
 * Сув, CO₂, сотув бўлимлари/контрагентлар, объектлар бўйича ходимлар ва
 * бозор лойиҳалари ҳеч қайси манбада йўқ. Улар бўш жой эмас — блок ўз ўрнида
 * қолади, қиймат ўрнида «маълумот йўқ» туради; нол билан ҳам, тахмин билан
 * ҳам тўлдирилмайди. Объект сурати ҳам йўқ — у ўйлаб топилмайди, ўрнида
 * фақат чизиқли иконка.
 *
 * Учта устун учун учта категорик ранг (`--s1/--s2/--s3`) — фақат устун
 * сарлавҳаси ва карточка чизиғида; ҳолат ранглари (`good/warn/crit`) эса
 * фақат ўзгариш ва режа чипларида.
 */

/* -------------------------------------------------------------------------- */
/* манба ҳолати                                                               */
/* -------------------------------------------------------------------------- */

interface SrcState {
  loading: boolean;
  notAvailable: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Бир нечта сўровнинг умумий ҳолати — плитка учун. */
function srcState(...qs: QueryResult<unknown>[]): SrcState {
  return {
    loading: qs.some((q) => q.loading),
    notAvailable: qs.some((q) => q.notAvailable),
    error: qs.find((q) => q.error !== null && q.data === null)?.error ?? null,
    refetch: () => qs.forEach((q) => q.error && q.refetch()),
  };
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-[15px] leading-[1.6] font-medium tracking-normal text-ink-3">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* иконкалар — 18px чизиқли SVG, ранг матндан (`currentColor`)                */
/* -------------------------------------------------------------------------- */

type IconId = "person" | "mine" | "factory" | "bolt" | "box" | "flask" | "money" | "clock";

const ICON_PATH: Record<IconId, ReactNode> = {
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  mine: <path d="M3 19 9 8l3 5 2-3 7 9H3Z" />,
  factory: <path d="M3 20V9l5 3V9l5 3V9l5 3v8H3Zm4-4v2m5-2v2m5-2v2" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  box: <path d="M3 8l9-4 9 4v9l-9 4-9-4V8Zm9 4 9-4M12 12v9m0-9L3 8" />,
  flask: <path d="M9 3h6M10 3v6L4 20h16l-6-11V3" />,
  money: <path d="M3 7h18v10H3V7Zm9 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Icon({ id }: { id: IconId }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none text-ink-3"
    >
      {ICON_PATH[id]}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* плитка                                                                     */
/* -------------------------------------------------------------------------- */

function TileFoot({ tile }: { tile: CompanyTile }) {
  return (
    <>
      {tile.period && <Pill>{tile.period}</Pill>}
      {tile.delta && <Pill status={tile.delta.status}>{tile.delta.text}</Pill>}
      {tile.delta && tile.prevPeriod && (
        <span className="text-ink-3">{tile.prevPeriod} га нисбатан</span>
      )}
      {tile.warn && <Pill status="warn">⚠ {tile.warn}</Pill>}
      {tile.spark && (
        <span className="ml-auto">
          <Sparkline values={tile.spark} color={tile.token} label={tile.sparkText ?? tile.label} />
        </span>
      )}
      {tile.notes.length > 0 && (
        <p className="basis-full text-[11px] leading-[1.45] text-ink-3">{tile.notes.join(" · ")}</p>
      )}
    </>
  );
}

/**
 * Корхона плиткаси: манба ҳолатини ўзи чизади. `tile` келгунча ёрлиқ ва
 * бирлик пропдан олинади — плитка ўрни сакрамайди.
 */
function KpiTile({
  label,
  unit,
  stripe,
  state,
  tile,
}: {
  label: string;
  unit: string;
  stripe?: string;
  state: SrcState;
  tile: CompanyTile | null;
}) {
  let value: ReactNode;
  let foot: ReactNode;
  let showUnit = false;

  if (tile) {
    showUnit = tile.value !== null;
    value = tile.value ?? <Muted>{NO_DATA}</Muted>;
    foot = <TileFoot tile={tile} />;
  } else if (state.notAvailable) {
    value = <Muted>серверда йўқ</Muted>;
    foot = <Pill>бўлим серверда мавжуд эмас</Pill>;
  } else if (state.error) {
    value = <Muted>юкланмади</Muted>;
    foot = (
      <>
        <Pill status="crit">хато</Pill>
        <span className="text-ink-3">{state.error.message}</span>
        <RetryButton onClick={state.refetch} />
      </>
    );
  } else {
    value = <Muted>юкланмоқда…</Muted>;
  }

  return (
    <StatTile
      label={tile?.label ?? label}
      value={value}
      unit={showUnit ? (tile?.unit ?? unit) : undefined}
      stripe={tile ? tile.token : stripe}
      foot={foot}
    />
  );
}

/** Манбаси умуман йўқ кўрсаткич — аниқ матн, бўш жой эмас. */
function NoSourceTile({ label, unit, note }: { label: string; unit: string; note: string }) {
  return (
    <StatTile
      label={`${label}, ${unit}`}
      value={<Muted>{NO_DATA}</Muted>}
      foot={<p className="basis-full text-[11px] leading-[1.45] text-ink-3">{note}</p>}
    />
  );
}

/** Устун жамидаги кичик плитка — `CompanyRow` дан. */
function RowTile({ r, stripe, label }: { r: CompanyRow; stripe: string; label?: string }) {
  return (
    <StatTile
      label={label ?? r.label}
      value={r.value ?? <Muted>{r.missing ? "босқич манбада йўқ" : NO_DATA}</Muted>}
      unit={r.value === null ? undefined : r.unit}
      stripe={stripe}
      foot={
        r.delta || r.planPct !== null ? (
          <>
            {r.delta && <Pill status={r.delta.status}>{r.delta.text}</Pill>}
            {r.planPct !== null && <Pill status={statusOf(r.planPct)}>режа {pctTxt(r.planPct)}</Pill>}
          </>
        ) : undefined
      }
    />
  );
}

/** Устун жамидаги «маълумот йўқ» плиткаси. */
function NoDataTile({ label, note }: { label: string; note?: string }) {
  return (
    <StatTile
      label={label}
      value={<Muted>{NO_DATA}</Muted>}
      foot={note ? <p className="basis-full text-[11px] leading-[1.45] text-ink-3">{note}</p> : undefined}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* объект карточкаси                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Катта кўрсаткич блоки: иконка · катта сон + бирлик · изоҳ · чиплар.
 * Қиймат йўқ бўлса блок ўз ўрнида қолади, сон ўрнида «маълумот йўқ».
 */
function Metric({
  icon,
  label,
  value,
  unit,
  delta,
  planPct,
  warn,
  size = "lg",
}: {
  icon: IconId;
  label: string;
  value: string | null;
  unit?: string;
  delta?: CompanyDelta | null;
  planPct?: number | null;
  warn?: string | null;
  size?: "lg" | "md";
}) {
  const big = size === "lg" ? "text-[24px]" : "text-[19px]";
  return (
    <div className="flex min-w-0 items-start gap-2.5 py-1">
      <span className="mt-1">
        <Icon id={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`${big} leading-[1.1] font-mono tabular-nums [font-weight:640] tracking-[-0.02em]`}>
          {value === null ? (
            <span className="font-sans text-[13px] font-medium tracking-normal text-ink-3">{NO_DATA}</span>
          ) : (
            <>
              {value}
              {unit && <span className="ml-[5px] font-sans text-[12px] font-medium tracking-normal text-ink-3">{unit}</span>}
            </>
          )}
        </div>
        <div className="mt-0.5 text-[11px] leading-[1.35] text-ink-3">{label}</div>
        {(delta || (planPct !== null && planPct !== undefined) || warn) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {delta && (
              <Pill status={delta.status}>
                {delta.status === "good" ? "▲ " : delta.status === "crit" || delta.status === "warn" ? "▼ " : ""}
                {delta.text}
              </Pill>
            )}
            {planPct !== null && planPct !== undefined && (
              <Pill status={statusOf(planPct)}>режа {pctTxt(planPct)}</Pill>
            )}
            {warn && <Pill status="warn">⚠ {warn}</Pill>}
          </div>
        )}
      </div>
    </div>
  );
}

const rowMetric = (r: CompanyRow, icon: IconId, size: "lg" | "md" = "lg") => (
  <Metric
    key={r.key}
    icon={icon}
    label={r.label}
    value={r.missing ? null : r.value}
    unit={r.unit}
    delta={r.delta}
    planPct={r.planPct}
    size={size}
  />
);

/** Карточка остидаги ихчам рўйхат учун қиймат. */
function RowValue({ r }: { r: CompanyRow }) {
  if (r.missing) return <span className="font-sans text-ink-3">босқич манбада йўқ</span>;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {r.value === null ? (
        <span className="font-sans text-ink-3">{NO_DATA}</span>
      ) : (
        <>
          {r.value}
          {r.unit && <span className="font-sans text-ink-3">{r.unit}</span>}
        </>
      )}
      {r.delta && <Pill status={r.delta.status}>{r.delta.text}</Pill>}
      {r.planPct !== null && <Pill status={statusOf(r.planPct)}>режа {pctTxt(r.planPct)}</Pill>}
    </span>
  );
}

const rowsOf = (rows: CompanyRow[]) => rows.map((r) => ({ k: r.label, v: <RowValue r={r} /> }));

const SITE_ICON: Record<string, IconId[]> = {
  ingichka: ["mine", "box", "factory"],
  navoiy: ["flask", "box", "box"],
  gtc1: ["flask"],
};

/** Фаолиятдаги объект карточкаси: ном · тури · катта кўрсаткичлар · ходимлар · тафсилот. */
function SiteCard({ site, token, extra }: { site: CompanySite; token: string; extra?: CompanyRow[] }) {
  const icons = SITE_ICON[site.key] ?? [];
  return (
    <Card
      title={site.name}
      stripe={token}
      sub={site.idle ? <Pill status="warn">тўхтаган</Pill> : undefined}
      note={site.kind}
    >
      <div className="flex flex-col divide-y divide-grid">
        {site.primary.map((r, i) => rowMetric(r, icons[i] ?? "box"))}
        <Metric icon="person" label="Ходимлар" value={null} />
      </div>
      {site.idle && (
        <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-3">
          Манбада бу босқич «простой» деб белгиланган — қиймат йўқлиги шу билан изоҳланади.
        </p>
      )}
      {(site.detail.length > 0 || (extra && extra.length > 0)) && (
        <KeyValueList rows={rowsOf([...site.detail, ...(extra ?? [])])} />
      )}
    </Card>
  );
}

/** Цех карточкаси: ном · маҳсулот · чиқариш катта сон + ўзгариш + режа. */
function WorkshopCard({ w, token }: { w: CompanyWorkshop; token: string }) {
  return (
    <Card title={w.name} stripe={token} note={w.product}>
      <Metric
        icon="factory"
        label="Чиқариш (ойига)"
        value={w.row.missing ? null : w.row.value}
        unit={w.row.unit}
        delta={w.row.delta}
        planPct={w.row.planPct}
        size="md"
      />
    </Card>
  );
}

/** Қурилаётган объект карточкаси — оч фонли (`surface-2`), реестрдан. */
function PlannedCard({ p }: { p: CompanyProject }) {
  const w = Math.max(0, Math.min(100, p.progressPct));
  return (
    <article className="flex min-w-0 flex-col rounded-card border border-hair bg-surface-2 px-3.5 pt-3 pb-3">
      <h4 className="line-clamp-3 text-[12.5px] leading-[1.35] [font-weight:650]">{p.name}</h4>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Pill>
          {p.phase} {p.years}
        </Pill>
        {p.commissioning && <Pill>ишга тушириш: {p.commissioning}</Pill>}
      </div>
      <div className="mt-1 flex flex-col divide-y divide-grid">
        <Metric icon="person" label="Режалаштирилган ходимлар" value={p.jobs} unit="та" size="md" />
        <Metric icon="factory" label="Режа қуввати" value={p.capacity} size="md" />
        <Metric icon="money" label={`Қиймати · ўзлаштирилди ${p.disbursed} млн $`} value={p.cost} unit="млн $" size="md" />
      </div>
      <div className="mt-2 flex items-center gap-2" title="Реестрдаги жисмоний бажарилиш">
        <span className="w-[64px] flex-none text-[11px] text-ink-3">Бажарилиш</span>
        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className="absolute inset-y-0 left-0 rounded-[3px]"
            style={{ width: `${w.toFixed(2)}%`, background: "var(--s1)" }}
          />
        </span>
        <span className="w-[48px] flex-none text-right font-mono text-[12px] tabular-nums">
          {pctTxt(p.progressPct)}
        </span>
      </div>
    </article>
  );
}

/** Қурилаётган объектлар блоки: сарлавҳа · сони чипи · карточкалар тўри. */
function PlannedBlock({ items, token, empty }: { items: CompanyProject[]; token: string; empty?: string }) {
  return (
    <Card
      title="Қурилаётган / лойиҳа босқичидаги обектлар"
      sub={<Pill>{items.length} та</Pill>}
      stripe={token}
      note={
        items.length
          ? "Инвестиция реестри (статик, йил кўрсатилмаган). Бажарилиш — реестрдаги жисмоний бажарилиш."
          : undefined
      }
    >
      {items.length ? (
        <div className={GRID.g2}>
          {items.map((p) => (
            <PlannedCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] leading-[1.5] text-ink-2">{empty}</p>
      )}
    </Card>
  );
}

/** Устун сарлавҳаси — категорик ранг фақат шу нуқтада ва карточка чизиғида. */
function PillarHead({ title, sub, token }: { title: string; sub: string; token: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <span aria-hidden="true" className="h-[9px] w-[9px] flex-none rounded-full" style={{ background: token }} />
      <h3 className="text-[13.5px] [font-weight:650] tracking-[0.02em] uppercase">{title}</h3>
      <span className="text-[11.5px] text-ink-3">{sub}</span>
    </div>
  );
}

/** Устун ичидаги кичик бўлим сарлавҳаси. */
function SubHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mt-1 flex items-baseline justify-between gap-2">
      <h4 className="text-[11px] [font-weight:650] tracking-[0.08em] text-ink-3 uppercase">{title}</h4>
      {right}
    </div>
  );
}

function FlowCard({ flow }: { flow: CompanyFlow }) {
  return (
    <Card title={flow.title}>
      <ol className="mt-1 flex flex-wrap items-stretch gap-1.5">
        {flow.nodes.map((n, i) => (
          <li key={n.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-[14px] text-ink-3">
                →
              </span>
            )}
            <span className="flex min-w-0 flex-col rounded-[5px] border border-hair bg-surface-2 px-2.5 py-1.5">
              <span className="text-[11px] leading-[1.3] text-ink-3">{n.site}</span>
              <span className="max-w-[200px] text-[11.5px] leading-[1.3] text-ink-2">{n.output}</span>
              <span className="font-mono text-[12.5px] tabular-nums [font-weight:600]">
                {n.value === null ? <span className="font-sans font-normal text-ink-3">{NO_DATA}</span> : n.value}
                {n.value !== null && n.unit && <span className="ml-1 font-sans font-normal text-ink-3">{n.unit}</span>}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function CompanyPanel({ period, months }: PanelProps) {
  // Жорий ой — даврнинг охирги ойи; давр бўш бўлса `period.to` дан.
  const cur = months[months.length - 1] ?? monthOf(period.to);
  const one = useMemo(() => companyMonthRange(cur), [cur]);
  const trend = useMemo(() => companyTrendRange(cur), [cur]);

  // Завод фильтри — `adapters/company.ts` даги константа: жами `total`
  // Ингичка рудасини ҳам қўшиб юборади, шунинг учун фақат Чирчик сўралади.
  const dashQ = useQuery(`company-dash_${cur}`, (s) => getDashboard(one, { plant: COMPANY_PLANT }, s));
  const dashTrendQ = useQuery(`company-dash-trend_${cur}`, (s) =>
    getDashboard(trend, { plant: COMPANY_PLANT }, s),
  );
  const chainQ = useQuery(`company-chain_${cur}`, (s) => getChain(trend, s));
  const kpiQ = useQuery(`company-kpi_${cur}`, (s) => getKpi(trend, s));
  const salesQ = useQuery(`company-sales_${cur}`, (s) => getSalesMonthly(trend, s));
  const salesProdQ = useQuery(`company-sales-products_${cur}`, (s) => getSalesProducts(one, s));
  const elecQ = useQuery(`company-elec_${cur}`, (s) =>
    getElectricityByType(trend, { period: "monthly" }, s),
  );
  // Йилсиз манбалар — давр танлагичига боғланмаган, калит доимий.
  const finQ = useQuery("company-finance", (s) => getFinanceReport(s));
  const mobQ = useQuery("company-mobplan", (s) => getMobplan(s));

  const production = useMemo(
    () => (dashQ.data ? companyProduction(dashQ.data, dashTrendQ.data, cur) : null),
    [dashQ.data, dashTrendQ.data, cur],
  );
  const chain = useMemo(() => (chainQ.data ? companyChain(chainQ.data, cur) : null), [chainQ.data, cur]);
  const staff = useMemo(
    () => (kpiQ.data || mobQ.data ? companyStaff(kpiQ.data, mobQ.data, cur) : null),
    [kpiQ.data, mobQ.data, cur],
  );
  const sales = useMemo(
    () => (salesQ.data ? companySales(salesQ.data, salesProdQ.data, cur) : null),
    [salesQ.data, salesProdQ.data, cur],
  );
  const energy = useMemo(() => (elecQ.data ? companyEnergy(elecQ.data, cur) : null), [elecQ.data, cur]);
  const revenue = useMemo(() => (finQ.data ? companyRevenue(finQ.data) : null), [finQ.data]);
  const projects = useMemo(() => companyProjects(), []);

  const staffState = srcState(kpiQ, mobQ);
  // Ходимлар плиткаси иккита манбадан: биттаси келса ҳам чизилади.
  const staffTile = staff && (kpiQ.data || mobQ.data) ? staff.tile : null;

  const S1 = "var(--s1)";
  const S2 = "var(--s2)";
  const S3 = "var(--s3)";

  /** 1 цех ходимлари — фақат шу цех бўйича маълум; бошқа объектларда йўқ. */
  const workshop1Staff = staff?.workshop1 ? (
    <Metric
      icon="person"
      label={`Ходимлар — фақат 1 цех (${staff.workshop1.month})`}
      value={staff.workshop1.value}
      unit="киши"
      warn="қисман"
    />
  ) : (
    <Metric icon="person" label={kpiQ.loading ? "Ходимлар — юкланмоқда…" : "Ходимлар"} value={null} />
  );

  return (
    <>
      <p className="mb-4 max-w-[118ch] text-[12px] leading-[1.55] text-ink-3">
        Жорий ой — давр танлагичидаги охирги ой:{" "}
        <b className="font-semibold text-ink-2">{monthLabel(cur)}</b>; ўзгариш ундан бир ой олдингисига
        нисбатан. Барча сонлар манбадан, ҳисобланган фақат ўзгариш фоизи ва реестр йиғиндиси.
        Манбада йўқ кўрсаткич «{NO_DATA}» деб туради — нол билан ҳам, тахмин билан ҳам тўлдирилмаган.
        Тушум (йилсиз молиявий ҳисобот) ва қурилаётган лойиҳалар (реестр) давр танлагичига боғланмаган.
      </p>

      {/* --- 1. корхона плиткалари ------------------------------------------ */}
      <div className={GRID.g4}>
        <KpiTile label="Жами ходимлар" unit="киши" state={staffState} tile={staffTile} />
        <KpiTile
          label="Ишлаб чиқариш (тайёр маҳсулот)"
          unit="т"
          state={srcState(dashQ)}
          tile={production?.tile ?? null}
        />
        <KpiTile label="Тушум" unit="млрд сўм" state={srcState(finQ)} tile={revenue} />
        <KpiTile
          label="Реализация (тайёр маҳсулот)"
          unit="т"
          state={srcState(salesQ)}
          tile={sales?.realization ?? null}
        />
        <KpiTile
          label="Хомашё (W-отвал қайта ишлаш)"
          unit="минг т"
          state={srcState(chainQ)}
          tile={chain?.raw ?? null}
        />
        <KpiTile label="Электр энергия" unit="кВт·с" state={srcState(elecQ)} tile={energy?.tile ?? null} />
        <NoSourceTile
          label="Сув истеъмоли"
          unit="м³"
          note="Манба йўқ: сув ҳисоблагичлари ишлаб чиқариш ҳисоботига уланмаган."
        />
        <NoSourceTile
          label="CO₂ чиқиндиси"
          unit="т"
          note="Манба йўқ: эмиссия ҳисоби ҳеч қайси тизимда юритилмайди."
        />
      </div>

      {/* --- 2. учта устун -------------------------------------------------- */}
      <Section
        className="mt-5"
        title="Хомашё базаси → Қайта ишлаш → Бозор"
        note="ҳар бир устунда: жами · фаолиятдаги объектлар · қурилаётган объектлар"
      >
        <div className={GRID.g3}>
          {/* ── Хомашё базаси ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PillarHead title="Хомашё базаси" sub="Ингичка · ГТЦ «Навоий» · ГТЦ-1" token={S1} />
            <Loader
              q={chainQ}
              height={160}
              notAvailableWhat="/chain"
              isEmpty={() => !chain || !chain.hasValues}
              emptyTitle="Занжир маълумоти йўқ"
              emptyText={`${monthLabel(cur)} атрофидаги ойлар учун занжир ёзуви топилмади.`}
            >
              {() =>
                chain && (
                  <>
                    <SubHead title="Устун жами" right={<Pill>{chain.monthLabel}</Pill>} />
                    <div className={GRID.g2}>
                      <RowTile r={chain.sites[0].primary[0]} stripe={S1} label="Хомашё (руда)" />
                      <RowTile r={chain.concentrate} stripe={S1} label="Гравиконцентрат" />
                      <NoDataTile label="Ходимлар" note="кон/участка бўйича сон манбада йўқ" />
                    </div>
                    <SubHead title="Фаолиятдаги объектлар" right={<Pill>{chain.sites.length} та</Pill>} />
                    <div className={GRID.g2}>
                      <SiteCard site={chain.sites[0]} token={S1} extra={[chain.ogarok]} />
                      <SiteCard site={chain.sites[1]} token={S1} />
                      <SiteCard site={chain.sites[2]} token={S1} />
                    </div>
                  </>
                )
              }
            </Loader>
            <PlannedBlock items={projects.mine} token={S1} />
          </div>

          {/* ── Қайта ишлаш ───────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PillarHead title="Қайта ишлаш" sub="Чирчик завод · цехлар" token={S2} />
            <Loader
              q={dashQ}
              height={200}
              notAvailableWhat="/dashboard"
              isEmpty={() => !production || production.month === null}
              emptyTitle="Ишлаб чиқариш маълумоти йўқ"
              emptyText={`${monthLabel(cur)} учун «${COMPANY_PLANT}» бўйича ёзув топилмади.`}
            >
              {() =>
                production && (
                  <>
                    <SubHead title="Устун жами" right={production.month ? <Pill>{production.month}</Pill> : undefined} />
                    <div className={GRID.g2}>
                      <RowTile r={production.total} stripe={S2} />
                      {staff?.workshop1 ? (
                        <StatTile
                          label="Ходимлар"
                          value={staff.workshop1.value}
                          unit="киши"
                          stripe={S2}
                          foot={<Pill status="warn">қисман — фақат 1 цех, {staff.workshop1.month}</Pill>}
                        />
                      ) : (
                        <NoDataTile label="Ходимлар" note={kpiQ.loading ? "юкланмоқда…" : undefined} />
                      )}
                    </div>
                    <SubHead title="Фаолиятдаги объектлар" right={<Pill>1 завод</Pill>} />
                    <Card
                      title={COMPANY_PLANT}
                      stripe={S2}
                      sub={production.month ?? undefined}
                      note="Гидро/пирометаллургия, қаттиқ қотишма, асбоб, ўтга чидамли маҳсулот."
                    >
                      <div className="flex flex-col divide-y divide-grid">
                        <Metric
                          icon="factory"
                          label="Тайёр маҳсулот (ойига)"
                          value={production.total.value}
                          unit={production.total.unit}
                          delta={production.total.delta}
                          planPct={production.total.planPct}
                        />
                        {energy ? (
                          rowMetric(energy.plant, "bolt")
                        ) : (
                          <Metric
                            icon="bolt"
                            label={
                              elecQ.loading
                                ? "Электр энергия — юкланмоқда…"
                                : elecQ.notAvailable
                                  ? "Электр энергия — серверда йўқ"
                                  : "Электр энергия"
                            }
                            value={null}
                          />
                        )}
                        {workshop1Staff}
                      </div>
                      <p className="mt-2 text-[11px] leading-[1.4] text-ink-3">
                        Металл кесими (тоннада) — ўша ойдаги тайёр маҳсулот; ўзгариш — бэкенд ҳисоблаган
                        олдинги ойга нисбатан фарқ.
                      </p>
                      <KeyValueList
                        rows={[
                          ...production.metals.map((m) => ({
                            k: m.name,
                            v: (
                              <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                {m.value} <span className="font-sans text-ink-3">т</span>
                                {m.delta && <Pill status={m.delta.status}>{m.delta.text}</Pill>}
                                {m.planPct !== null && (
                                  <Pill status={statusOf(m.planPct)}>режа {pctTxt(m.planPct)}</Pill>
                                )}
                              </span>
                            ),
                          })),
                          ...(chain ? rowsOf(chain.reagents) : []),
                        ]}
                      />
                    </Card>
                  </>
                )
              }
            </Loader>
            <Loader
              q={chainQ}
              height={200}
              notAvailableWhat="/chain"
              isEmpty={() => !chain || chain.workshops.length === 0}
              emptyTitle="Цехлар бўйича маълумот йўқ"
            >
              {() =>
                chain && (
                  <>
                    <SubHead
                      title="Цехлар"
                      right={
                        <Pill>
                          {chain.workshops.length} та · {chain.monthLabel}
                        </Pill>
                      }
                    />
                    <div className={GRID.g2}>
                      {chain.workshops.map((w) => (
                        <WorkshopCard key={w.key} w={w} token={S2} />
                      ))}
                    </div>
                    <p className="text-[11px] leading-[1.4] text-ink-3">
                      Ҳар бир цехнинг занжирдаги асосий чиқиши — ўз бирлигида, цехлар орасида қўшилмайди.
                    </p>
                  </>
                )
              }
            </Loader>
            <PlannedBlock items={projects.metal} token={S2} />
            <p className="text-[11px] leading-[1.4] text-ink-3">
              Реестр жами ({projects.totals.count} лойиҳа): иш ўрни {projects.totals.jobs} · қиймат{" "}
              {projects.totals.cost} млн $ · ўзлаштирилди {projects.totals.disbursed} млн $.
            </p>
          </div>

          {/* ── Бозор ва сотув ────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PillarHead title="Бозор ва сотув" sub="СГП — реализация ва қолдиқлар" token={S3} />
            <Loader
              q={salesQ}
              height={160}
              notAvailableWhat="/sales/monthly"
              isEmpty={() => sales === null}
              emptyTitle="СГП маълумоти йўқ"
              emptyText={`${monthLabel(cur)} атрофидаги ойлар учун реализация ва қолдиқ ёзуви топилмади.`}
            >
              {() =>
                sales && (
                  <>
                    <SubHead title="Устун жами" right={<Pill>{sales.monthLabel}</Pill>} />
                    <div className={GRID.g2}>
                      <KpiTile label={sales.realization.label} unit="т" state={srcState(salesQ)} tile={{ ...sales.realization, spark: null, period: null, notes: [] }} />
                      <KpiTile label={sales.stock.label} unit="т" state={srcState(salesQ)} tile={{ ...sales.stock, period: null, notes: [] }} />
                      <KpiTile
                        label={sales.rawStock.label}
                        unit="т"
                        state={srcState(salesQ)}
                        tile={{
                          ...sales.rawStock,
                          period: null,
                          notes: sales.rawOtherUnits.length
                            ? [
                                "шундан бошқа бирликда: " +
                                  sales.rawOtherUnits.map((u) => `${u.value} ${u.unit}`).join(" · "),
                              ]
                            : [],
                        }}
                      />
                      <NoDataTile label="Сотув суммаси" note="СГП фақат натурада — сумма/валюта кесими йўқ" />
                      <NoDataTile label="Ходимлар" note="сотув бўлими бўйича сон манбада йўқ" />
                    </div>
                    <p className="text-[11px] leading-[1.4] text-ink-3">
                      Реализация — ой ичидаги оқим, қолдиқ — ой охиридаги ҳолат; иккиси қўшилмайди. Фақат
                      тонна оиласи.
                      {(sales.stock.warn || sales.realization.warn) &&
                        " ⚠ Бирлиги шубҳали маҳсулотлар йиғиндига базадаги ҳолича кирган — тафсилоти «Сотиш ва қолдиқлар (СГП)» бўлимида."}
                    </p>
                  </>
                )
              }
            </Loader>
            <SubHead title="Фаолиятдаги объектлар" right={<Pill>{NO_DATA}</Pill>} />
            <Card title="Сотув бўлимлари ва контрагентлар" stripe={S3} note="Бўлим, контрагент, экспорт/ички бозор кесими">
              <div className="flex flex-col divide-y divide-grid">
                <Metric icon="box" label="Сотув бўлимлари" value={null} />
                <Metric icon="money" label="Контрагентлар ва сотув суммаси" value={null} />
                <Metric icon="person" label="Ходимлар" value={null} />
              </div>
              <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
                СГП фақат маҳсулот номи ва натурадаги ҳажмни беради — бўлим/контрагент кесими манбада
                сақланмайди.
              </p>
            </Card>
            <PlannedBlock
              items={[]}
              token={S3}
              empty={`Реестрда йўқ: инвестиция реестридаги ${projects.totals.count} лойиҳанинг ҳаммаси хомашё ёки қайта ишлашга тегишли.`}
            />
          </div>
        </div>
      </Section>

      {/* --- 3. хомашё оқими ---------------------------------------------- */}
      <Section
        title="Хомашё оқими"
        note={chain ? `${chain.monthLabel} · занжирнинг асосий йўллари · ҳар тугун ўз бирлигида` : "занжирнинг асосий йўллари"}
      >
        <Loader
          q={chainQ}
          height={120}
          notAvailableWhat="/chain"
          isEmpty={() => !chain || chain.flows.length === 0}
          emptyTitle="Оқим маълумоти йўқ"
        >
          {() =>
            chain && (
              <div className={GRID.g2}>
                {chain.flows.map((f) => (
                  <FlowCard key={f.key} flow={f} />
                ))}
              </div>
            )
          }
        </Loader>
      </Section>
    </>
  );
}
