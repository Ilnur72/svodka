import { useDeferredValue, useId, useMemo, useState } from "react";
import type { PanelProps } from "../types";
import { getNarastayka, getProductionTree } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { inkTokenOf, nf, pctTxt, periodLabel, exact, smart, statusOf, stripeOf } from "../lib/format";
import { UNASSIGNED_PLANT_NOTE } from "../lib/dataQuality";
import {
  dailyFromNarastayka,
  deviationRows,
  filterItems,
  fromTree,
  prodStats,
  unitGroups,
  type DeviationRow,
  type ProdItem,
} from "../lib/adapters/production";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { BarsH } from "../components/BarsH";
import { BulletChart, BulletLegend } from "../components/BulletRow";
import { ChartLegend } from "../components/ChartLegend";
import { TimeLine } from "../components/TimeLine";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { Loader } from "../components/states";

const devRows = (items: DeviationRow[]) =>
  items.map((x) => ({
    label: x.name,
    v: x.pc,
    valueColor: inkTokenOf(x.pc),
    extra: ["Режа / Факт", `${exact(x.plan)} / ${exact(x.fakt)} ${x.unit ?? ""}`.trim()] as [
      string,
      string,
    ],
  }));

export function ProdPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const uid = useId();
  const [workshop, setWorkshop] = useState("ALL");
  const [query, setQuery] = useState("");
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  // 300+ позицияли рўйхат ёзиш тезлигини секинлаштирмаслиги учун.
  const deferredQuery = useDeferredValue(query);
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;

  const treeQ = useQuery(`prod-tree_${key}`, (s) =>
    getProductionTree(period, { depth: "product" }, s),
  );

  const flat = useMemo(() => (treeQ.data ? fromTree(treeQ.data) : null), [treeQ.data]);
  const items: ProdItem[] = flat?.items ?? [];
  const rows = useMemo(
    () => filterItems(items, workshop, deferredQuery),
    [items, workshop, deferredQuery],
  );
  const stats = useMemo(() => prodStats(rows), [rows]);
  const { low, high, all, showAll, noPlan, totals } = useMemo(() => deviationRows(rows), [rows]);
  const groups = useMemo(() => unitGroups(rows), [rows]);

  const candidates = useMemo(() => {
    const withValue = rows.filter((x) => x.plan > 0 || x.fakt > 0);
    return withValue.length > 0 ? withValue : rows;
  }, [rows]);

  // Танлов индекс билан эмас, ўзлик билан сақланади — фильтр ўзгарганда
  // эффектсиз тикланади.
  const picked = candidates.find((x) => x.key === pickedKey) ?? candidates[0] ?? null;

  const dailyQ = useQuery(
    `prod-daily_${key}_${picked?.name ?? ""}`,
    (s) => getNarastayka(period, { product: picked?.name, limit: 400 }, s),
    { enabled: Boolean(picked) },
  );

  const daily = useMemo(
    () => (dailyQ.data ? dailyFromNarastayka(dailyQ.data.rows, multiMonth) : null),
    [dailyQ.data, multiMonth],
  );

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

          <div className="mb-3.5 flex flex-wrap items-center gap-2.5 rounded-card border border-hair bg-surface px-3.5 py-2.5 shadow-card">
            <label
              htmlFor={`${uid}-ws`}
              className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
            >
              Цех / объект
            </label>
            <select
              id={`${uid}-ws`}
              value={workshop}
              onChange={(ev) => {
                setWorkshop(ev.target.value);
                setPickedKey(null);
              }}
            >
              <option value="ALL">Барчаси ({items.length} позиция)</option>
              {(flat?.workshops ?? []).map((w) => (
                <option key={`${w.plant}#${w.code}`} value={`${w.plant}#${w.code}`}>
                  {w.plant === w.code ? w.label : `${w.label} — ${w.count} поз.`}
                </option>
              ))}
            </select>
            <label
              htmlFor={`${uid}-q`}
              className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
            >
              Қидирув
            </label>
            <input
              id={`${uid}-q`}
              type="search"
              placeholder="маҳсулот номи…"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
            />
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

          <Section
            className="mt-5"
            title={showAll ? "Режа бажарилиши" : "Энг катта четланишлар"}
            note={showAll ? "режага нисбатан бажарилиш · тўлиқ рўйхат" : "режага нисбатан бажарилиш, фақат режали позициялар"}
          >
            {showAll ? (
              /* Позиция кам бўлса (одатда битта цех танланганда) чекка рўйхат
                 эмас, ҳаммаси кўрсатилади — ўртадаги қаторлар ҳам кўринсин. */
              <Card
                title="Барча режали позициялар"
                sub={`${all.length} та · бажарилиш бўйича`}
                note="Позиция кўп бўлмагани учун тўлиқ рўйхат кўрсатилмоқда. Барчаси танланганда фақат энг чекка позициялар чиқади."
              >
                <div className="mt-2">
                  <BarsH
                    ariaLabel="Барча режали позициялар — бажарилиш"
                    rows={devRows(all)}
                    track
                    rowH={25}
                    thick={15}
                    padR={62}
                    vName="Бажарилиш"
                    vFmt={(v) => nf(v, 1) + "%"}
                  />
                </div>
              </Card>
            ) : (
              <div className={GRID.g2}>
                <Card title="Режадан ортда қолган позициялар" sub={`пастки ${low.length} та`}>
                  <div className="mt-2">
                    <BarsH
                      ariaLabel="Режадан ортда қолган позициялар"
                      rows={devRows(low)}
                      max={100}
                      track
                      rowH={25}
                      thick={15}
                      padR={62}
                      vName="Бажарилиш"
                      vFmt={(v) => nf(v, 1) + "%"}
                    />
                  </div>
                </Card>
                <Card title="Режа ошиқча бажарилган позициялар" sub={`юқори ${high.length} та`}>
                  <div className="mt-2">
                    <BarsH
                      ariaLabel="Режа ошиқча бажарилган позициялар"
                      rows={devRows(high)}
                      track
                      rowH={25}
                      thick={15}
                      padR={62}
                      vName="Бажарилиш"
                      vFmt={(v) => nf(v, 1) + "%"}
                    />
                  </div>
                </Card>
              </div>
            )}

            {/* Манбадаги «всего» сатрлари — пастдаги қаторларнинг йиғиндиси
                (`Ввод W концентрата, всего = ИОФ + покупной`). Улар юқоридаги
                рўйхатларга ва ҳажм рейтингига кирмайди, акс ҳолда битта миқдор
                икки марта саналарди. Лекин раҳбар учун айнан шу умумлаштирувчи
                сон муҳим, шунинг учун алоҳида карточкада. */}
            {totals.length > 0 && (
              <Card
                className="mt-3"
                title="Йиғинди сатрлар"
                sub={`${totals.length} та · манбадаги «всего»`}
                note="Бу қаторлар пастдаги позицияларнинг йиғиндиси, шунинг учун улар умумий ҳисоб-китобларга, четланиш рўйхатларига ва ҳажм рейтингига қўшилмайди — акс ҳолда битта миқдор икки марта саналарди."
              >
                <div className="mt-2">
                  <BarsH
                    ariaLabel="Манбадаги йиғинди сатрлар — бажарилиш"
                    rows={totals.map((x) => ({
                      label: x.name,
                      v: x.pc ?? 0,
                      valueColor: x.pc === null ? "var(--ink-3)" : inkTokenOf(x.pc),
                      extra: [
                        "Режа / Факт",
                        `${exact(x.plan)} / ${exact(x.fakt)} ${x.unit ?? ""}`.trim(),
                      ] as [string, string],
                    }))}
                    track
                    rowH={26}
                    thick={15}
                    padR={62}
                    vName="Бажарилиш"
                    vFmt={(v) => nf(v, 1) + "%"}
                  />
                </div>
                <TableToggle
                  caption="Манбадаги йиғинди сатрлар"
                  cols={[
                    { t: "Қатор", wrap: true },
                    { t: "Цех" },
                    { t: "Бирлик" },
                    { t: "Режа", num: true },
                    { t: "Факт", num: true },
                    { t: "Бажарилиш", num: true },
                  ]}
                  rows={totals.map((x) => ({
                    key: x.key,
                    cells: [
                      x.name,
                      x.workshop,
                      x.unit ?? "—",
                      exact(x.plan),
                      exact(x.fakt),
                      x.pc === null ? "—" : pctTxt(x.pc),
                    ],
                  }))}
                />
              </Card>
            )}

            {/* Режаси йўқ позициялар фоиз диаграммасига тушмайди (нолга бўлиб
                бўлмайди), лекин уларда факт бўлиши мумкин — масалан «Получение
                ТМА из 5 цеха по факту». Уларни бутунлай яшириб қўймаслик учун
                алоҳида жадвал. */}
            {noPlan.length > 0 && (
              <Card
                className="mt-3"
                title="Режаси йўқ позициялар"
                sub={`${noPlan.length} та`}
                note="Бу қаторларга режа қўйилмаган, шунинг учун бажарилиш фоизи ҳисобланмайди ва улар юқоридаги диаграммаларга тушмайди. Кўпчилиги — бошқа цехдан қабул қилиш («по факту») қаторлари."
              >
                <DataTable
                  caption="Режаси йўқ позициялар"
                  cols={[
                    { t: "Позиция", wrap: true },
                    { t: "Цех" },
                    { t: "Бирлик" },
                    { t: "Факт", num: true },
                  ]}
                  rows={noPlan.map((x) => ({
                    key: `${x.workshop}#${x.id}`,
                    cells: [
                      x.name,
                      <span className="text-ink-3">{x.workshop}</span>,
                      <span className="text-ink-3">{x.unit ?? "—"}</span>,
                      exact(x.fakt),
                    ],
                  }))}
                />
              </Card>
            )}
          </Section>

          <Section
            title="Ҳажм бўйича энг йирик позициялар"
            note="ўлчов бирлиги гуруҳлари бўйича алоҳида — қиймати ўзаро қўшилмайди"
          >
            <Card>
              <BulletLegend />
              {groups.length === 0 ? (
                <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">
                  Фильтр бўйича кўрсаткич топилмади.
                </div>
              ) : (
                <div className={GRID.g2}>
                  {groups.map((g) => (
                    <div key={g.unit}>
                      <div className="mt-1.5 mb-1 text-[12px] [font-weight:650] text-ink-2">
                        {g.name}{" "}
                        <span className="font-normal text-ink-3">· {g.items.length} позиция</span>
                      </div>
                      <BulletChart
                        rows={g.items.map((x) => ({
                          key: x.key,
                          label: x.name,
                          plan: x.plan,
                          fact: x.fakt,
                          unit: x.unit ?? "",
                        }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Section>

          <Section
            title="Позиция бўйича кунлик динамика"
            note="давр бошидан ўсиб борувчи якун (нарастающий итог)"
          >
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <label
                  htmlFor={`${uid}-item`}
                  className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
                >
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
                        {daily.matched.length > 1 && (
                          <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
                            Кунлик ёзувлар номи бўйича излангани учун {daily.matched.length} та
                            яқин номли позиция бирга йиғилди: {daily.matched.join(" · ")}
                          </p>
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
