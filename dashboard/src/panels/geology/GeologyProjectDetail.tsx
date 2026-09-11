import { exact, nf, pctTxt } from "../../lib/format";
import { usePalette } from "../../lib/theme";
import {
  GEO_GROUP_TOKEN,
  geoFilledMetrics,
  geoGeologyRows,
  geoKpis,
  geoPassportRows,
  geoPassportTexts,
  geoWorkYears,
  type GeoProject,
  type GeoVolumeMetric,
} from "../../lib/adapters/geology";
import { GRID } from "../../components/layout";
import { Pill } from "../../components/Pill";
import { Columns } from "../../components/Columns";
import { PercentRing } from "../../components/PercentRing";
import { DataTable } from "../../components/DataTable";
import {
  FactColumns,
  FactText,
  GeoBlock,
  GeoKpiTile,
  GeoPanel,
  GeoStatusBar,
  GroupChip,
  ResultBox,
  VolumeRow,
} from "./parts";
import { GeoIcon } from "./icons";

/**
 * Битта геология лойиҳасининг тафсилот саҳифаси — «ситуацион марказ» макапи
 * бўйича: сарлавҳа қатори, учта рақамланган блок ва пастда ҳолат тасмаси.
 *
 *   1. ЛОЙИҲА ПАСПОРТИ      — маъмурий маълумот: қаерда, ким билан, қанчага
 *   2. АСОСИЙ КЎРСАТКИЧЛАР  — 2026 иш ҳажми: плиткалар, диаграмма, бажарилиш
 *   3. ГЕОЛОГИК МАЪЛУМОТЛАР — фойдали қазилма, захиралар ва иш режаси
 *
 * ═══ Макапда бор, бизда йўқ ═════════════════════════════════════════════
 *
 * Макапдаги 4- ва 5-блоклар («Лойиҳа 3D модели», «Геологик 3D модели») ўша
 * ерда ҳам бўш эди ва манбада бундай маълумот йўқ — шунинг учун улар
 * чизилмайди, ўринлари ҳам қолдирилмайди: қолган блоклар бутун кенгликни
 * эгаллайди.
 *
 * Шу сабаб билан тушириб қолдирилганлар: уchastka майдони, чуқурлик
 * оралиғи, разведка усули, литсензия рақами/муддати, лойиҳа оператори,
 * масъул раҳбар, жамоа сони, ташқи пудратчилар, маълумот ишончлилиги,
 * лойиҳа фотоси ва QR код. Буларнинг бирортаси ҳам `geology-projects`
 * жавобида йўқ, ўйлаб топилмайди. QR учун эса янги пакет қўшилмайди.
 *
 * ═══ Бўлмаган майдон умуман чизилмайди ══════════════════════════════════
 *
 * Ҳар бир лойиҳада 8–12 та катак тўлдирилмаган (ҳамкор — 14/46, молиялаш —
 * 8/46, туман — 29/46). «маълумот йўқ» қаторини ўн икки марта такрорлаш
 * саҳифани ўқилмас қиларди, шунинг учун бўш қатор рўйхатга умуман тушмайди.
 *
 * ЯГОНА истисно — 2-блокдаги ҳажм плиткалари: 31 та лойиҳада 2026 иш ҳажми
 * умуман кўрсатилмаган ва бу шунчаки «йўқ» эмас, ўқувчи билиши керак бўлган
 * ҳолат. У битта қатор ёзув билан айтилади.
 *
 * ═══ Иккита фоиз аралашмайди ════════════════════════════════════════════
 *
 * Ҳалқадаги фоиз — **иш режаси** бўйича (`Бажарилди` ишлари / жами ишлар),
 * ҳажм фоизлари эса бурғилаш/намуналаш/канава бўйича. Бу турли ўлчовлар:
 * ҳеч қаерда қўшилмайди, ўртачаси олинмайди ва битта «умумий тайёрлик»
 * сифатида кўрсатилмайди — ҳар бири ўз панелида, ўз ёрлиғи билан.
 */

export interface GeologyProjectDetailProps {
  p: GeoProject;
  /** Фильтрланган рўйхатдаги ўрни (0 дан) — топилмаса `-1`. */
  index: number;
  /** Фильтрланган рўйхат узунлиги. */
  count: number;
  prev: GeoProject | null;
  next: GeoProject | null;
  onOpen: (no: number) => void;
  onBack: () => void;
  asOf: string;
  source: string;
}

const NAV_BTN =
  "cursor-pointer rounded-[5px] border border-hair bg-surface px-2.5 py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-40";

/** Манбада қиймати кўрсатилмаган бўлимнинг ўрнидаги ягона қатор. */
function Absent({ children }: { children: string }) {
  return <p className="text-[12px] text-ink-3">{children}</p>;
}

/**
 * Битта ҳажм кўрсаткичи — ўз диаграммаси, ўз шкаласи, ўз бирлиги.
 * Учта кўрсаткич (п.м, дона, м³) ҳеч қачон битта шкалага қўйилмайди.
 *
 * Диаграмма фақат **иккала** сон бор бўлганда чизилади (қаранг: `charts`) —
 * бажарилгани кўрсатилмаган ерда «0» устуни «ишламаган» деган ёлғон хулосани
 * берарди, ёлғиз режа устуни эса юқоридаги плиткадаги сонни бошқа шаклда
 * такрорлашдан бошқа нарса бўлмасди.
 */
function MetricChart({
  m,
  plan,
  done,
  color,
}: {
  m: GeoVolumeMetric;
  plan: number;
  done: number;
  color: string;
}) {
  const values = [plan, done];
  return (
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12px] [font-weight:650]">{m.label}</span>
        <span className="font-mono text-[11px] text-ink-3">{m.unit}</span>
      </div>
      <Columns
        labels={["Режа", "Бажарилди"]}
        series={[{ name: `${m.label}, ${m.unit}`, color, values }]}
        height={168}
        thick={38}
        yWidth={46}
        vFmt={(n) => `${exact(n)} ${m.unit}`}
        valueLabel={(_, i) => exact(values[i])}
        ariaLabel={`${m.label}: 2026 йил режа ва бажарилган, ${m.unit}`}
      />
      {m.over && (
        <div className="mt-1 flex justify-center">
          <Pill status="good">режадан ортиқ — {pctTxt(m.pct)}</Pill>
        </div>
      )}
    </div>
  );
}

export function GeologyProjectDetail({
  p,
  index,
  count,
  prev,
  next,
  onOpen,
  onBack,
  asOf,
  source,
}: GeologyProjectDetailProps) {
  const pal = usePalette();
  const token = GEO_GROUP_TOKEN[p.groupKey];

  const passport = geoPassportRows(p);
  const texts = geoPassportTexts(p);
  const geology = geoGeologyRows(p);
  const kpis = geoKpis(p);
  const years = geoWorkYears(p.works);

  const metrics = p.volume ? geoFilledMetrics(p.volume) : [];
  // Диаграмма фақат солиштириладиган кўрсаткичлар учун: режа ҳам,
  // бажарилгани ҳам берилган бўлса.
  const charts = metrics.flatMap((m) =>
    m.plan !== null && m.done !== null ? [{ m, plan: m.plan, done: m.done }] : [],
  );

  /* --- 2-блок: ҳажм бажарилиши ва иш режаси ҳалқаси --------------------- */

  const volumePanel = p.volume && (
    <GeoPanel title="Ҳажм бўйича бажарилиш" sub="2026 йил" icon="gauge">
      <div className="mt-0.5">
        {metrics.map((m) => (
          <VolumeRow key={m.key} m={m} />
        ))}
      </div>
    </GeoPanel>
  );

  const progressPanel = p.progress && (
    <GeoPanel title="Лойиҳа бажарилиш даражаси" sub="иш режаси бўйича" icon="tasks">
      <div className="mt-1 flex flex-wrap items-center gap-4">
        <PercentRing
          label="Иш режаси бажарилиши"
          pct={p.progress.pct}
          color={pal.s1}
          note={`${p.progress.done} / ${p.progress.total} иш`}
        />
        {/* `min-w-[210px]` — `min-w-0` эмас: панел саҳифанинг ярмида турганда
            (721–1180px) рўйхат ҳалқанинг ёнига сиқилиб, сонлар панелдан
            чиқиб кетарди. Энди у сиқилиш ўрнига ҳалқанинг остига тушади. */}
        <div className="min-w-[210px] max-w-[360px] flex-1">
          <div className="flex justify-between gap-3 border-t border-grid py-[6px] text-[12px] first:border-t-0">
            <span className="text-ink-2">Жами ишлар</span>
            <span className="font-mono tabular-nums">{nf(p.progress.total)} та</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-grid py-[6px] text-[12px]">
            <span className="text-ink-2">Бажарилди</span>
            <span className="font-mono tabular-nums">{nf(p.progress.done)} та</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-grid py-[6px] text-[12px]">
            <span className="text-ink-2">Режада</span>
            <span className="font-mono tabular-nums">
              {nf(p.progress.total - p.progress.done)} та
            </span>
          </div>
        </div>
      </div>
    </GeoPanel>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* --- сарлавҳа қатори ------------------------------------------------ */}
      {/* Фон — гуруҳ рангидан токенлар билан аралаштирилган енгил градиент
          (`color-mix`), яъни безак. Расм эмас: манбада лойиҳа фотоси йўқ. */}
      <div
        className="relative overflow-hidden rounded-card border border-hair px-4 pt-3.5 pb-3.5 shadow-card"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${token} 14%, var(--surface)) 0%, var(--surface) 58%)`,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: token }}
        />
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span
            className="grid h-[36px] w-[36px] flex-none place-items-center rounded-[7px]"
            style={{
              background: `color-mix(in srgb, ${token} 16%, transparent)`,
              color: token,
            }}
          >
            <GeoIcon id="crystal" size={21} className="text-current" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
              <h2 className="max-w-[60ch] text-[21px] leading-[1.22] [font-weight:680] break-words">
                {p.shortName}
              </h2>
              <span className="font-mono text-[13px] text-ink-3">№ {p.no}</span>
              <GroupChip group={p.group} groupKey={p.groupKey} />
            </div>
            {/* Чиплар — рўйхат карточкаси ва харитадаги модал билан **айнан
                бир хил** иккилик: тоифа ва йўналиш. Босилган карточка билан
                очилган саҳифа бир хил белгилар билан таниб олинади. Ҳудуд бу
                ерга қўшилмайди — у паспортдаги «Жойлашуви» қатори. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill>{p.category}</Pill>
              <Pill>{p.direction}</Pill>
            </div>
          </div>

          {/* Макапдаги ўнг тугмалар («Ҳисоботлар», «Файллар») бу ерда йўқ:
              бундай функция мавжуд эмас, ишламайдиган тугма эса энг ёмон
              вариант. Ўрнида — ҳақиқатан ишлайдиган навигация. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {index >= 0 && (
              <span className="mr-0.5 font-mono text-[11.5px] text-ink-3">
                {index + 1} / {count}
              </span>
            )}
            <button
              type="button"
              disabled={!prev}
              onClick={() => prev && onOpen(prev.no)}
              className={NAV_BTN}
            >
              ← Олдинги
            </button>
            <button
              type="button"
              disabled={!next}
              onClick={() => next && onOpen(next.no)}
              className={NAV_BTN}
            >
              Кейинги →
            </button>
            <button type="button" onClick={onBack} className={NAV_BTN}>
              ← Рўйхатга
            </button>
          </div>
        </div>

        {/* Тўлиқ ном — 180 белгигача, шунинг учун сарлавҳадан алоҳида қатор.
            Макапда бу «Объект номи» бўлиб паспортда турарди; бу ерда у
            лойиҳанинг ўзини таништиргани учун сарлавҳа остида қолди ва
            паспортда такрорланмайди. */}
        <p className="mt-2.5 max-w-[120ch] border-t border-grid pt-2.5 text-[12.5px] leading-[1.55] text-ink-2 break-words">
          {p.name}
        </p>
      </div>

      {/* --- 1. лойиҳа паспорти --------------------------------------------- */}
      <GeoBlock no={1} title="Лойиҳа паспорти" sub={`${passport.length} та кўрсатилган майдон`}>
        <FactColumns rows={passport} />

        {texts.length > 0 && (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-grid pt-3">
            {texts.map((t) => (
              <FactText key={t.key} label={t.label} text={t.value} />
            ))}
          </div>
        )}

        <ResultBox text={p.result} className="mt-3" />
      </GeoBlock>

      {/* --- 2. асосий кўрсаткичлар ----------------------------------------- */}
      <GeoBlock
        no={2}
        title="Асосий кўрсаткичлар"
        sub={p.volume ? "2026 йил иш ҳажми" : undefined}
      >
        {/* Плиткалар сони лойиҳадан лойиҳага 1 дан 5 гача ўзгаради (Лолабулоқда
            иккита, Карманада бешта), лекин устун шаблони **доим битта**:
            «Олдинги/Кейинги» билан ўтганда плитка ўлчами сакрамаслиги керак.
            Тўлмаган жой ўнг томонда очиқ қолади — бу «шу лойиҳада бошқа
            кўрсаткич кўрсатилмаган» деганини ўзи айтиб туради. */}
        {kpis.length > 0 && (
          <div className={GRID.g5}>
            {kpis.map((k) => (
              <GeoKpiTile key={k.key} kpi={k} />
            ))}
          </div>
        )}

        {/* 31 та лойиҳада ҳажм, 10 тасида иш режаси умуман кўрсатилмаган:
            плитка ҳам, диаграмма ҳам, ҳалқа ҳам чизилмайди — ўрнида битта
            қатор ёзув. Бу саҳифадаги ягона «йўқ» ёзуви: қолган ҳамма жойда
            бўш майдон умуман чизилмайди, бу иккитаси эса ўқувчи билиши
            керак бўлган ҳолат. */}
        {(!p.volume || p.progress === null) && (
          <div className={"flex flex-col gap-1" + (kpis.length > 0 ? " mt-3" : "")}>
            {!p.volume && <Absent>2026 йил иш ҳажми киритилмаган</Absent>}
            {p.progress === null && <Absent>Иш режаси киритилмаган</Absent>}
          </div>
        )}

        {charts.length > 0 && (
          <div className="mt-3">
            <GeoPanel title="Режа ва бажарилган" sub="ҳар кўрсаткич ўз бирлигида" icon="gauge">
              {/* Битта диаграмма ҳам икки устунли шаблонда чизилади: бутун
                  кенгликка ёйилганда иккита устун 1 500px канвасда йўқолиб
                  кетарди, ёнма-ён солиштириш эса шу иккита устуннинг
                  баландлиги учун керак. */}
              <div className={GRID.g2}>
                {charts.map((c) => (
                  <MetricChart key={c.m.key} m={c.m} plan={c.plan} done={c.done} color={pal.s1} />
                ))}
              </div>
            </GeoPanel>
          </div>
        )}

        {/* Иккита фоиз ёнма-ён, лекин алоҳида панелда ва ҳар бирининг ўз
            ёрлиғи билан: чапдаги — ҳажм, ўнгдаги — иш режаси.
            Биттаси йўқ бўлса ҳам шаблон ўзгармайди — ёлғиз панел бутун
            кенгликка чўзилиб, ҳалқанинг ўнгида бўш майдон қолдирмасин. */}
        {(volumePanel || progressPanel) && (
          <div className={`${GRID.g2} mt-3 items-start`}>
            {volumePanel}
            {progressPanel}
          </div>
        )}

      </GeoBlock>

      {/* --- 3. геологик маълумотлар ---------------------------------------- */}
      {/* Макапдаги қатламлар жадвали, тарқалиш ҳалқаси ва элементлар бўйича
          таҳлил натижалари сонли кўринишда манбада йўқ — шунинг учун улар
          ўрнига **бор** нарса турибди: захира матнлари ва иш режаси. */}
      <GeoBlock
        no={3}
        title="Геологик маълумотлар"
        sub={p.works.length > 0 ? `${p.works.length} та иш режаси` : undefined}
      >
        <div className={p.works.length > 0 ? `${GRID.g23} items-start` : ""}>
          {/* Элементлар чипларга ажратилмайди: `metals` манбада вергул билан
              ёзилган матн ва айнан шу кўринишда қолиши керак. Чипларга
              бўлиш ўша матнни иккинчи марта, бошқа шаклда такрорларди. */}
          <GeoPanel title="Фойдали қазилма ва захиралар" icon="crystal">
            <div className="mt-0.5">
              {geology.map((r) => (
                <FactRowStacked key={r.key} label={r.label} value={r.value} />
              ))}
            </div>
          </GeoPanel>

          {p.works.length > 0 && (
            <GeoPanel
              title="Иш режаси"
              icon="tasks"
              sub={
                p.progress === null
                  ? undefined
                  : `${p.progress.done} / ${p.progress.total} бажарилди`
              }
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {years.map((y) => (
                  <Pill key={y.year} status={y.done > 0 ? "good" : "mute"}>
                    {y.year} — {y.total} та{y.done > 0 && ` · ${y.done} бажарилди`}
                  </Pill>
                ))}
              </div>
              {/* «Миқдори» устуни йўқ: манбада иш бўйича миқдор кўрсатилмаган —
                  2026 ҳажмлари 2-блокдаги плиткаларда туради. */}
              <DataTable
                caption={`${p.shortName} — иш режаси`}
                cols={[
                  { t: "№", num: true },
                  { t: "Иш номи", wrap: true },
                  { t: "Муддат" },
                  { t: "Ҳолат" },
                ]}
                rows={p.works.map((w, i) => ({
                  key: String(w.id),
                  cells: [
                    i + 1,
                    w.work,
                    <span key="d" className="font-mono text-[11.5px] text-ink-2">
                      {w.deadline}
                    </span>,
                    <Pill key="s" status={w.done ? "good" : "mute"}>
                      {w.status}
                    </Pill>,
                  ],
                }))}
              />
            </GeoPanel>
          )}
        </div>
      </GeoBlock>

      {/* --- ҳолат тасмаси -------------------------------------------------- */}
      <GeoStatusBar asOf={asOf} source={source} />
    </div>
  );
}

/**
 * Захира матнлари учун қатор: ёрлиқ устида, қиймат остида.
 *
 * `FactRow` (ёнма-ён устун) бу ерда ярамайди — `oreReserve` 117,
 * `metalReserve` 111 белгигача, панел эса саҳифанинг 2/5 қисми: матн
 * ёрлиқнинг ўнгидаги тор тасмага сиқилиб қоларди.
 */
function FactRowStacked({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-grid py-[7px] first:border-t-0 first:pt-0">
      <div className="text-[11px] leading-[1.35] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[12.5px] leading-[1.5] break-words">{value}</div>
    </div>
  );
}
