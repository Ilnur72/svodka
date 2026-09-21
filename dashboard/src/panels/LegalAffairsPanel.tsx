import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type { LegalAffairsDashboard } from "../api/types";
import { getLegalAffairsDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { usePalette } from "../lib/theme";
import { dateLabel, exact, monthLabel, monthTick, nf, pctTxt } from "../lib/format";
import {
  NO_DATA,
  legalView,
  type LegalAppealRow,
  type LegalCase,
  type LegalClaimRow,
  type LegalColumnRow,
  type LegalDateView,
  type LegalExtra,
  type LegalReviewRow,
  type LegalSectionQuality,
  type LegalView,
} from "../lib/adapters/legalAffairs";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Banner } from "../components/Banner";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { Columns } from "../components/Columns";
import { DataTable, type Row } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";

/**
 * «Юридик бошқарма» — `Юридик бошқарма.xlsx` нинг **учта варағи**:
 * `1. СУД ИШЛАРИ` (23 иш), `2. ПРЕТЕНЗИЯЛАР` (2 ёзув),
 * `3. ШАРТНОМА ЭКСПЕРТИЗАСИ` (10 экспертиза) — жами 35 мантиқий ёзув.
 *
 * ═══ ИККИ ҚАВАТ: аввал ИШ, сўнг МАНБА ═══════════════════════════════════
 *
 * Бўлим икки қаватга бўлинган ва қайси нарса қайси қаватда туриши БИТТА
 * мезон билан ҳал қилинади:
 *
 *   ХУЛОСА қавати (биринчи экран) — **ҳуқуқий иш** ҳақида: нечта суд иши
 *     бор ва улар НИМА ҲАҚИДА, ким олиб боряпти, қайси босқичда, қачон
 *     кўрилган;
 *
 *   МАНБА қавати (`Disclosure`, ёпиқ) — **Excel файли** ҳақида: физик
 *     қаторлар, merge блоклари, бўш ва сийрак устунлар, такрорий `Т/р`,
 *     сарлавҳа зиддиятлари, сана аномалиялари.
 *
 * ⚠️ Мезоннинг чегараси: «бу СОН шубҳали» — юқорида қолади; «Excel'да 5 та
 * бўш устун бор» — пастга тушади. Пастга тушган нарсанинг биттаси ҳам
 * ЎЧИРИЛМАГАН: аввал плиткалар остида, бўлим `note` ларида ва диаграммалар
 * тагида турган ҳар бир жумла «Манба ҳақида» ёки «Манбадаги белгилар»
 * блокида ТЎЛИҚ сақланган.
 *
 * ═══ Иш мазмуни ЭКРАНГА ЧИҚАРИЛГАН ══════════════════════════════════════
 *
 * Аввал 23 ишнинг ҳаммаси «Батафсил маълумот» ичидаги ёпиқ блокда эди —
 * яъни бўлимнинг ЯГОНА мазмунли қисми бир босиш ортида турарди ва экранда
 * фақат ном-рақам кўринарди. Энди улар иккинчи бўлимнинг ўзида, ўқиладиган
 * рўйхат бўлиб туради: ҳар бир иш — мазмуни (икки қаторгача қисқартирилган),
 * суди, юристи, босқичи ва мажлис куни. Босилганда ЎША ЖОЙДА тўлиқ матн
 * очилади: иш мазмунининг тўлиғи, суд натижаси, шикоят матнлари, изоҳ ва
 * манбадаги катаклар.
 *
 * ⚠️ «Қарама-қарши томон» устуни ЯСАЛМАДИ. Манбада бундай устун ЙЎҚ: томонлар
 * иш мазмуни матнининг ичида («даъвогар … жавобгар …»). Уни матндан ажратиб
 * олиш маълумот тўқиш бўларди — Ўзбек ҳуқуқий матнида даъвогар, жавобгар ва
 * учинчи шахс аралашган (22- ва 23-ишда жавобгар «Olmaliq KMK», УзТМК эса
 * учинчи шахс). Шунинг учун томонлар МАТННИНГ ЎЗИДА, манбадагидек кўринади.
 *
 * ⚠️ Суд ишида даъво СУММАСИ учун ҳам алоҳида устун йўқ — у ҳам мазмун
 * матнининг ичида. Сумма устуни фақат «Претензиялар» варағида бор.
 *
 * ═══ Ёнидаги «Давлат харидлари» билан адашмасин ═════════════════════════
 *
 * Иккови ҳам бошқарма ҳужжатидан келади ва иккови ҳам вақт қатори эмас,
 * лекин мазмуни умуман кесишмайди: бу — ҲУҚУҚИЙ иш юритиш (суд ишлари,
 * претензиялар, шартнома экспертизаси), у эса ХАРИД ҳажмлари (тур × чорак).
 * Алоҳида бэкенд модуллари: `legal-affairs` ва `state-procurement`. Экранда
 * бу фарқ «Манба ҳақида» блокида ёзилган — биринчи экранда унга жой йўқ.
 *
 * ═══ Нега «суд натижаси» бўйича кесим ЙЎҚ ═══════════════════════════════
 *
 * Манбада `Суд натижаси` устуни 23/23 тўлдирилган — яъни бўш эмас. Лекин у
 * ЭРКИН МАТН: 23 ёзувда 22 ноёб қиймат, узунлиги 78–701 белги. «Ютилган /
 * ютқазилган / кўрилмоқда» каби тасниф манбада УМУМАН ЙЎҚ, уни матндан
 * чиқариш эса маълумот тўқиш бўларди. Шунинг учун натижа диаграммага
 * айлантирилмайди ва рўйхатда ТЎЛИҚ матн ҳолида туради — ўлчовнинг ўзи
 * («22 ноёб матн») экранда очиқ ёзилган.
 *
 * ═══ Нега «яқин мажлислар» блоки ЙЎҚ ════════════════════════════════════
 *
 * 22 та ўқилган мажлис санасининг биттаси ҳам бугундан кейин эмас (энг
 * охиргиси 24.06.2026). Бўш блокни «маълумот йўқ» деб чизиш шовқиндан бошқа
 * нарса бермасди, шунинг учун у манбада кутилаётган мажлис пайдо бўлганда
 * ЎЗИ чиқади — қаттиқ ўчирилган эмас, шартли.
 *
 * ═══ «Маълумот йўқ» ≠ «нол» ва ≠ «бўлим бўш» ════════════════════════════
 *
 * Бўш катак ҳеч қаерда нол билан ҳам, жимгина ташлаб кетиш билан ҳам
 * тўлдирилмайди — «маълумот йўқ» деб ёзилади ва устун ўз ўрнида қолади.
 * Шунинг учун «Шикоят иши қолдирилган кун» (манбада 0/23) ҳар бир ишда
 * кўринади: устун МАВЖУД, фақат тўлдирилмаган.
 *
 * ⚠️ «Претензиялар» да атиги 2 ёзув бор. Бу «маълумот йўқ» ЭМАС —
 * манбанинг ҳолати, ва экранда шундай ёзилади.
 *
 * ═══ Диаграмма кам ══════════════════════════════════════════════════════
 *
 * Бўлимда жами 35 ёзув бор. Учта диаграмма қолдирилган: юрист кесими ва суд
 * кесими («иш кимда тўпланган») ҳамда мажлисларнинг ой кесими («иш қачон
 * кўрилган»). Қолган ҳамма нарса эркин матн: уни диаграммага айлантириш
 * маъно қўшмасди, фақат ясама тасниф ясарди.
 *
 * ⚠️ Юрист ва суд кесимлари ўлчови иккисида ҳам «та», лекин булар икки ХИЛ
 * кесим — шунинг учун улар ҳеч қачон битта шкалага қўйилмайди.
 */

const LBL = "text-[10.5px] font-medium tracking-[0.04em] text-ink-3 uppercase";

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Манбада тўлдирилмаган жой — бўлим бўйлаб бир хил матн ва тус. */
function Muted({ children = NO_DATA }: { children?: ReactNode }) {
  return <span className="text-[12px] font-medium tracking-normal text-ink-3">{children}</span>;
}

/**
 * Ёрлиқ + қиймат. Қиймат бўлмаса блок ЎЗ ЎРНИДА қолади ва «маълумот йўқ»
 * деб ёзилади — шунда «устун бор, лекин бўш» экрандан йўқолиб кетмайди.
 */
function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={LBL}>{label}</div>
      <div className="mt-0.5 text-[12px] leading-[1.5] break-words">
        {children === null || children === undefined ? <Muted /> : children}
      </div>
    </div>
  );
}

/**
 * Сана катаги.
 *
 * ⚠️ Манбада сана ўрнида ХОМ МАТН турган бўлса («23.06.2025 й») у
 * ўзгаришсиз кўрсатилади ва ёнига белги қўйилади: бэкенд уни атайин парс
 * қилмаган, форматни тахмин қилиш маълумот тўқиш бўларди.
 */
function DateField({ label, d }: { label: string; d: LegalDateView }) {
  return (
    <Field label={label}>
      {d.label === null ? null : (
        <>
          <span className={d.asText ? undefined : "font-mono tabular-nums"}>{d.label}</span>
          {d.asText && (
            <span className="ml-1.5 align-middle">
              <Pill status="warn">манбада матн — сана сифатида ўқилмаган</Pill>
            </span>
          )}
        </>
      )}
    </Field>
  );
}

/** Merge блокидан қутқарилган катаклар — «ортиқча» эмас, манбада турган матн. */
function Extras({ list }: { list: LegalExtra[] }) {
  if (list.length === 0) return null;
  return (
    <div className="mt-2 rounded-[5px] border border-dashed border-rule bg-surface-2 px-2.5 py-2">
      <div className={LBL}>Бирлаштирилган блокдан қутқарилган катаклар</div>
      <ul className="mt-1 flex flex-col gap-1">
        {list.map((e) => (
          <li key={e.key} className="text-[11.5px] leading-[1.5] text-ink-2 break-words">
            <span className="font-mono text-ink-3">{e.excelRow}-қатор</span> · {e.column}:{" "}
            {e.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * «N / M» тўлиқлик қатори.
 *
 * Фоиз фақат чизиқнинг ёнида — у ўртача ёки йиғинди эмас, шунчаки нечта
 * ёзувда устун тўлдирилгани. Сон доим ёнида туради, шунда «13%» ўқувчини
 * адаштирмайди.
 */
function Fill({ row }: { row: LegalColumnRow }) {
  const pct = row.total === 0 ? 0 : (row.filled / row.total) * 100;
  const tone = row.filled === 0 ? "bg-rule" : pct >= 66 ? "bg-s1" : "bg-s3";
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
        <span className="min-w-0 flex-1 text-[12px] leading-[1.35] [font-weight:600] break-words">
          {row.label}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {nf(row.filled)}
          <span className="mx-1 text-ink-3">/</span>
          {nf(row.total)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className={"absolute inset-y-0 left-0 rounded-[3px] " + tone}
            style={{ width: `${pct.toFixed(2)}%` }}
          />
        </span>
        <span className="w-[52px] flex-none text-right font-mono text-[11.5px] tabular-nums">
          {pctTxt(pct)}
        </span>
      </div>
      {row.filled === 0 && (
        <p className="mt-1 text-[11px] leading-[1.45] text-ink-3">
          Устун манбада <b className="font-semibold text-ink-2">мавжуд</b>, лекин биронта ёзувда
          ҳам тўлдирилмаган — бу нол эмас, маълумотнинг йўқлиги.
        </p>
      )}
    </div>
  );
}

/** Бэкенднинг ўз изоҳи — манба ҳақидаги далил, ўзгартирилмайди. */
function Reason({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-3 break-words">{children}</p>
  );
}

/**
 * Катта сон — ёрлиқ, қиймат ва бирлик.
 *
 * `calc` — қиймат ҲИСОБЛАНГАН (йиғинди, улуш, нисбат), шунда `nf(v, 2)`:
 * сузувчи нуқта «думи» экранга чиқмаслиги учун. Манбадан келган катак эса
 * яхлитланмайди — `exact()`. Қоида `adapters/invest.ts` да ёзилган ва бутун
 * сводка бўйлаб бир хил.
 *
 * ⚠️ Бу бўлимдаги катта сонлар — ЁЗУВ САНОҚЛАРИ (23 иш, 3 апелляция), яъни
 * бутун сон; уларда `calc` керак эмас ва қўйилмайди. `calc` фақат ҳақиқий
 * ҳисоб-китоб натижаси учун — масалан хом сумма йиғиндиси.
 */
function Big({
  label,
  value,
  unit,
  calc = false,
  children,
}: {
  label: string;
  value: number | null;
  unit: string;
  calc?: boolean;
  /** Соннинг ОСТИДА турадиган изоҳ — ишончлилик белгиси шу ерда. */
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className={LBL}>{label}</div>
      <div className="mt-1 text-[24px] leading-[1.05] [font-weight:640] tracking-[-0.02em]">
        {value === null ? (
          <Muted />
        ) : (
          <>
            <span className="font-mono tabular-nums">{calc ? nf(value, 2) : exact(value)}</span>
            <span className="ml-[5px] text-[12px] font-medium tracking-normal text-ink-3">
              {unit}
            </span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Иккинчи даражали блок — ёпиқ ҳолатда бошланади.
 *
 * ⚠️ Бу ЯШИРИШ эмас: ичидаги ҳамма нарса жойида, бир босишда очилади ва
 * тугманинг ўзида нима борлиги (ва нечта экани) ёзилган. Мақсад — биринчи
 * экранда «юридик бошқармада ҳозир нима бўляпти» деган саволга жавоб турсин,
 * 23 ишнинг 12 майдонли тўлиқ шакли эса ўқувчи сўраганда чиқсин.
 *
 * A11y ва ҳулқ `components/TableToggle.tsx` ҳамда «Давлат харидлари»
 * бўлимидаги `Disclosure` билан айнан бир хил (`aria-expanded` +
 * `aria-controls` + `hidden`). Мазмун очилгандагина рендер қилинади — ёпиқ
 * блокларнинг ҳаммаси доим чизилса биринчи рендер оғирлашарди (бу ерда у
 * 23 × 12 майдон + 10 экспертиза дегани).
 */
function Disclosure({
  label,
  hint,
  children,
}: {
  label: string;
  /** Тугмадаги қисқа ҳисоб — «23 та иш», «20 та белги». */
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `la-more-${uid}`;

  return (
    <div className="mt-2.5 first:mt-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full cursor-pointer items-center gap-2.5 rounded-card border px-[13px] py-2.5 text-left " +
          (open
            ? "border-s1 bg-surface text-ink"
            : "border-hair bg-surface text-ink-2 hover:text-ink")
        }
      >
        <span
          aria-hidden="true"
          className={
            "grid h-[18px] w-[18px] flex-none place-items-center rounded-[4px] font-mono text-[12px] leading-none " +
            (open ? "bg-s1 text-white" : "bg-sunken text-ink-3")
          }
        >
          {open ? "−" : "+"}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] [font-weight:650]">{label}</span>
        {hint && <span className="flex-none text-[11.5px] text-ink-3">{hint}</span>}
      </button>
      <div id={panelId} hidden={!open} className="mt-2.5">
        {open && children}
      </div>
    </div>
  );
}

/**
 * Апелляцияга чиққан битта иш — қисқа қатор.
 *
 * ⚠️ Бу ерда шикоят МАТНИ чизилмайди (у 700 белиггача): матн тўлиқ ҳолида
 * пастдаги «Ишларнинг тўлиқ рўйхати» да турибди. Бу ерда фақат «қайси иш,
 * қайси судда, қайси устун тўлдирилган» — яъни БОСҚИЧ, мазмун эмас.
 */
function AppealRow({ a }: { a: LegalAppealRow }) {
  return (
    <li className="border-t border-grid py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="w-[26px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {a.ordinal === null ? "—" : nf(a.ordinal)}
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-[1.4] [font-weight:600] break-words">
          {a.court ?? <Muted>суд {NO_DATA}</Muted>}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[26px]">
        {a.lawyer !== null && <Pill>юрист: {a.lawyer}</Pill>}
        {a.hasSummary && <Pill>шикоят мазмуни ёзилган</Pill>}
        {a.hasHearing && <Pill status="good">шикоят натижаси ёзилган</Pill>}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. суд иши                                                                 */
/* -------------------------------------------------------------------------- */

/** Мажлис куни — қисқа чип. Манбада хом матн бўлса ⚠ билан, ўзгаришсиз. */
function HearingPill({ d }: { d: LegalDateView }) {
  if (d.label === null) return <Pill status="warn">мажлис куни кўрсатилмаган</Pill>;
  return (
    <Pill status={d.asText ? "warn" : "mute"}>
      мажлис: {d.label}
      {d.asText ? " ⚠" : ""}
    </Pill>
  );
}

/**
 * Битта суд иши — ЎҚИЛАДИГАН қатор.
 *
 * ⚠️ Бу бўлимнинг энг муҳим бўлаги: «юридик бошқармада нима бўляпти» деган
 * саволга жавоб АЙНАН шу ерда. Шунинг учун у иккинчи бўлимнинг ўзида
 * туради, «Батафсил маълумот» ичидаги ёпиқ блокда эмас.
 *
 * Ёпиқ ҳолатда — иш НИМА ҲАҚИДА (мазмун матни икки қаторгача), КИМ БИЛАН
 * ва ҚАЕРДА (суд), КИМ олиб боряпти (юрист), ҚАЙСИ БОСҚИЧДА, ҚАЧОН
 * кўрилган. Очиқ ҳолатда — ўша жойда манбадаги ҲАММА майдон.
 *
 * ⚠️ Мазмун матни `line-clamp-2` билан фақат ЭКРАНДА қисқаради: матннинг
 * ўзи кесилмайди ва бир босишда тўлиқ очилади. Уни манбада қисқартириш
 * ҳужжатнинг ҳуқуқий маъносини йўқотарди.
 *
 * ⚠️ Натижа матни бўйича «ютилди / ютқазилди» деган тасниф ЯСАЛМАЙДИ:
 * манбада бундай устун йўқ (23 ёзувда 22 ноёб эркин матн), уни матндан
 * чиқариш маълумот тўқиш бўларди.
 */
function CaseCard({ c, fillOf }: { c: LegalCase; fillOf: (field: string) => string }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `la-case-${uid}`;

  // Ёрлиқдаги «N / M» API'дан келади — қаттиқ ёзилган сон эскириб қолмаслиги
  // учун (манба тўлдирилганда ёрлиқ ҳам ўзи ўзгаради).
  const at = (field: string) => {
    const f = fillOf(field);
    return f === "" ? "" : ` (${f})`;
  };

  return (
    <div className="border-t border-grid py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="w-[24px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {c.ordinal === null ? "—" : nf(c.ordinal)}
        </span>
        <p
          className={
            "min-w-0 flex-1 text-[12.5px] leading-[1.45] break-words " +
            (open ? "" : "line-clamp-2")
          }
        >
          {c.subject}
        </p>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[24px]">
        {c.court === null ? <Pill status="warn">суд {NO_DATA}</Pill> : <Pill>{c.court}</Pill>}
        {c.lawyer === null ? (
          <Pill status="warn">юрист {NO_DATA}</Pill>
        ) : (
          <Pill>юрист: {c.lawyer}</Pill>
        )}
        {c.inAppeal && <Pill status="warn">апелляция босқичида</Pill>}
        <HearingPill d={c.hearing} />
        <span className="flex-1" />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={
            "flex-none cursor-pointer rounded-[5px] border px-2 py-[3px] text-[11px] font-semibold " +
            (open
              ? "border-s1 bg-surface-2 text-ink"
              : "border-hair bg-surface-2 text-ink-2 hover:text-ink")
          }
        >
          {open ? "− яшириш" : "+ тўлиқ матн"}
        </button>
      </div>

      <div id={panelId} hidden={!open} className="pl-[24px]">
        {open && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {c.caseNumber !== null && (
                <Pill status={c.caseNumberDuplicate ? "warn" : "mute"}>
                  иш № {c.caseNumber}
                  {c.caseNumberDuplicate ? " · такрорланган" : ""}
                </Pill>
              )}
              {c.rowSpan > 1 && (
                <Pill status="warn">
                  манбада {c.excelRow}–{c.excelRowEnd} қатор (бирлаштирилган)
                </Pill>
              )}
            </div>

            <div className={"mt-2 " + GRID.g2}>
              <DateField label="Иш тайинланган ажрим сана" d={c.ruling} />
              <DateField label="Суд кўриладиган кун" d={c.hearing} />
            </div>

            <div className="mt-2">
              <Field label="Суд натижаси">{c.result}</Field>
            </div>

            {/* Шикоят устунлари манбада ЖУДА сийрак тўлдирилган (2/23, 3/23
                ва 0/23). Улар шу ерда ҳам кўринади: «устун бор, лекин бўш»
                ҳолати фақат сифат бўлимида турса, рўйхатни ўқиётган одам
                устуннинг умуман йўқлигини ўйларди. */}
            <div className={"mt-2 " + GRID.g2}>
              <Field label={`Суд қароридан норози томон шикояти${at("appealSummary")}`}>
                {c.appealSummary}
              </Field>
              <Field label={`Шикоят кўриладиган сана ва натижаси${at("appealHearingText")}`}>
                {c.appealHearing}
              </Field>
              <Field label={`Шикоят иши қолдирилган кун${at("appealPostponedText")}`}>
                {c.appealPostponed}
              </Field>
              <Field label={`Изоҳ${at("note")}`}>{c.note}</Field>
            </div>

            <Extras list={c.extras} />
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. претензия                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Битта претензия.
 *
 * ⚠️ Сумма МАНБАДАГИ хом қиймат билан, манбадаги ЁРЛИҒИ билан кўрсатилади
 * ва ёнида кўринадиган огоҳлантириш туради. Қиймат бу ерда қайта
 * шкалаланмайди: сарлавҳа «млн сўм» дейди, лекин 9 106 250 «млн сўм» бўлса
 * 9,1 триллион сўм чиқарди — ишонарсиз, лекин бу ҳам ТАХМИН.
 */
function ClaimRow({ c, fillOf }: { c: LegalClaimRow; fillOf: (field: string) => string }) {
  const at = (field: string) => {
    const f = fillOf(field);
    return f === "" ? "" : ` (${f})`;
  };
  return (
    <div className="border-t border-grid py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="w-[26px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {c.ordinal === null ? "—" : nf(c.ordinal)}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] [font-weight:650] break-words">
          {c.respondent ?? <Muted>жавобгар {NO_DATA}</Muted>}
        </span>
        <span className="flex-none text-right font-mono text-[13px] tabular-nums">
          {c.amountRaw === null ? <Muted /> : exact(c.amountRaw)}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[26px]">
        <Pill>манбадаги ёрлиқ: {c.amountUnitLabel}</Pill>
        {c.amountUnitSuspect && (
          <Pill status="warn">⚠ бирлик тасдиқланмаган — қиймат катталиги «сўм» ни кўрсатади</Pill>
        )}
        {c.excelRow !== null && <Pill>манбада {c.excelRow}-қатор</Pill>}
      </div>

      <div className="mt-2 pl-[26px]">
        <Field label="Иш мазмуни">{c.subject}</Field>
      </div>

      {/* Бу тўрт устун манбада бутунлай бўш — улар ЎЗ ЎРНИДА қолади, ёнида
          эса нечта ёзувда тўлганини API'нинг ўзи айтади. */}
      <div className={"mt-2 pl-[26px] " + GRID.g4}>
        <DateField label={`Талабнома юборилган кун${at("sentDateText")}`} d={c.sent} />
        <Field label={`Талабномада кўрсатилган муддат${at("deadlineText")}`}>{c.deadline}</Field>
        <Field label={`Жавобгардан келиб тушган хат${at("responseText")}`}>{c.response}</Field>
        <Field label={`Изоҳ${at("note")}`}>{c.note}</Field>
      </div>

      <div className="pl-[26px]">
        <Extras list={c.extras} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. шартнома экспертизаси                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Битта экспертиза.
 *
 * ⚠️ Манбада 5- ва 6-устуннинг сарлавҳаси АЙНАН бир хил
 * («Кўриб чиқилган кун.ой.йил»), лекин 5-си — сана, 6-си — юридик хулоса
 * МАТНИ. Шунинг учун улар бу ерда иккита АЛОҲИДА майдон бўлиб туради ва
 * фарқи ёрлиқда ёзилган.
 *
 * ⚠️ «Кўриб чиқилган» қиймати аслида ОЙ белгиси (манбада 10/10 қиймат ойнинг
 * 1-куни) — шунинг учун «Январь 2026» деб кўрсатилади, «1-январь» деб эмас.
 */
function ReviewRow({ r }: { r: LegalReviewRow }) {
  return (
    <div className="border-t border-grid py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="w-[26px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {r.ordinal === null ? "—" : nf(r.ordinal)}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] [font-weight:650] break-words">
          {r.counterparty ?? <Muted>контрагент {NO_DATA}</Muted>}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[26px]">
        {r.ordinalDuplicate && <Pill status="warn">Т/р {r.ordinal} такрорланган</Pill>}
        {r.rowSpan > 1 && (
          <Pill status="warn">
            манбада {r.excelRow}–{r.excelRowEnd} қатор (бирлаштирилган)
          </Pill>
        )}
        {r.rowSpan === 1 && r.excelRow !== null && <Pill>манбада {r.excelRow}-қатор</Pill>}
      </div>

      <div className={"mt-2 pl-[26px] " + GRID.g2}>
        <DateField label="Келиб тушган кун" d={r.received} />
        <Field label="Кўриб чиқилган (5-устун · манбада ОЙ белгиси)">
          {r.reviewed.label === null ? null : (
            <>
              <span className="font-mono tabular-nums">{r.reviewed.label}</span>
              {r.reviewed.monthOnly && (
                <span className="ml-1.5 align-middle">
                  <Pill>кун эмас, ой</Pill>
                </span>
              )}
              {r.reviewed.yearSuspect && (
                <span className="ml-1.5 align-middle">
                  <Pill status="crit">⚠ йил кетма-кетликдан чиққан</Pill>
                </span>
              )}
            </>
          )}
        </Field>
      </div>

      <div className={"mt-2 pl-[26px] " + GRID.g2}>
        {/* Манбадаги сарлавҳа шартнома номини ваъда қилади, катакда эса
            ЛАВОЗИМ турибди — ёрлиқда шу ёзилган. */}
        <Field label="«Шартнома номи / предмети» устуни (манбада лавозим турибди)">
          {r.contractName}
        </Field>
        <Field label="Хулоса матни (6-устун · сарлавҳаси 5-устун билан бир хил)">
          {r.conclusion}
        </Field>
      </div>

      <div className="pl-[26px]">
        <Extras list={r.extras} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* маълумот сифати                                                            */
/* -------------------------------------------------------------------------- */

/** Битта бўлимнинг сифат блоки — ҳамма белги бир хил кўринишда. */
function QualityCard({ q }: { q: LegalSectionQuality }) {
  const merged = q.physicalRows - q.records;
  return (
    <Card
      title={q.title}
      sub={`${q.issues} та белги`}
      stripe={q.issues === 0 ? "var(--good)" : "var(--warn)"}
      note={`Варақ «${q.sheet}» · ${q.records} мантиқий ёзув, ${q.physicalRows} физик Excel қатори.`}
    >
      {merged > 0 && (
        <p className="mb-2 text-[11.5px] leading-[1.5] text-ink-3">
          Фарқ <b className="font-mono font-semibold text-ink-2">{merged}</b> қатор —{" "}
          {q.mergedBlocks.length} та бирлаштирилган (merge) блок сабабли. Бу фарқ импорт
          блокларни ТЎҒРИ ҳал қилганининг далили: акс ҳолда бир нечта ёзув икки марта
          ҳисобланарди.{" "}
          {q.mergedBlocks.length > 0 && (
            <>
              Блоклар:{" "}
              {q.mergedBlocks.map((b) => `${b.excelRow}–${b.excelRowEnd}`).join(", ")}. Блок
              ичида ҳар бир устун АЛОҲИДА ўқилади — бирорта устун merge бўлмаса, ундаги
              фарқли қиймат пастдаги «қутқарилган катаклар» да қолади.
            </>
          )}
        </p>
      )}

      {q.emptyColumns.length > 0 && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Бутунлай бўш устунлар ({q.emptyColumns.length} та)</div>
          <ul className="mt-1 flex flex-col">
            {q.emptyColumns.map((c) => (
              <li
                key={c.key}
                className="flex flex-wrap items-baseline gap-x-2 border-t border-grid py-1.5 text-[12px] first:border-t-0"
              >
                <span className="min-w-0 flex-1 break-words text-ink-2">{c.label}</span>
                <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                  {c.filled} / {c.total}
                </span>
                <Pill status="warn">устун бор, маълумот йўқ</Pill>
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.sparseColumns.length > 0 && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Сийрак тўлдирилган устунлар ({q.sparseColumns.length} та)</div>
          <ul className="mt-1 flex flex-col">
            {q.sparseColumns.map((c) => (
              <li
                key={c.key}
                className="flex flex-wrap items-baseline gap-x-2 border-t border-grid py-1.5 text-[12px] first:border-t-0"
              >
                <span className="min-w-0 flex-1 break-words text-ink-2">{c.label}</span>
                <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                  {c.filled} / {c.total} · {pctTxt(c.ratio * 100)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-3">
            Ярмидан ками тўлдирилган устун бўйича ўртача ёки йиғинди ҳисобланмайди — у бутун
            бўлим ҳақида ҳеч нарса демайди.
          </p>
        </div>
      )}

      {(q.duplicateCaseNumbers.length > 0 || q.duplicateOrdinals.length > 0) && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Такрорий қийматлар</div>
          <ul className="mt-1 flex flex-col">
            {q.duplicateCaseNumbers.map((d) => (
              <li key={d.key} className="border-t border-grid py-1.5 text-[12px] first:border-t-0">
                Иш рақами <b className="font-mono font-semibold">{d.value}</b> —{" "}
                {d.excelRows.join(", ")}-қаторларда. Иккала ёзув ҳам САҚЛАНГАН: даъвогар бошқа,
                ўчириш маълумот йўқотиш бўларди.
              </li>
            ))}
            {q.duplicateOrdinals.map((d) => (
              <li key={d.key} className="border-t border-grid py-1.5 text-[12px] first:border-t-0">
                <b className="font-mono font-semibold">Т/р {d.value}</b> —{" "}
                {d.excelRows.join(", ")}-қаторларда. Шунинг учун `Т/р` калит сифатида
                ишлатилмайди.
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.duplicateHeaders.map((h) => (
        <div key={h.key} className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Сарлавҳа такрори</div>
          <p className="mt-1 text-[12px] leading-[1.5]">
            «<b>{h.header}</b>» сарлавҳаси иккита устунда. Улар иккита АЛОҲИДА майдонга
            ўқилган: <span className="font-mono text-[11.5px]">{h.fields.join(", ")}</span> —
            рўйхатда ҳам алоҳида кўрсатилади.
          </p>
          <Reason>{h.reason}</Reason>
        </div>
      ))}

      {q.headerConflicts.map((h) => (
        <div key={h.key} className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Сарлавҳа мазмунга мос эмас</div>
          <p className="mt-1 text-[12px] leading-[1.5]">
            «<b>{h.header}</b>» (<span className="font-mono text-[11.5px]">{h.field}</span>).
            Манбадаги мисоллар: {h.samples.join(" · ")}.
          </p>
          <Reason>{h.reason}</Reason>
        </div>
      ))}

      {q.unitConflicts.map((u) => (
        <div key={u.key} className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Ўлчов бирлиги зиддияти</div>
          <p className="mt-1 text-[12px] leading-[1.5]">
            Сарлавҳа «<b>{u.header}</b>» — эълон қилинган бирлик{" "}
            <b>{u.declaredUnit}</b>, қиймат катталиги эса <b>{u.observedUnit}</b> ни кўрсатади.
            Қиймат <b>қайта шкалаланмаган</b>.
          </p>
          <DataTable
            className="mt-1.5"
            cols={[
              { t: "Қатор", num: true },
              { t: "Манбадаги қиймат", num: true },
            ]}
            rows={u.values.map((v) => ({
              key: `${u.key}-${v.excelRow}`,
              cells: [nf(v.excelRow), exact(v.value)],
            }))}
            caption="Бирлиги шубҳали қийматлар"
          />
          <Reason>{u.reason}</Reason>
        </div>
      ))}

      {q.monthOnlyDates && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Сана эмас, ой</div>
          <p className="mt-1 text-[12px] leading-[1.5]">
            «<b>{q.monthOnlyDates.column}</b>» устунидаги {q.monthOnlyDates.records} та
            қийматнинг ҲАММАСИ ойнинг 1-куни. Панелда улар ой сифатида кўрсатилади
            («Январь 2026»), кун сифатида эмас.
          </p>
          <Reason>{q.monthOnlyDates.reason}</Reason>
        </div>
      )}

      {q.dateAnomalies.length > 0 && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Сана аномалияси ({q.dateAnomalies.length} та)</div>
          <DataTable
            className="mt-1.5"
            cols={[
              { t: "Қатор", num: true },
              { t: "Устун", wrap: true },
              { t: "Манбадаги қиймат" },
              { t: "Йил", num: true },
              { t: "Кутилган йил", num: true },
            ]}
            rows={q.dateAnomalies.map((a) => ({
              key: a.key,
              cells: [
                nf(a.excelRow),
                a.column,
                a.value,
                <b key="y" className="text-crit-ink">
                  {nf(a.year)}
                </b>,
                a.expectedYear === null ? "—" : nf(a.expectedYear),
              ],
            }))}
            caption="Кетма-кетликдан чиққан саналар"
          />
          <Reason>{q.dateAnomalies[0].reason}</Reason>
        </div>
      )}

      {q.extras.length > 0 && (
        <div className="mt-2 border-t border-grid pt-2">
          <div className={LBL}>Бирлаштирилган блокдан қутқарилган катаклар</div>
          <ul className="mt-1 flex flex-col">
            {q.extras.map((e) => (
              <li
                key={e.key}
                className="border-t border-grid py-1.5 text-[11.5px] leading-[1.5] break-words first:border-t-0"
              >
                <span className="font-mono text-ink-3">{e.excelRow}-қатор</span> · {e.column}:{" "}
                {e.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {q.warnings.length > 0 && <Reason>Огоҳлантиришлар: {q.warnings.join("; ")}</Reason>}

      {q.issues === 0 && (
        <p className="text-[12px] leading-[1.5] text-ink-3">
          Бу бўлимда белги топилмади: устунлар тўлдирилган, такрор ва номувофиқлик йўқ.
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* манба ҳақида — биринчи экрандан тушган изоҳлар                             */
/* -------------------------------------------------------------------------- */

/**
 * Манба ва методология — биринчи экрандан ТУШГАН матнлар.
 *
 * ⚠️ Бу ерда ҳеч нарса ўчирилмаган. Аввал плиткалар остида чип бўлиб турган
 * («42 физик Excel қатори», «фарқ 7 қатор — merge», «5 бирлаштирилган блок»,
 * «такрорий Т/р бор», «8 устундан 4 таси бўш»), бўлим сарлавҳасининг ёнида
 * турган («учала тур алоҳида…») ва диаграмма тагида уч қатор бўлиб ётган
 * ҳар бир жумла шу ерда ТЎЛИҚ ҳолида сақланган. Ўзгаргани фақат ЖОЙИ.
 */
function LegalSourceCard({ v }: { v: LegalView }) {
  const t = v.totals;
  const cf = v.caseFlow;
  const merged = t.physicalRows - t.records;
  return (
    <Card
      title="Манба ва методология"
      sub={`${t.records} мантиқий ёзув · ${t.physicalRows} физик Excel қатори`}
      note="Биринчи экрандаги ҳар бир сон айнан шу манбадан ва айнан шу қоидалар билан ҳисобланган."
    >
      <div className="border-t border-grid pt-2">
        <div className={LBL}>Нега учала тур АЛОҲИДА</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Манбада учта варақ бор ва уларнинг устунлари <b>Т/р</b> дан бошқа жойда умуман
          кесишмайди, шунинг учун улар битта «универсал» жадвалга йиғилмайди. Йиғилса «бу
          майдон бу тур учун МАВЖУД ЭМАС» билан «бу майдон ТЎЛДИРИЛМАГАН» фарқланмай
          қоларди — бу бутун сводка бўйлаб амал қиладиган асосий қоидани бузарди.
        </p>
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Варақлар ва қаторлар</div>
        <DataTable
          className="mt-1.5"
          cols={[
            { t: "Бўлим", wrap: true },
            { t: "Варақ", wrap: true },
            { t: "Ёзув", num: true },
            { t: "Физик қатор", num: true },
            { t: "Merge блок", num: true },
            { t: "Устун", num: true },
            { t: "Бўш устун", num: true },
          ]}
          rows={[v.quality.courtCases, v.quality.claims, v.quality.contractReviews].map((s) => ({
            key: s.key,
            cells: [
              s.title,
              s.sheet,
              nf(s.records),
              nf(s.physicalRows),
              nf(s.mergedBlocks.length),
              nf(s.columns.length),
              s.emptyColumns.length === 0 ? (
                <span key="e" className="font-mono text-ink-3">
                  0
                </span>
              ) : (
                <b key="e" className="text-warn-ink">
                  {nf(s.emptyColumns.length)}
                </b>
              ),
            ],
          }))}
          caption="Варақлар бўйича ёзув, қатор ва устунлар ҳисоби"
        />
        {merged > 0 && (
          <p className="mt-1.5 text-[12px] leading-[1.5] text-ink-2">
            Жами фарқ <b className="font-mono">{nf(merged)}</b> қатор — бирлаштирилган
            (merge) блоклар сабабли. Бу фарқ импорт блокларни ТЎҒРИ ҳал қилганининг далили:
            акс ҳолда бир нечта ёзув икки марта ҳисобланарди.
          </p>
        )}
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Мажлислар диаграммаси қандай ўқилади</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Ўқ узлуксиз: оралиқдаги нол — ҲАҚИҚИЙ нол, ўша ойда мажлис бўлмаган. Санаси
          ўқилмаган иш диаграммага УМУМАН кирмайди — нол баландлик билан турса «мажлис
          бўлмаган» дегандай кўринарди, бу эса бутунлай бошқа гап. Диаграммада{" "}
          <b className="font-mono">{nf(cf.hearingIso)}</b> та иш бор;{" "}
          <b className="font-mono">{nf(cf.hearingAsText)}</b> та ишда сана ўрнида хом матн
          турибди (бэкенд уни атайин парс қилмаган — форматни тахмин қилиш маълумот тўқиш
          бўларди) ва <b className="font-mono">{nf(cf.hearingMissing)}</b> та ишда мажлис
          куни умуман кўрсатилмаган. Иккинчиси нол эмас, маълумотнинг йўқлиги.
        </p>
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Нега «суд натижаси» бўйича диаграмма йўқ</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          «Суд натижаси» устуни{" "}
          <b className="font-mono">
            {nf(cf.resultFilled)} / {nf(t.courtCases)}
          </b>{" "}
          тўлдирилган, лекин у <b>эркин матн</b>: {nf(cf.resultDistinct)} ноёб қиймат,
          узунлиги {nf(cf.resultMinLen)}–{nf(cf.resultMaxLen)} белги. «Ютилган /
          ютқазилган» каби тасниф манбада умуман ЙЎҚ, уни матндан чиқариш эса маълумот
          тўқиш бўларди — шунинг учун натижа диаграммага айлантирилмади ва ҳар бир ишнинг
          ичида тўлиқ матн ҳолида турибди.
        </p>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-ink-2">
          Шу сабабдан «қарама-қарши томон» устуни ҳам ясалмади: манбада бундай устун йўқ,
          томонлар иш мазмуни матнининг ичида («даъвогар … жавобгар …»). Суд ишида даъво
          СУММАСИ учун ҳам алоҳида устун йўқ — сумма устуни фақат «Претензиялар» варағида.
        </p>
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Ёнидаги «Давлат харидлари» билан фарқи</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Иккови ҳам бошқарма ҳужжатидан келади ва иккови ҳам вақт қатори эмас, лекин
          мазмуни умуман кесишмайди: бу — ҲУҚУҚИЙ иш юритиш (суд ишлари, претензиялар,
          шартнома экспертизаси), у эса ХАРИД ҳажмлари (тур × чорак). Алоҳида бэкенд
          модуллари.
        </p>
      </div>
    </Card>
  );
}

/**
 * Манбадаги белгиларнинг ЯЛПИ ҳисоби — тури бўйича.
 *
 * ⚠️ Бу чизиқ аввал БИРИНЧИ ЭКРАНДА, плиткаларнинг остида, бутун кенглик
 * бўйлаб турарди ва саҳифадаги иккинчи энг кўзга ташланадиган элемент эди —
 * ҳолбуки ундаги саккизта чипнинг биттаси ҳам юридик иш ҳақида эмас. Ҳар
 * бир чип шу ерда сақланган, фақат жойи ўзгарди.
 */
function LegalQualitySummaryCard({ v }: { v: LegalView }) {
  const qy = v.quality;
  const qs = qy.summary;
  if (qy.issues === 0) return null;
  return (
    <Card className="mb-3" stripe="var(--warn)">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[12.5px] [font-weight:650]">
          Манбада {qy.issues} та белги топилган
        </span>
        {qs.unitConflicts > 0 && (
          <Pill status="crit">{qs.unitConflicts} ўлчов бирлиги зиддияти</Pill>
        )}
        {qs.dateAnomalies > 0 && <Pill status="crit">{qs.dateAnomalies} сана аномалияси</Pill>}
        {qs.emptyColumns > 0 && <Pill status="warn">{qs.emptyColumns} бутунлай бўш устун</Pill>}
        {qs.sparseColumns > 0 && <Pill status="warn">{qs.sparseColumns} сийрак устун</Pill>}
        {qs.duplicates > 0 && <Pill status="warn">{qs.duplicates} такрорий қиймат</Pill>}
        {qs.headerIssues > 0 && <Pill status="warn">{qs.headerIssues} сарлавҳа муаммоси</Pill>}
        {qs.monthOnlyColumns > 0 && <Pill>{qs.monthOnlyColumns} устун: кун эмас, ой</Pill>}
        {qs.mergedBlocks > 0 && <Pill>{qs.mergedBlocks} бирлаштирилган блок</Pill>}
        {qs.extras > 0 && <Pill>{qs.extras} қутқарилган катак</Pill>}
        {qs.warnings > 0 && <Pill>{qs.warnings} импорт огоҳлантириши</Pill>}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function LegalAffairsPanel() {
  const q = useQuery("legal-affairs-dashboard", (s) => getLegalAffairsDashboard(s));
  return (
    <Loader q={q} height={420} notAvailableWhat="/legal-affairs/dashboard">
      {(data) => <LegalBody data={data} />}
    </Loader>
  );
}
function LegalBody({ data }: { data: LegalAffairsDashboard }) {
  const pal = usePalette();
  const v = useMemo(() => legalView(data), [data]);
  const t = v.totals;
  const qy = v.quality;
  const cf = v.caseFlow;
  const rf = v.reviewFlow;

  // Иккита кесим — иккита АЛОҲИДА карточка. Ўлчов иккисида ҳам «та», лекин
  // булар икки ХИЛ кесим ва битта шкалага қўйилса солиштирув маъносиз бўларди.
  const lawyerRows = v.byLawyer.map((l) => ({
    label: l.label,
    v: l.cases,
    extra: ["Улуш", pctTxt((l.cases / Math.max(1, t.courtCases)) * 100)] as [string, string],
  }));
  const courtRows = v.byCourt.map((c) => ({
    label: c.label,
    v: c.cases,
    extra: ["Улуш", pctTxt((c.cases / Math.max(1, t.courtCases)) * 100)] as [string, string],
  }));

  const noLawyer = v.cases.filter((c) => c.lawyer === null).length;
  const columnsTotal =
    qy.courtCases.columns.length + qy.claims.columns.length + qy.contractReviews.columns.length;

  // Мажлислар ой кесими — ЯГОНА вақт ўқи бор кесим.
  // ⚠️ Ўқ УЗЛУКСИЗ: оралиқдаги нол «ўша ойда мажлис бўлмаган» дегани ва бу
  // ҲАҚИҚИЙ нол. Санаси ўқилмаган иш диаграммага умуман кирмайди — у нол
  // баландлик билан турса «мажлис бўлмаган» дегандай кўринарди, бу эса
  // бутунлай бошқа гап. Ундай ишлар изоҳда алоҳида санаб ўтилади.
  const monthLabels = cf.byMonth.map((m) => monthTick(m.month));
  const monthFull = cf.byMonth.map((m) => monthLabel(m.month));
  const monthSeries = [
    { name: "Суд мажлислари", color: pal.s1, values: cf.byMonth.map((m) => m.cases) },
  ];
  const peakMonth =
    cf.byMonth.length === 0 ? null : cf.byMonth.reduce((a, b) => (b.cases > a.cases ? b : a));

  /*
   * ⚠️ Устун устидаги қиймат ёрлиғининг индекси — МАЪЛУМОТ индекси ЭМАС.
   *
   * Recharts баландлиги нол бўлган устун учун тўртбурчакни умуман чизмайди
   * (12 ойдан 3 таси нол → SVG'да 9 та `path`), `LabelList` эса ўша ЧИЗИЛГАН
   * тўртбурчакларни санайди. Натижада нолли ойдан кейинги ҳамма ёрлиқ бир
   * позиция чапга силжиб, «Ноябрь = 7» ёрлиғи «Декабрь» устунининг устида
   * турарди — экрандаги сон бошқа ойга тегишли бўлиб қоларди.
   *
   * Шунинг учун мослик шу ерда тикланади: чизилган устунлар — айнан нолдан
   * катта ойлар, ўз тартибида. Диаграммада нол ойлар ЎЗ ЎРНИДА қолади (ўқ
   * узлуксиз), фақат уларнинг устида ёзадиган сон йўқ — «0» ёрлиқлари 12
   * устунли диаграммани шовқинга тўлдирарди.
   *
   * Бу `components/Columns.tsx` нинг умумий хулқи ва бошқа панелларга ҳам
   * тегишли — лекин уни шу вазифа доирасида ўзгартириш 5 та бошқа панелнинг
   * кўринишига тегиб кетарди, шунинг учун тузатиш чақирувчи томонда.
   */
  const drawnMonths = cf.byMonth.filter((m) => m.cases > 0);

  // Экспертизаларнинг ҚИСҚА кесими — тўлиқ шакли (хулоса матни, қутқарилган
  // катаклар, «лавозим турган» устун) пастда, «Батафсил маълумот» да.
  const reviewRows: Row[] = v.reviews.map((r) => ({
    key: r.key,
    cells: [
      <span key="o" className="font-mono text-[11.5px] tabular-nums">
        {r.ordinal === null ? "—" : nf(r.ordinal)}
        {r.ordinalDuplicate && (
          <span className="ml-1.5 align-middle">
            <Pill status="warn">такрор</Pill>
          </span>
        )}
      </span>,
      r.counterparty ?? <Muted key="c">контрагент {NO_DATA}</Muted>,
      r.received.label === null ? (
        <Muted key="rc" />
      ) : (
        <span key="rc" className={r.received.asText ? undefined : "font-mono tabular-nums"}>
          {r.received.label}
        </span>
      ),
      r.reviewed.label === null ? (
        <Muted key="rv" />
      ) : (
        <span key="rv">
          <span className="font-mono tabular-nums">{r.reviewed.label}</span>
          {r.reviewed.yearSuspect && (
            <span className="ml-1.5 align-middle">
              <Pill status="crit">⚠ йил</Pill>
            </span>
          )}
        </span>
      ),
    ],
  }));

  return (
    <>
      {/* --- 1. БОШ РАҚАМЛАР: учала бўлим бир қарашда -----------------------
          ⚠️ Плиткаларнинг ости аввал файл механикаси билан тўла эди («42
          физик Excel қатори», «фарқ 7 қатор — merge», «5 бирлаштирилган
          блок», «такрорий Т/р бор», «8 устундан 4 таси бўш»). Ўша чипларнинг
          ҳаммаси «Батафсил маълумот → Манба ва методология» жадвалида
          сақланган; бу ерда эса ўрнига ИШ ҳақидаги факт турибди. */}
      <Section title="Юридик бошқарма" note="ҳуқуқий иш юритиш — жорий ҳолат">
        <div className={GRID.g4}>
          <StatTile
            label="Суд ишлари"
            value={nf(t.courtCases)}
            unit="та"
            stripe="var(--s1)"
            foot={
              <>
                <Pill>
                  {v.byCourt.length} суд · {v.byLawyer.length} юрист
                </Pill>
                {cf.appealed.length > 0 && (
                  <Pill status="warn">{cf.appealed.length} таси апелляцияда</Pill>
                )}
                {noLawyer > 0 && <Pill status="warn">{noLawyer} тада юрист йўқ</Pill>}
              </>
            }
          />
          <StatTile
            label="Претензиялар"
            value={nf(t.claims)}
            unit="та"
            stripe="var(--s2)"
            foot={
              <>
                {/* Даъво суммаси МАНБАДАГИ хом қиймат билан — қайта
                    шкалаланмайди. Ёрлиқ тасдиқланмагани соннинг ЎЗИГА
                    тегади, шунинг учун огоҳлантириш шу ерда қолади. */}
                <Pill>
                  сумма: {t.claimsAmountRawSum === null ? NO_DATA : exact(t.claimsAmountRawSum)}
                </Pill>
                {t.claimsAmountUnitSuspect && <Pill status="warn">⚠ бирлик тасдиқланмаган</Pill>}
              </>
            }
          />
          <StatTile
            label="Шартнома экспертизаси"
            value={nf(t.contractReviews)}
            unit="та"
            stripe="var(--s3)"
            foot={
              rf.reviewedFirst !== null && rf.reviewedLast !== null ? (
                <Pill>
                  {monthLabel(rf.reviewedFirst)} — {monthLabel(rf.reviewedLast)}
                </Pill>
              ) : (
                <Pill>кўриб чиқилган давр {NO_DATA}</Pill>
              )
            }
          />
          <StatTile
            label="Жами ёзувлар"
            value={nf(t.records)}
            unit="та"
            stripe="var(--s4)"
            foot={
              <Pill>
                {t.courtCases} суд иши · {t.claims} претензия · {t.contractReviews} экспертиза
              </Pill>
            }
          />
        </div>
      </Section>

      {/* --- 2. СУД ИШЛАРИ — бўлимнинг мазмуни ------------------------------
          ⚠️ Ишларнинг рўйхати аввал «Батафсил маълумот» ичидаги ёпиқ блокда
          эди: бўлимнинг ЯГОНА мазмунли қисми бир босиш ортида турарди. Энди
          у шу ернинг ўзида ва ҳар бир иш бир қарашда ўқилади. */}
      <Section
        title="Суд ишлари"
        note={`${t.courtCases} та иш · ${v.byCourt.length} суд · ${v.byLawyer.length} юрист`}
      >
        <Card
          title="Ишлар — нима ҳақида"
          sub={`${v.cases.length} та`}
          note="Ҳар бир қаторда: иш мазмуни, суди, юристи, босқичи ва мажлис куни. «Тўлиқ матн» — манбадаги ҳамма майдон: мазмуннинг тўлиғи, суд натижаси, шикоят матнлари ва изоҳ."
        >
          {v.cases.length === 0 ? (
            <EmptyState title="Суд ишлари топилмади" />
          ) : (
            /* Рўйхат узун (23 иш) — карточка бутун саҳифани чўзиб
               юбормаслиги учун ўз ичида скроллга ўтади. Чегара `tbl-wrap`
               нинг ҳулқи билан бир хил: мазмун кесилмайди, фақат кўриниш
               қутиси чекланади. */
            <div className="max-h-[620px] overflow-y-auto rounded-[6px] border border-hair px-3" tabIndex={0}>
              {v.cases.map((c) => (
                <CaseCard key={c.key} c={c} fillOf={qy.courtCases.fillOf} />
              ))}
            </div>
          )}
        </Card>

        <div className={"mt-3 " + GRID.g3}>
          <Card title="Юристлар кесими" sub={`${v.byLawyer.length} юрист`}>
            {lawyerRows.length === 0 ? (
              <EmptyState title="Юрист кўрсатилган иш топилмади" />
            ) : (
              <BarsH
                rows={lawyerRows}
                vName="Ишлар"
                vFmt={(n) => nf(n)}
                ariaLabel="Суд ишларининг юристлар бўйича тақсимоти"
              />
            )}
          </Card>
          <Card title="Судлар кесими" sub={`${v.byCourt.length} суд`}>
            {courtRows.length === 0 ? (
              <EmptyState title="Суд номи кўрсатилган иш топилмади" />
            ) : (
              <BarsH
                rows={courtRows}
                vName="Ишлар"
                vFmt={(n) => nf(n)}
                ariaLabel="Суд ишларининг судлар бўйича тақсимоти"
              />
            )}
          </Card>

          <Card
            title="Апелляция босқичи"
            sub={`${cf.appealed.length} / ${t.courtCases} иш`}
            stripe={cf.appealed.length > 0 ? "var(--s2)" : undefined}
          >
            <Big label="Апелляцияга чиққан" value={cf.appealed.length} unit="та иш">
              <p className="mt-1 text-[11px] leading-[1.45] text-ink-3">
                {t.courtCases} ишдан{" "}
                <b className="font-semibold text-ink-2">
                  {pctTxt((cf.appealed.length / Math.max(1, t.courtCases)) * 100)}
                </b>
                . Шикоят матни ишнинг «тўлиқ матн» ида.
              </p>
            </Big>

            {cf.appealed.length > 0 && (
              <ul className="mt-2.5 flex flex-col border-t border-grid pt-1">
                {cf.appealed.map((a) => (
                  <AppealRow key={a.key} a={a} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Мажлисларнинг вақт кесими — «иш қачон кўрилган» ва «яқинда нима
            кутиляпти» деган саволга жавоб. Аввал диаграмманинг остида уч
            қаторли методология матни турарди; у «Манба ва методология»
            блокига тўлиқ кўчирилган, бу ерда битта жумла қолди. */}
        <Card
          className="mt-3"
          title="Суд мажлислари — ойлар бўйича"
          sub="та"
        >
          {cf.byMonth.length === 0 ? (
            <EmptyState
              title="Мажлис санаси ўқилган иш йўқ"
              text="Бу «юкланмади» эмас: манбада сана ўқиладиган шаклда кўрсатилмаган."
            />
          ) : (
            <Columns
              labels={monthLabels}
              fullLabels={monthFull}
              series={monthSeries}
              height={200}
              vFmt={(n) => `${nf(n)} та`}
              /* Индекс — ЧИЗИЛГАН устунники, шунинг учун `drawnMonths`.
                 Сабаби юқорида, `drawnMonths` нинг ёнида ёзилган. */
              valueLabel={(_, i) => {
                const m = drawnMonths[i];
                return m === undefined ? null : nf(m.cases);
              }}
              ariaLabel="Суд мажлисларининг ойлар бўйича тақсимоти"
            />
          )}

          {/* ⚠️ «Яқин мажлислар» блоки фақат ҲАҚИҚАТАН кутилаётган мажлис
              бўлса чизилади. Ҳозир манбада битта ҳам йўқ — бўш блокни
              «маълумот йўқ» деб кўрсатиш шовқиндан бошқа нарса бермасди. */}
          {cf.upcoming.length > 0 ? (
            <div className="mt-2 border-t border-grid pt-2">
              <div className={LBL}>
                Кутилаётган мажлислар ({nf(cf.upcoming.length)} та · {dateLabel(cf.today)}{" "}
                ҳолатига)
              </div>
              <ul className="mt-1 flex flex-col">
                {cf.upcoming.map((u) => (
                  <li
                    key={u.key}
                    className="flex flex-wrap items-baseline gap-x-2 border-t border-grid py-1.5 text-[12px] first:border-t-0"
                  >
                    <span className="w-[26px] flex-none font-mono text-[11px] tabular-nums text-ink-3">
                      {u.ordinal === null ? "—" : nf(u.ordinal)}
                    </span>
                    <span className="font-mono tabular-nums">{dateLabel(u.date)}</span>
                    <span className="min-w-0 flex-1 break-words text-ink-2">
                      {u.court ?? NO_DATA}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 border-t border-grid pt-2 text-[12px] leading-[1.5] text-ink-2">
              <b>{dateLabel(cf.today)}</b> ҳолатига кутилаётган мажлис йўқ — ўқилган{" "}
              {nf(cf.hearingIso)} та сананинг ҳаммаси ўтган даврга тегишли
              {cf.hearingLast !== null && <>, энг охиргиси {dateLabel(cf.hearingLast)}</>}.
              {peakMonth !== null && peakMonth.cases > 0 && (
                <> Энг банд ой — {monthLabel(peakMonth.month)}, {nf(peakMonth.cases)} та мажлис.</>
              )}
            </p>
          )}
        </Card>
      </Section>

      {/* --- 3. ПРЕТЕНЗИЯЛАР — атиги 2 ёзув, тўлиқ ҳолда кўринади -----------
          ⚠️ «Бўлим ҳолати» карточкаси (ёзувлар, физик Excel қаторлари,
          устунлар, бутунлай бўш устунлар) «Манба ва методология» жадвалига
          кўчирилди — у файл ҳақида, претензия ҳақида эмас. */}
      <Section title="Претензиялар" note={`${t.claims} та · даъво юборилган`}>
        <Card
          title="Даъво суммаси"
          sub={t.claimsAmountUnitLabel}
          stripe={t.claimsAmountUnitSuspect ? "var(--warn)" : "var(--s1)"}
        >
          <div className="font-mono text-[24px] leading-[1.1] [font-weight:640] tabular-nums tracking-[-0.02em]">
            {t.claimsAmountRawSum === null ? <Muted /> : exact(t.claimsAmountRawSum)}
          </div>
          {/* Қиймат ҳам, ёрлиқ ҳам манбадагидек. Қайта шкалалаш (×1000 ёки
              ÷1000) АТАЙЛАБ қилинмайди: у тахминни ҳақиқатга айлантириб
              қўярди. Огоҳлантириш соннинг ЎЗИГА тегади — шунинг учун битта
              қисқа жумла бўлиб шу ерда қолади. */}
          <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-2">
            {t.claims} та ёзувдан.
            {t.claimsAmountUnitSuspect && (
              <>
                {" "}
                ⚠ Бирлик <b>тасдиқланмаган</b>: манбадаги сарлавҳа «млн сўм» дейди, қиймат
                катталиги эса оддий «сўм» ни кўрсатади. Қиймат қайта ҳисобланмади.
              </>
            )}
          </p>
        </Card>

        {/* Атиги 2 ёзув — улар `Disclosure` га яширилмайди: бўлимнинг ўзи
            шунча кичик ва очиб кўриш учун битта босиш ортиқча бўларди. */}
        <Card className="mt-3" title="Претензияларнинг тўлиқ рўйхати" sub={`${v.claims.length} та`}>
          {v.claims.length === 0 ? (
            <EmptyState
              title="Манбада претензия ёзуви йўқ"
              text="Бу «юкланмади» эмас: бўлим манбада бўш."
            />
          ) : (
            v.claims.map((c) => <ClaimRow key={c.key} c={c} fillOf={qy.claims.fillOf} />)
          )}
        </Card>
      </Section>

      {/* --- 4. ШАРТНОМА ЭКСПЕРТИЗАСИ — қисқа кесим -------------------------
          ⚠️ «Бўлим ҳолати» карточкасидаги файл механикаси (физик қаторлар,
          merge блоклари, «келиб тушган сана ўқилган N/M») «Манба ва
          методология» жадвалига кўчирилди. Бу ерда экспертизанинг ЎЗИ —
          рўйхат, даври ва сонни ўзгартирадиган огоҳлантириш қолди. */}
      <Section
        title="Шартнома экспертизаси"
        note={
          rf.reviewedFirst !== null && rf.reviewedLast !== null
            ? `${t.contractReviews} та · ${monthLabel(rf.reviewedFirst)} — ${monthLabel(rf.reviewedLast)}`
            : `${t.contractReviews} та`
        }
      >
        <Card
          title="Экспертизалар"
          sub={`${v.reviews.length} та`}
          stripe={rf.yearSuspect > 0 ? "var(--warn)" : undefined}
          note="Хулоса матни, «лавозим турган» устун ва қутқарилган катаклар тўлиқ ҳолида пастдаги «Батафсил маълумот» да."
        >
          {v.reviews.length === 0 ? (
            <EmptyState title="Шартнома экспертизаси топилмади" />
          ) : (
            /* `maxHeight` стандарт 440px дан катта: манбадаги 10 ёзувнинг
               иккитаси икки қаторга ёйилади ва стандарт баландликда охирги
               қатор карточка четида КЕСИЛИБ қоларди. Рўйхат узайса жадвал
               ўзи скроллга ўтади — бу чегара уни ўчирмайди. */
            <DataTable
              cols={[
                { t: "Т/р", num: true },
                { t: "Контрагент", wrap: true },
                { t: "Келиб тушган", wrap: true },
                { t: "Кўриб чиқилган (ой)", wrap: true },
              ]}
              rows={reviewRows}
              maxHeight={560}
              caption="Шартнома экспертизаларининг қисқа кесими"
            />
          )}

          {/* Даврни ЎЗГАРТИРАДИГАН огоҳлантириш — шунинг учун шу ерда
              қолади, битта қисқа жумла бўлиб. */}
          {rf.yearSuspect > 0 && (
            <p className="mt-2 text-[11.5px] leading-[1.5] text-warn-ink">
              ⚠ <b>{nf(rf.yearSuspect)}</b> та ёзувда «кўриб чиқилган» йили{" "}
              <b className="font-mono">2001</b> — улар юқоридаги давр ҳисобига қўшилмади,
              лекин рўйхатда манбадагидек, ⚠ белгиси билан турибди.
            </p>
          )}
        </Card>
      </Section>

      {/* --- 5. МАНБА қавати — иккинчи даража --------------------------------
          Бу ердаги ҳеч нарса олиб ташланмаган: ҳаммаси жойида, фақат ёпиқ
          ҳолатда бошланади. Тугманинг ўзида ичкарида нима борлиги ва нечта
          экани ёзилган.

          ⚠️ Биринчи экрандан ТУШГАН нарсалар шу ерда:
            · «Манбада 20 та белги топилган» чизиғи ва саккизта чип →
              «Манбадаги белгилар» (`LegalQualitySummaryCard`);
            · плиткалар остидаги файл чиплари, «учала тур алоҳида…» изоҳи,
              диаграмма остидаги уч қаторли методология, «22 ноёб натижа
              матни» ўлчови, иккита «Бўлим ҳолати» карточкаси →
              «Манба ва методология» (`LegalSourceCard`);
            · «Суд ишларининг тўлиқ рўйхати» блоки БУ ЕРДАН ОЛИНДИ — у
              иккинчи бўлимга, ўқиладиган рўйхат бўлиб кўчди, ва ҳар бир
              иш «тўлиқ матн» билан ўша ердаёқ тўлиқ очилади. */}
      <Section
        title="Батафсил маълумот"
        note="манбадаги ҳар бир ёзув ва ҳар бир белги — керак бўлганда очилади"
      >
        <Disclosure label="Манба ва методология" hint="сонлар қандай ҳисобланган">
          <LegalSourceCard v={v} />
        </Disclosure>

        <Disclosure
          label="Шартнома экспертизаларининг тўлиқ рўйхати"
          hint={`${v.reviews.length} та ёзув · хулоса матни билан`}
        >
          <Card
            title="Экспертизаларнинг тўлиқ рўйхати"
            sub={`${v.reviews.length} та`}
            note={
              <>
                {qy.contractReviews.duplicateHeaders.length > 0 && (
                  <>
                    ⚠ Манбада иккита устуннинг сарлавҳаси АЙНАН бир хил («
                    {qy.contractReviews.duplicateHeaders[0].header}»), лекин 5-си — САНА, 6-си —
                    юридик ХУЛОСА МАТНИ. Улар бу ерда иккита алоҳида майдон.{" "}
                  </>
                )}
                {qy.contractReviews.monthOnlyDates !== null && (
                  <>
                    «Кўриб чиқилган» қиймати аслида ОЙ белгиси: манбадаги{" "}
                    {qy.contractReviews.monthOnlyDates.records} та қийматнинг ҳаммаси ойнинг
                    1-куни.
                  </>
                )}
              </>
            }
          >
            {v.reviews.length === 0 ? (
              <EmptyState title="Шартнома экспертизаси топилмади" />
            ) : (
              v.reviews.map((r) => <ReviewRow key={r.key} r={r} />)
            )}
          </Card>
        </Disclosure>

        <Disclosure
          label="Манбадаги белгилар — маълумот сифати"
          hint={`${qy.issues} та белги · яширилмайди, тузатилмайди`}
        >
          {/* Аввал биринчи экранда, бутун кенглик бўйлаб турган чизиқ. */}
          <LegalQualitySummaryCard v={v} />
          {qy.warnings.length > 0 && (
            <Banner tone="warn">Бўлимлараро огоҳлантиришлар: {qy.warnings.join(" · ")}</Banner>
          )}
          <div className={GRID.g3}>
            <QualityCard q={qy.courtCases} />
            <QualityCard q={qy.claims} />
            <QualityCard q={qy.contractReviews} />
          </div>
        </Disclosure>

        <Disclosure
          label="Устунлар тўлдирилганлиги"
          hint={`${columnsTotal} устун · 3 варақ`}
        >
          <div className={GRID.g3}>
            {[qy.courtCases, qy.claims, qy.contractReviews].map((s) => (
              <Card
                key={s.key}
                title={s.title}
                sub={`${s.columns.length} устун`}
                note="Тўлдирилмаган жой нол билан тўлдирилмайди. 0 / N бўлган устун диаграмма ёки йиғинди сифатида умуман чизилмайди — маълумот бордек кўринмаслиги учун."
              >
                {s.columns.map((c) => (
                  <Fill key={c.key} row={c} />
                ))}
              </Card>
            ))}
          </div>
        </Disclosure>
      </Section>
    </>
  );
}
