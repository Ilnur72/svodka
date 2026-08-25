import { useId, useMemo, useState } from "react";
import type { KpiResponse } from "../api/types";
import type { Status } from "../types";
import type { KpiCategoryVM, KpiHistoryPoint, KpiRowVM, KpiVM } from "../lib/adapters/kpi";
import type { QueryResult } from "../lib/useQuery";
import {
  KPI_ALL,
  KPI_CATEGORY_FIRST,
  KPI_EMPTY_FILTER,
  KPI_PCT_MAX,
  KPI_STATUS_INK,
  KPI_STATUS_LABEL,
  KPI_STATUS_ORDER,
  KPI_STATUS_TOKEN,
  kpiFilterActive,
  kpiStatusOf,
  kpiMonth,
  kpiView,
  kpiWhyMute,
  type KpiFilter,
} from "../lib/adapters/kpi";
import { exact, monthLabel, nf, pctTxt } from "../lib/format";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Columns } from "../components/Columns";
import { ChartLegend } from "../components/ChartLegend";
import { Pill } from "../components/Pill";
import { TableToggle } from "../components/TableToggle";
import { StatusDonut } from "../components/StatusDonut";
import { Sparkline } from "../components/Sparkline";
import { Loader } from "../components/states";

/**
 * «Кўрсаткичлар паспорти» — раҳбар экрани.
 *
 * Мақсад: 5–10 сонияда олти саволга жавоб — умумий ҳолат, нечта муаммо,
 * нечта диққат, нечта норма, энг муҳим 5 муаммо, қайси категория ёмон.
 * Шунинг учун экран **аналитик кесимлар билан юкланмайди**: ҳар бир блок
 * битта саволга хизмат қилади, тафсилот эса «яна N та» ва жадвал орқали.
 *
 * Тартиб: фильтрлар → 5 та KPI карточка → ҳолат динамикаси (ойлар кесимида)
 * → категориялар прогресси → статуслар донати → ТОП-10 жадвал.
 *
 * ─── Ҳолат чегараси ───────────────────────────────────────────────────────
 * 0–79 муаммо · 80–94 диққат · 95+ норма. Чегара `adapters/kpi.ts` даги
 * `KPI_THRESHOLDS` да, **фақат шу бўлим учун**: умумий `statusOf()` (100/85)
 * ўзгармаган, шунинг учун «Металлар баланси», «Цехлар занжири» ва «Кунлик
 * сводка» бўлимлари ўз чегарасида қолди.
 *
 * ─── Фильтрлар ────────────────────────────────────────────────────────────
 * Ой, категория, ҳолат ва цех — битта ҳолатда (`filter`). Улар view-model'га
 * узатилади, шунинг учун **барча блок** (карточкалар, муаммолар, донат,
 * прогресс, жадвал) битта манбадан янгиланади: экранда бир-бирига зид сон
 * пайдо бўлмайди.
 */

const DASH = "—";

/* -------------------------------------------------------------------------- */
/* 1. фильтрлар                                                               */
/* -------------------------------------------------------------------------- */

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const uid = useId();
  return (
    <span className="flex items-center gap-1.5">
      <label
        htmlFor={uid}
        className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
      >
        {label}
      </label>
      <select id={uid} value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value={KPI_ALL}>{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function FilterBar({
  vm,
  filter,
  onFilter,
  month,
  onMonth,
}: {
  vm: KpiVM;
  filter: KpiFilter;
  onFilter: (f: KpiFilter) => void;
  month: string;
  onMonth: (m: string) => void;
}) {
  const active = kpiFilterActive(filter);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-hair bg-surface px-3.5 py-2.5 shadow-card">
      <Select
        label="Давр"
        value={month}
        onChange={onMonth}
        options={vm.months
          .slice()
          .reverse()
          .map((m) => ({ value: m, label: monthLabel(m) + (m === vm.reference ? " · эталон" : "") }))}
      />
      {/* 18 категория рўйхат ёки карточка эмас, фақат dropdown — акс ҳолда
          биринчи экран кесимлар билан тўлиб кетарди. */}
      <Select
        label="Категория"
        value={filter.category}
        onChange={(category) => onFilter({ ...filter, category })}
        allLabel={`Барчаси (${vm.options.categories.length})`}
        options={vm.options.categories.map((c) => ({ value: c, label: c }))}
      />
      <Select
        label="Ҳолат"
        value={filter.status}
        onChange={(status) => onFilter({ ...filter, status })}
        allLabel="Барчаси"
        options={KPI_STATUS_ORDER.map((s) => ({ value: s, label: KPI_STATUS_LABEL[s] }))}
      />
      <Select
        label="Цех/участка"
        value={filter.site}
        onChange={(site) => onFilter({ ...filter, site })}
        allLabel={`Барчаси (${vm.options.sites.length})`}
        options={vm.options.sites.map((s) => ({ value: s, label: s }))}
      />
      <button
        type="button"
        disabled={!active}
        onClick={() => onFilter(KPI_EMPTY_FILTER)}
        className={
          "rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold " +
          (active ? "cursor-pointer text-ink-2 hover:text-ink" : "cursor-not-allowed text-ink-3 opacity-55")
        }
      >
        Фильтрларни тозалаш
      </button>
      {active && (
        <Pill>
          {vm.counts.total} / {vm.totalAll} кўрсаткич
        </Pill>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. KPI карточкалари                                                        */
/* -------------------------------------------------------------------------- */

/** Битта катта рақам — карточка бошқа ҳеч нарса билан юкланмайди. */
function KpiCard({
  label,
  value,
  unit,
  note,
  token,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: React.ReactNode;
  token?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-4 shadow-card">
      {token && (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: token }}
        />
      )}
      <span className="mb-1.5 block text-[10.5px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[30px] leading-[1.02] [font-weight:650] tracking-[-0.02em]">
            {value}
            {unit && (
              <span className="ml-[5px] text-[13px] font-medium tracking-normal text-ink-3">
                {unit}
              </span>
            )}
          </div>
          {note && <div className="mt-1.5 text-[11.5px] text-ink-2">{note}</div>}
        </div>
        {children && <div className="flex-none">{children}</div>}
      </div>
    </div>
  );
}

function DeltaNote({ delta, previous }: { delta: number | null; previous: string | null }) {
  if (delta === null || previous === null) {
    return <span className="text-ink-3">олдинги ой билан таққослаб бўлмайди</span>;
  }
  const up = delta >= 0;
  return (
    <span>
      <span
        className="font-mono [font-weight:600] tabular-nums"
        style={{ color: up ? "var(--good-ink)" : "var(--crit-ink)" }}
      >
        {up ? "+" : "−"}
        {nf(Math.abs(delta), 1)} п.п.
      </span>{" "}
      <span className="text-ink-3">{monthLabel(previous)} га нисбатан</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. ҳолат динамикаси                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Ойлар кесимида нечта кўрсаткич қайси ҳолатда бўлган — **гуруҳланган**
 * устунлар (стек эмас): ҳар ойда учта устун ёнма-ён туради, шунда ойдан-ойга
 * ҳар бир ҳолатнинг ўзгариши кўринади.
 *
 * Ўқ **битта** — кўрсаткичлар сони (дона). Иккинчи Y ўқи йўқ: учала қатор ҳам
 * бир хил ўлчовда, шунинг учун иккинчи шкала сохта боғлиқлик ясарди.
 *
 * Ранг бу ерда сериянинг ўзи — сериялар айнан ҳолат. Шунга қарамай ранг
 * ёлғиз маъно ташимайди: легендада ном, тултипда ном ва сон, пастда эса
 * жадвал кўриниши бор.
 *
 * ⚠️ «Баҳоланмайди» **устун сифатида чизилмайди** (учта устун талаб қилинган),
 * шунинг учун уч устун йиғиндиси ойлик жамидан кам бўлади. Фарқ яширилмайди:
 * тултип сарлавҳасида ва жадвалда алоҳида ёзилади.
 */
function StatusTrend({ history }: { history: KpiHistoryPoint[] }) {
  const p = usePalette();
  if (history.length === 0) {
    return (
      <p className="px-2.5 py-5 text-center text-[13px] text-ink-3">
        Танланган кесимда тарих учун маълумот йўқ.
      </p>
    );
  }

  return (
    <>
      <ChartLegend
        items={[
          { name: KPI_STATUS_LABEL.good, color: KPI_STATUS_TOKEN.good },
          { name: KPI_STATUS_LABEL.warn, color: KPI_STATUS_TOKEN.warn },
          { name: KPI_STATUS_LABEL.crit, color: KPI_STATUS_TOKEN.crit },
        ]}
      />
      <Columns
        labels={history.map((h) => h.label)}
        // Баҳоланмайдиганлар сони тултип сарлавҳасида — уч устун йиғиндиси
        // ойлик жамидан нега кам эканини ўша ернинг ўзида тушунтиради.
        fullLabels={history.map((h) =>
          h.mute > 0 ? `${h.full} · баҳоланмайди ${h.mute} та` : h.full,
        )}
        height={260}
        yWidth={38}
        yTickFmt={(v) => nf(v, 0)}
        vFmt={(v) => `${nf(v, 0)} та`}
        ariaLabel="Ойлар кесимида кўрсаткичлар ҳолати: норма, диққат, муаммо"
        series={[
          { name: KPI_STATUS_LABEL.good, color: p.good, values: history.map((h) => h.good) },
          { name: KPI_STATUS_LABEL.warn, color: p.warn, values: history.map((h) => h.warn) },
          { name: KPI_STATUS_LABEL.crit, color: p.crit, values: history.map((h) => h.crit) },
        ]}
      />

      <TableToggle
        caption="Ойлар кесимида кўрсаткичлар ҳолати"
        cols={[
          { t: "Ой" },
          { t: KPI_STATUS_LABEL.good, num: true },
          { t: KPI_STATUS_LABEL.warn, num: true },
          { t: KPI_STATUS_LABEL.crit, num: true },
          { t: KPI_STATUS_LABEL.mute, num: true },
          { t: "Жами", num: true },
          { t: "Медиана", num: true },
        ]}
        rows={history.map((h) => ({
          key: h.month,
          cells: [h.full, h.good, h.warn, h.crit, h.mute, h.total, pctTxt(h.pct)],
        }))}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. категориялар прогресси                                                  */
/* -------------------------------------------------------------------------- */

function CategoryRow({
  cat,
  active,
  onPick,
}: {
  cat: KpiCategoryVM;
  active: boolean;
  onPick: (key: string) => void;
}) {
  const w = cat.pct === null ? 0 : Math.max(0, Math.min(cat.pct, KPI_PCT_MAX));
  return (
    <button
      type="button"
      onClick={() => onPick(cat.key)}
      aria-pressed={active}
      title={`${cat.title}: ${pctTxt(cat.pct)} · ${KPI_STATUS_LABEL[cat.status]} · ${cat.counts.total} кўрсаткич`}
      className={
        "flex w-full cursor-pointer items-center gap-3 rounded-[5px] px-1.5 py-[5px] text-left " +
        (active ? "bg-surface-2" : "hover:bg-surface-2")
      }
    >
      <span
        className={
          "min-w-0 flex-1 truncate text-[12px] " + (active ? "[font-weight:650] text-ink" : "text-ink-2")
        }
      >
        {cat.title}
      </span>
      {/* Ингичка прогресс: маълумот учи 4px юмалоқ, тагида 2px бўшлиқ. */}
      <span className="hidden h-1.5 w-[168px] flex-none overflow-hidden rounded-[3px] bg-sunken mid:block">
        <span
          className="block h-full rounded-[4px]"
          style={{ width: `${((w / KPI_PCT_MAX) * 100).toFixed(2)}%`, background: KPI_STATUS_TOKEN[cat.status] }}
        />
      </span>
      <span
        className="w-[52px] flex-none text-right font-mono text-[12px] [font-weight:600] tabular-nums"
        style={{ color: KPI_STATUS_INK[cat.status] }}
      >
        {pctTxt(cat.pct)}
      </span>
      <span className="w-[30px] flex-none text-right font-mono text-[11px] tabular-nums text-ink-3">
        {cat.counts.total}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. жадвал                                                                  */
/* -------------------------------------------------------------------------- */

function TableRow({ row }: { row: KpiRowVM }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const c = row.cell;
  const why = kpiWhyMute(row);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`kr-${uid}`}
      >
        <td className="wrap">
          {row.hasLimit && (
            <span className="text-warn-ink" title="манбада чеклов қайд этилган">
              ⚠{" "}
            </span>
          )}
          {row.name}
        </td>
        <td>{row.category}</td>
        <td>{row.site}</td>
        <td className="num">{c?.plan == null ? DASH : exact(c.plan)}</td>
        <td className="num">{c?.fakt == null ? DASH : exact(c.fakt)}</td>
        <td>{row.unit}</td>
        <td className="num" style={{ color: KPI_STATUS_INK[row.status] }}>
          {c?.anomaly && <span aria-hidden="true">⚠ </span>}
          {pctTxt(c?.pct ?? null)}
        </td>
        <td>
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-none rounded-sm"
              style={{ background: KPI_STATUS_TOKEN[row.status] }}
            />
            {KPI_STATUS_LABEL[row.status]}
          </span>
        </td>
        <td className="num">
          {row.gap === null ? DASH : `${row.gap >= 0 ? "+" : "−"}${exact(Math.abs(row.gap))}`}
        </td>
      </tr>
      {open && (
        <tr id={`kr-${uid}`}>
          <td colSpan={9} className="wrap">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-ink-2">
              <span>
                Режа <b className="font-mono tabular-nums">{c?.plan == null ? DASH : exact(c.plan)}</b>{" "}
                {row.unit}
              </span>
              <span>
                Факт <b className="font-mono tabular-nums">{c?.fakt == null ? DASH : exact(c.fakt)}</b>{" "}
                {row.unit}
              </span>
              <span>
                Олдинги ой <b className="font-mono tabular-nums">{pctTxt(row.prevPct)}</b>
              </span>
              {why && <Pill>{why}</Pill>}
              {row.hasLimit && <Pill status="warn">манбада чеклов қайд этилган</Pill>}
              {c?.anomaly && <Pill status="warn">фоиз шкаладан юқори — сон тўлиқ кўрсатилган</Pill>}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function ManagementView({ kpiQ }: { kpiQ: QueryResult<KpiResponse> }) {
  const [filter, setFilter] = useState<KpiFilter>(KPI_EMPTY_FILTER);
  const [picked, setPicked] = useState<string | null>(null);
  const [allCats, setAllCats] = useState(false);
  const [allRows, setAllRows] = useState(false);

  const month = kpiQ.data ? kpiMonth(kpiQ.data, picked) : null;
  const vm = useMemo(
    () => (kpiQ.data && month ? kpiView(kpiQ.data, month, filter) : null),
    [kpiQ.data, month, filter],
  );

  const pickCategory = (key: string) =>
    setFilter((f) => ({ ...f, category: f.category === key ? KPI_ALL : key }));
  const pickStatus = (s: Status) =>
    setFilter((f) => ({ ...f, status: f.status === s ? KPI_ALL : s }));

  return (
    <Loader
      q={kpiQ}
      height={320}
      notAvailableWhat="/kpi"
      isEmpty={() => !vm || !vm.hasValues}
      emptyTitle="Ушбу давр учун кўрсаткич маълумоти йўқ"
    >
      {() => vm && <Body vm={vm} filter={filter} setFilter={setFilter} month={vm.month}
        onMonth={setPicked} pickCategory={pickCategory} pickStatus={pickStatus}
        allCats={allCats} setAllCats={setAllCats} allRows={allRows} setAllRows={setAllRows} />}
    </Loader>
  );
}

function Body({
  vm,
  filter,
  setFilter,
  month,
  onMonth,
  pickCategory,
  pickStatus,
  allCats,
  setAllCats,
  allRows,
  setAllRows,
}: {
  vm: KpiVM;
  filter: KpiFilter;
  setFilter: (f: KpiFilter) => void;
  month: string;
  onMonth: (m: string) => void;
  pickCategory: (k: string) => void;
  pickStatus: (s: Status) => void;
  allCats: boolean;
  setAllCats: (v: boolean) => void;
  allRows: boolean;
  setAllRows: (v: boolean) => void;
}) {
  const c = vm.counts;
  const share = (n: number): string => (c.total ? nf((n / c.total) * 100, 0) + "%" : DASH);
  const cats = allCats ? vm.categories : vm.categories.slice(0, KPI_CATEGORY_FIRST);
  const restCats = vm.categories.length - cats.length;
  const rows = allRows ? vm.rows : vm.table;
  const restRows = vm.rows.length - rows.length;

  return (
    <>
      <div className="mb-3">
        <FilterBar vm={vm} filter={filter} onFilter={setFilter} month={month} onMonth={onMonth} />
      </div>

      <Section title="Умумий ҳолат" note={`${monthLabel(vm.month)} · паспорт кўрсаткичлари`}>
        <div className={GRID.g5}>
          <KpiCard
            label="Умумий бажарилиш"
            value={pctTxt(vm.overall.pct)}
            token={KPI_STATUS_TOKEN[kpiStatusOf(vm.overall.pct)]}
            note={<DeltaNote delta={vm.overall.delta} previous={vm.previous} />}
          >
            <Sparkline
              values={vm.history.map((h) => h.pct)}
              color={KPI_STATUS_TOKEN[kpiStatusOf(vm.overall.pct)]}
              label={`Ойлар кесимида умумий бажарилиш: ${vm.history
                .filter((h) => h.pct !== null)
                .map((h) => `${h.full} ${nf(h.pct as number, 0)}%`)
                .join(", ")}`}
            />
          </KpiCard>
          <KpiCard
            label={KPI_STATUS_LABEL.crit}
            value={nf(c.crit, 0)}
            token={KPI_STATUS_TOKEN.crit}
            note={<span className="text-ink-3">{share(c.crit)} жамидан</span>}
          />
          <KpiCard
            label="Диққат талаб қилади"
            value={nf(c.warn, 0)}
            token={KPI_STATUS_TOKEN.warn}
            note={<span className="text-ink-3">{share(c.warn)} жамидан</span>}
          />
          <KpiCard
            label={KPI_STATUS_LABEL.good}
            value={nf(c.good, 0)}
            token={KPI_STATUS_TOKEN.good}
            note={<span className="text-ink-3">{share(c.good)} жамидан</span>}
          />
          <KpiCard
            label="Жами кўрсаткич"
            value={nf(c.total, 0)}
            note={
              <span className="text-ink-3">
                {c.mute > 0 ? `${c.mute} таси баҳоланмайди` : "барчаси баҳоланган"}
              </span>
            }
          />
        </div>
      </Section>

      <Section
        title="Раҳбар эътиборига — ҳолат динамикаси"
        note={`${vm.history.length} ой · ҳар ойда нечта кўрсаткич қайси ҳолатда бўлган`}
      >
        <Card>
          <StatusTrend history={vm.history} />
        </Card>
      </Section>

      <div className={GRID.g32}>
        {/* Иккала карточка бир хил баландликда: grid катакчаси stretch,
            Section — flex устун, Card эса қолган жойни тўлдиради. Қаторлар
            сони (`KPI_CATEGORY_FIRST`) донат карточкаси баландлигига қараб
            ўлчанган, шунинг учун бўш жой 3px дан ошмайди. */}
        <Section
          title="Категориялар бўйича ҳолат"
          note="медиана бажарилиш · энг пасти тепада"
          className="flex flex-col"
        >
          <Card className="flex-1">
            {cats.map((cat) => (
              <CategoryRow
                key={cat.key}
                cat={cat}
                active={filter.category === cat.key}
                onPick={pickCategory}
              />
            ))}
            {restCats > 0 && (
              <button
                type="button"
                onClick={() => setAllCats(true)}
                className="mt-2 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Яна {restCats} та →
              </button>
            )}
            {allCats && vm.categories.length > KPI_CATEGORY_FIRST && (
              <button
                type="button"
                onClick={() => setAllCats(false)}
                className="mt-2 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Йиғиш
              </button>
            )}
            <TableToggle
              caption="Категориялар бўйича бажарилиш"
              cols={[
                { t: "Категория", wrap: true },
                { t: "Бажарилиш", num: true },
                { t: "Ҳолат" },
                { t: "Кўрсаткич", num: true },
              ]}
              rows={vm.categories.map((cat) => ({
                key: cat.key,
                cells: [cat.title, pctTxt(cat.pct), KPI_STATUS_LABEL[cat.status], cat.counts.total],
              }))}
            />
          </Card>
        </Section>

        <Section
          title="Статуслар тақсимоти"
          note={`${c.total} кўрсаткич`}
          className="flex flex-col"
        >
          <Card className="flex-1">
            <StatusDonut
              counts={c}
              centerNote="жами"
              onPick={pickStatus}
              active={filter.status === KPI_ALL ? null : (filter.status as Status)}
            />
            <p className="mt-2.5 text-[11.5px] leading-[1.45] text-ink-3">
              Легендадаги қаторга босилса — шу ҳолат бўйича фильтр қўлланади.
            </p>
          </Card>
        </Section>
      </div>

      <Section
        title={allRows ? "Барча кўрсаткичлар" : "ТОП-10 кўрсаткич"}
        note={`${monthLabel(vm.month)} · энг паст бажарилишдан бошлаб · қаторга босилса тафсилот очилади`}
      >
        <Card>
          <div className="tbl-wrap" tabIndex={0}>
            <table className="tbl">
              <caption className="sr-only">
                Паспорт кўрсаткичлари — режа, факт, бажарилиш ва ҳолат
              </caption>
              <thead>
                <tr>
                  <th>Кўрсаткич</th>
                  <th>Категория</th>
                  <th>Цех</th>
                  <th className="num">Режа</th>
                  <th className="num">Факт</th>
                  <th>Ўлчов</th>
                  <th className="num">Бажарилиш</th>
                  <th>Статус</th>
                  <th className="num">Оғиш</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <TableRow key={r.no} row={r} />
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="px-2.5 py-5 text-center text-[13px] text-ink-3">
              Танланган кесимда кўрсаткич йўқ.
            </p>
          )}
          {restRows > 0 && (
            <button
              type="button"
              onClick={() => setAllRows(true)}
              className="mt-2.5 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Барча {vm.rows.length} кўрсаткич →
            </button>
          )}
          {allRows && vm.rows.length > vm.table.length && (
            <button
              type="button"
              onClick={() => setAllRows(false)}
              className="mt-2.5 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Фақат ТОП-10
            </button>
          )}
        </Card>
      </Section>
    </>
  );
}
