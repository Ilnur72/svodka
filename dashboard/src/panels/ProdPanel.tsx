import { Fragment, useDeferredValue, useId, useMemo, useState } from "react";
import type { PanelProps } from "../types";
import { getNarastayka, getProductionTree } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, pctTxt, periodLabel, exact, smart, statusOf, stripeOf } from "../lib/format";
import { UNASSIGNED_PLANT_NOTE } from "../lib/dataQuality";
import {
  FILTER_ALL,
  NARASTAYKA_LAST_DAY_LIMIT,
  dailyFromNarastayka,
  DEFAULT_VALUE_FILTER,
  VALUE_FILTERS,
  facets,
  filterByValue,
  filterItems,
  fromTree,
  lastDayFacts,
  narastaykaLimit,
  prodStats,
  productCards,
  scopeItems,
  type FacetKey,
  type ProdFilter,
  type ValueFilterKey,
  type ProdItem,
} from "../lib/adapters/production";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { ProductCard } from "../components/ProductCard";
import { CheckSelect } from "../components/CheckSelect";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { ChartLegend } from "../components/ChartLegend";
import { TimeLine } from "../components/TimeLine";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { Loader } from "../components/states";

/** Битта саҳифада нечта карточка чизилади — қолгани тугма билан очилади. */
const CARD_PAGE = 48;

/** Фильтр панелидаги ёрлиқ услуби — учта жойда бир хил. */
const LBL = "text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase";

export function ProdPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const uid = useId();
  const [plant, setPlant] = useState(FILTER_ALL);
  const [workshopSel, setWorkshopSel] = useState(FILTER_ALL);
  const [facetSel, setFacetSel] = useState<Record<FacetKey, string>>({
    category: FILTER_ALL,
    material: FILTER_ALL,
    process: FILTER_ALL,
  });
  const [query, setQuery] = useState("");
  // Қиймат мавжудлиги бўйича фильтр — **фақат маҳсулот карточкаларига**
  // тегишли. Четланиш рўйхатлари, ҳажм рейтинги ва плиткалар ўзгармайди:
  // улар бутун кесимни кўрсатиши керак.
  const [valueSel, setValueSel] = useState<ValueFilterKey[]>(DEFAULT_VALUE_FILTER);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [expandedSig, setExpandedSig] = useState<string | null>(null);

  // 300+ позицияли рўйхат ёзиш тезлигини секинлаштирмаслиги учун.
  const deferredQuery = useDeferredValue(query);
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;

  const treeQ = useQuery(`prod-tree_${key}`, (s) =>
    getProductionTree(period, { depth: "product" }, s),
  );

  const flat = useMemo(() => (treeQ.data ? fromTree(treeQ.data) : null), [treeQ.data]);
  const items: ProdItem[] = flat?.items ?? [];

  // Иерархик фильтр: цех рўйхати танланган заводникилар билан тўлади.
  const wsOptions = useMemo(
    () => (flat?.workshops ?? []).filter((w) => w.plant === plant),
    [flat, plant],
  );
  // Танлов эффектсиз тикланади (`pickedKey` билан бир хил услуб): завод
  // ўзгарса, эски цех рўйхатда қолмагани учун ўзи «Барчаси» га тушади.
  const workshop = wsOptions.some((w) => w.code === workshopSel) ? workshopSel : FILTER_ALL;
  const oneWorkshop = plant !== FILTER_ALL && workshop !== FILTER_ALL;

  const plantCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of items) m.set(x.plant, (m.get(x.plant) ?? 0) + 1);
    return m;
  }, [items]);

  // Қўшимча кесимлар — завод/цех кесимидаги ҳақиқий қийматлардан.
  const scoped = useMemo(() => scopeItems(items, plant, workshop), [items, plant, workshop]);
  const facetList = useMemo(() => facets(scoped), [scoped]);

  const filter: ProdFilter = useMemo(() => {
    // Кесимда энди мавжуд бўлмаган қиймат ўзи «Барчаси» га тушади.
    const eff = (k: FacetKey): string => {
      const f = facetList.find((x) => x.key === k);
      return f && f.values.includes(facetSel[k]) ? facetSel[k] : FILTER_ALL;
    };
    return {
      plant,
      workshop,
      category: eff("category"),
      material: eff("material"),
      process: eff("process"),
      query: deferredQuery,
    };
  }, [plant, workshop, facetList, facetSel, deferredQuery]);

  const rows = useMemo(() => filterItems(items, filter), [items, filter]);
  const dirty =
    plant !== FILTER_ALL ||
    filter.category !== FILTER_ALL ||
    filter.material !== FILTER_ALL ||
    filter.process !== FILTER_ALL ||
    query.trim() !== "" ||
    valueSel.length !== DEFAULT_VALUE_FILTER.length ||
    !DEFAULT_VALUE_FILTER.every((k) => valueSel.includes(k));

  const resetFilters = () => {
    setPlant(FILTER_ALL);
    setWorkshopSel(FILTER_ALL);
    setFacetSel({ category: FILTER_ALL, material: FILTER_ALL, process: FILTER_ALL });
    setQuery("");
    setPickedKey(null);
    // Стандарт ҳолатга қайтарилади, «ҳаммаси» га эмас — акс ҳолда тозалаш
    // бўш позицияларни экранга қайтариб чиқарарди.
    setValueSel(DEFAULT_VALUE_FILTER);
  };

  const stats = useMemo(() => prodStats(rows), [rows]);

  const candidates = useMemo(() => {
    const withValue = rows.filter((x) => x.plan > 0 || x.fakt > 0);
    return withValue.length > 0 ? withValue : rows;
  }, [rows]);

  // Танлов индекс билан эмас, ўзлик билан сақланади — фильтр ўзгарганда
  // эффектсиз тикланади.
  const picked = candidates.find((x) => x.key === pickedKey) ?? candidates[0] ?? null;

  // Чегара давр узунлигидан ҳисобланади: собит 400 та қатор узун даврда
  // етмай қоларди ва жавоб `for_day DESC` тартибида қирқилгани учун энг эски
  // кунлар жимгина тушиб қоларди.
  const dailyLimit = narastaykaLimit(period.from, period.to);

  const dailyQ = useQuery(
    `prod-daily_${key}_${picked?.name ?? ""}`,
    (s) => getNarastayka(period, { product: picked?.name, limit: dailyLimit }, s),
    { enabled: Boolean(picked) },
  );

  const daily = useMemo(
    () => (dailyQ.data ? dailyFromNarastayka(dailyQ.data, multiMonth) : null),
    [dailyQ.data, multiMonth],
  );

  /* «Сўнгги кун» кесими — карточкадаги тўртинчи, ҳақиқатан **бошқа** сон:
     дарахтдаги `fakt` давр бошидан йиғилган якун, бу эса битта куннинг
     чиқими. Фақат битта цех танланганда ва битта сўров билан юкланади;
     «Барчаси» да сўралмайди — у бутун комбинатнинг кунлик рўйхати бўларди.
     Юкланмаса ёки бўш бўлса карточка асосий уч сон билан бузилмай ишлайди. */
  const plantParam = flat?.plants.find((x) => x.name === plant && !x.unassigned)
    ? plant
    : undefined;

  const lastDayQ = useQuery(
    `prod-lastday_${key}_${plant}_${workshop}`,
    (s) =>
      getNarastayka(period, { workshop, plant: plantParam, limit: NARASTAYKA_LAST_DAY_LIMIT }, s),
    { enabled: oneWorkshop },
  );

  const lastDay = useMemo(
    () => (lastDayQ.data ? lastDayFacts(lastDayQ.data) : null),
    [lastDayQ.data],
  );

  const allCards = useMemo(() => productCards(rows, lastDay), [rows, lastDay]);
  const cards = useMemo(() => filterByValue(allCards, valueSel), [allCards, valueSel]);
  const hiddenByValue = allCards.length - cards.length;
  // Ҳар бир шарт нечта позицияга тушади — рўйхатда сон бўлиб кўринади.
  const valueCounts = useMemo(() => {
    const c = { planSet: 0, planNone: 0, faktSet: 0, faktNone: 0 };
    for (const x of allCards) {
      if (x.planSet) c.planSet += 1;
      else c.planNone += 1;
      if (x.faktSet) c.faktSet += 1;
      else c.faktNone += 1;
    }
    return c;
  }, [allCards]);
  // «Барчасини кўрсатиш» ҳолати фильтрнинг ўзига боғланади — фильтр ўзгарса
  // рўйхат ўзи яна қисқа ҳолатга қайтади (эффект керак эмас).
  const filterSig = [
    filter.plant,
    filter.workshop,
    filter.category,
    filter.material,
    filter.process,
    filter.query,
  ].join("|");
  const cardsShown = expandedSig === filterSig ? cards : cards.slice(0, CARD_PAGE);

  const metShare = stats.met / (stats.withPlan || 1);
  const hasUnassigned = (flat?.plants ?? []).some((x) => x.unassigned);

  return (
    <Loader
      q={treeQ}
      height={320}
      notAvailableWhat="/production/tree"
      isEmpty={() => items.length === 0}
      emptyTitle="Ушбу давр учун ишлаб чиқариш маълумоти йўқ"
    >
      {() => (
        <>
          {hasUnassigned && (
            <Banner tone="warn">
              <b>Заводга боғланмаган позициялар.</b>{" "}
              {flat?.plants.find((x) => x.unassigned)?.productCount ?? 0} та позиция заводга
              бириктирилмаган — {UNASSIGNED_PLANT_NOTE} Улар рўйхатда «Заводга боғланмаган» гуруҳи
              сифатида кўринади.
            </Banner>
          )}

          {/* Иерархик фильтр: аввал завод, кейин ўша заводнинг цехлари.
              Қўшимча кесимлар (категория / металл / жараён) маълумотда
              ҳақиқатан бор бўлсагина чиқади — бўш select кўрсатилмайди. */}
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5 rounded-card border border-hair bg-surface px-3.5 py-2.5 shadow-card">
            <label htmlFor={`${uid}-plant`} className={LBL}>
              Завод
            </label>
            <select
              id={`${uid}-plant`}
              value={plant}
              onChange={(ev) => {
                setPlant(ev.target.value);
                setWorkshopSel(FILTER_ALL);
                setPickedKey(null);
              }}
            >
              <option value={FILTER_ALL}>Барчаси ({items.length} позиция)</option>
              {(flat?.plants ?? []).map((pl) => (
                <option key={pl.name} value={pl.name}>
                  {pl.label} · {plantCounts.get(pl.name) ?? 0} поз.
                </option>
              ))}
            </select>

            <label htmlFor={`${uid}-ws`} className={LBL}>
              Цех / объект
            </label>
            <select
              id={`${uid}-ws`}
              className="min-w-0 flex-[0_1_320px] disabled:opacity-55"
              value={workshop}
              disabled={plant === FILTER_ALL}
              title={wsOptions.find((w) => w.code === workshop)?.fullName ?? undefined}
              onChange={(ev) => {
                setWorkshopSel(ev.target.value);
                setPickedKey(null);
              }}
            >
              <option value={FILTER_ALL}>
                {plant === FILTER_ALL
                  ? "Аввал заводни танланг"
                  : `Барчаси (${scoped.length} позиция)`}
              </option>
              {wsOptions.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.label} · {w.count} поз.
                </option>
              ))}
            </select>

            {facetList.map((f) => (
              <Fragment key={f.key}>
                <label htmlFor={`${uid}-${f.key}`} className={LBL}>
                  {f.label}
                </label>
                <select
                  id={`${uid}-${f.key}`}
                  value={filter[f.key]}
                  onChange={(ev) =>
                    setFacetSel((prev) => ({ ...prev, [f.key]: ev.target.value }))
                  }
                >
                  <option value={FILTER_ALL}>Барчаси</option>
                  {f.values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Fragment>
            ))}

            {/* Қиймат мавжудлиги — кўп танловли, фақат карточкаларга таъсир
                қилади. Стандарт ҳолатда бўш позициялар яширилади. */}
            <span className={LBL}>Қиймат</span>
            <CheckSelect
              label="Қиймат мавжудлиги бўйича фильтр"
              options={VALUE_FILTERS.map((v) => ({ ...v, count: valueCounts[v.key] }))}
              picked={valueSel}
              onChange={setValueSel}
              emptyText="ҳеч бири танланмаган"
            />

            <label htmlFor={`${uid}-q`} className={LBL}>
              Қидирув
            </label>
            <input
              id={`${uid}-q`}
              type="search"
              placeholder="маҳсулот номи…"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
            />
            {dirty && (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Фильтрни тозалаш
              </button>
            )}
            <span className="flex-1" />
            <Pill>{periodLabel(months)}</Pill>
            <Pill>{stats.total} позиция</Pill>
          </div>

          <div className={GRID.g4}>
            <StatTile
              label="Кузатилаётган позициялар"
              value={nf(stats.total)}
              unit="та"
              stripe="var(--s1)"
              foot={<Pill>режали: {stats.withPlan}</Pill>}
            />
            <StatTile
              label="Ўртача бажарилиш даражаси"
              value={nf(stats.score, 1)}
              unit="%"
              stripe={stripeOf(stats.score)}
              foot={<Pill status={statusOf(stats.score)}>{nf(stats.score, 1)}%</Pill>}
            />
            <StatTile
              label="Режа тўлиқ бажарилган"
              value={nf(stats.met)}
              unit="позиция"
              stripe={metShare >= 0.5 ? "var(--good)" : "var(--warn)"}
              foot={
                <Pill status={metShare >= 0.5 ? "good" : "warn"}>
                  {nf(metShare * 100, 0)}% режали позициядан
                </Pill>
              }
            />
            <StatTile
              label="Ишлаб чиқарилмаган"
              value={nf(stats.zero)}
              unit="позиция"
              stripe={stats.zero ? "var(--crit)" : "var(--good)"}
              foot={<Pill status={stats.zero ? "crit" : "good"}>режа бор, факт нол</Pill>}
            />
          </div>

          {/* Фойдаланувчи сўраган асосий кўриниш: ҳар бир маҳсулот — алоҳида
              карточка. Манбадаги «всего» сатрлари бу ерга кирмайди: улар
              пастдаги қаторларнинг йиғиндиси ва қўшилса битта миқдор икки
              марта саналарди (`prodStats()` даги қоида билан бир хил). */}
          <Section
            className="mt-5"
            title="Маҳсулот карточкалари"
            note="ҳар бир позиция бўйича режа, факт ва бажарилиш · тартиб: энг орқада қолгани биринчи"
          >
            {cards.length === 0 ? (
              <Card>
                <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">
                  {valueSel.length === 0
                    ? "«Қиймат» фильтрида ҳеч бир шарт танланмаган — шунинг учун ҳеч нарса кўрсатилмаяпти."
                    : "Фильтр бўйича позиция топилмади."}
                </div>
              </Card>
            ) : (
              <>
                {/* Нима яширилгани доим ёзиб турилади — фойдаланувчи фильтр
                    таъсирини кўрмасдан қолмаслиги учун. */}
                {hiddenByValue > 0 && (
                  <p className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
                    <Pill>{nf(hiddenByValue)} та қиймати йўқ позиция яширилди</Pill>
                    <span>
                      «Қиймат» фильтрида ҳозир танланган:{" "}
                      {VALUE_FILTERS.filter((v) => valueSel.includes(v.key))
                        .map((v) => v.label)
                        .join(", ")}
                      . Нол режа ҳақиқий қиймат ҳисобланади — режаси нол, лекин факти бор
                      позиция «Факти бор» шарти билан кўринишда қолади.
                    </span>
                  </p>
                )}
                <div className={GRID.g4}>
                  {cardsShown.map((c) => (
                    <ProductCard key={c.key} card={c} showWorkshop={!oneWorkshop} />
                  ))}
                </div>
                {cards.length > cardsShown.length && (
                  <button
                    type="button"
                    onClick={() => setExpandedSig(filterSig)}
                    className="mt-3 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[13px] py-[6px] text-[12px] font-semibold text-ink-2 hover:text-ink"
                  >
                    Яна {nf(cards.length - cardsShown.length)} та позицияни кўрсатиш
                  </button>
                )}
              </>
            )}
          </Section>

          <Section
            title="Позиция бўйича кунлик динамика"
            note="давр бошидан ўсиб борувчи якун (нарастающий итог)"
          >
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <label htmlFor={`${uid}-item`} className={LBL}>
                  Позиция
                </label>
                <select
                  id={`${uid}-item`}
                  className="min-w-0 flex-[1_1_320px]"
                  value={picked ? picked.key : ""}
                  onChange={(ev) => setPickedKey(ev.target.value)}
                >
                  {candidates.map((x) => (
                    <option key={x.key} value={x.key}>
                      {x.workshop} · {x.name} ({x.unit ?? "—"})
                    </option>
                  ))}
                </select>
              </div>
              {picked ? (
                <Loader
                  q={dailyQ}
                  height={250}
                  notAvailableWhat="/narastayka"
                  isEmpty={() => !daily || daily.labels.length === 0}
                  emptyTitle="Ушбу позиция бўйича кунлик ёзув йўқ"
                >
                  {() =>
                    daily && (
                      <>
                        {/* Қирқилиш — диаграмманинг ўзи нотўғри бўлади, шунинг
                            учун изоҳ эмас, диаграмма тепасида огоҳлантириш. */}
                        {daily.truncated && (
                          <Banner tone="warn">
                            <b>Кунлик қаторлар тўлиқ келмади.</b> Номга {nf(daily.total)} та ёзув мос
                            келди, жавобга {nf(daily.received)} таси сиғди. Қаторлар кундан тескари
                            тартибда келгани учун даврнинг <b>энг эски кунлари</b> тушиб қолди —
                            қуйидаги ўсиб борувчи якун тўлиқ эмас. Даврни қисқартиринг ёки цех
                            фильтри билан позицияни аниқроқ танланг.
                          </Banner>
                        )}
                        <ChartLegend
                          items={[
                            { name: "Режа (ўсиб борувчи)", color: "var(--s1)" },
                            { name: "Факт (ўсиб борувчи)", color: "var(--s2)" },
                          ]}
                        />
                        <TimeLine
                          labels={daily.labels}
                          fullLabels={daily.fullLabels}
                          height={250}
                          area={false}
                          ariaLabel={`${picked.name} — давр бошидан ўсиб борувчи режа ва факт`}
                          yTickFmt={smart}
                          vFmt={(v) => exact(v) + " " + (picked.unit ?? "")}
                          series={[
                            { name: "Режа", color: p.s1, values: daily.cumPlan },
                            { name: "Факт", color: p.s2, values: daily.cumFakt },
                          ]}
                        />
                        {/* Номи бўйича изланганда нима қўшилгани ва нима
                            ҳисобдан чиқарилгани — иккови ёнма-ён туради. */}
                        {(daily.matched.length > 1 ||
                          daily.excludedTotals.length > 0 ||
                          daily.totalsOnly) && (
                          <div className="mt-2 space-y-1 text-[11.5px] leading-[1.45] text-ink-3">
                            {daily.matched.length > 1 && (
                              <p>
                                Кунлик ёзувлар номи бўйича излангани учун {daily.matched.length} та
                                яқин номли позиция бирга йиғилди: {daily.matched.join(" · ")}
                              </p>
                            )}
                            {daily.excludedTotals.length > 0 && (
                              <p>
                                Манбадаги «всего» йиғинди сатри ҳисобдан чиқарилди — у пастдаги
                                қаторларнинг йиғиндиси, қўшилса битта миқдор икки марта саналарди:{" "}
                                {daily.excludedTotals.join(" · ")}
                              </p>
                            )}
                            {daily.totalsOnly && (
                              <p>
                                Танланган позиция — манбадаги «всего» йиғинди сатри. Диаграмма
                                айнан шу йиғинди бўйича қурилди, унинг таркибий қаторлари алоҳида
                                позициялар сифатида рўйхатда турибди.
                              </p>
                            )}
                          </div>
                        )}
                        <TableToggle
                          caption={`${picked.name} — кунлик режа ва факт`}
                          cols={[
                            { t: "Кун" },
                            { t: "Режа (кунлик)", num: true },
                            { t: "Факт (кунлик)", num: true },
                            { t: "Режа (ўсиб)", num: true },
                            { t: "Факт (ўсиб)", num: true },
                          ]}
                          rows={daily.labels.map((_, i) => ({
                            key: String(i),
                            cells: [
                              daily.fullLabels[i],
                              exact(daily.plan[i]),
                              exact(daily.fakt[i]),
                              exact(daily.cumPlan[i]),
                              exact(daily.cumFakt[i]),
                            ],
                          }))}
                        />
                      </>
                    )
                  }
                </Loader>
              ) : (
                <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">
                  Фильтр бўйича позиция топилмади.
                </div>
              )}
            </Card>
          </Section>

          <Section title="Тўлиқ рўйхат" note="фильтр бўйича барча позициялар">
            <Card>
              <DataTable
                caption="Барча кузатилаётган позициялар"
                emptyText="Фильтр бўйича позиция топилмади."
                cols={[
                  { t: "Завод" },
                  { t: "Цех / объект" },
                  { t: "Позиция", wrap: true },
                  { t: "Бирлик" },
                  { t: "Металл" },
                  { t: "Жараён" },
                  { t: "Режа", num: true },
                  { t: "Факт", num: true },
                  { t: "Бажарилиш", num: true },
                ]}
                rows={rows.map((x) => ({
                  key: x.key,
                  cells: [
                    x.plantLabel,
                    x.workshop,
                    x.name,
                    x.unit ?? "—",
                    x.material ?? "—",
                    x.process ?? "—",
                    exact(x.plan),
                    exact(x.fakt),
                    x.percent == null ? (
                      "—"
                    ) : (
                      <Pill status={statusOf(x.percent)}>{pctTxt(Math.min(x.percent, 9999))}</Pill>
                    ),
                  ],
                }))}
              />
            </Card>
          </Section>
        </>
      )}
    </Loader>
  );
}
