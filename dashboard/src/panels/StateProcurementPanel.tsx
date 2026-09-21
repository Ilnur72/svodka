import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type { StateProcurementDashboard } from "../api/types";
import { getStateProcurementDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { usePalette } from "../lib/theme";
import { exact, nf, pctTxt } from "../lib/format";
import {
  AMOUNT_SOURCE_UNIT,
  AMOUNT_UNIT,
  NO_COLUMN,
  NO_DATA,
  bln,
  procurementView,
  type ProcPeriod,
  type ProcQuality,
  type ProcSlot,
  type ProcType,
  type ProcView,
  type ProcYearCompare,
  type ProcYearTotal,
} from "../lib/adapters/stateProcurement";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Banner } from "../components/Banner";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { DataTable, type Row } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";

/**
 * «Давлат харидлари 2025–2026» — `Давлат Харидлари_2025_2026.xlsx`,
 * `Харидлар маълумоти` варағи: **10 харид тури × 8 давр слоти = 80 факт**,
 * устига манбанинг ўз «Жами харидлар:» қатори (яна 8 слот).
 *
 * ═══ ИККИ ҚАВАТ: аввал ИШ, сўнг МАНБА ═══════════════════════════════════
 *
 * Бўлим атайин икки қаватга бўлинган ва қайси нарса қайси қаватда туриши
 * БИТТА мезон билан ҳал қилинади:
 *
 *   ХУЛОСА қавати (биринчи экран) — **харид** ҳақида: қанча сотиб олинди,
 *     ўтган йилга нисбатан қандай, нималар сотиб олинди, қайси сонга
 *     эҳтиёт билан қараш керак;
 *
 *   МАНБА қавати (`Disclosure`, ёпиқ) — **Excel файли** ҳақида: физик
 *     қаторлар, бўш устунлар, матн кўринишидаги катаклар, файлнинг ўз
 *     йиғиндиси билан номувофиқлик, ўлчов бирлиги ёрлиғи, тўлиқ матрица.
 *
 * ⚠️ Мезоннинг чегараси: «бу СОН шубҳали» — юқорида қолади (масалан 2025
 * суммасининг 54,7% и битта аномал катак); «Excel'да 6 та бўш устун бор» —
 * пастга тушади. Биринчиси соннинг ўзига тегади, иккинчиси йўқ.
 *
 * ⚠️ Пастга тушган нарсанинг биттаси ҳам ЎЧИРИЛМАГАН — ҳаммаси бир босишда
 * очилади ва тугманинг ўзида нечта экани ёзилган.
 *
 * ═══ Сумма ЎҚИЛАДИГАН бирликда ══════════════════════════════════════════
 *
 * Манбадаги бирлик — **млн сўм**, ва 2025 йилнинг суммаси шу бирликда
 * `1 160 953,8428` бўлиб чиқади. Бундай сонни одам ўқий олмайди. Шунинг
 * учун ХУЛОСА қавати бўйлаб ягона бирлик ишлатилади — **млрд сўм**
 * (`adapters/stateProcurement.ts` даги `AMOUNT_UNIT` ва `bln()`).
 *
 * ⚠️ Бу манбани тузатиш ЭМАС: ҳар бир катта соннинг остида манбадаги хом
 * қиймат ўз бирлиги билан ёзилади, МАНБА қавати эса бутунлай манба
 * бирлигида (`млн сўм`, `exact()`) қолади.
 *
 * ═══ Ёнидаги «Юридик бошқарма» билан адашмасин ══════════════════════════
 *
 * Иккови ҳам бошқарма ҳужжатидан ва иккови ҳам вақт қатори эмас, лекин
 * мазмуни кесишмайди: бу — ХАРИД ҳажмлари (тур × чорак, сони ва шартнома
 * суммаси), у эса ҲУҚУҚИЙ иш юритиш. Алоҳида бэкенд модуллари. Экранда бу
 * фарқ «Манба ҳақида» блокида ёзилган — биринчи экранда унга жой йўқ.
 *
 * ═══ Учта ҳолат аралаштирилмайди ════════════════════════════════════════
 *
 *   «маълумот йўқ»       — катак манбада БЎШ (`null`);
 *   «0»                  — ҲАҚИҚИЙ нол, ҳеч нарса харид қилинмаган;
 *   «устун манбада йўқ»  — бу давр учун устуннинг ЎЗИ манбада йўқ.
 *
 * Манбада учовининг ҳаммаси учрайди («Тендер» қатори — фарқ энг кўринадиган
 * жой: 2025 I чоракда `0`, II чоракда БЎШ, III–IV чоракда сони ҳам БЎШ).
 * Уларни битта «0» остига йиғиш манзарани бузарди.
 *
 * ═══ Йиғинди қатори икки марта ҳисобланмайди ════════════════════════════
 *
 * «Жами харидлар:» қатори ва «умумий» давр слотлари — пастдаги қаторларнинг
 * СУММАСИ. Бўлимда улар ҳеч қаерда ҳисобга қўшилмайди: ҳисобланган йиғинди
 * фақат `quarter` слотларидан олинади, манбанинг ўз йиғиндиси эса ЁНМА-ЁН
 * эталон сифатида турибди. Тенг бўлмаган жойда иккаласи ҳам қолади.
 *
 * ═══ Бирликлар аралашмайди ══════════════════════════════════════════════
 *
 * Иккита ўлчов бор: сони (та) ва шартнома суммаси (млн сўм). Улар ҳеч қаерда
 * битта шкалага қўйилмайди ва иккинчи Y ўқи ясалмайди — ҳар бири ўз
 * карточкасида.
 *
 * ⚠️ Манбадаги хатолар ТУЗАТИЛМАЙДИ: ёлғон «млрд сум» ёрлиғи, аномал катак
 * (2025 II чорак, «Энг яхши таклифни танлаш»), файлнинг ўз йиғиндисидаги
 * икки номувофиқлик — ҳаммаси экранда очиқ кўрсатилади.
 */

const LBL = "text-[10.5px] font-medium tracking-[0.04em] text-ink-3 uppercase";

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Қиймат кўрсатилмаган жой — бўлим бўйлаб бир хил матн ва тус. */
function Muted({ children = NO_DATA }: { children?: ReactNode }) {
  return <span className="text-[11px] font-medium tracking-normal text-ink-3">{children}</span>;
}

/**
 * Сон катаги.
 *
 * ⚠️ `null` **ҳеч қачон** `0` деб кўрсатилмайди: у «маълумот йўқ» деб
 * ёзилади. Ҳақиқий `0` эса `0` бўлиб қолади.
 *
 * `calc` — қиймат ҲИСОБЛАНГАН (чораклар йиғиндиси, фарқ). Ўшанда `nf(v, 2)`:
 * сузувчи нуқта «думи» экранга чиқмаслиги учун (`663861.21529` шунинг
 * натижаси эди). Манбадан келган катак эса яхлитланмайди — `exact()`.
 * Қоида `adapters/invest.ts` да ёзилган ва бутун сводка бўйлаб бир хил.
 */
function V({ v, calc = false }: { v: number | null; calc?: boolean }) {
  if (v === null) return <Muted />;
  return <span className="font-mono tabular-nums">{calc ? nf(v, 2) : exact(v)}</span>;
}

/**
 * `сони` катаги.
 *
 * Манбада МАТН бўлган катак белгиланади: айнан шу катаклар файлнинг ўз
 * `SUM()` идан тушиб қолган ва йиғинди қаторидаги фарқни тушунтиради.
 */
function CountCell({ s }: { s: ProcSlot }) {
  return (
    <>
      <V v={s.count} />
      {s.countWasText && (
        <span
          className="ml-1 text-[10px] font-semibold text-warn-ink"
          title={`Манбада катак МАТН эди: «${s.countRawText ?? ""}» — Excel'нинг SUM() и уни ҳисобга олмаган.`}
        >
          матн
        </span>
      )}
    </>
  );
}

/**
 * ТМБ катаги — учта ҲАР ХИЛ ҳолат.
 *
 * ⚠️ «Устун манбада йўқ» («умумий» слотларда 3 эмас, 2 устун бор) ва «устун
 * бор, лекин тўлдирилмаган» — БОШҚА-БОШҚА ҳолат. Иккиси ҳам `0` ЭМАС.
 */
function TmbCell({ s }: { s: ProcSlot }) {
  if (!s.hasTmbColumn) return <Muted>{NO_COLUMN}</Muted>;
  if (s.tmb === null) return <Muted>устун бор, тўлдирилмаган</Muted>;
  return <span className="font-mono tabular-nums">{exact(s.tmb)}</span>;
}

/** Бэкенднинг ўз изоҳи — манба ҳақидаги далил, ўзгартирилмайди. */
function Reason({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[11px] leading-[1.5] text-ink-3 break-words">{children}</p>;
}

/** Давр ёрлиғи: «умумий» слот бошқа тусда — у чораклар йиғиндиси. */
function SlotLabel({ label, total }: { label: string; total: boolean }) {
  return (
    <span className={total ? "[font-weight:650] text-ink-2" : undefined}>
      {label}
      {total && <span className="ml-1.5 text-[10px] font-normal text-ink-3">йиғинди слот</span>}
    </span>
  );
}

/**
 * Иккинчи даражали блок — ёпиқ ҳолатда бошланади.
 *
 * ⚠️ Бу ЯШИРИШ эмас: ичидаги ҳамма нарса жойида, бир босишда очилади ва
 * тугманинг ўзида нима борлиги (ва нечта экани) ёзилган. Мақсад — биринчи
 * экранда «қанча харид қилдик» деган саволга жавоб турсин, 80 катакли
 * матрица эса ўқувчи сўраганда чиқсин.
 *
 * A11y ва ҳулқ `components/TableToggle.tsx` билан айнан бир хил
 * (`aria-expanded` + `aria-controls` + `hidden`), фақат ичида жадвал эмас,
 * ихтиёрий мазмун туради. Мазмун очилгандагина рендер қилинади — ёпиқ
 * блокларнинг ҳаммаси доим чизилса биринчи рендер оғирлашарди.
 */
function Disclosure({
  label,
  hint,
  children,
}: {
  label: string;
  /** Тугмадаги қисқа ҳисоб — «80 факт», «32 белги». */
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `sp-more-${uid}`;

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

/* -------------------------------------------------------------------------- */
/* йил карточкаси — бўлимнинг бош рақами                                      */
/* -------------------------------------------------------------------------- */

/** Катта сон — ёрлиқ, қиймат ва бирлик. Сон ЯХЛИТЛАНМАЙДИ. */
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
  /**
   * `true` — қиймат ҲИСОБЛАНГАН (йиғинди, улуш, нисбат), шунинг учун
   * `nf(v, 2)` билан чиқади. Сабаби `adapters/invest.ts` да ёзилган ва
   * бутун сводка бўйлаб амал қилади: манбадаги сон яхлитланмайди
   * (`exact()`), ҳисобланган сон эса сузувчи нуқта «думи»ни экранга
   * олиб чиқмаслиги керак — `720953.00349` шунинг натижаси эди.
   * Иккита хона манбадаги аниқликдан ортиқ, яъни маълумот йўқолмайди.
   */
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
 * Манбадаги ХОМ қиймат — ўз бирлиги билан, соннинг остида битта қатор.
 *
 * ⚠️ Экрандаги катта сон `млрд сўм` да (ўқилиши учун), манбада эса у
 * `млн сўм` да турибди. Иккиси орасидаги боғлиқлик шу қаторда КЎРИНАДИ:
 * хом қиймат йўқолмайди ва уни қидириб юриш керак эмас.
 */
function SourceValue({ v }: { v: number | null }) {
  if (v === null) return null;
  return (
    <p className="mt-1 text-[11px] leading-[1.45] text-ink-3">
      манбада <span className="font-mono tabular-nums">{exact(v)}</span> {AMOUNT_SOURCE_UNIT}
    </p>
  );
}

/**
 * Битта йилнинг якуний кўрсаткичи — бўлимнинг БОШ рақами.
 *
 * Карточкада фақат УЧ нарса қолади ва учови ҳам ХАРИД ҳақида:
 *
 *  1. **Сумма** — ўқиладиган бирликда (млрд сўм), остида манбадаги хом
 *     қиймат ўз бирлиги билан;
 *  2. **Сони**;
 *  3. **Тўлиқ бўлмаган йил** белгиси. 2026 да манбада 2 чорак бор, 2025 да
 *     4 та. Буни ёзмай ёнма-ён қўйиш «харидлар камайди» деган ЁЛҒОН хулосага
 *     олиб келарди.
 *
 * ⚠️ Аномал катак огоҳлантириши АЙНАН сумманинг остида қолади: 2025 да
 * битта шубҳали катак йил суммасининг ярмидан кўпини ташкил қилади, яъни у
 * СОННИНГ ЎЗИГА тегади. Лекин у энди уч жумла эмас, битта жумла — сабабнинг
 * батафсили «Манбадаги белгилар» да.
 *
 * ⚠️ Файлнинг ўз йиғинди қатори билан фарқ (2026: ҳисобланган 978, манбада
 * 976) бу ерда ЁЗИЛМАЙДИ ва бу яшириш эмас. Фарқ 978 дан 2 та — соннинг
 * ўзини ўзгартирмайди, сабаби эса соф Excel механикаси (файлнинг `SUM()` и
 * матн кўринишидаги катакни ҳисобга олмаган). Шунинг учун у МАНБА қаватида,
 * УЧТА жойда тўлиқ турибди: «Давр слотлари» жадвалида (ҳисобланган ↔ эълон
 * ↔ мослик), «Манбадаги белгилар» даги номувофиқлик жадвалида (фарқ ва
 * сабаби билан) ва «матн» катаклари рўйхатида.
 */
function YearCard({ y }: { y: ProcYearTotal }) {
  return (
    <Card
      title={`${y.year} йил`}
      sub={`${y.quarters} чорак`}
      stripe={y.partial ? "var(--s2)" : "var(--s1)"}
    >
      {y.partial && (
        <div className="mb-2.5">
          <Pill status="warn">тўлиқ йил эмас — {y.quarterLabels.join(" + ")}</Pill>
        </div>
      )}

      <Big label="Шартнома суммаси" value={bln(y.amount)} unit={AMOUNT_UNIT} calc>
        <SourceValue v={y.amount} />
        {/* ⚠️ Огоҳлантириш соннинг ЎЗИГА тегади — шунинг учун шу ерда. */}
        {y.outliers.map((o) => (
          <p key={o.key} className="mt-1.5 text-[11.5px] leading-[1.45] text-warn-ink">
            ⚠ Шундан{" "}
            {y.outlierShare !== null && (
              <b className="font-semibold">{pctTxt(y.outlierShare * 100)}</b>
            )}{" "}
            и — битта шубҳали катак («{o.type}»). Бу сонга эҳтиёт билан қаранг.
          </p>
        ))}
      </Big>

      <div className="mt-3 border-t border-grid pt-2.5">
        <Big label="Харидлар сони" value={y.count} unit="та" />
      </div>
    </Card>
  );
}

/**
 * «Ўтган йилга нисбатан» — АЙНАН бир хил чораклар кесимида.
 *
 * ⚠️ Фоиз ранг билан «яхши/ёмон» деб баҳоланмайди: харид ҳажмининг камайиши
 * ўз-ўзидан ёмон ҳам, яхши ҳам эмас — бу бошқарув қарорига боғлиқ. Шунинг
 * учун ранг нейтрал, маънони фақат ишора ва сон ташийди.
 */
function CompareCard({ c }: { c: ProcYearCompare }) {
  const delta = (
    label: string,
    pct: number | null,
    now: string,
    base: string,
    unit: string,
  ) => (
    <div className="min-w-0">
      <div className={LBL}>{label}</div>
      <div className="mt-1 font-mono text-[22px] leading-[1.05] [font-weight:640] tabular-nums tracking-[-0.02em]">
        {pct === null ? <Muted /> : `${pct >= 0 ? "+" : "−"}${nf(Math.abs(pct), 1)}%`}
      </div>
      <p className="mt-1 text-[11px] leading-[1.45] text-ink-3">
        <span className="font-mono tabular-nums text-ink-2">{now}</span>
        <span className="mx-1">←</span>
        <span className="font-mono tabular-nums">{base}</span> {unit}
      </p>
    </div>
  );

  return (
    <Card
      title="Ўтган йилга нисбатан"
      sub={`${c.year} ↔ ${c.baseYear}`}
      stripe="var(--s3)"
      note={`Айнан бир хил чораклар солиштирилди — ${c.quarterLabels.join(" + ")}. Тўлиқ йил билан ярим йилни таққослаш ёлғон хулоса берарди.`}
    >
      <div className={GRID.g2}>
        {delta(
          "Шартнома суммаси",
          c.amountPct,
          nf(bln(c.amount), 2),
          nf(bln(c.baseAmount), 2),
          AMOUNT_UNIT,
        )}
        {delta("Харидлар сони", c.countPct, nf(c.count), nf(c.baseCount), "та")}
      </div>

      {/* Аномал катак солиштирувнинг АСОСИНИ ўзгартиради — шунинг учун у шу
          ернинг ўзида ёзилади, пастдаги йиғилган блокда эмас. */}
      {(c.outlierInBase || c.outlierInYear) && (
        <p className="mt-2.5 border-t border-grid pt-2 text-[11.5px] leading-[1.45] text-warn-ink">
          ⚠ Солиштирувнинг {c.outlierInBase ? c.baseYear : c.year} томонида битта шубҳали
          катак бор — фоиз кўп жиҳатдан айнан шунга боғлиқ.
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* харид тури карточкаси                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Битта харид тури — 8 давр слоти тўлиқ шаклда.
 *
 * Нега тур бўйича, давр бўйича эмас: манбадаги энг муҳим номувофиқлик
 * («умумий» слот ўз чоракларига тенг эмас) АЙНАН тур ичида содир бўлади,
 * шунинг учун солиштирув шу карточканинг ичида, қийматларнинг ёнида туради.
 */
function TypeCard({ t }: { t: ProcType }) {
  const rows: Row[] = t.slots.map((s) => ({
    key: s.key,
    cells: [
      <SlotLabel key="p" label={s.label} total={s.kind === "total"} />,
      <CountCell key="c" s={s} />,
      <V key="a" v={s.amount} />,
      <TmbCell key="t" s={s} />,
    ],
  }));

  return (
    <Card
      title={
        <>
          {t.no !== null && <span className="mr-2 font-mono text-[11px] text-ink-3">{t.no}</span>}
          {t.name}
        </>
      }
      sub={t.excelRow === null ? undefined : `манбада ${t.excelRow}-қатор`}
      stripe={t.slotMismatches.length > 0 || t.hasOutlier ? "var(--warn)" : undefined}
    >
      <DataTable
        cols={[
          { t: "Давр", wrap: true },
          { t: "Сони", num: true },
          { t: "Шартнома суммаси", num: true },
          { t: "Тасдиқланган ТМБ", num: true },
        ]}
        rows={rows}
        caption={`${t.name} — давр слотлари бўйича харидлар`}
      />

      {/* Ҳисобланган ва манбада эълон қилинган — ЁНМА-ЁН. Тенг бўлмаган жойда
          иккаласи ҳам қолади: манбанинг ўз йиғиндиси тузатилмайди. */}
      <div className="mt-2.5 border-t border-grid pt-2">
        <div className={LBL}>Чораклар йиғиндиси ↔ манбанинг «умумий» слоти</div>
        <ul className="mt-1 flex flex-col">
          {t.years.map((y) => (
            <li key={y.key} className="border-t border-grid py-1.5 text-[11.5px] first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-ink-3">{y.year}</span>
                <span className="min-w-0 flex-1">
                  сони: ҳисобланган <V v={y.computedCount} /> · эълон <V v={y.declaredCount} />
                </span>
                {!y.countMatches && <Pill status="warn">мос келмади</Pill>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="w-[34px] flex-none" />
                <span className="min-w-0 flex-1">
                  сумма: ҳисобланган <V v={y.computedAmount} calc /> · эълон{" "}
                  <V v={y.declaredAmount} />
                </span>
                {!y.amountMatches && <Pill status="warn">мос келмади</Pill>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {t.slotMismatches.length > 0 && (
        <div className="mt-2 border-t border-grid pt-2">
          {t.slotMismatches.map((m) => (
            <p key={m.key} className="text-[11.5px] leading-[1.5] text-ink-2">
              ⚠ <b>{m.period}</b> слотида «{m.measure}»: чораклардан ҳисобланган{" "}
              <b className="font-mono">
                {m.computed === null ? NO_DATA : nf(m.computed, 2)}
              </b>
              , манбада эълон қилинган{" "}
              <b className="font-mono">
                {m.declared === null ? NO_DATA : exact(m.declared)}
              </b>
              . Қўшилиши кутилган чораклар: {m.parts.join(", ")}. Манбадаги зиддият —{" "}
              <b>тузатилмади</b>.
            </p>
          ))}
        </div>
      )}

      {t.hasOutlier && (
        <p className="mt-2 border-t border-grid pt-2 text-[11.5px] leading-[1.5] text-ink-2">
          ⚠ Шу турда аномал катта сумма топилган — тафсилоти пастдаги «Маълумот сифати»
          бўлимида.
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* манба ҳақида — биринчи экрандан тушган изоҳлар                             */
/* -------------------------------------------------------------------------- */

/**
 * Манба, ўлчов бирлиги ва методология — биринчи экрандан ТУШГАН матнлар.
 *
 * ⚠️ Бу ерда ҳеч нарса ўчирилмаган: аввал плиткалар остида, диаграммалар
 * тагида ва йил карточкаларида турган ҳар бир жумла шу ерда ТЎЛИҚ ҳолида
 * сақланган. Ўзгаргани фақат ЖОЙИ — улар «қанча харид қилдик» деган
 * саволнинг жавобини кўмиб юборарди.
 */
function SourceCard({ v }: { v: ProcView }) {
  const t = v.totals;
  return (
    <Card
      title="Манба ва ўлчов бирлиги"
      sub={`${t.types} тур × ${t.periods} слот = ${t.facts} факт`}
      note="Биринчи экрандаги сонлар айнан шу манбадан ва айнан шу қоидалар билан ҳисобланган."
    >
      <div className="border-t border-grid pt-2">
        <div className={LBL}>Ўлчов бирлиги</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Манбадаги устун сарлавҳаси «{t.amountUnitLabel}» — яъни хом қиймат{" "}
          <b>{AMOUNT_SOURCE_UNIT}</b> да. Шу бирликда 2025 йилнинг суммаси{" "}
          <b className="font-mono">1 160 953,8428</b> бўлиб чиқади: «млн» ёрлиғи остида
          миллиондан 1,16 миллион марта катта сон. Бундай сонни ўқиб бўлмайди, шунинг учун
          хулоса қаватида ягона бирлик — <b>{AMOUNT_UNIT}</b> (÷1000) ишлатилади. Қиймат
          манбада ЎЗГАРМАЙДИ: хулоса қаватидаги ҳар бир соннинг остида хом қиймат ўз
          бирлиги билан ёзилган, бу бўлимдаги жадвалларда эса ҳамма сон манба бирлигида.
        </p>
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Йиғинди қандай ҳисобланади</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Йиғинди ФАҚАТ чорак слотларидан олинади. Манбанинг «умумий» слотлари
          (<span className="font-mono text-[11.5px]">2025-TOTAL</span>,{" "}
          <span className="font-mono text-[11.5px]">2026-TOTAL</span>) ва «Жами харидлар:»
          қатори қўшилмайди — улар аллақачон чоракларнинг суммаси
          (<span className="font-mono text-[11.5px]">production-report</span> даги{" "}
          <span className="font-mono text-[11.5px]">isTotal</span> билан бир хил мантиқ).
          Манбанинг ўз сони ёнма-ён эталон сифатида текширилади ва тенглаштирилмайди.
        </p>
      </div>

      {/* Аввал ҳар бир йил карточкасининг ичида, соннинг остида турган
          жумлалар: «Манбанинг ўз йиғиндиси билан мос келди», «⚠ Манбанинг ўз
          «Жами харидлар:» қаторида 976 турибди…» ва «⚠ ёрлиқ ёлғон». Ҳаммаси
          шу ерда, энди қуруқ жадвал шаклида — бу файл ҳақидаги маълумот. */}
      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Ҳисобланган ↔ манбанинг ўз йиғиндиси</div>
        <DataTable
          className="mt-1.5"
          cols={[
            { t: "Йил" },
            { t: "Сони — ҳисобланган", num: true },
            { t: "Сони — манбада", num: true },
            { t: `Сумма — ҳисобланган, ${AMOUNT_SOURCE_UNIT}`, num: true },
            { t: `Сумма — манбада, ${AMOUNT_SOURCE_UNIT}`, num: true },
            { t: "Мослик" },
          ]}
          rows={v.years.map((y) => ({
            key: y.key,
            cells: [
              `${y.year}`,
              <V key="cc" v={y.count} />,
              <V key="dc" v={y.declaredCount} />,
              <V key="ca" v={y.amount} calc />,
              <V key="da" v={y.declaredAmount} />,
              y.countMatches && y.amountMatches ? (
                <Pill key="m" status="good">
                  мос келди
                </Pill>
              ) : (
                <Pill key="m" status="warn">
                  {y.countMatches ? "сумма" : "сони"} мос келмади
                </Pill>
              ),
            ],
          }))}
          caption="Йил кесимида ҳисобланган ва манбада эълон қилинган қийматлар"
        />
        <p className="mt-1.5 text-[12px] leading-[1.5] text-ink-2">
          Мос келмаган жойда ИККАЛА сон ҳам сақланган ва тенглаштирилмаган. 2026 да
          ҳисобланган сон манбанинг «Жами харидлар:» қаторидагидан 2 тага катта, чунки
          экрандаги сон — 10 та тур қаторида ҲАҚИҚАТАН турган нарса, файлнинг{" "}
          <span className="font-mono text-[11.5px]">SUM()</span> и эса матн кўринишидаги
          катакни ҳисобга олмаган. Бу манбанинг ички зиддияти, импорт хатоси эмас.
        </p>
        {v.years.some((y) => y.unitSuspect) && (
          <p className="mt-1.5 text-[12px] leading-[1.5] text-ink-2">
            ⚠{" "}
            {v.years
              .filter((y) => y.unitSuspect)
              .map((y) => y.year)
              .join(", ")}{" "}
            йилнинг «умумий» устунида манбадаги ёрлиқ ёлғон: «млрд» дейди, қиймат эса млн.
            Қиймат қайта шкалаланмади ва ёрлиқ ўзгартирилмади — арифметик далили
            «Манбадаги белгилар» бўлимида.
          </p>
        )}
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Диаграммаларда нима йўқ ва нега</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Қиймати кўрсатилмаган чорак ёки тур диаграммага УМУМАН чизилмайди — нол
          баландлик билан турса «ҳеч нарса харид қилинмаган» дегандай кўринарди, бу эса
          бутунлай бошқа гап. Улар жадвалда ўз ўрнида «{NO_DATA}» бўлиб қолади. Аномал
          катак эса диаграммадан ОЛИБ ТАШЛАНМАЙДИ (олиб ташланса экрандаги манзара
          манбага мос келмасди) — фақат бошқа рангда белгиланади.
        </p>
      </div>

      <div className="mt-2 border-t border-grid pt-2">
        <div className={LBL}>Ёнидаги «Юридик бошқарма» билан фарқи</div>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">
          Иккови ҳам бошқарма ҳужжатидан ва иккови ҳам вақт қатори эмас, лекин мазмуни
          кесишмайди: бу — ХАРИД ҳажмлари (тур × чорак, сони ва шартнома суммаси), у эса
          ҲУҚУҚИЙ иш юритиш. Алоҳида бэкенд модуллари.
        </p>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* маълумот сифати                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Манбадаги белгиларнинг ЯЛПИ ҳисоби — тури бўйича.
 *
 * ⚠️ Бу блок аввал БИРИНЧИ ЭКРАНДА, йил карточкаларининг остида турарди ва
 * саҳифадаги иккинчи энг кўзга ташланадиган элемент эди. Ундаги ҳар бир чип
 * шу ерда сақланган — фақат жойи ўзгарди: «Манбада 23 та зиддият» деган
 * сарлавҳа «қанча харид қилдик» деган саволнинг жавобидан олдин турмайди.
 */
function QualitySummaryCard({ q }: { q: ProcQuality }) {
  if (q.issues === 0) return null;
  return (
    <Card className="mb-3" stripe="var(--warn)">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[12.5px] [font-weight:650]">
          Манбада {q.issues} та зиддият топилган
        </span>
        {q.outliers.length > 0 && <Pill status="crit">{q.outliers.length} аномал катак</Pill>}
        {q.unitConflicts.length > 0 && (
          <Pill status="crit">{q.unitConflicts.length} ўлчов бирлиги зиддияти</Pill>
        )}
        {q.totalMismatches.length > 0 && (
          <Pill status="warn">{q.totalMismatches.length} йиғинди номувофиқлиги</Pill>
        )}
        {q.slotMismatches.length > 0 && (
          <Pill status="warn">{q.slotMismatches.length} «умумий» слот зиддияти</Pill>
        )}
        {q.emptyColumns.length > 0 && (
          <Pill status="warn">{q.emptyColumns.length} бутунлай бўш устун</Pill>
        )}
        {q.textCountCells.length > 0 && (
          <Pill status="warn">{q.textCountCells.length} «матн» катаги</Pill>
        )}
      </div>
    </Card>
  );
}

function QualitySection({ q }: { q: ProcQuality }) {
  return (
    <>
      <QualitySummaryCard q={q} />
      <div className={GRID.g2}>
        <Card
          title="Манбанинг ўз йиғиндиси билан номувофиқлик"
          sub={`${q.totalMismatches.length} та устун`}
          stripe={q.totalMismatches.length > 0 ? "var(--warn)" : "var(--good)"}
          note={`«Жами харидлар:» қаторида эълон қилинган сон харид турлари қаторларининг йиғиндисига тенг бўлиши керак. ${q.totalChecksCount} солиштирувдан ${q.totalChecksCount - q.totalMismatches.length} таси мос келади. Мос келмаганлар ТУЗАТИЛМАДИ: файлнинг ўзи ичдан зиддиятли ва иккала сон ҳам сақланган.`}
        >
          {q.totalMismatches.length === 0 ? (
            <EmptyState title="Барча устунда йиғинди мос келди" />
          ) : (
            <>
              <DataTable
                cols={[
                  { t: "Давр", wrap: true },
                  { t: "Кўрсаткич" },
                  { t: "Устун" },
                  { t: "Ҳисобланган", num: true },
                  { t: "Эълон қилинган", num: true },
                  { t: "Фарқ", num: true },
                ]}
                rows={q.totalMismatches.map((m) => ({
                  key: m.key,
                  cells: [
                    m.period,
                    m.measure,
                    <span key="c" className="font-mono text-[11.5px]">
                      {m.column}
                    </span>,
                    <V key="cm" v={m.computed} />,
                    <V key="dc" v={m.declared} />,
                    <b key="d" className="font-mono text-warn-ink">
                      {m.diff === null ? NO_DATA : nf(m.diff, 2)}
                    </b>,
                  ],
                }))}
                caption="Файлнинг ўз йиғиндиси қаторлар йиғиндисига мос келмаган устунлар"
              />
              {q.totalMismatches[0].reason && <Reason>{q.totalMismatches[0].reason}</Reason>}
            </>
          )}
        </Card>

        <Card
          title="«Матн» кўринишидаги «сони» катаклари"
          sub={`${q.textCountCells.length} та катак`}
          note="Юқоридаги номувофиқликнинг САБАБИ: бу катаклар манбада сон эмас, матн бўлган ва Excel'нинг SUM() и уларни эътиборсиз қолдирган. Импорт уларни сонга келтирган, шунинг учун ҳисобланган йиғинди файлнинг ўз йиғиндисидан катта."
        >
          {q.textCountCells.length === 0 ? (
            <EmptyState title="Бундай катак топилмади" />
          ) : (
            <DataTable
              cols={[
                { t: "Қатор", num: true },
                { t: "Устун" },
                { t: "Харид тури", wrap: true },
                { t: "Давр", wrap: true },
                { t: "Манбада" },
                { t: "Сонга келтирилган", num: true },
              ]}
              rows={q.textCountCells.map((c) => ({
                key: c.key,
                cells: [
                  c.excelRow === null ? "—" : nf(c.excelRow),
                  <span key="col" className="font-mono text-[11.5px]">
                    {c.column}
                  </span>,
                  c.type,
                  c.period,
                  <span key="raw" className="font-mono text-[11.5px]">
                    «{c.value}»
                  </span>,
                  <V key="p" v={c.parsed} />,
                ],
              }))}
              caption="«сони» катаги манбада матн бўлган ҳолатлар"
            />
          )}
        </Card>
      </div>

      <div className={"mt-3 " + GRID.g2}>
        <Card
          title="«Умумий» слот ичидаги зиддият"
          sub={`${q.slotMismatches.length} та`}
          stripe={q.slotMismatches.length > 0 ? "var(--warn)" : "var(--good)"}
          note="«Умумий» слот ўз чоракларининг йиғиндисига тенг бўлиши керак. Мос келмаган ҳоллар манбада шундай — қайта ҳисобланмади."
        >
          {q.slotMismatches.length === 0 ? (
            <EmptyState title="Барча турда умумий слот чоракларга тенг" />
          ) : (
            <>
              <DataTable
                cols={[
                  { t: "Харид тури", wrap: true },
                  { t: "Слот", wrap: true },
                  { t: "Кўрсаткич" },
                  { t: "Чораклардан", num: true },
                  { t: "Слотда эълон", num: true },
                ]}
                rows={q.slotMismatches.map((m) => ({
                  key: m.key,
                  cells: [
                    m.type,
                    m.period,
                    m.measure,
                    <V key="c" v={m.computed} />,
                    <V key="d" v={m.declared} />,
                  ],
                }))}
                caption="Умумий слот ўз чоракларига тенг бўлмаган ҳоллар"
              />
              {/* `null ≠ 0` қоидасининг ЎЗИ очиб берган топилма: бўш катаклар
                  нол деб ўқилганда у умуман кўринмасди. Қатор рақамига эмас,
                  ҲОЛАТНИНГ ЎЗИГА боғлаб текширилади. */}
              {q.slotMismatches.some((m) => m.computed === null && m.declared === 0) && (
                <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-3">
                  {q.slotMismatches
                    .filter((m) => m.computed === null && m.declared === 0)
                    .map((m) => `«${m.type}» (${m.period}, ${m.measure})`)
                    .join("; ")}{" "}
                  — бўш катакни нол деб ўқимаслик қоидаси очиб берган топилма: умумий слотда{" "}
                  <b className="font-mono font-semibold text-ink-2">0</b> деб эълон қилинган,
                  чораклар эса <b>бўш</b> («кўрсатилмаган»). Агар бўш катак нол деб ўқилганда
                  бу номувофиқлик умуман кўринмасди.
                </p>
              )}
            </>
          )}
        </Card>

        <Card
          title="Бутунлай бўш устунлар"
          sub={`${q.emptyColumns.length} та`}
          stripe="var(--warn)"
          note="Устунлар манбада МАВЖУД, лекин биронта қаторда ҳам тўлдирилмаган. Улар нол билан тўлдирилмайди ва диаграммага умуман чизилмайди — маълумот бордек кўринмаслиги учун."
        >
          {q.emptyColumns.length === 0 ? (
            <EmptyState title="Барча устун тўлдирилган" />
          ) : (
            <DataTable
              cols={[
                { t: "Устун" },
                { t: "Манбадаги сарлавҳа", wrap: true },
                { t: "Давр", wrap: true },
                { t: "Текширилган қатор", num: true },
              ]}
              rows={q.emptyColumns.map((c) => ({
                key: c.key,
                cells: [
                  <span key="c" className="font-mono text-[11.5px]">
                    {c.column}
                  </span>,
                  c.header,
                  c.period,
                  <>
                    <span className="font-mono">0</span>
                    <span className="mx-1 text-ink-3">/</span>
                    <span className="font-mono">{nf(c.rowsChecked)}</span>
                  </>,
                ],
              }))}
              caption="Манбада бутунлай бўш устунлар"
            />
          )}
          <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-3">
            ⚠ Бу рўйхатда «умумий» давр слотлари ЙЎҚ ва бўлиши ҳам керак эмас: у ерда ТМБ
            устунининг ЎЗИ манбада йўқ (2 устун, 3 эмас). «Устун бор, лекин бўш» билан
            «устун умуман йўқ» — бошқа-бошқа ҳолат ва матрицада ҳам алоҳида ёзилади.
          </p>
        </Card>
      </div>

      {q.unitConflicts.map((u) => (
        <Card
          key={u.key}
          className="mt-3"
          title="Ўлчов бирлиги зиддияти — манбадаги сарлавҳа ёлғон"
          sub={`${u.period} · ${u.column} устуни`}
          stripe="var(--crit)"
          note={`Сарлавҳа «${u.header}» — эълон қилинган бирлик «${u.declaredUnit}», аслида эса «${u.observedUnit}». Қиймат ҚАЙТА ШКАЛАЛАНМАДИ (1000 га кўпайтирилмади ва бўлинмади) — манбадагидек турибди.`}
        >
          <DataTable
            cols={[
              { t: "Харид тури", wrap: true },
              { t: "Умумий слотда эълон", num: true },
              { t: "Чораклар йиғиндиси", num: true },
              { t: "Тенгми" },
            ]}
            rows={u.evidence.map((e) => ({
              key: e.key,
              cells: [
                e.type,
                <V key="d" v={e.declared} />,
                <V key="q" v={e.quartersSum} />,
                e.equal ? (
                  <Pill key="eq" status="good">
                    айнан тенг
                  </Pill>
                ) : (
                  <Pill key="eq" status="warn">
                    тенг эмас
                  </Pill>
                ),
              ],
            }))}
            caption="Арифметик далил: умумий слот ↔ чораклар йиғиндиси"
          />
          <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-3">
            Далил арифметик: агар устун ҳақиқатан «{u.declaredUnit}» да бўлганда, унинг
            қиймати чораклар (млн сўм) йиғиндисидан <b>1000 марта</b> фарқ қиларди. Жадвалда
            эса улар <b>айнан тенг</b> — яъни шкала битта, фақат ёрлиқ нотўғри. Шунинг учун
            панел бу устуннинг бирлигини ишончли деб ёзмайди.
          </p>
          <Reason>{u.reason}</Reason>
        </Card>
      ))}

      {q.outliers.length > 0 && (
        <Card
          className="mt-3"
          title="Аномал катта сумма"
          sub={`${q.outliers.length} та катак`}
          stripe="var(--crit)"
          note="Қатордаги қолган чораклардан кескин ажралиб турган қиймат. ТУЗАТИЛМАДИ: манбада шундай ва у манбанинг ўз йиғинди қатори билан изчил. Диаграммада бу катак бутун давр устунини чўзиб қўяди — шунинг учун сумма диаграммасининг остида изоҳ турибди."
        >
          {q.outliers.map((o) => (
            <div key={o.key} className="border-t border-grid py-2 first:border-t-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="min-w-0 flex-1 text-[12.5px] [font-weight:650]">{o.type}</span>
                <Pill>{o.period}</Pill>
                <Pill>
                  {o.column}
                  {o.excelRow === null ? "" : o.excelRow}
                </Pill>
              </div>
              <div className={"mt-2 " + GRID.g4}>
                <div>
                  <div className={LBL}>Манбадаги қиймат</div>
                  <div className="mt-0.5 font-mono text-[15px] [font-weight:640] tabular-nums text-crit-ink">
                    {exact(o.value)}
                  </div>
                </div>
                <div>
                  <div className={LBL}>Қолган чораклар медианаси</div>
                  <div className="mt-0.5 font-mono text-[15px] [font-weight:640] tabular-nums">
                    {nf(o.medianOfOthers, 2)}
                  </div>
                </div>
                <div>
                  <div className={LBL}>Медианадан катталиги</div>
                  <div className="mt-0.5 font-mono text-[15px] [font-weight:640] tabular-nums">
                    {nf(o.ratio, 1)}×
                  </div>
                </div>
                <div>
                  <div className={LBL}>Давр йиғиндисидаги улуши</div>
                  <div className="mt-0.5 font-mono text-[15px] [font-weight:640] tabular-nums">
                    {o.shareOfPeriod === null ? <Muted /> : pctTxt(o.shareOfPeriod * 100)}
                  </div>
                </div>
              </div>
              <Reason>{o.reason}</Reason>
            </div>
          ))}
        </Card>
      )}

      <Card
        className="mt-3"
        title="Кўрсатилмаган катаклар"
        sub="давр × кўрсаткич кесимида"
        note={
          <>
            «Кўрсатилмаган» — катак манбада БЎШ. ⚠ Бу рўйхатга <b>0</b> қийматли катаклар
            КИРМАЙДИ: нол — маълумот, бўшлиқ эса маълумотнинг йўқлиги.
            {q.missingCells.length > 0 && (
              <>
                {" "}
                Ҳар бир давр учун {nf(q.missingCells[0].total)} қатор текширилади (харид
                турлари + манбанинг ўз «Жами харидлар:» қатори).
              </>
            )}
          </>
        }
      >
        <DataTable
          cols={[
            { t: "Давр", wrap: true },
            { t: "Кўрсаткич" },
            { t: "Кўрсатилмаган", num: true },
            { t: "Текширилган", num: true },
            { t: "Улуши", num: true },
          ]}
          rows={q.missingCells.map((m) => ({
            key: m.key,
            cells: [
              m.period,
              m.measure,
              m.missing === 0 ? (
                <span key="m" className="font-mono text-ink-3">
                  0
                </span>
              ) : (
                <b key="m" className="font-mono text-warn-ink">
                  {nf(m.missing)}
                </b>
              ),
              nf(m.total),
              pctTxt(m.total === 0 ? 0 : (m.missing / m.total) * 100),
            ],
          }))}
          caption="Давр ва кўрсаткич кесимида кўрсатилмаган катаклар"
        />
      </Card>

      {q.warnings.length > 0 && (
        <Card className="mt-3" title="Импорт огоҳлантиришлари" sub={`${q.warnings.length} та`}>
          <ul className="flex flex-col">
            {q.warnings.map((w) => (
              <li
                key={w}
                className="border-t border-grid py-1.5 text-[11.5px] leading-[1.5] text-ink-2 break-words first:border-t-0"
              >
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function StateProcurementPanel() {
  const q = useQuery("state-procurement-dashboard", (s) => getStateProcurementDashboard(s));
  return (
    <Loader q={q} height={420} notAvailableWhat="/state-procurement/dashboard">
      {(data) => <ProcurementBody data={data} />}
    </Loader>
  );
}

function ProcurementBody({ data }: { data: StateProcurementDashboard }) {
  const pal = usePalette();
  const v = useMemo(() => procurementView(data), [data]);
  const t = v.totals;
  const q = v.quality;

  // Диаграммалар ФАҚАТ чорак слотларидан чизилади: «умумий» слотлар
  // аллақачон чоракларнинг йиғиндиси ва битта диаграммада ёнма-ён турса
  // ҳамма нарса икки баробар кўринарди.
  // ⚠️ `?? 0` ЁЗИЛМАЙДИ: «сони кўрсатилмаган» давр диаграммада нол баландлик
  // билан турса, у «нол харид» дегандай кўринарди — бу бутунлай бошқа гап.
  // Шунинг учун бўш давр умуман чизилмайди, худди қуйидаги сумма
  // диаграммасида (`computedAmount !== null`) бўлгани каби. Иккита
  // диаграмма битта қоидага бўйсунади.
  const countRows = v.quarters
    .filter((p) => p.computedCount !== null)
    .map((p) => ({
      label: p.short,
      v: p.computedCount as number,
      extra: ["Сумма кўрсатилган турлар", `${p.typesWithAmount} / ${t.types}`] as [string, string],
    }));

  // Аномал катак бор давр бошқа рангда: у устунни чўзиб қўяди ва буни
  // диаграммада ҳам кўриш керак (ранг ёлғиз маъно ташимайди — остида изоҳ).
  //
  // ⚠️ Диаграммадаги қиймат ЭКРАН бирлигида (млрд сўм) — бутун хулоса
  // қавати билан бир хил. Манбадаги хом қиймат тултипда, ўз бирлиги билан
  // қолади: у ҳеч қаерга йўқолмайди.
  const outlierPeriods = new Set(q.outliers.map((o) => o.period));
  const amountRows = v.quarters
    .filter((p) => p.computedAmount !== null)
    .map((p) => ({
      label: p.short,
      v: bln(p.computedAmount) as number,
      color: outlierPeriods.has(p.label) ? pal.warn : pal.s3,
      extra: outlierPeriods.has(p.label)
        ? (["Диққат", "ичида аномал катак бор"] as [string, string])
        : ([
            `Манбада, ${AMOUNT_SOURCE_UNIT}`,
            exact(p.computedAmount),
          ] as [string, string]),
    }));
  const amountHidden = v.quarters.length - amountRows.length;

  // Харид турлари — сумма бўйича. Тартиб: каттадан кичикка, чунки савол
  // «энг кўп пул қаерга кетди» — манбадаги `Т/р` тартиби бунга жавоб бермайди.
  // ⚠️ `?? 0` ЙЎҚ: суммаси кўрсатилмаган тур диаграммага ТУШМАЙДИ (чорак
  // диаграммалари билан айнан бир хил қоида), лекин жадвалда ўз ўрнида
  // «маълумот йўқ» бўлиб қолади — у йўқолиб кетмайди.
  const typesByAmount = [...v.types].sort((a, b) => {
    if (a.quartersAmount === null) return b.quartersAmount === null ? 0 : 1;
    if (b.quartersAmount === null) return -1;
    return b.quartersAmount - a.quartersAmount;
  });

  const typeAmountRows = typesByAmount
    .filter((x) => x.quartersAmount !== null)
    .map((x) => ({
      label: x.name,
      v: bln(x.quartersAmount) as number,
      color: x.hasOutlier ? pal.warn : pal.s3,
      extra: [
        "Сони",
        x.quartersCount === null ? NO_DATA : `${nf(x.quartersCount)} та`,
      ] as [string, string],
    }));
  const typesHidden = v.types.length - typeAmountRows.length;
  const outlierTypeNames = [...new Set(q.outliers.map((o) => o.type))];

  const typeRows: Row[] = typesByAmount.map((x) => ({
    key: x.key,
    cells: [
      <span key="n">
        {x.no !== null && <span className="mr-1.5 font-mono text-[11px] text-ink-3">{x.no}</span>}
        {x.name}
        {x.hasOutlier && (
          <span className="ml-1.5 align-middle">
            <Pill status="warn">аномал катак</Pill>
          </span>
        )}
      </span>,
      <V key="c" v={x.quartersCount} />,
      /* ⚠️ ЭКРАН бирлигида (млрд сўм) — бутун хулоса қавати билан бир хил.
         Манбадаги хом қиймат «Тўлиқ матрица» да, ўз бирлигида турибди. */
      <V key="a" v={bln(x.quartersAmount)} calc />,
      x.quartersAmount === null || t.quartersAmount === null || t.quartersAmount === 0 ? (
        <Muted key="s" />
      ) : (
        pctTxt((x.quartersAmount / t.quartersAmount) * 100)
      ),
    ],
  }));

  const periodRows: Row[] = v.periods.map((p: ProcPeriod) => ({
    key: p.key,
    cells: [
      <SlotLabel key="p" label={p.label} total={p.kind === "total"} />,
      <V key="cc" v={p.computedCount} />,
      <V key="dc" v={p.declaredCount} />,
      <V key="ca" v={p.computedAmount} />,
      <V key="da" v={p.declaredAmount} />,
      p.matches ? (
        <Pill key="m" status="good">
          мос келди
        </Pill>
      ) : (
        <Pill key="m" status="warn">
          мос келмади
        </Pill>
      ),
      `${p.typesWithCount} / ${p.typesWithAmount}`,
    ],
  }));

  const totalRows: Row[] = v.totalRow.map((s) => ({
    key: s.key,
    cells: [
      <SlotLabel key="p" label={s.label} total={s.kind === "total"} />,
      <CountCell key="c" s={s} />,
      <V key="a" v={s.amount} />,
      <span key="u" className="text-[11px]">
        {s.amountUnitLabel}
        {s.amountUnitSuspect && (
          <span className="ml-1.5 align-middle">
            <Pill status="crit">⚠ ёрлиқ ёлғон</Pill>
          </span>
        )}
      </span>,
      <TmbCell key="t" s={s} />,
    ],
  }));

  return (
    <>
      {/* --- 1. ЖАВОБ: қанча харид қилинди ----------------------------------
          Биринчи экранда фақат ХАРИД туради. Аввал шу ернинг иккинчи энг
          кўзга ташланадиган элементи «Манбада 23 та зиддият топилган» деган
          бутун кенгликдаги чизиқ эди — у ЎЧИРИЛМАДИ, «Батафсил маълумот →
          Манбадаги белгилар» блокига кўчирилди (`QualitySummaryCard`).
          Ундаги ҳар бир чип ўша ерда жойида турибди. */}
      <Section
        title="Харидлар"
        note={`${v.years.map((y) => (y.partial ? `${y.year} — ${y.quarters} чорак` : `${y.year} — тўлиқ йил`)).join(" · ")}`}
      >
        <div className={GRID.g3}>
          {v.years.map((y) => (
            <YearCard key={y.key} y={y} />
          ))}
          {v.compare !== null && <CompareCard c={v.compare} />}
        </div>
      </Section>

      {/* --- 2. НИМАЛАР СОТИБ ОЛИНДИ ---------------------------------------- */}
      <Section title="Нималар сотиб олинди" note={`${t.types} тур · 2025–2026 чораклари`}>
        <div className={GRID.g23}>
          <Card
            title="Сумма бўйича улуши"
            sub={AMOUNT_UNIT}
            note={
              typesHidden > 0
                ? `${typesHidden} та турда сумма кўрсатилмаган — улар диаграммада йўқ (нол эмас, маълумот йўқ), жадвалда ўз ўрнида.`
                : undefined
            }
          >
            <BarsH
              rows={typeAmountRows}
              vFmt={(x) => nf(x, 2)}
              vName={`Шартнома суммаси, ${AMOUNT_UNIT}`}
              ariaLabel="Шартнома суммасининг харид турлари бўйича тақсимоти"
            />
            {outlierTypeNames.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-[1.5] text-warn-ink">
                ⚠ Белгиланган устун ичида битта шубҳали катак бор ({outlierTypeNames.join(", ")})
                — унинг улуши ҳақиқийдан катта кўриниши мумкин.
              </p>
            )}
          </Card>

          <Card title="Турлар кесими" sub={`сони (та) ва суммаси (${AMOUNT_UNIT})`}>
            <DataTable
              cols={[
                { t: "Харид тури", wrap: true },
                { t: "Сони", num: true },
                { t: `Сумма, ${AMOUNT_UNIT}`, num: true },
                { t: "Улуши", num: true },
              ]}
              rows={typeRows}
              caption="Харид турлари бўйича сони ва шартнома суммаси"
            />
          </Card>
        </div>
      </Section>

      {/* --- 3. чораклар динамикаси ------------------------------------------ */}
      <Section title="Чораклар динамикаси" note="2025 — тўртта чорак, 2026 — иккита чорак">
        <div className={GRID.g2}>
          {/* Иккита ўлчов — иккита АЛОҲИДА карточка. «та» ва «млрд сўм» ҳеч
              қачон битта шкалага қўйилмайди ва иккинчи Y ўқи ясалмайди. */}
          <Card title="Чораклар бўйича сони" sub="та">
            <BarsH
              rows={countRows}
              vName="Харидлар сони"
              vFmt={(n) => nf(n)}
              ariaLabel="Харидлар сонининг чораклар бўйича тақсимоти"
            />
            {/* Аввал бу ерда уч қаторли методология матни турарди — у
                «Манба ҳақида» ва «Манбадаги белгилар» блокларига тўлиқ
                ҳолида кўчирилган. Бу ерда фақат соннинг ЎЗИГА тегадиган
                битта жумла қолди. */}
            {q.totalMismatches.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-3">
                {q.totalMismatches.length} та чоракда бу сон файлнинг ўз йиғиндисидан 1 тага
                фарқ қилади — сабаби «Манбадаги белгилар» да.
              </p>
            )}
          </Card>

          <Card
            title="Чораклар бўйича шартнома суммаси"
            sub={AMOUNT_UNIT}
            note={
              amountHidden > 0
                ? `${amountHidden} та чоракда сумма кўрсатилмаган — улар диаграммада йўқ (нол эмас, маълумот йўқ).`
                : undefined
            }
          >
            <BarsH
              rows={amountRows}
              /* Чораклар йиғиндиси — ҲИСОБЛАНГАН қиймат, шунинг учун
                 стандарт `exact()` эмас: у сузувчи нуқта «думи»ни
                 диаграммага олиб чиқарди (`466,11514549`). */
              vFmt={(x) => nf(x, 2)}
              vName={`Шартнома суммаси, ${AMOUNT_UNIT}`}
              ariaLabel="Шартнома суммасининг чораклар бўйича тақсимоти"
            />
            {q.outliers.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-[1.5] text-warn-ink">
                ⚠ Белгиланган устун чўзилиб кетган: ичида битта шубҳали катак бор —{" "}
                {q.outliers
                  .map(
                    (o) =>
                      `${o.type}, ${o.period} (давр йиғиндисининг ${
                        o.shareOfPeriod === null ? "?" : pctTxt(o.shareOfPeriod * 100)
                      } и)`,
                  )
                  .join("; ")}
                .
              </p>
            )}
          </Card>
        </div>
      </Section>

      {/* --- 4. МАНБА қавати — иккинчи даража --------------------------------
          Бу ердаги ҳеч нарса олиб ташланмаган: ҳаммаси жойида, фақат ёпиқ
          ҳолатда бошланади. Тугманинг ўзида ичкарида нима борлиги ва нечта
          экани ёзилган.

          ⚠️ Биринчи экрандан ТУШГАН нарсалар шу ерда:
            · «Манбада 23 та зиддият топилган» чизиғи ва ҳамма чип →
              «Манбадаги белгилар» (`QualitySummaryCard`);
            · «Манбанинг ўз йиғиндиси билан мос келди» ва ёлғон «млрд сум»
              ёрлиғи изоҳи → «Манба ва ўлчов бирлиги» (`SourceCard`);
            · диаграммалар остидаги уч қаторли методология → ўша ерда;
            · ёнидаги «Юридик бошқарма» таби билан фарқи → ўша ерда. */}
      <Section
        title="Батафсил маълумот"
        note="манбадаги ҳар бир катак ва ҳар бир белги — керак бўлганда очилади"
      >
        <Disclosure label="Манба ва ўлчов бирлиги" hint="сонлар қандай ҳисобланган">
          <SourceCard v={v} />
        </Disclosure>

        <Disclosure
          label="Тўлиқ матрица — ҳар бир тур бўйича давр слотлари"
          hint={`${t.types} тур × ${t.periods} слот = ${t.facts} факт`}
        >
          <Banner tone="info">
            ⚠️ Бу бўлимда ҳамма сон <b>МАНБА бирлигида</b> — {t.amountUnitLabel}, яхлитланмаган
            (юқоридаги хулоса қаватида улар {AMOUNT_UNIT} га келтирилган). Катакларни ўқиш:{" "}
            <b>сон</b> — манбадаги қиймат; <b>«{NO_DATA}»</b> — катак манбада бўш; <b>0</b> —
            ҳақиқий нол, ҳеч нарса харид қилинмаган; <b>«{NO_COLUMN}»</b> — бу давр учун
            устуннинг ЎЗИ манбада йўқ («умумий» слотларда ТМБ устуни 3 эмас, 2 та).{" "}
            <b>«матн»</b> белгиси — манбада катак сон эмас, матн бўлган. Тўртта ҳолат атайин
            фарқланади: улар битта «0» остига йиғилса манбадаги номувофиқликлар умуман
            кўринмасди.
          </Banner>
          <div className={GRID.g2}>
            {v.types.map((type) => (
              <TypeCard key={type.key} t={type} />
            ))}
          </div>
        </Disclosure>

        <Disclosure
          label="Давр слотлари ва манбанинг ўз «Жами харидлар:» қатори"
          hint={`${v.periods.length} слот · эталон билан солиштирув`}
        >
          <Card
            title="Давр бўйича: ҳисобланган ↔ манбада эълон қилинган"
            sub={`${v.periods.length} слот`}
            note="«Ҳисобланган» — харид турлари қаторларининг йиғиндиси. «Эълон қилинган» — манбанинг ўз «Жами харидлар:» қаторидаги сон. Иккаласи ЁНМА-ЁН турибди ва тенглаштирилмайди. Охирги устун: сони / суммаси кўрсатилган турлар сони."
          >
            <DataTable
              cols={[
                { t: "Давр", wrap: true },
                { t: "Сони — ҳисобланган", num: true },
                { t: "Сони — эълон", num: true },
                { t: "Сумма — ҳисобланган", num: true },
                { t: "Сумма — эълон", num: true },
                { t: "Мослик" },
                { t: "Тўлдирилган турлар" },
              ]}
              rows={periodRows}
              caption="Давр слотлари бўйича ҳисобланган ва эълон қилинган қийматлар"
            />
          </Card>

          <Card
            className="mt-3"
            title="«Жами харидлар:» қатори — манбадаги 18-қатор"
            sub={`${v.totalRow.length} слот`}
            stripe="var(--s6)"
            note="Бу қатор пастдаги харид турларининг СУММАСИ. Шунинг учун у `facts` рўйхатига умуман кирмайди ва бўлимдаги ҳеч бир ҳисобга қўшилмайди — фақат текшириш учун ёнма-ён кўрсатилади (`production-report` даги `isTotal` билан бир хил мантиқ)."
          >
            <DataTable
              cols={[
                { t: "Давр", wrap: true },
                { t: "Сони", num: true },
                { t: "Шартнома суммаси", num: true },
                { t: "Манбадаги ёрлиқ", wrap: true },
                { t: "Тасдиқланган ТМБ", num: true },
              ]}
              rows={totalRows}
              caption="«Жами харидлар:» қаторининг давр слотлари"
            />
          </Card>
        </Disclosure>

        <Disclosure
          label="Манбадаги белгилар — маълумот сифати"
          hint={`${q.issues} та белги · яширилмайди, тузатилмайди`}
        >
          <QualitySection q={q} />
        </Disclosure>
      </Section>
    </>
  );
}
