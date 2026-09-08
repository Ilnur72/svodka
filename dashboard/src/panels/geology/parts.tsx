import type { ReactNode } from "react";
import { exact, pctTxt } from "../../lib/format";
import { GEO_GROUP_TOKEN, NO_DATA, geoFilledMetrics } from "../../lib/adapters/geology";
import type {
  GeoGroupKey,
  GeoProject,
  GeoVolume,
  GeoVolumeMetric,
} from "../../lib/adapters/geology";
import { Pill } from "../../components/Pill";
import { StatTile } from "../../components/StatTile";

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
