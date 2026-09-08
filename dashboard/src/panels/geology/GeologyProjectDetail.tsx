import { dateLabel, exact, nf, pctTxt } from "../../lib/format";
import { usePalette } from "../../lib/theme";
import {
  GEO_GROUP_TOKEN,
  geoFilledMetrics,
  type GeoProject,
  type GeoVolumeMetric,
} from "../../lib/adapters/geology";
import { GRID } from "../../components/layout";
import { Card } from "../../components/Card";
import { Pill } from "../../components/Pill";
import { Columns } from "../../components/Columns";
import { PercentRing } from "../../components/PercentRing";
import { DataTable } from "../../components/DataTable";
import {
  GroupChip,
  HeroTile,
  ProjectFacts,
  ProjectVolumeList,
  ResultBox,
  heroTilesOf,
} from "./parts";

/**
 * Битта геология лойиҳасининг тафсилот саҳифаси.
 *
 * ═══ Экранда фақат манбада бор нарса ════════════════════════════════════
 *
 * Тақдимотда лойиҳа бўйича **масъул шахслар, координата/масофа, бириктирилган
 * ҳужжатлар ва ёзув санаси йўқ**. Шунинг учун бу саҳифада «Масъуллар»,
 * «Лойиҳа жойлашуви» (харита) ва «Қўшимча ҳужжатлар» блоклари умуман
 * чизилмайди — бўш ўрин эгаллаган карточка сифатида ҳам эмас. Жойлашув
 * фақат матн бўлиб, «Асосий маълумотлар» да (ҳудуд + туман) туради;
 * `partner` эса шахс эмас, ташкилот, шунинг учун у ҳам ўша рўйхатда.
 *
 * «PDF ҳисоботни юклаб олиш» ва «Таҳрирлаш» тугмалари ҳам йўқ: бундай
 * функция мавжуд эмас, ишламайдиган тугма эса энг ёмон вариант.
 *
 * ═══ Бўш бўлим чизилмайди ═══════════════════════════════════════════════
 *
 * 31 та лойиҳада 2026 иш ҳажми, 10 тасида иш режаси кўрсатилмаган. Бундай
 * ҳолда карточка «0» билан тўлдирилмайди — бир қатор ёзув билан
 * алмаштирилади («2026 йил иш ҳажми киритилмаган»). Тўртта катта кўрсаткич
 * эса доим ўз ўрнида қолади (`маълумот йўқ` билан), чунки улар бўйича
 * барча лойиҳа бир хил ўқилиши керак.
 *
 * ═══ Иккита фоиз аралашмайди ════════════════════════════════════════════
 *
 * Ҳалқадаги фоиз — **иш режаси** бўйича (`Бажарилди` ишлари / жами ишлар),
 * ҳажм фоизлари эса бурғилаш/намуналаш/канава бўйича. Бу турли ўлчовлар:
 * ҳеч қаерда қўшилмайди, ўртачаси олинмайди ва битта «умумий тайёрлик»
 * сифатида кўрсатилмайди. Ҳалқанинг ёрлиғида манбаси очиқ ёзилган.
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
  "cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-40";

/**
 * Битта ҳажм кўрсаткичи — ўз диаграммаси, ўз шкаласи, ўз бирлиги.
 * Учта кўрсаткич (п.м, дона, м³) ҳеч қачон битта шкалага қўйилмайди.
 *
 * Диаграмма фақат **иккала** сон бор бўлганда чизилади (қаранг: `charts`) —
 * бажарилгани кўрсатилмаган ерда «0» устуни «ишламаган» деган ёлғон хулосани
 * берарди, ёлғиз режа устуни эса юқоридаги «2026 йил режаси» карточкасидаги
 * сонни бошқа шаклда такрорлашдан бошқа нарса бўлмасди.
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

/** Матнли бўлимча — «Лойиҳа ҳақида» ичидаги абзац. Бўш бўлса чизилмайди. */
function Para({ title, text }: { title: string; text: string | null }) {
  if (text === null || text.trim() === "") return null;
  return (
    <div className="border-t border-grid pt-2.5 first:border-t-0 first:pt-0">
      <div className="text-[11px] [font-weight:650] tracking-[0.06em] text-ink-3 uppercase">
        {title}
      </div>
      <p className="mt-1 max-w-[100ch] text-[13px] leading-[1.6] text-ink break-words">{text}</p>
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
  const metrics = p.volume ? geoFilledMetrics(p.volume) : [];
  // Диаграмма фақат солиштириладиган кўрсаткичлар учун: режа ҳам,
  // бажарилгани ҳам берилган бўлса.
  const charts = metrics.flatMap((m) =>
    m.plan !== null && m.done !== null ? [{ m, plan: m.plan, done: m.done }] : [],
  );

  const facts = (
    <Card title="Асосий маълумотлар">
      <ProjectFacts p={p} />
    </Card>
  );

  const plan2026 = p.volume && (
    <Card title="2026 йил режаси" sub={`${metrics.length} кўрсаткич`} stripe="var(--s1)">
      <ProjectVolumeList v={p.volume} />
    </Card>
  );

  const status = (
    <Card title="Лойиҳа ҳолати" sub="иш режаси бўйича">
      {p.progress === null ? (
        <p className="text-[12px] text-ink-3">Иш режаси киритилмаган</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <PercentRing
            label="Иш режаси бажарилиши"
            pct={p.progress.pct}
            color={pal.s1}
            note={`${p.progress.done} / ${p.progress.total} иш`}
          />
          {/* Кенглик чекланган: диаграммасиз лойиҳада карточка бутун
              экранни эгаллаганда учта қатор бир-биридан узилиб қоларди. */}
          <div className="min-w-0 max-w-[420px] flex-1">
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
      )}
    </Card>
  );

  const chartCard = charts.length > 0 && (
    <Card
      title="2026 йил бўйича кўрсаткичлар"
      sub="ҳар кўрсаткич ўз бирлигида"
    >
      <div className={charts.length > 1 ? GRID.g2 : ""}>
        {charts.map((c) => (
          <MetricChart key={c.m.key} m={c.m} plan={c.plan} done={c.done} color={pal.s1} />
        ))}
      </div>
    </Card>
  );

  const about =
    (p.plan2026 ?? p.done2026 ?? p.note ?? p.result) !== null ? (
      <Card title="Лойиҳа ҳақида">
        <div className="mt-1 flex flex-col gap-2.5">
          <Para title="2026 йил режаси" text={p.plan2026} />
          <Para title="2026 йилда бажарилгани" text={p.done2026} />
          <Para title="Изоҳ" text={p.note} />
        </div>
        <ResultBox text={p.result} className="mt-3" />
      </Card>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* --- навигация ------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={NAV_BTN}>
          ← Лойиҳалар рўйхатига қайтиш
        </button>
        <span className="flex-1" />
        {index >= 0 && (
          <span className="text-[11.5px] text-ink-3">
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
      </div>

      {/* --- ҳеро ----------------------------------------------------------- */}
      {/* Фон — гуруҳ рангидан токенлар билан аралаштирилган енгил градиент
          (`color-mix`), яъни безак. Расм эмас: манбада лойиҳа фотоси йўқ. */}
      <div
        className="relative overflow-hidden rounded-card border border-hair px-5 pt-4 pb-4 shadow-card"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${token} 14%, var(--surface)) 0%, var(--surface) 58%)`,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: token }}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill>{p.category}</Pill>
            <Pill>{p.direction}</Pill>
            <Pill>№ {p.no}</Pill>
          </div>
          <GroupChip group={p.group} groupKey={p.groupKey} />
        </div>
        <h2 className="mt-2.5 max-w-[70ch] text-[23px] leading-[1.22] [font-weight:680] break-words">
          {p.shortName}
        </h2>
        <p className="mt-1.5 max-w-[110ch] text-[13px] leading-[1.55] text-ink-2 break-words">
          {p.name}
        </p>
      </div>

      {/* --- тўртта катта кўрсаткич ----------------------------------------- */}
      <div className={GRID.g4}>
        {heroTilesOf(p).map((t) => (
          <HeroTile key={t.label} {...t} />
        ))}
      </div>

      {/* --- асосий маълумотлар ва 2026 режаси ------------------------------ */}
      {plan2026 ? (
        <div className={GRID.g2}>
          {facts}
          {plan2026}
        </div>
      ) : (
        facts
      )}

      {/* 31 та лойиҳада ҳажм умуман кўрсатилмаган: карточка ҳам, диаграмма ҳам
          чизилмайди — ўрнида битта қатор. */}
      {!p.volume && (
        <p className="text-[12px] text-ink-3">2026 йил иш ҳажми киритилмаган</p>
      )}

      {/* --- ҳолат ва 2026 диаграммалари ------------------------------------ */}
      {/* `items-start` — иккита карточканинг баландлиги ҳар хил: ҳалқали
          карточка диаграмма баландлигигача чўзилиб, бўш жой қолдирмасин. */}
      {chartCard ? (
        <div className={`${GRID.g2} items-start`}>
          {status}
          {chartCard}
        </div>
      ) : (
        status
      )}

      {/* --- иш режаси ------------------------------------------------------ */}
      {p.works.length > 0 && (
        <Card title="Иш режаси" sub={`${p.works.length} та иш`}>
          {/* «Миқдори» устуни йўқ: манбада иш бўйича миқдор кўрсатилмаган —
              2026 ҳажмлари алоҳида карточкада туради. */}
          <DataTable
            caption={`${p.shortName} — иш режаси`}
            cols={[{ t: "№", num: true }, { t: "Иш номи", wrap: true }, { t: "Муддат" }, { t: "Ҳолат" }]}
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
        </Card>
      )}

      {/* --- лойиҳа ҳақида -------------------------------------------------- */}
      {about}

      {/* --- манба ---------------------------------------------------------- */}
      {/* Лойиҳа даражасида яратилган/янгиланган сана йўқ — фақат манба
          ҳужжатининг ҳолат санаси бор, шунинг учун саҳифа охирида бир марта. */}
      <p className="text-[11.5px] leading-[1.5] text-ink-3">
        {dateLabel(asOf)} ҳолатига · {source}
      </p>
    </div>
  );
}
