import type { ReactNode } from "react";
import { dateLabel, exact, pctTxt } from "../../lib/format";
import { GEO_GROUP_TOKEN, NO_DATA, geoFilledMetrics } from "../../lib/adapters/geology";
import type {
  GeoFactRow,
  GeoGroupKey,
  GeoKpi,
  GeoProject,
  GeoVolume,
  GeoVolumeMetric,
} from "../../lib/adapters/geology";
import { GRID } from "../../components/layout";
import { Pill } from "../../components/Pill";
import { StatTile } from "../../components/StatTile";
import { GeoIcon, type GeoIconId } from "./icons";

/**
 * «Геология лойиҳалари» бўлимининг учта кўринишида (рўйхат, тафсилот
 * саҳифаси ва харитадаги модал) бир хил ишлатиладиган бўлаклар.
 *
 * Улар шу ерда туради, чунки ҳамма кўриниш бир хил маънони бир хил кўринишда
 * бериши шарт: «маълумот йўқ» ҳамма жойда бир хил ёзилади, режа/факт қатори
 * бир хил ўқилади, гуруҳ ранги битта манбадан келади. Модал — тафсилот
 * саҳифасининг ихчам варианти, шунинг учун у **айнан шу** бўлаклардан
 * йиғилади: иккита жойда иккита ҳақиқат пайдо бўлмаслиги учун.
 */

/** Манбада катак тўлдирилмаган жой — ҳамма жойда бир хил матн ва бир хил тус. */
export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-medium tracking-normal text-ink-3">{children}</span>;
}

/** Гуруҳ чипи — ранги бутун бўлим бўйлаб битта ва номи ҳамиша ёнида. */
export function GroupChip({ group, groupKey }: { group: string; groupKey: GeoGroupKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
      <i
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: GEO_GROUP_TOKEN[groupKey] }}
      />
      {group}
    </span>
  );
}

/**
 * Карточкадаги кўрсаткич. Қиймат йўқ бўлса блок ўз ўрнида қолади — шунда
 * барча карточка ва тафсилот саҳифаси бир хил тузилишда ўқилади.
 */
export function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | null;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[17px] leading-[1.15] [font-weight:640] tabular-nums tracking-[-0.02em]">
        {value === null ? (
          <Muted>{NO_DATA}</Muted>
        ) : (
          <>
            {value}
            {unit && (
              <span className="ml-[4px] font-sans text-[11px] font-medium tracking-normal text-ink-3">
                {unit}
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-0.5 text-[10.5px] leading-[1.3] text-ink-3">{label}</div>
    </div>
  );
}

/**
 * Матн қатори. Манбада бўш бўлган қатор умуман чизилмайди — «—» билан
 * тўлдирилган рўйхат ўқишни оғирлаштиради, маълумот эса қўшмайди.
 */
export function TextRow({ k, v, wide }: { k: string; v: string | null; wide?: boolean }) {
  if (v === null || v.trim() === "") return null;
  return (
    <div className="flex gap-2.5 border-t border-grid py-[6px] text-[12px] leading-[1.5] first:border-t-0">
      <span className={(wide ? "w-[150px]" : "w-[92px]") + " flex-none text-ink-3"}>{k}</span>
      <span className="min-w-0 flex-1 break-words text-ink-2">{v}</span>
    </div>
  );
}

/**
 * Режа/факт қатори: тўлдиргич чизиқ, аниқ сонлар ва фоиз чипи.
 * Тўлдиргич 100% да тўхтайди, фоиз матни эса ҳақиқий қийматни кўрсатади
 * (Лолабулоқда бурғилаш 440% — манбадаги ҳақиқий сон, кесилмайди).
 */
export function VolumeRow({ m, name }: { m: GeoVolumeMetric; name?: string }) {
  const fill = m.pct === null ? 0 : Math.max(0, Math.min(100, m.pct));
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 flex-1 truncate text-[12px] [font-weight:600]">
          {name ?? m.label}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {m.done === null ? <span className="font-sans text-ink-3">—</span> : exact(m.done)}
          <span className="mx-1 text-ink-3">/</span>
          {m.plan === null ? <span className="font-sans text-ink-3">—</span> : exact(m.plan)}
          <span className="ml-1 font-sans text-[11px] text-ink-3">{m.unit}</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className="absolute inset-y-0 left-0 rounded-[3px]"
            style={{
              width: `${fill.toFixed(2)}%`,
              background: m.pct === null ? "var(--rule)" : "var(--s1)",
            }}
          />
        </span>
        {m.noReport ? (
          <Pill>ҳисобот берилмаган</Pill>
        ) : (
          <>
            <span className="w-[52px] flex-none text-right font-mono text-[11.5px] tabular-nums">
              {pctTxt(m.pct)}
            </span>
            {m.over && <Pill status="good">режадан ортиқ</Pill>}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* тафсилот ва модал учун умумий блоклар                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ҳеро остидаги катта кўрсаткич. Матнли қиймат (ҳудуд, фойдали қазилма)
 * кичикроқ ўлчамда чиқади — 27px да узун матн саҳифани бузарди, лекин ёрлиқ
 * ва ўрин ўзгармайди.
 */
export function HeroTile({
  label,
  value,
  unit,
  stripe,
  text,
}: {
  label: string;
  value: string | null;
  unit?: string;
  stripe: string;
  text?: boolean;
}) {
  let node: ReactNode;
  if (value === null) {
    node = <span className="text-[15px] font-medium tracking-normal text-ink-3">{NO_DATA}</span>;
  } else if (text) {
    node = (
      <span className="block text-[15.5px] leading-[1.35] [font-weight:640] tracking-normal break-words">
        {value}
      </span>
    );
  } else {
    node = value;
  }
  return (
    <StatTile label={label} value={node} unit={value === null ? undefined : unit} stripe={stripe} />
  );
}

export interface HeroTileSpec {
  label: string;
  value: string | null;
  unit?: string;
  stripe: string;
  text?: boolean;
}

/**
 * Лойиҳанинг тўртта асосий кўрсаткичи — **қайси** тўрттаси эканини шу ерда
 * бир марта ҳал қилинади, жойлаштиришни эса чақирувчи танлайди (саҳифада
 * тўрт устун, модалда икки). Шунда икки жойда икки хил тўртлик пайдо
 * бўлмайди.
 */
export const heroTilesOf = (p: GeoProject): HeroTileSpec[] => [
  { label: "Қиймати", value: p.cost === null ? null : exact(p.cost), unit: "млн $", stripe: "var(--s3)" },
  { label: "Тугаш йили", value: p.endYear === null ? null : String(p.endYear), stripe: "var(--s4)" },
  { label: "Ҳудуд", value: p.region, stripe: "var(--s2)", text: true },
  { label: "Фойдали қазилма", value: p.mineral, stripe: "var(--s5)", text: true },
];

/** «Асосий маълумотлар» карточкасининг ичи. Бўш қатор чизилмайди. */
export function ProjectFacts({ p }: { p: GeoProject }) {
  return (
    <div className="mt-1">
      <TextRow wide k="Фойдали қазилма" v={p.mineral} />
      <TextRow wide k="Металлар" v={p.metals} />
      <TextRow wide k="Руда захираси" v={p.oreReserve} />
      <TextRow wide k="Металл захираси" v={p.metalReserve} />
      <TextRow wide k="Молиялаш манбаи" v={p.funding} />
      <TextRow wide k="Ҳудуд" v={p.region} />
      <TextRow wide k="Туман" v={p.district} />
      <TextRow wide k="Ҳамкор / мутахассислар" v={p.partner} />
      <TextRow wide k="Тоифа" v={p.category} />
      <TextRow wide k="Йўналиш" v={p.direction} />
    </div>
  );
}

/** «2026 йил режаси» карточкасининг ичи: ҳажм қаторлари ва иккита чип. */
export function ProjectVolumeList({ v }: { v: GeoVolume }) {
  return (
    <>
      <div className="mt-1">
        {geoFilledMetrics(v).map((m) => (
          <VolumeRow key={m.key} m={m} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {v.labPlan !== null && <Pill>лаборатория режа {exact(v.labPlan)} дона</Pill>}
        {v.budget !== null && <Pill>бюджет {exact(v.budget)} млн $</Pill>}
      </div>
    </>
  );
}

/**
 * «Кутилаётган натижа» — манбадаги ягона хулоса матни, шунинг учун у оддий
 * абзац эмас, ажратилган блок. Иккала кўринишда ҳам бир хил.
 */
export function ResultBox({ text, className }: { text: string | null; className?: string }) {
  if (text === null || text.trim() === "") return null;
  return (
    <div
      className={"rounded-[6px] border border-hair px-3 py-2.5" + (className ? " " + className : "")}
      style={{ background: "color-mix(in srgb, var(--s1) 7%, var(--surface-2))" }}
    >
      <div className="text-[11px] [font-weight:650] tracking-[0.06em] text-ink-3 uppercase">
        Кутилаётган натижа
      </div>
      <p className="mt-1 max-w-[100ch] text-[13px] leading-[1.6] text-ink break-words">{text}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* тафсилот саҳифасининг рақамланган блоклари                                 */
/* -------------------------------------------------------------------------- */

/**
 * Рақамланган блок — макапдаги «1. ЛОЙИҲА ПАСПОРТИ» қобиғи.
 *
 * `Card` эмас, чунки бу карточка эмас, **бўлим**: ичида яна панеллар туради.
 * Шунинг учун унинг сарлавҳаси `Section` каби катта ҳарфли ва ажратилган,
 * фони эса `--surface` — ичкаридаги панеллар (`GeoPanel`) `--surface-2` да
 * бўлгани учун иккала мавзуда ҳам бир-биридан ажралиб туради.
 */
export function GeoBlock({
  no,
  title,
  sub,
  children,
}: {
  no: number;
  title: string;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-hair bg-surface shadow-card">
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-grid px-4 py-2.5">
        <span
          aria-hidden="true"
          className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[5px] font-mono text-[12px] [font-weight:650] text-s1"
          style={{ background: "color-mix(in srgb, var(--s1) 14%, transparent)" }}
        >
          {no}
        </span>
        <h2 className="text-[12.5px] [font-weight:650] tracking-[0.1em] uppercase">{title}</h2>
        {sub && <span className="ml-auto text-[11.5px] text-ink-3">{sub}</span>}
      </header>
      <div className="px-4 pt-3 pb-4">{children}</div>
    </section>
  );
}

/**
 * Блок ичидаги панел. `Card` дан фарқи — фони: блокнинг ўзи аллақачон
 * `--surface` да, шунинг учун ичкаридаги панел `--surface-2` бўлади.
 * Қоронғи мавзуда бу макапдагидек бир поғона очроқ, ёруғида — бир поғона
 * тўқроқ; иккаласида ҳам чегара чизиғи билан ажралиб туради.
 */
export function GeoPanel({
  title,
  sub,
  icon,
  children,
}: {
  title: string;
  sub?: ReactNode;
  icon?: GeoIconId;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[6px] border border-hair bg-surface-2 px-3.5 pt-2.5 pb-3">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {icon && <GeoIcon id={icon} size={14} className="self-center text-ink-3" />}
        <h3 className="text-[12.5px] [font-weight:650]">{title}</h3>
        {sub && <span className="ml-auto text-[11px] text-ink-3">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * «Ёрлиқ: қиймат» қатори — макапдаги паспорт қатори.
 *
 * Ёрлиқ устуни қатъий кенгликда: иккита устун ёнма-ён турганда қийматлар
 * бир хил чизиқдан бошланиши керак, акс ҳолда рўйхат «зинапоя» бўлиб
 * кўринади. Тор экранда (≤720px) устунлар бир-бирининг остига тушади, ёрлиқ
 * кенглиги эса ўзгармайди — бу ерда сатр узунлиги муаммо эмас.
 */
export function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2.5 border-t border-grid py-[6px] text-[12.5px] leading-[1.5] first:border-t-0">
      <span className="w-[140px] flex-none text-ink-3">{label}</span>
      <span className="min-w-0 flex-1 break-words text-ink">{value}</span>
    </div>
  );
}

/**
 * Паспорт қаторлари икки устунда — макапдаги каби.
 *
 * Тақсимот тартиб бўйича: биринчи ярми чапда, иккинчиси ўнгда. Устунлар
 * мустақил рўйхат, шунинг учун чапдаги узун қиймат ўнгдагиларни силжитмайди.
 */
export function FactColumns({ rows }: { rows: GeoFactRow[] }) {
  if (rows.length === 0) return null;
  const half = Math.ceil(rows.length / 2);
  const cols = [rows.slice(0, half), rows.slice(half)];
  return (
    <div className={GRID.g2}>
      {cols.map((col, i) =>
        col.length === 0 ? null : (
          <div key={i} className="min-w-0">
            {col.map((r) => (
              <FactRow key={r.key} label={r.label} value={r.value} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

/**
 * Узун матнли қатор — 100–180 белгили изоҳлар учун. Ёрлиқ устида туради,
 * чунки «ёрлиқ: қиймат» устунида бундай матн ўнг томонда тор бир тасмага
 * сиқилиб қоларди.
 */
export function FactText({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-t border-grid pt-2.5 first:border-t-0 first:pt-0">
      <div className="text-[11px] [font-weight:650] tracking-[0.06em] text-ink-3 uppercase">
        {label}
      </div>
      <p className="mt-1 max-w-[110ch] text-[12.5px] leading-[1.6] text-ink break-words">{text}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2-блок: кўрсаткич плиткаси                                                 */
/* -------------------------------------------------------------------------- */

/** Плитка иконкалари — калит бўйича; рўйхатда йўқ калит `gauge` олади. */
const KPI_ICON: Record<string, GeoIconId> = {
  drill: "drill",
  sample: "flask",
  trench: "trench",
  lab: "lab",
  budget: "coin",
};

/**
 * Макап услубидаги кўрсаткич плиткаси: ёрлиқ, катта сон, бирлик ва остида
 * иккинчи қатор.
 *
 * `StatTile` дан фарқи фақат жойлашувда (марказга тортилган, бирлик соннинг
 * остида) — макапда шундай. Сон эса ўша қоида билан: `exact()`, яъни
 * яхлитланмайди.
 *
 * Иккинчи қаторда учта ҳолатдан бири бўлади:
 *   • «ҳисобот берилмаган» — режа бор, бажарилгани кўрсатилмаган (**«0%» эмас**);
 *   • бажарилган ҳажм ва фоиз — фоиз 100 дан юқори бўлса ҳам тўлиқ ёзилади;
 *   • ҳеч нарса — лаборатория ва бюджетда бажарилган сон манбада умуман йўқ.
 */
export function GeoKpiTile({ kpi }: { kpi: GeoKpi }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[6px] border border-hair bg-surface-2 px-3 pt-2.5 pb-2.5 text-center">
      {/* Иконка ёрлиқнинг ёнида: у кўрсаткичнинг **ўзини** билдиради (бурғи,
          колба, қатламлар). Макапда у пастки қаторда, ўзгариш фоизи ёнида
          турарди — лекин у ердаги белги тренд нишони эди, бизда эса тренд
          йўқ: манба битта санадаги кесим, олдинги қиймат мавжуд эмас. */}
      <span className="flex items-center justify-center gap-1.5 text-[11.5px] leading-[1.35] font-medium text-ink-3">
        <GeoIcon id={KPI_ICON[kpi.key] ?? "gauge"} size={15} />
        {kpi.label}
      </span>
      {/* `StatTile` даги қарор шу ерда ҳам: катта ўлчамда пропорционал
          рақамлар моноширинликдан кўра яхшироқ ўқилади. */}
      <span className="mt-1 text-[25px] leading-[1.1] [font-weight:640] tracking-[-0.02em]">
        {kpi.value}
      </span>
      <span className="mt-0.5 text-[11px] leading-[1.35] text-ink-3">
        {kpi.unit && <span className="text-ink-2">{kpi.unit}</span>}
        {kpi.unit && " · "}
        {kpi.scope}
      </span>
      {(kpi.noReport || kpi.note !== null || kpi.pct !== null) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-t border-grid pt-2 text-[11px] text-ink-2">
          {kpi.noReport ? (
            <Pill>ҳисобот берилмаган</Pill>
          ) : (
            <>
              {kpi.note !== null && <span className="min-w-0 break-words">{kpi.note}</span>}
              {kpi.pct !== null && (
                <Pill status={kpi.over ? "good" : "mute"}>{pctTxt(kpi.pct)}</Pill>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* саҳифа ости — ҳолат қатори                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Макапдаги пастки ҳолат тасмаси.
 *
 * Унда фойдаланувчи, сессия ва «тизим ҳолати» ҳам бор эди — бу саҳифада
 * бундай маълумот йўқ, шунинг учун ўйлаб топилмайди. Қоладигани иккита ва
 * иккови ҳам ҳақиқий: манба ҳужжати ва унинг ҳолат санаси. Лойиҳа
 * даражасида «янгиланган сана» манбада умуман йўқ.
 */
export function GeoStatusBar({ asOf, source }: { asOf: string; source: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-card border border-hair bg-surface px-3.5 py-2 text-[11.5px] leading-[1.5] text-ink-3 shadow-card">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <GeoIcon id="doc" size={13} className="self-center" />
        Маълумот манбаи:
        <span className="min-w-0 break-words text-ink-2">{source}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <GeoIcon id="clock" size={13} className="self-center" />
        Маълумот ҳолати:
        <span className="text-ink-2">{dateLabel(asOf)}</span>
      </span>
    </div>
  );
}

/**
 * Иш режаси — ихчам рўйхат (модал учун).
 *
 * Тафсилот саҳифасидаги `DataTable` бу ерда ишлатилмайди: тор ойнада у ўз
 * скролли ва ёпишқоқ сарлавҳаси билан модалнинг скролли ичида иккинчи
 * скролл ҳосил қиларди. Устунлар ўша-ўша — иш номи, муддат, ҳолат.
 */
export function WorkList({ works }: { works: GeoProject["works"] }) {
  return (
    <div className="mt-1">
      {works.map((w) => (
        <div
          key={w.id}
          className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-grid py-[7px] text-[12px] leading-[1.45] first:border-t-0"
        >
          <span className="min-w-0 flex-1 break-words text-ink-2">{w.work}</span>
          <span className="font-mono text-[11.5px] whitespace-nowrap text-ink-3">{w.deadline}</span>
          <Pill status={w.done ? "good" : "mute"}>{w.status}</Pill>
        </div>
      ))}
    </div>
  );
}
