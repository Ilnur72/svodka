import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProjectRegistryDashboard } from "../api/types";
import { getProjectRegistryDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { usePalette } from "../lib/theme";
import { exact, nf, pctTxt } from "../lib/format";
import {
  REG_FILTER_EMPTY,
  regById,
  regFilter,
  regFilterDirty,
  regGroup,
  registryView,
  type RegCluster,
  type RegFilter,
  type RegListCluster,
  type RegProject,
} from "../lib/adapters/projectRegistry";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { ShareBar } from "../components/ShareBar";
import { CheckSelect } from "../components/CheckSelect";
import { DataTable, type Row } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";
import { registryMapVM } from "../lib/adapters/registryMap";
import { Muted, Num, SourceDot } from "./projectRegistry/parts";
import { RegistryMap } from "./projectRegistry/RegistryMap";
import { RegistryPlaceModal } from "./projectRegistry/RegistryPlaceModal";
import { RegistryProjectDetail } from "./projectRegistry/RegistryProjectDetail";

/**
 * «Лойиҳалар реестри 2026–2030» — `ТМК_Лойиҳалари_16_09_2026…xlsx` дан
 * 144 та лойиҳа, 9 кластер, 17 йўналиш.
 *
 * ═══ Ёнидаги «Инвестиция дастури» билан адашмасин ═══════════════════════
 *
 * Иккови ҳам 2026–2030 йиллар лойиҳалари ва улар кўп жойда устма-уст тушади
 * (88 лойиҳадан 82 таси шу реестрда ҳам бор). Фарқи — манба ва қамров:
 *
 *   `investdeck` — PPTX тақдимот, 03.08.2026, 88 лойиҳа. Ҳар бирида KPI,
 *                  бажариладиган ишлар рўйхати ва йиллар бўйича молия жадвали.
 *   `registry`   — XLSX реестр, 16.09.2026, 144 лойиҳа, 9 кластер. Ҳар бирида
 *                  ОПЕРАЦИОН устунлар: бажарилиш %, ТИА/қурилиш ҳужжатлари,
 *                  инфратузилма, ишга тушириш санаси, масъул шахс.
 *
 * Улар атайин бирлаштирилмаган — бу фойдаланувчининг қарори. Бу фарқ энди
 * интерфейсда ёзилмайди (фойдаланувчи талаби билан манба баннери олиб
 * ташланган) — сарлавҳа остида фақат реестр санаси ва «XLSX реестр» қолди.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: лойиҳалар, кластерлар, умумий қиймат, иш ўринлари.
 *  2. Кластер кесими — **асосий навигация**: учта диаграмма (ҳар бири ўз
 *     бирлигида, алоҳида карточкада) ва кластер → йўналиш дарахти. Кластер
 *     босилса пастдаги рўйхат шу кластерга фильтрланади.
 *  3. Молиялаштириш манбалари.
 *  4. География — харита. Иккинчи навигация: маркер босилса рўйхат шу
 *     нуқтадаги лойиҳаларга фильтрланади.
 *  5. Лойиҳалар рўйхати — кластер → йўналиш бўйича гуруҳланган.
 *
 * ═══ Харита: битта маркер — битта НУҚТА ═════════════════════════════════
 *
 * Координата бэкенддан келади (`lat`/`lon`, `Ҳудуди` устунидаги матндан
 * аниқланган) ва у **туман/шаҳар маркази**. Шу сабабли 133 лойиҳа атиги 20
 * нуқтага тушади — фақат Чирчиқда 63 та. Ҳар бир лойиҳа алоҳида маркер
 * бўлса экран ёлғон гапирарди, шунинг учун маркерлар нуқта бўйича
 * ЙИҒИЛАДИ (`lib/adapters/registryMap.ts`), нуқта эса ҳеч қаерга
 * силжитилмайди ва номдан тахмин қилинмайди. Хаританинг ўзи —
 * `panels/investMap/MapCanvas`, янгиси ёзилмаган.
 *
 * «Маълумот сифати» ва «Маълумот тўлиқлиги» бўлимлари фойдаланувчи талаби
 * билан олиб ташланган. Адаптердаги `quality` ва `filled` ҳисоби ЖОЙИДА
 * қолди: `quality.emptyColumns` тафсилот ойнасига узатилади (унда «реестрда
 * бу устун бўш» белгиси шундан келади).
 *
 * ═══ Бирликлар аралашмайди ══════════════════════════════════════════════
 *
 * Кластер кесимида учта ўлчов бор: лойиҳалар сони (та), қиймат (млн $) ва
 * иш ўринлари (та). Улар ҳеч қаерда битта шкалага қўйилмайди ва иккинчи Y ўқи
 * ясалмайди — ҳар бири ўз карточкасида.
 *
 * ═══ «Кўрсатилмаган» ≠ «нол» ════════════════════════════════════════════
 *
 * Реестр жуда нотекис тўлдирилган. Бўш катак нол билан ҳам, «—» билан жимгина
 * ҳам тўлдирилмайди: ёзилади, ва ҳар бир кўрсаткич ёнида **нечта лойиҳадан**
 * ҳисоблангани туради. Ўртача ҳисоблаш 3/144 тўлган устунда йўлдан урарди —
 * шунинг учун бўлимда ўртача умуман йўқ.
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

/* -------------------------------------------------------------------------- */
/* кластер дарахти                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Битта кластер: ўзи, сўнг йўналишлари ичкарига сурилган ҳолда.
 *
 * Кластер номи — тугма: босилса рўйхат шу кластерга фильтрланади. Бу бўлимнинг
 * асосий навигацияси: 144 лойиҳа битта текис рўйхатда ўқилмайди.
 */
function ClusterRow({
  c,
  share,
  picked,
  onPick,
}: {
  c: RegCluster;
  share: number;
  picked: boolean;
  onPick: (name: string) => void;
}) {
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => onPick(c.name)}
        aria-pressed={picked}
        className="flex w-full cursor-pointer flex-wrap items-baseline gap-x-2.5 gap-y-1 text-left"
      >
        {c.no && (
          <span className="flex-none font-mono text-[11px] text-ink-3">{c.no}</span>
        )}
        <span
          className={
            "min-w-0 flex-1 text-[12.5px] leading-[1.35] break-words " +
            (picked ? "text-s1 [font-weight:680]" : "[font-weight:650]")
          }
        >
          {c.name}
        </span>
        <span className="flex-none font-mono text-[12px] tabular-nums text-ink-2">
          {nf(c.projects)}
          <span className="ml-1 font-sans text-[11px] text-ink-3">та</span>
        </span>
        <span className="w-[112px] flex-none text-right font-mono text-[12px] tabular-nums">
          <Num v={c.totalCost} unit="млн $" />
        </span>
        <span className="w-[104px] flex-none text-right font-mono text-[12px] tabular-nums">
          <Num v={c.jobs} unit="иш ўрни" />
        </span>
      </button>

      {/* Улуш чизиғи — фақат лойиҳалар сони бўйича (пул эмас): иккита ўлчов
          битта чизиқда аралашмаслиги учун. */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className="absolute inset-y-0 left-0 rounded-[3px] bg-s1"
            style={{ width: `${share.toFixed(2)}%` }}
          />
        </span>
        <span className="w-[48px] flex-none text-right font-mono text-[11px] tabular-nums text-ink-3">
          {pctTxt(share)}
        </span>
      </div>

      <ul className="mt-1.5 flex flex-col gap-1 border-l border-rule pl-3">
        {c.directions.map((d) => (
          <li
            key={d.key}
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[12px]"
          >
            {d.no && <span className="flex-none font-mono text-[10.5px] text-ink-3">{d.no}</span>}
            <span className="min-w-0 flex-1 break-words text-ink-2">
              {d.name ?? <Muted>йўналиш кўрсатилмаган</Muted>}
            </span>
            <span className="flex-none font-mono tabular-nums text-ink-2">
              {nf(d.projects)}
              <span className="ml-1 font-sans text-[11px] text-ink-3">та</span>
            </span>
            <span className="w-[112px] flex-none text-right font-mono tabular-nums text-ink-2">
              <Num v={d.totalCost} unit="млн $" />
            </span>
            <span className="w-[104px] flex-none text-right font-mono tabular-nums text-ink-2">
              <Num v={d.jobs} unit="иш ўрни" />
            </span>
          </li>
        ))}
      </ul>

      {/* Манбанинг ўз гуруҳ қатори билан солиштирув. Гуруҳ қатори лойиҳа эмас
          ва ҳеч қандай йиғиндига қўшилмайди — у фақат текшириш учун. */}
      {!c.matches && (
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
          ⚠ Манбадаги гуруҳ қаторида: {c.declaredProjects === null ? "—" : nf(c.declaredProjects)}{" "}
          та, {c.declaredTotalCost === null ? "—" : exact(c.declaredTotalCost)} млн $,{" "}
          {c.declaredJobs === null ? "—" : nf(c.declaredJobs)} иш ўрни — ҳисобланган билан мос
          келмади.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* рўйхатдаги қатор                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Битта лойиҳа — ихчам қатор.
 *
 * Атайин кам нарса: `Т/р`, ном, тури, умумий қиймат, иш ўринлари ва муддат.
 * Қолган 130 дан ортиқ устун тафсилот ойнасида — рўйхатда уларни кўрсатиш
 * 144 қаторни ўқиб бўлмас ҳолга келтирарди.
 */
function ProjectRow({ p, onOpen }: { p: RegProject; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="flex w-full cursor-pointer flex-col gap-1 border-t border-grid px-1 py-2 text-left first:border-t-0 hover:bg-surface-2"
    >
      <div className="flex w-full flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="w-[30px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {p.ordinal === null ? "—" : nf(p.ordinal)}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] [font-weight:600] break-words">
          {p.name}
        </span>
        <span className="w-[112px] flex-none text-right font-mono text-[12px] tabular-nums">
          <Num v={p.totalCost} unit="млн $" />
        </span>
        <span className="w-[104px] flex-none text-right font-mono text-[12px] tabular-nums">
          <Num v={p.jobs} unit="иш ўрни" />
        </span>
      </div>
      <div className="flex w-full flex-wrap items-center gap-1.5 pl-[40px]">
        <Pill>{p.kind}</Pill>
        {p.deadline && <Pill>{p.deadline}</Pill>}
        {p.progressPercent !== null && (
          <Pill status="warn">бажарилиш {exact(p.progressPercent)}%</Pill>
        )}
        {p.financeGap !== null && (
          <Pill status="crit">молия фарқи {exact(p.financeGap)} млн $</Pill>
        )}
        {p.responsible === null && <Pill status="warn">масъул шахс кўрсатилмаган</Pill>}
      </div>
    </button>
  );
}

/** Рўйхатнинг битта кластер блоки — ичида йўналиш сарлавҳалари. */
function ListCluster({ c, onOpen }: { c: RegListCluster; onOpen: (id: number) => void }) {
  return (
    <Card
      className="mt-3 first:mt-0"
      title={
        <>
          {c.no && <span className="mr-2 font-mono text-[11px] text-ink-3">{c.no}</span>}
          {c.cluster}
        </>
      }
      sub={
        <>
          {nf(c.projects)} лойиҳа ·{" "}
          {c.totalCost === null ? "қиймати кўрсатилмаган" : `${exact(c.totalCost)} млн $`}
        </>
      }
    >
      {c.groups.map((g) => (
        <div key={g.key} className="mt-2.5 first:mt-0">
          <div className="flex flex-wrap items-baseline gap-2 border-b border-rule pb-1">
            {g.directionNo && (
              <span className="font-mono text-[10.5px] text-ink-3">{g.directionNo}</span>
            )}
            <span className="min-w-0 flex-1 text-[11.5px] [font-weight:650] tracking-[0.04em] text-ink-2 uppercase">
              {g.direction ?? "Йўналиш кўрсатилмаган"}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-ink-3">
              {nf(g.rows.length)} та
              {g.totalCost !== null && ` · ${exact(g.totalCost)} млн $`}
            </span>
          </div>
          {g.rows.map((p) => (
            <ProjectRow key={p.id} p={p} onOpen={onOpen} />
          ))}
        </div>
      ))}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function ProjectRegistryPanel() {
  const q = useQuery("project-registry-dashboard", (s) => getProjectRegistryDashboard(s));
  return (
    <Loader q={q} height={420} notAvailableWhat="/project-registry/dashboard">
      {(data) => <RegistryBody data={data} />}
    </Loader>
  );
}

function RegistryBody({ data }: { data: ProjectRegistryDashboard }) {
  const uid = useId();
  const pal = usePalette();
  const v = useMemo(() => registryView(data), [data]);
  const [filter, setFilter] = useState<RegFilter>(REG_FILTER_EMPTY);
  const listRef = useRef<HTMLDivElement>(null);
  /**
   * Очиқ турган НУҚТА ойнаси (`RegProject.placeKey`).
   *
   * ⚠️ Бу харитадаги танловдан (`filter.places`) АЛОҲИДА ҳолат ва улар
   * атайин бир хил эмас: ойна ёпилгач танлов ҳам, рўйхат фильтри ҳам ўз
   * жойида қолади (маркер ёниб туради, рўйхат устида чип кўринади). Иккови
   * битта ҳолатда сақланса, ойнани ёпиш фильтрни ҳам бекор қилар эди.
   */
  const [placeOpen, setPlaceOpen] = useState<string | null>(null);
  /**
   * Лойиҳа тафсилоти НУҚТА ойнасидан очилган бўлса — қайси нуқтадан.
   * Фақат шунда тафсилот устида «← ортга» тугмаси чизилади.
   */
  const [placeBack, setPlaceBack] = useState<string | null>(null);

  /**
   * Харита ДОИМ барча лойиҳалардан ясалади, фильтрланганидан эмас.
   *
   * ⚠️ Бу атайин: `MapCanvas` `vm` ўзгарганда MapLibre объектини бутунлай
   * қайта яратади (маркерлар, плиткалар, кўриниш). Харита фильтрга
   * боғланганда маркер босилиши ўша фильтрни ўзгартирар, у эса хаританинг
   * ўзини қайта юклаб, зум ва суриш ҳолатини йўқотарди. Фильтр бир
   * йўналишда оқади: харита → рўйхат.
   */
  const mapVm = useMemo(
    () => registryMapVM(v.projects, import.meta.env.BASE_URL),
    [v.projects],
  );

  // Очиқ лойиҳа — хэшнинг иккинчи сегментида (`#registry/61`), рўйхат ҳолати
  // эса шу компонентда. Шунинг учун ойна ёпилганда фильтр ва қидирув ўз
  // ҳолича қолади: рўйхат қайта монтаж қилинмайди.
  const [sub, goSub] = useHashSub("registry");
  const open = regById(v.projects, sub);

  const shown = useMemo(() => regFilter(v.projects, filter), [v.projects, filter]);
  const groups = useMemo(() => regGroup(shown), [shown]);
  const dirty = regFilterDirty(filter);
  const t = v.totals;

  // Мавжуд бўлмаган лойиҳага ҳавола (эскирган ёки нотўғри id) хатога олиб
  // келмайди — манзил жимгина рўйхатга тушади. `replace`, чунки бундай ёзув
  // тарихда қолмаслиги керак.
  useEffect(() => {
    if (sub !== null && open === null) goSub(null, true);
  }, [sub, open, goSub]);

  /**
   * Тафсилот ёпилиши билан «← ортга» нинг мўлжали ҳам ўчади.
   *
   * Эффект керак, чунки ёпилиш ЙЎЛЛАРИ битта эмас: «Ёпиш», `Esc`, перда,
   * ва браузернинг «орқага» тугмаси (хэш `#registry/61` → `#registry`).
   * Охиргиси компонентдан ташқарида содир бўлади — уни фақат шу ердан
   * тутиш мумкин. Усиз мўлжал сақланиб қолар ва кейинроқ РЎЙХАТдан
   * очилган лойиҳада ҳам ёлғон «← ортга» кўринарди.
   */
  useEffect(() => {
    if (sub === null) setPlaceBack(null);
  }, [sub]);

  const pickCluster = (name: string) => {
    setFilter((f) => ({
      ...f,
      clusters: f.clusters.length === 1 && f.clusters[0] === name ? [] : [name],
    }));
    listRef.current?.scrollIntoView({ block: "start" });
  };

  /**
   * Танланган нуқта — алоҳида `useState` ЭМАС, фильтрнинг ўзи.
   *
   * Иккита ҳолат бўлганда улар ажралиб кетарди: карточка бир нуқтани
   * кўрсатиб турганда рўйхат бошқасига фильтрланган бўлиши мумкин эди.
   * Ягона манба буни умуман имконсиз қилади. Хаританинг бўш жойи босилса
   * `MapCanvas` `null` беради — карточка ҳам, фильтр ҳам бирга бекор бўлади.
   *
   * ⚠️ Бу ерда `listRef.scrollIntoView` ЙЎҚ: харитани кўздан кечираётган
   * фойдаланувчи ҳар маркер босилишида саҳифа сакрашини кутмайди.
   */
  const place = filter.places[0] ?? null;
  const placeName = mapVm.pins.find((p) => p.id === place)?.name ?? null;
  const pickPlace = (key: string | null) => {
    setFilter((f) => ({ ...f, places: key === null ? [] : [key] }));
    // Маркер босилса нуқтанинг ТЎЛИҚ рўйхати ойнада очилади — 63 лойиҳали
    // нуқта харита устидаги карточкага сиғмайди. Хаританинг бўш жойи
    // босилганда (`key === null`) ойна ҳам ёпилади.
    setPlaceOpen(key);
  };

  const openPlace = placeOpen === null ? null : (mapVm.placeList.find((p) => p.key === placeOpen) ?? null);
  const backPlace = placeBack === null ? null : (mapVm.placeList.find((p) => p.key === placeBack) ?? null);

  /**
   * Нуқта ойнасидан лойиҳа тафсилотига ўтиш — ойналар АЛМАШАДИ, устма-уст
   * турмайди (сабаби: `RegistryProjectDetail` → `back`). Қайтиш йўли
   * `placeBack` да сақланади.
   */
  const openFromPlace = (id: number) => {
    setPlaceBack(placeOpen);
    setPlaceOpen(null);
    goSub(String(id));
  };

  // Диаграмма қаторлари: учта ўлчов — учта алоҳида карточка.
  const countRows = v.clusters.map((c) => ({
    label: c.name,
    v: c.projects,
    extra: ["Улуш", pctTxt((c.projects / Math.max(1, t.projects)) * 100)] as [string, string],
  }));
  // Қиймати кўрсатилмаган кластер диаграммага тушмайди: `null` ни нолга
  // айлантириш «маблағ ажратилмаган» деган ёлғон хулоса берарди.
  const costRows = v.clusters
    .filter((c) => c.totalCost !== null)
    .map((c) => ({
      label: c.name,
      v: c.totalCost as number,
      color: pal.s3,
      extra: ["Лойиҳалар", `${nf(c.projects)} та`] as [string, string],
    }));
  const jobRows = v.clusters
    .filter((c) => c.jobs !== null)
    .map((c) => ({
      label: c.name,
      v: c.jobs as number,
      color: pal.s2,
      extra: ["Лойиҳалар", `${nf(c.projects)} та`] as [string, string],
    }));
  const jobsHidden = v.clusters.length - jobRows.length;

  const sourceRows: Row[] = v.sources.map((s) => ({
    key: s.key,
    cells: [
      <span key="n" className="inline-flex items-center gap-2">
        <SourceDot color={s.color} />
        {s.label}
      </span>,
      s.total === null ? <Muted key="v">—</Muted> : exact(s.total),
      s.total === null || v.sourcesTotal === null ? "—" : pctTxt((s.total / v.sourcesTotal) * 100),
      s.empty ? <Muted key="c">устун бўш</Muted> : nf(s.projects),
    ],
  }));

  const noDirection = v.projects.filter((p) => p.direction === null).length;

  return (
    <>
      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section
        title="Лойиҳалар реестри 2026–2030"
        note={v.asOf ? `${v.asOf} ҳолатига · XLSX реестр` : "XLSX реестр"}
      >
        <div className={GRID.g4}>
          <StatTile
            label="Жами лойиҳалар"
            value={nf(t.projects)}
            unit="та"
            stripe="var(--s1)"
            foot={<Pill>реестрдаги ҳар бир қатор</Pill>}
          />
          <StatTile
            label="Кластерлар"
            value={nf(t.clusters)}
            unit="та"
            stripe="var(--s2)"
            foot={
              <>
                <Pill>{t.directions} йўналиш</Pill>
                {noDirection > 0 && (
                  <Pill status="warn">{noDirection} лойиҳада йўналиш йўқ</Pill>
                )}
              </>
            }
          />
          <StatTile
            label="Умумий қиймати"
            value={exact(t.totalCost)}
            unit="млн $"
            stripe="var(--s3)"
            foot={
              <>
                <Pill>144 / 144 лойиҳада кўрсатилган</Pill>
                {t.declaredTotalCost !== null && (
                  <Pill status={t.matches ? "good" : "warn"}>
                    манбадаги «ЖАМИ» {t.matches ? "мос келди" : "мос келмади"}
                  </Pill>
                )}
              </>
            }
          />
          <StatTile
            label="Иш ўринлари"
            value={t.jobs === null ? <Muted /> : nf(t.jobs)}
            unit="та"
            stripe="var(--s4)"
            foot={
              <>
                <Pill>
                  {t.jobsFilled} / {t.projects} лойиҳада кўрсатилган
                </Pill>
                {t.projects - t.jobsFilled > 0 && (
                  <Pill status="warn">{t.projects - t.jobsFilled} тада йўқ</Pill>
                )}
              </>
            }
          />
        </div>
      </Section>

      {/* --- 2. кластер кесими --------------------------------------------- */}
      <Section
        title="Кластерлар ва йўналишлар"
        note="бўлимнинг асосий кесими — кластер номи босилса пастдаги рўйхат фильтрланади"
      >
        <div className={GRID.g3}>
          <Card title="Лойиҳалар сони" sub={`${v.clusters.length} кластер`}>
            <BarsH
              rows={countRows}
              vName="Лойиҳалар"
              vFmt={(n) => nf(n)}
              ariaLabel="Лойиҳаларнинг кластерлар бўйича тақсимоти"
            />
          </Card>
          <Card title="Умумий қиймати" sub="млн $">
            <BarsH
              rows={costRows}
              vName="Умумий қиймат, млн $"
              ariaLabel="Умумий қийматнинг кластерлар бўйича тақсимоти"
            />
          </Card>
          <Card
            title="Иш ўринлари"
            sub="та"
            note={
              jobsHidden > 0
                ? `${jobsHidden} та кластерда биронта лойиҳада ҳам иш ўрни кўрсатилмаган — улар диаграммада йўқ (нол эмас, маълумот йўқ).`
                : undefined
            }
          >
            <BarsH
              rows={jobRows}
              vName="Иш ўринлари"
              vFmt={(n) => nf(n)}
              ariaLabel="Иш ўринларининг кластерлар бўйича тақсимоти"
            />
          </Card>
        </div>

        <Card
          className="mt-3"
          title="Кластер → йўналиш → лойиҳа"
          sub={`${v.clusters.length} кластер · ${t.directions} йўналиш · ${t.projects} лойиҳа`}
          note="Йўналиш ихтиёрий: Литий, R&D, Рақамлаштириш ва Кадрлар кластерларида у умуман йўқ. ⚠ «Келажак металлари технопарки» да йўналиш устунида технологик босқич эмас, ЖОЙЛАШУВ турибди («Чирчиқ шаҳрида») — манбада шундай."
        >
          {v.clusters.map((c) => (
            <ClusterRow
              key={c.key}
              c={c}
              share={(c.projects / Math.max(1, t.projects)) * 100}
              picked={filter.clusters.length === 1 && filter.clusters[0] === c.name}
              onPick={pickCluster}
            />
          ))}
        </Card>
      </Section>

      {/* --- 3. молиялаштириш манбалари ------------------------------------- */}
      <Section
        title="Молиялаштириш манбалари"
        note={`${t.financeFilled} / ${t.projects} лойиҳада кўрсатилган`}
      >
        <div className={GRID.g23}>
          <Card
            title="Манбалар улуши"
            sub={v.sourcesTotal === null ? undefined : `${exact(v.sourcesTotal)} млн $`}
          >
            {v.sources.filter((s) => s.total !== null).length === 0 ? (
              <EmptyState title="Манбалар бўйича сумма кўрсатилмаган" />
            ) : (
              <ShareBar
                parts={v.sources
                  .filter((s) => s.total !== null)
                  .map((s) => ({ name: s.label, value: s.total as number, color: s.color }))}
              />
            )}

            {/* Манбалар йиғиндиси умумий қийматдан кичик — бу НОРМАЛ: 144
                лойиҳанинг фақат 91 тасида манба кўрсатилган. Фарқни «камомад»
                деб ўқимаслик учун бу очиқ ёзилади. */}
            <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
              Манбалар бўйича йиғинди{" "}
              <b className="font-mono font-semibold text-ink-2">{exact(v.sourcesTotal)}</b> млн $ —
              бу реестрнинг умумий қийматидан (
              <b className="font-mono font-semibold text-ink-2">{exact(t.totalCost)}</b> млн $)
              кичик, чунки {t.projects - t.financeFilled} та лойиҳада молиялаштириш манбаси умуман
              кўрсатилмаган. Бу камомад эмас — «кўрсатилмаган».
            </p>
          </Card>

          <Card title="Манбалар кесими" sub="улуш манбалар йиғиндисига нисбатан">
            <DataTable
              cols={[
                { t: "Манба" },
                { t: "Сумма, млн $", num: true },
                { t: "Улуши", num: true },
                { t: "Лойиҳалар", num: true },
              ]}
              rows={sourceRows}
              caption="Молиялаштириш манбалари бўйича йиғинди"
            />
            <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
              «Лойиҳалар» — манба нечта лойиҳада кўрсатилгани. Рўйхат доим тўлиқ: манбада
              бутунлай бўш устунлар ҳам кўрсатилади ва «устун бўш» деб белгиланади — уларни
              нол билан тўлдириш «маблағ ажратилмаган» деган ёлғон хулоса берарди.
            </p>
          </Card>
        </div>
      </Section>

      {/* --- 4. география --------------------------------------------------- */}
      <Section
        title="Лойиҳалар географияси"
        note="иккинчи кесим — маркер босилса нуқтадаги барча лойиҳалар ойнада очилади ва пастдаги рўйхат ҳам шу нуқтага фильтрланади"
      >
        <RegistryMap
          vm={mapVm}
          selected={place}
          onSelect={pickPlace}
          onOpen={(id) => goSub(String(id))}
        />
      </Section>

      {/* --- 5. лойиҳалар рўйхати ------------------------------------------- */}
      <div ref={listRef}>
        <Section title="Лойиҳалар">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className={LBL}>Кластер</span>
            <CheckSelect
              label="Кластер бўйича фильтр"
              options={v.facets.clusters.map((c) => ({
                key: c.key,
                label: c.label,
                count: c.count,
              }))}
              picked={filter.clusters}
              onChange={(c) => setFilter((f) => ({ ...f, clusters: c }))}
              emptyText="барчаси"
            />

            <span className={LBL}>Лойиҳа тури</span>
            <CheckSelect
              label="Лойиҳа тури бўйича фильтр"
              options={v.facets.kinds.map((k) => ({
                key: k.key,
                label: k.label,
                count: k.count,
              }))}
              picked={filter.kinds}
              onChange={(k) => setFilter((f) => ({ ...f, kinds: k }))}
              emptyText="барчаси"
            />

            <label htmlFor={`${uid}-q`} className={LBL}>
              Қидирув
            </label>
            <input
              id={`${uid}-q`}
              type="search"
              placeholder="лойиҳа номи, ҳудуд, масъул…"
              value={filter.query}
              onChange={(ev) => setFilter((f) => ({ ...f, query: ev.target.value }))}
            />

            {/* Харитадан келган фильтр — CheckSelect'да кўринмайди, шунинг
                учун у АЛОҲИДА чип билан ёзилади. Усиз рўйхат «ўз-ўзидан»
                қисқариб қолгандай кўринар ва сабабини топиб бўлмасди. */}
            {place !== null && (
              <button
                type="button"
                onClick={() => pickPlace(null)}
                aria-label="Харитадаги нуқта фильтрини олиб ташлаш"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--s1)_38%,transparent)] bg-[color-mix(in_srgb,var(--s1)_12%,transparent)] px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Харитадаги нуқта: {placeName ?? place}
                <span aria-hidden="true">✕</span>
              </button>
            )}

            {dirty && (
              <button
                type="button"
                onClick={() => setFilter(REG_FILTER_EMPTY)}
                className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                Фильтрни тозалаш
              </button>
            )}

            <span className="flex-1" />
            <Pill>
              {shown.length} / {t.projects} лойиҳа
            </Pill>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              title="Танланган шартга мос лойиҳа топилмади"
              text="Қидирув сўзини, кластер ёки лойиҳа тури фильтрини ўзгартиринг."
            />
          ) : (
            groups.map((c) => <ListCluster key={c.key} c={c} onOpen={(id) => goSub(String(id))} />)
          )}
        </Section>
      </div>

      {/* Иккита ойна ҲЕЧ ҚАЧОН бирга турмайди: нуқта ойнасидан лойиҳа
          очилганда биринчиси ёпилади (`openFromPlace`), қайтиш эса «← ортга»
          билан. Сабаби `RegistryProjectDetail` → `back` изоҳида. */}
      {openPlace && !open && (
        <RegistryPlaceModal
          place={openPlace}
          onOpenProject={openFromPlace}
          // Ойнани ёпиш ХАРИТАДАГИ танловни бекор қилмайди: маркер ёниб
          // туради, рўйхат эса ўша нуқтага фильтрланганича қолади.
          onClose={() => setPlaceOpen(null)}
        />
      )}

      {open && (
        <RegistryProjectDetail
          p={open}
          all={v.projects}
          // «Маълумот сифати» бўлими олиб ташланди, лекин бу рўйхат ойнада
          // керак: «реестрда бу устун бўш» белгиси шундан ясалади.
          emptyColumns={v.quality.emptyColumns}
          back={
            backPlace === null
              ? undefined
              : {
                  label: `${backPlace.short} · ${nf(backPlace.projects)} лойиҳа`,
                  onBack: () => {
                    goSub(null);
                    setPlaceOpen(backPlace.key);
                  },
                }
          }
          onOpen={(id) => goSub(String(id))}
          onClose={() => goSub(null)}
        />
      )}
    </>
  );
}
