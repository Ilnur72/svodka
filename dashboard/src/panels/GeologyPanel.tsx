import { useEffect, useId, useMemo, useState } from "react";
import type { GeologyDashboard } from "../api/types";
import { getGeologyDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { usePalette } from "../lib/theme";
import { dateLabel, exact, nf, pctTxt } from "../lib/format";
import {
  GEO_FILTER_EMPTY,
  GEO_GROUP_TOKEN,
  geoFilter,
  geoFilterDirty,
  geoProjectByNo,
  geoVolumeRows,
  geoVolumeTotals,
  geologyView,
  type GeoFilter,
  type GeoGroupFilter,
  type GeoProject,
  type GeoSlice,
  type GeoVolumeMetric,
} from "../lib/adapters/geology";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { Columns } from "../components/Columns";
import { ShareDonut } from "../components/ShareDonut";
import { CheckSelect } from "../components/CheckSelect";
import { SegmentSwitch } from "../components/SegmentSwitch";
import { EmptyState, Loader } from "../components/states";
import { GroupChip, Metric, VolumeRow } from "./geology/parts";
import { GeologyProjectDetail } from "./geology/GeologyProjectDetail";
import { GeologyMapView } from "./geology/GeologyMapView";

/**
 * «Геология лойиҳалари» — Геология бошқармасининг 46 та геология-қидирув
 * лойиҳаси, 14.04.2026 ҳолатига.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: лойиҳалар сони, иккита гуруҳ, жами қиймат, 2026 бурғилаш
 *     ва намуналаш.
 *  2. Кесимлар: тоифа (ҳалқа), йўналиш ва ҳудуд (горизонтал устун), тугаш
 *     йили (вертикал устун).
 *  3. Лойиҳалар рўйхати — фильтр қатори ва қисқа карточкалар.
 *  4. 2026 иш ҳажмлари — ҳар бир кўрсаткич ўз карточкасида.
 *
 * ═══ Учта кўриниш ═══════════════════════════════════════════════════════
 *
 * Карточка босилганда ўша лойиҳанинг тафсилот саҳифаси очилади
 * (`geology/GeologyProjectDetail.tsx`), манзилда `#geology/<рақам>` пайдо
 * бўлади — ҳавола бериш ва «орқага» тугмаси шу орқали ишлайди. Рўйхатнинг
 * ўз ҳолати (фильтр, қидирув) бу компонентда қолади, шунинг учун қайтганда
 * ўзгармайди.
 *
 * Учинчиси — вилоятлар харитаси (`#geology/map`). Хэшнинг иккинчи сегменти
 * бу ерда иккита нарсани сақлайди: лойиҳа рақами ёки `map`. Улар
 * чалкашмайди, чунки `map` — сон эмас: `geoProjectByNo()` сон бўлмаган
 * қийматда `null` қайтаради, шунинг учун текширув тартиби ҳам оддий —
 * аввал `map`, кейин рақам. Харита ҳам, рўйхат ҳам **битта** фильтрдан
 * озиқланади, шунинг учун улар ҳеч қачон бошқа-бошқа сон кўрсатмайди.
 *
 * ═══ Бирликлар аралашмайди ══════════════════════════════════════════════
 *
 * Бурғилаш (п.м), намуналаш (дона) ва канава (м³) — учта турли бирлик,
 * шунинг учун улар ҳеч қаерда битта шкалага қўйилмайди: ҳар бири алоҳида
 * карточка ва алоҳида плиткада.
 *
 * ═══ Режадан ортиқ бажарилиш ════════════════════════════════════════════
 *
 * Айрим лойиҳаларда фоиз 100 дан юқори (Лолабулоқ — бурғилаш 440%,
 * намуналаш 277%; Қоратепа-Зирабулоқ — намуналаш 329%). Бу манбадаги
 * ҳақиқий сон ва кесиб ташланмайди: сон тўлиқ ёзилади, ёнида «режадан
 * ортиқ» чипи туради. Тўлдиргич чизиқнинг ўзи 100% да тўхтайди — акс ҳолда
 * битта 440% ли қатор ёнидаги 25% ли қаторларни кўринмас қилиб қўярди.
 *
 * ═══ Ҳисобот берилмаган ≠ ноль ══════════════════════════════════════════
 *
 * Канава бўйича 15 та лойиҳанинг ҳаммасида бажарилгани кўрсатилмаган
 * (`trenchDoneReported === 0`). Бундай ҳолат «0%» эмас, «ҳисобот берилмаган»
 * деб ёзилади — акс ҳолда ишламаган деган ёлғон хулоса чиқарди.
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

/** Хэшдаги харита кўриниши — лойиҳа рақамидан фарқли ўлароқ сон эмас. */
const MAP_SUB = "map";

type GeoViewMode = "list" | "map";

/* Алмаштиргич белгилари. Ранги — `currentColor`: тугманинг ўз матни билан
   бир хил, шунинг учун танланган/танланмаган ва ёруғ/қоронғи ҳолатларнинг
   тўрттасида ҳам ўзи тўғри кўринади. Маънони матн беради, белги эмас. */
const ICON = "h-[13px] w-[13px]";

const ListIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className={ICON}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
  >
    <path d="M2.6 4h10.8M2.6 8h10.8M2.6 12h10.8" />
  </svg>
);

const MapIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className={ICON}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    <path d="M6 2.4 2 4v9.6l4-1.6 4 1.6 4-1.6V2.4l-4 1.6-4-1.6Z" />
    <path d="M6 2.4V12M10 4V13.6" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* рўйхатдаги карточка                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Рўйхатдаги битта лойиҳа — қисқа карточка.
 *
 * Карточкада атайин кам нарса бор: ном, гуруҳ, учта кўрсаткич ва ҳажм/иш
 * режаси **борлиги**. Тўлиқ маълумот (захиралар, 2026 режаси, иш режаси,
 * натижа) тафсилот саҳифасида — бир хил сонни икки жойда кўрсатиш рўйхатни
 * ўқилмас қиларди.
 *
 * Бутун карточка `<button>`: ичида бошқа босиладиган элемент йўқ, шунинг
 * учун сичқонча ва клавиатура учун битта аниқ мақсад қолади.
 */
function ProjectCard({ p, onOpen }: { p: GeoProject; onOpen: (no: number) => void }) {
  const token = GEO_GROUP_TOKEN[p.groupKey];
  return (
    <button
      type="button"
      onClick={() => onOpen(p.no)}
      className="relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-3.5 text-left shadow-card hover:border-s1"
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: token }}
      />

      <div className="flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1">
        <h3 className="min-w-0 flex-1 text-[13.5px] leading-[1.3] [font-weight:650] break-words">
          {p.shortName}
        </h3>
        <GroupChip group={p.group} groupKey={p.groupKey} />
      </div>

      <p className="mt-1 line-clamp-2 text-[11.5px] leading-[1.45] text-ink-3">{p.name}</p>

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-grid pt-2.5">
        <Metric label="Қиймати" value={p.cost === null ? null : exact(p.cost)} unit="млн $" />
        <Metric label="Тугаш йили" value={p.endYear === null ? null : String(p.endYear)} />
        <Metric label="Ҳудуд" value={p.region} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Pill>{p.category}</Pill>
        <Pill>{p.direction}</Pill>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
        {/* Нима борлиги — қаторнинг ўзи: манбада йўқ нарса «0» бўлиб
            кўринмаслиги учун йўқлиги ҳам ёзилади. */}
        {p.progress === null ? (
          <Pill>иш режаси йўқ</Pill>
        ) : (
          <Pill status={p.progress.done > 0 ? "good" : "mute"}>
            иш режаси {p.progress.done}/{p.progress.total}
          </Pill>
        )}
        {p.volume ? <Pill>2026 ҳажми бор</Pill> : <Pill>2026 ҳажми йўқ</Pill>}
        <span className="flex-1" />
        <span className="text-[11px] font-semibold tracking-[0.06em] text-s1 uppercase">
          Батафсил →
        </span>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function GeologyPanel() {
  const q = useQuery("geology-dashboard", (s) => getGeologyDashboard(s));
  return (
    <Loader q={q} height={360} notAvailableWhat="/geology-projects/dashboard">
      {(data) => <GeologyBody data={data} />}
    </Loader>
  );
}

function GeologyBody({ data }: { data: GeologyDashboard }) {
  const uid = useId();
  const p = usePalette();
  const v = useMemo(() => geologyView(data), [data]);
  const [filter, setFilter] = useState<GeoFilter>(GEO_FILTER_EMPTY);

  // Очиқ лойиҳа — хэшнинг иккинчи сегментида (`#geology/12`), рўйхат ҳолати
  // эса шу компонентда. Шунинг учун тафсилотдан қайтганда фильтр ва қидирув
  // ўз ҳолича қолади: рўйхат қайта монтаж қилинмайди.
  const [sub, goSub] = useHashSub("geology");
  const mode: GeoViewMode = sub === MAP_SUB ? "map" : "list";
  const open = mode === "map" ? null : geoProjectByNo(v.projects, sub);

  const shown = useMemo(() => geoFilter(v.projects, filter), [v.projects, filter]);
  // Ҳажм йиғиндиси кўринаётган лойиҳалардан: фильтр бўш бўлганда бу
  // `summary.volumes2026` билан айнан бир хил сон беради.
  const vt = useMemo(() => geoVolumeTotals(shown), [shown]);
  const dirty = geoFilterDirty(filter);
  const t = v.totals;

  // Мавжуд бўлмаган лойиҳага ҳавола (эскирган ёки нотўғри рақам) хатога олиб
  // келмайди — манзил жимгина рўйхатга тушади. `replace`, чунки бундай ёзув
  // тарихда қолмаслиги керак. `map` — ҳақиқий кўриниш, тозаланмайди.
  useEffect(() => {
    if (sub !== null && sub !== MAP_SUB && open === null) goSub(null, true);
  }, [sub, open, goSub]);

  if (open) {
    // Олдинги/кейинги — фильтрланган рўйхат бўйича: экранда кўринмаётган
    // лойиҳага ўтиб кетмаслик учун.
    const i = shown.findIndex((x) => x.id === open.id);
    return (
      <GeologyProjectDetail
        p={open}
        index={i}
        count={shown.length}
        prev={i > 0 ? shown[i - 1] : null}
        next={i >= 0 && i < shown.length - 1 ? shown[i + 1] : null}
        onOpen={(no) => goSub(String(no))}
        onBack={() => goSub(null)}
        asOf={v.asOf}
        source={v.source}
      />
    );
  }

  const set = <K extends keyof GeoFilter>(k: K, val: GeoFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: val }));

  /** Кесим қаторлари: «кўрсатилмаган» гуруҳи нейтрал рангда. */
  const barRows = (slices: GeoSlice[]) =>
    slices.map((s) => ({
      label: s.name,
      v: s.value,
      color: s.muted ? p["ink-3"] : p.s1,
      extra: ["Улуш", pctTxt((s.value / t.projects) * 100)] as [string, string],
    }));

  const drillT = t.metrics[0];
  const sampleT = t.metrics[1];

  return (
    <>
      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section title="Геология лойиҳалари" note={`${dateLabel(v.asOf)} ҳолатига`}>
        <div className={GRID.g6}>
          <StatTile
            label="Жами лойиҳалар"
            value={nf(t.projects)}
            unit="та"
            stripe="var(--s1)"
            foot={<Pill>{t.works} та иш · {t.worksProjects} лойиҳада</Pill>}
          />
          <StatTile
            label="Шакллантирилаётган"
            value={nf(t.forming)}
            unit="та"
            stripe={GEO_GROUP_TOKEN.forming}
          />
          <StatTile
            label="Бошқарилаётган"
            value={nf(t.managed)}
            unit="та"
            stripe={GEO_GROUP_TOKEN.managed}
          />
          <StatTile
            label="Жами қиймат"
            value={exact(t.costTotal)}
            unit="млн $"
            stripe="var(--s3)"
            foot={
              <>
                <Pill>{t.costWith} та лойиҳада кўрсатилган</Pill>
                {t.costWithout > 0 && <Pill status="warn">{t.costWithout} тада йўқ</Pill>}
              </>
            }
          />
          <StatTile
            label="2026 бурғилаш режа"
            value={exact(drillT.plan)}
            unit={drillT.unit}
            stripe="var(--s4)"
            foot={
              drillT.noReport ? (
                <Pill>ҳисобот берилмаган</Pill>
              ) : (
                <>
                  {/* Ҳолат ранги йўқ: манба — йил ўртасидаги кесим, «шу
                      санагача қанча бўлиши керак эди» деган режа эса унда
                      йўқ. 25% ни қизил қилиш манбада бўлмаган баҳо бўларди. */}
                  <Pill>бажарилди {pctTxt(drillT.pct)}</Pill>
                  <span className="text-ink-3">{exact(drillT.done)} {drillT.unit}</span>
                </>
              )
            }
          />
          <StatTile
            label="2026 намуналаш режа"
            value={exact(sampleT.plan)}
            unit={sampleT.unit}
            stripe="var(--s5)"
            foot={
              sampleT.noReport ? (
                <Pill>ҳисобот берилмаган</Pill>
              ) : (
                <>
                  <Pill>бажарилди {pctTxt(sampleT.pct)}</Pill>
                  <span className="text-ink-3">{exact(sampleT.done)} {sampleT.unit}</span>
                </>
              )
            }
          />
        </div>
      </Section>

      {/* --- 2. кесимлар ---------------------------------------------------- */}
      <Section title="Кесимлар">
        <div className={GRID.g23}>
          <Card title="Тоифалар бўйича" sub={`${t.projects} лойиҳа`}>
            <ShareDonut
              segments={v.byCategory}
              total={t.projects}
              centerNote="лойиҳа"
              ariaLabel="Лойиҳаларнинг тоифалар бўйича тақсимоти"
            />
          </Card>
          <Card title="Йўналишлар бўйича" sub={`${v.byDirection.length} йўналиш`}>
            <BarsH
              rows={barRows(v.byDirection)}
              vName="Лойиҳалар"
              vFmt={(n) => nf(n)}
              ariaLabel="Лойиҳаларнинг йўналишлар бўйича тақсимоти"
            />
          </Card>
        </div>

        <div className={`${GRID.g32} mt-3`}>
          <Card title="Ҳудудлар бўйича" sub={`${v.byRegion.length} қатор`}>
            <BarsH
              rows={barRows(v.byRegion)}
              vName="Лойиҳалар"
              vFmt={(n) => nf(n)}
              ariaLabel="Лойиҳаларнинг ҳудудлар бўйича тақсимоти"
            />
          </Card>
          <Card title="Тугаш йили бўйича" sub={`${t.projects} лойиҳа`}>
            <Columns
              labels={v.byEndYear.map((s) => s.name)}
              series={[{ name: "Лойиҳалар", color: p.s1, values: v.byEndYear.map((s) => s.value) }]}
              height={200}
              yTickFmt={(n) => nf(n)}
              yWidth={34}
              vFmt={(n) => nf(n)}
              valueLabel={(_, i) => nf(v.byEndYear[i].value)}
              ariaLabel="Лойиҳаларнинг тугаш йили бўйича тақсимоти"
            />
          </Card>
        </div>
      </Section>

      {/* --- 3. лойиҳалар рўйхати ------------------------------------------- */}
      <Section title="Лойиҳалар">
        {/* Кўриниш алмаштиргичи фильтрлардан юқорида ва улардан ажратилган:
            фильтр иккала кўринишга ҳам бир хил таъсир қилади, шунинг учун у
            «рўйхатнинг фильтри» эмас, бўлимнинг фильтри. */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
          <SegmentSwitch<GeoViewMode>
            label="Лойиҳалар кўриниши"
            options={[
              { id: "list", label: "Рўйхат", icon: <ListIcon /> },
              { id: "map", label: "Харита", icon: <MapIcon /> },
            ]}
            value={mode}
            onChange={(m) => goSub(m === "map" ? MAP_SUB : null)}
          />
          <span className="flex-1" />
          <Pill>
            {shown.length} / {t.projects} лойиҳа
          </Pill>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <SegmentSwitch<GeoGroupFilter>
            label="Гуруҳ бўйича фильтр"
            options={[
              { id: "all", label: `Барчаси (${t.projects})` },
              { id: "managed", label: `Бошқарилаётган (${t.managed})` },
              { id: "forming", label: `Шакллантирилаётган (${t.forming})` },
            ]}
            value={filter.group}
            onChange={(g) => set("group", g)}
          />

          <span className={LBL}>Тоифа</span>
          <CheckSelect
            label="Тоифа бўйича фильтр"
            options={v.facets.categories.map((c) => ({
              key: c,
              label: c,
              count: v.projects.filter((x) => x.category === c).length,
            }))}
            picked={filter.categories}
            onChange={(c) => set("categories", c)}
            emptyText="барчаси"
          />

          {/* Металл рўйхати узун (37 та қиймат), шунинг учун «Тоифа» каби
              кўп танловли рўйхат: биттадан ортиғи бирга танланади. */}
          <span className={LBL}>Металл / фойдали қазилма</span>
          <CheckSelect
            label="Металл ва фойдали қазилма бўйича фильтр"
            options={v.facets.metals.map((m) => ({
              key: m.key,
              label: m.label,
              count: m.count,
            }))}
            picked={filter.metals}
            onChange={(m) => set("metals", m)}
            emptyText="барчаси"
          />

          <label htmlFor={`${uid}-dir`} className={LBL}>
            Йўналиш
          </label>
          <select
            id={`${uid}-dir`}
            value={filter.direction}
            onChange={(ev) => set("direction", ev.target.value)}
          >
            <option value="">Барчаси</option>
            {v.facets.directions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <label htmlFor={`${uid}-reg`} className={LBL}>
            Ҳудуд
          </label>
          <select
            id={`${uid}-reg`}
            value={filter.region}
            onChange={(ev) => set("region", ev.target.value)}
          >
            <option value="">Барчаси</option>
            {v.facets.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label htmlFor={`${uid}-q`} className={LBL}>
            Қидирув
          </label>
          <input
            id={`${uid}-q`}
            type="search"
            placeholder="лойиҳа номи…"
            value={filter.query}
            onChange={(ev) => set("query", ev.target.value)}
          />

          {dirty && (
            <button
              type="button"
              onClick={() => setFilter(GEO_FILTER_EMPTY)}
              className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Фильтрни тозалаш
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title="Танланган шартга мос лойиҳа топилмади"
            text="Қидирув сўзини ёки фильтрни ўзгартиринг."
          />
        ) : mode === "map" ? (
          <GeologyMapView projects={shown} onOpenFull={(no) => goSub(String(no))} />
        ) : (
          <div className={GRID.g3}>
            {shown.map((x) => (
              <ProjectCard key={x.id} p={x} onOpen={(no) => goSub(String(no))} />
            ))}
          </div>
        )}
      </Section>

      {/* --- 4. 2026 иш ҳажмлари -------------------------------------------- */}
      {/* Бўлим фильтрдан **кейин** туради, шунинг учун у ҳам фильтрланган
          рўйхатдан ҳисобланади: қаторлар, ЖАМИ, изоҳ ва иккала плитка ҳам.
          Акс ҳолда «Олтин» танланганда пастда литий ва вольфрам қаторлари
          қолиб, фильтр ишламаётгандек кўринарди. */}
      <Section
        title="2026 иш ҳажмлари"
        note={
          <>
            {vt.projects > 0 && `${vt.projects} лойиҳада кўрсатилган · ҳар кўрсаткич ўз бирлигида`}
            {dirty && <span className="ml-2 text-s1">фильтр бўйича</span>}
          </>
        }
      >
        {vt.projects === 0 ? (
          <EmptyState title="Танланган фильтр бўйича 2026 йил иш ҳажми киритилмаган" />
        ) : (
          <>
            <div className={GRID.g3}>
              {/* Тўпламда умуман қиймати йўқ кўрсаткич («— / 0 м³») чизилмайди:
                  у ердаги ягона хабар — шовқин. */}
              {vt.metrics
                .filter((m) => m.plan !== 0 || m.done !== null)
                .map((m) => (
                  <VolumeCard key={m.key} total={m} rows={geoVolumeRows(shown, m.key)} />
                ))}
            </div>
            <div className={`${GRID.g2} mt-3`}>
              <StatTile
                label="Лаборатория таҳлили режа"
                value={exact(vt.labPlan)}
                unit="дона"
                stripe="var(--s2)"
              />
              <StatTile
                label="2026 бюджет"
                value={exact(vt.budget)}
                unit="млн $"
                stripe="var(--s3)"
                foot={<Pill>{vt.projects} лойиҳа бўйича</Pill>}
              />
            </div>
          </>
        )}
      </Section>
    </>
  );
}

/** Битта ҳажм кўрсаткичи: жами қатор, сўнг режаси бор лойиҳалар. */
function VolumeCard({
  total,
  rows,
}: {
  total: GeoVolumeMetric;
  rows: { project: GeoProject; metric: GeoVolumeMetric }[];
}) {
  return (
    <Card
      title={total.label}
      stripe="var(--s1)"
      sub={`${rows.length} лойиҳа · ${total.unit}`}
    >
      <div className="rounded-[6px] border border-hair bg-surface-2 px-2.5 py-1">
        <VolumeRow m={total} name="ЖАМИ" />
      </div>
      <div className="mt-1.5">
        {rows.length === 0 ? (
          <p className="text-[11.5px] text-ink-3">Режа кўрсатилган лойиҳа йўқ</p>
        ) : (
          rows.map((r) => (
            <VolumeRow key={r.project.id} m={r.metric} name={r.project.shortName} />
          ))
        )}
      </div>
    </Card>
  );
}
