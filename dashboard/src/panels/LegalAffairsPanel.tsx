import type { ReactNode } from "react";
import { useMemo } from "react";
import type { LegalAffairsDashboard } from "../api/types";
import { getLegalAffairsDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { dateLabel, exact, nf, pctTxt } from "../lib/format";
import {
  NO_DATA,
  legalView,
  type LegalCase,
  type LegalClaimRow,
  type LegalColumnRow,
  type LegalDateView,
  type LegalExtra,
  type LegalReviewRow,
  type LegalSectionQuality,
} from "../lib/adapters/legalAffairs";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Banner } from "../components/Banner";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { DataTable } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";

/**
 * «Юридик бошқарма» — `Юридик бошқарма.xlsx` нинг **учта варағи**:
 * `1. СУД ИШЛАРИ` (23 иш), `2. ПРЕТЕНЗИЯЛАР` (2 ёзув),
 * `3. ШАРТНОМА ЭКСПЕРТИЗАСИ` (10 экспертиза) — жами 35 мантиқий ёзув.
 *
 * ═══ Ёнидаги «Давлат харидлари» билан адашмасин ═════════════════════════
 *
 * Иккови ҳам бошқарма ҳужжатидан келади ва иккови ҳам вақт қатори эмас,
 * лекин мазмуни умуман кесишмайди: бу — ҲУҚУҚИЙ иш юритиш (суд ишлари,
 * претензиялар, шартнома экспертизаси), у эса ХАРИД ҳажмлари (тур × чорак).
 * Алоҳида бэкенд модуллари: `legal-affairs` ва `state-procurement`.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: учала бўлимнинг ёзувлар сони + жами.
 *  2. Суд ишлари — юрист ва суд кесимлари (иккови ҳам «та», лекин иккита
 *     ХИЛ кесим, шунинг учун иккита алоҳида карточка) ва 23 ишнинг тўлиқ
 *     рўйхати.
 *  3. Претензиялар — **2 та ёзув**, хом суммаси ва бирлик шубҳаси билан.
 *  4. Шартнома экспертизаси — 10 ёзув; 5- ва 6-устун АЛОҲИДА кўрсатилади.
 *  5. Маълумот сифати — манбадаги ҳамма белги, яширилмайди.
 *  6. Устунлар тўлдирилганлиги — қайси устун нечта ёзувда тўлган.
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
 * Бўлимда жами 35 ёзув бор. Иккита диаграмма қолдирилган (юрист ва суд
 * кесими) — улар «иш кимда тўпланган» деган саволга жавоб беради. Қолган
 * ҳамма нарса матн ва сана: уларни диаграммага айлантириш маъно қўшмасди.
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

/* -------------------------------------------------------------------------- */
/* 1. суд иши                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Битта суд иши — тўлиқ шаклда.
 *
 * Атайин қисқартирилмайди: бўлимда 23 ёзув бор ва фойдаланувчига керак
 * бўлгани иш мазмуни билан суд натижасининг ТЎЛИҚ матни. Жадвалга сиқиш
 * матнни кесарди.
 */
function CaseRow({ c, fillOf }: { c: LegalCase; fillOf: (field: string) => string }) {
  // Ёрлиқдаги «N / M» API'дан келади — қаттиқ ёзилган сон эскириб қолмаслиги
  // учун (манба тўлдирилганда ёрлиқ ҳам ўзи ўзгаради).
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
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] [font-weight:600] break-words">
          {c.subject}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[26px]">
        {c.court === null ? <Pill status="warn">суд {NO_DATA}</Pill> : <Pill>{c.court}</Pill>}
        {c.lawyer === null ? (
          <Pill status="warn">юрист {NO_DATA}</Pill>
        ) : (
          <Pill>юрист: {c.lawyer}</Pill>
        )}
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

      <div className={"mt-2 pl-[26px] " + GRID.g2}>
        <DateField label="Иш тайинланган ажрим сана" d={c.ruling} />
        <DateField label="Суд кўриладиган кун" d={c.hearing} />
      </div>

      <div className="mt-2 pl-[26px]">
        <Field label="Суд натижаси">{c.result}</Field>
      </div>

      {/* Шикоят устунлари манбада ЖУДА сийрак тўлдирилган (2/23, 3/23 ва
          0/23). Улар шу ерда ҳам кўринади: «устун бор, лекин бўш» ҳолати
          фақат сифат бўлимида турса, рўйхатни ўқиётган одам устуннинг
          умуман йўқлигини ўйларди. */}
      <div className={"mt-2 pl-[26px] " + GRID.g2}>
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

      <div className="pl-[26px]">
        <Extras list={c.extras} />
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
  const v = useMemo(() => legalView(data), [data]);
  const t = v.totals;
  const qy = v.quality;

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
  const mergedTotal = t.physicalRows - t.records;

  return (
    <>
      {/* --- манба ва ёнидаги таблар билан фарқи ---------------------------- */}
      <Banner tone="info">
        Манба — <b>{v.source}</b>, унинг <b>учта варағи</b>
        {v.importedAt && <> · охирги импорт: {dateLabel(v.importedAt.slice(0, 10))}</>}. Бўлимда{" "}
        <b>{t.records} мантиқий ёзув</b> бор: {t.courtCases} суд иши, {t.claims} претензия ва{" "}
        {t.contractReviews} шартнома экспертизаси. Учала варақнинг устунлари <b>Т/р</b> дан
        бошқа жойда умуман кесишмайди, шунинг учун улар битта «универсал» жадвалга
        йиғилмайди — акс ҳолда «бу майдон бу тур учун мавжуд эмас» билан «бу майдон
        тўлдирилмаган» фарқланмай қоларди. Ёнидаги «Давлат харидлари» билан адашмасин: у —
        харид ҳажмлари, бу эса ҳуқуқий иш юритиш.
      </Banner>

      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section title="Юридик бошқарма" note="битта XLSX ҳужжатнинг жорий ҳолати">
        <div className={GRID.g4}>
          <StatTile
            label="Суд ишлари"
            value={nf(t.courtCases)}
            unit="та"
            stripe="var(--s1)"
            foot={
              <>
                <Pill>{v.byLawyer.length} юрист · {v.byCourt.length} суд</Pill>
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
                {/* Бу «маълумот йўқ» ЭМАС — манбада ҳақиқатан 2 та ёзув бор. */}
                <Pill>манбада {t.claims} та ёзув бор</Pill>
                {qy.claims.emptyColumns.length > 0 && (
                  <Pill status="warn">
                    {qy.claims.columns.length} устундан {qy.claims.emptyColumns.length} таси бўш
                  </Pill>
                )}
              </>
            }
          />
          <StatTile
            label="Шартнома экспертизаси"
            value={nf(t.contractReviews)}
            unit="та"
            stripe="var(--s3)"
            foot={
              <>
                <Pill>{qy.contractReviews.mergedBlocks.length} бирлаштирилган блок</Pill>
                {qy.contractReviews.duplicateOrdinals.length > 0 && (
                  <Pill status="warn">такрорий Т/р бор</Pill>
                )}
              </>
            }
          />
          <StatTile
            label="Жами ёзувлар"
            value={nf(t.records)}
            unit="та"
            stripe="var(--s4)"
            foot={
              <>
                <Pill>{nf(t.physicalRows)} физик Excel қатори</Pill>
                {mergedTotal > 0 && <Pill>фарқ {nf(mergedTotal)} қатор — merge</Pill>}
              </>
            }
          />
        </div>
      </Section>

      {/* --- 2. суд ишлари -------------------------------------------------- */}
      <Section
        title="Суд ишлари"
        note={`${t.courtCases} та · варақ «${qy.courtCases.sheet}»`}
      >
        <div className={GRID.g2}>
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
        </div>

        <Card
          className="mt-3"
          title="Ишларнинг тўлиқ рўйхати"
          sub={`${v.cases.length} та`}
          note="Иш мазмуни ва суд натижаси МАНБАДАГИ тўлиқ матн билан кўрсатилади — қисқартирилса ҳужжатнинг ҳуқуқий маъноси йўқоларди. Тўлдирилмаган устун «маълумот йўқ» деб ўз ўрнида қолади."
        >
          {v.cases.length === 0 ? (
            <EmptyState title="Суд ишлари топилмади" />
          ) : (
            v.cases.map((c) => <CaseRow key={c.key} c={c} fillOf={qy.courtCases.fillOf} />)
          )}
        </Card>
      </Section>

      {/* --- 3. претензиялар ------------------------------------------------ */}
      <Section
        title="Претензиялар"
        note={`${t.claims} та · варақ «${qy.claims.sheet}»`}
      >
        <div className={GRID.g23}>
          <Card
            title="Манбадаги хом йиғинди"
            sub={t.claimsAmountUnitLabel}
            stripe={t.claimsAmountUnitSuspect ? "var(--warn)" : "var(--s1)"}
          >
            <div className="font-mono text-[24px] leading-[1.1] [font-weight:640] tabular-nums tracking-[-0.02em]">
              {t.claimsAmountRawSum === null ? <Muted /> : exact(t.claimsAmountRawSum)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Pill>{t.claims} та ёзувдан</Pill>
              {t.claimsAmountUnitSuspect && <Pill status="warn">⚠ бирлик тасдиқланмаган</Pill>}
            </div>
            {/* Қиймат ҳам, ёрлиқ ҳам манбадагидек. Қайта шкалалаш (×1000 ёки
                ÷1000) бу ерда АТАЙЛАБ қилинмайди: у тахминни ҳақиқатга
                айлантириб қўярди. */}
            <p className="mt-2.5 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
              Манбадаги устун сарлавҳаси <b className="font-semibold text-ink-2">млн сўм</b>
              дейди, лекин қийматларнинг катталиги оддий <b className="font-semibold text-ink-2">сўм</b>{" "}
              эканини кўрсатади: «млн сўм» бўлса биттагина претензия 9,1 триллион сўмга
              чиқарди. Бу <b className="font-semibold text-ink-2">тасдиқланмаган</b> кузатув,
              шунинг учун қиймат қайта ҳисобланмади ва ёрлиқ ўзгартирилмади — иккиси ҳам
              манбадагидек турибди.
            </p>
          </Card>

          <Card
            title="Бўлим ҳолати"
            note="«Манбада 2 та ёзув бор» билан «маълумот йўқ» — иккита БОШҚА нарса. Бу бўлим бўш эмас: манбада айнан шунча ёзув киритилган."
          >
            <DataTable
              cols={[
                { t: "Кўрсаткич", wrap: true },
                { t: "Қиймат", num: true },
              ]}
              rows={[
                { key: "records", cells: ["Манбадаги ёзувлар", nf(qy.claims.records)] },
                {
                  key: "phys",
                  cells: ["Физик Excel қаторлари", nf(qy.claims.physicalRows)],
                },
                {
                  key: "cols",
                  cells: ["Устунлар", nf(qy.claims.columns.length)],
                },
                {
                  key: "empty",
                  cells: [
                    "Бутунлай бўш устунлар",
                    <b key="e" className="text-warn-ink">
                      {nf(qy.claims.emptyColumns.length)}
                    </b>,
                  ],
                },
              ]}
              caption="Претензиялар бўлимининг ҳолати"
            />
            <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-3">
              {qy.claims.columns.length} устундан {qy.claims.emptyColumns.length} таси (
              {qy.claims.emptyColumns.map((c) => c.label).join(", ")}) биронта ёзувда ҳам
              тўлдирилмаган. Улар қуйида «маълумот йўқ» деб ўз ўрнида кўрсатилади — нол билан
              тўлдирилмайди.
            </p>
          </Card>
        </div>

        <Card
          className="mt-3"
          title="Претензияларнинг тўлиқ рўйхати"
          sub={`${v.claims.length} та`}
        >
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

      {/* --- 4. шартнома экспертизаси --------------------------------------- */}
      <Section
        title="Шартнома экспертизаси"
        note={`${t.contractReviews} та · варақ «${qy.contractReviews.sheet}»`}
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
      </Section>

      {/* --- 5. маълумот сифати --------------------------------------------- */}
      <Section
        title="Маълумот сифати"
        note={`манбадаги ${qy.issues} та белги — яширилмайди, тузатилмайди`}
      >
        {qy.warnings.length > 0 && (
          <Banner tone="warn">
            Бўлимлараро огоҳлантиришлар: {qy.warnings.join(" · ")}
          </Banner>
        )}
        <div className={GRID.g3}>
          <QualityCard q={qy.courtCases} />
          <QualityCard q={qy.claims} />
          <QualityCard q={qy.contractReviews} />
        </div>
      </Section>

      {/* --- 6. устунлар тўлдирилганлиги ------------------------------------ */}
      <Section
        title="Устунлар тўлдирилганлиги"
        note="ҳар бир бўлимда: устун нечта ёзувда тўлдирилган"
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
      </Section>
    </>
  );
}
