import type {
  LegalAffairsDashboard,
  LegalClaim,
  LegalColumnFill,
  LegalContractReview,
  LegalCourtCase,
  LegalExtraCell,
  LegalSectionDataQuality,
  LegalSectionKey,
} from "../../api/types";
import { dateLabel, monthLabel } from "../format";

/**
 * «Юридик бошқарма» — `/legal-affairs/dashboard` жавобидан панел кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `Юридик бошқарма.xlsx`, **учта варақ**: `1. СУД ИШЛАРИ` (23 ёзув),
 * `2. ПРЕТЕНЗИЯЛАР` (2 ёзув), `3. ШАРТНОМА ЭКСПЕРТИЗАСИ` (10 ёзув) —
 * жами **35 мантиқий ёзув**. Бу вақт қатори эмас, битта ҳужжатнинг жорий
 * ҳолати, шунинг учун бўлим давр танлагичига боғланмаган.
 *
 * ⚠️ Учала бўлим АЛОҲИДА қолади ва битта «универсал» жадвалга йиғилмайди:
 * уларнинг устунлари `Т/р` дан бошқа жойда умуман кесишмайди. Йиғилса
 * «бу майдон бу тур учун МАВЖУД ЭМАС» билан «бу майдон ТЎЛДИРИЛМАГАН»
 * фарқланмай қоларди — бу бутун сводка бўйлаб амал қиладиган асосий
 * қоидани бузарди.
 *
 * ═══ «Кўрсатилмаган» ≠ «нол» ва ≠ «бўлим бўш» ═══════════════════════════
 *
 * Манба нотекис тўлдирилган. Бўш катак **нолга айлантирилмайди** ва жимгина
 * ташлаб кетилмайди: қиймат `null` бўлиб қолади, панел эса «маълумот йўқ»
 * деб ёзади ва ёнида нечта ёзувда устун тўлдирилганини кўрсатади.
 *
 * ⚠️ «Претензиялар» бўлимида атиги **2 та ёзув** бор — бу МАНБАНИНГ ҳолати,
 * хато эмас. Панел уни «маълумот йўқ» эмас, «манбада 2 та ёзув бор» деб
 * кўрсатади: иккиси ЖУДА бошқа нарса.
 *
 * ═══ Манба тузатилмайди ═════════════════════════════════════════════════
 *
 * Такрорий `Т/р`, такрорий иш рақами, 2001 йил, «млн сўм» сарлавҳаси остидаги
 * сўм қиймати — ҳаммаси **манбадагидек** қолади. Адаптер ҳеч нарсани қайта
 * шкалаламайди ва тўғриламайди, фақат белгини (`*Suspect`, `*Duplicate`)
 * қўшади — панел уни ҳалол кўрсатиши учун.
 *
 * ═══ Матн — КИРИЛЛ ══════════════════════════════════════════════════════
 *
 * API матн майдонларини ЛОТИН ёзувида беради, кириллчаси эса ёнидаги
 * `*Cyrillic` жуфтида. Сводка интерфейси кирилл — бу ерда ДОИМ `*Cyrillic`
 * олинади, панелга лотин шакли умуман чиқмайди. Ягона истисно — ТЕХНИК
 * қийматлар (`caseNumber`, `field`): улар манбада ҳам лотин-рақам.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "маълумот йўқ";

/** Бўлим сарлавҳалари — кирилл, манбадаги варақ номларига мос. */
export const LEGAL_SECTION_TITLE: Record<LegalSectionKey, string> = {
  courtCases: "Суд ишлари",
  claims: "Претензиялар",
  contractReviews: "Шартнома экспертизаси",
};

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                 */
/* -------------------------------------------------------------------------- */

/** Бўш сатр ҳам «кўрсатилмаган» — API'да у учрамайди, лекин кафолат эмас. */
const txt = (v: string | null | undefined): string | null =>
  v === null || v === undefined || v.trim() === "" ? null : v;

/**
 * Сана катаги.
 *
 * ⚠️ `iso` ва `text` бир вақтда ҳеч қачон тўлмайди: Excel санаси `iso` га,
 * парс қилинмаган хом матн эса `text` га тушади. Бэкенд «23.06.2025 й» ни
 * `dd.mm.yyyy` га ўхшаса ҳам АТАЙЛАБ парс қилмаган — форматни тахмин қилиш
 * маълумот тўқиш бўларди. Шунинг учун бу ерда ҳам парс қилинмайди, фақат
 * «манбада матн эди» белгиси қўйилади.
 */
export interface LegalDateView {
  /** Экранда кўрсатиладиган матн; `null` — манбада умуман йўқ. */
  label: string | null;
  /** `true` — манбада сана эмас, ХОМ МАТН турган. */
  asText: boolean;
  /**
   * ЎҚИЛГАН сана (`YYYY-MM-DD`) ёки `null`.
   *
   * ⚠️ Хом матн бу ерга ТУШМАЙДИ — у парс қилинмаган ва парс қилинмайди.
   * Шунинг учун вақт кесимлари (диапазон, ойлар диаграммаси) фақат шу
   * майдонга таянади, `label` га эмас: `label` форматланган матн ва ундан
   * қайта сана ясаш манбада бўлмаган аниқликни ўйлаб топиш бўларди.
   */
  iso: string | null;
}

function dateView(iso: string | null, raw: string | null): LegalDateView {
  if (iso !== null && iso.length >= 10) {
    return { label: dateLabel(iso), asText: false, iso: iso.slice(0, 10) };
  }
  const t = txt(raw);
  return t === null
    ? { label: null, asText: false, iso: null }
    : { label: t, asText: true, iso: null };
}

/**
 * «Кўриб чиқилган» устуни — сана эмас, **ОЙ** белгиси.
 *
 * ⚠️ Манбадаги 10/10 қиймат ойнинг 1-куни. Уни «1-январь» деб кўрсатиш
 * манбада бўлмаган аниқликни ўйлаб топиш бўларди, шунинг учун ёрлиқ ойгача
 * қисқартирилади: «Январь 2026». Йили кетма-кетликдан чиққан (2001) бўлса
 * қиймат ЎЗГАРТИРИЛМАЙДИ, фақат белгиланади.
 */
export interface LegalMonthView {
  label: string | null;
  asText: boolean;
  /** `true` — бу аниқ кун эмас, ой белгиси. */
  monthOnly: boolean;
  /** `true` — йил устундаги кетма-кетликдан чиққан (манбада 2001). */
  yearSuspect: boolean;
  /** ЎҚИЛГАН ой (`YYYY-MM`) ёки `null`. Хом матн бу ерга тушмайди. */
  month: string | null;
}

function monthView(r: LegalContractReview): LegalMonthView {
  if (r.reviewedDate !== null && r.reviewedDate.length >= 10) {
    return {
      label: r.reviewedDateIsMonthOnly ? monthLabel(r.reviewedDate) : dateLabel(r.reviewedDate),
      asText: false,
      monthOnly: r.reviewedDateIsMonthOnly,
      yearSuspect: r.reviewedDateYearSuspect,
      month: r.reviewedDate.slice(0, 7),
    };
  }
  const t = txt(r.reviewedDateTextCyrillic);
  return {
    label: t,
    asText: t !== null,
    monthOnly: r.reviewedDateIsMonthOnly,
    yearSuspect: r.reviewedDateYearSuspect,
    month: null,
  };
}

/** Merge блокидан қутқарилган катак. */
export interface LegalExtra {
  key: string;
  excelRow: number;
  /** КИРИЛЛ */
  column: string;
  /** КИРИЛЛ */
  value: string;
}

const extras = (list: LegalExtraCell[], scope: string): LegalExtra[] =>
  list.map((e, i) => ({
    key: `${scope}-${e.excelRow}-${i}`,
    excelRow: e.excelRow,
    column: e.columnCyrillic,
    value: e.valueCyrillic,
  }));

/** Устун тўлдирилганлиги — панелдаги «N / M» қатори учун. */
export interface LegalColumnRow {
  key: string;
  /** КИРИЛЛ — манбадаги сарлавҳа. */
  label: string;
  /** API майдони — техник қиймат, ўгирилмайди. */
  field: string;
  filled: number;
  total: number;
  /** 0…1 */
  ratio: number;
}

const columnRows = (list: LegalColumnFill[], scope: string): LegalColumnRow[] =>
  list.map((c) => ({
    key: `${scope}-${c.field}`,
    label: c.columnCyrillic,
    field: c.field,
    filled: c.filled,
    total: c.total,
    ratio: c.ratio,
  }));

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface LegalCase {
  id: number;
  key: string;
  /** Файлдаги `Т/р`. Барқарор эмас — фақат манбадаги қаторни топиш учун. */
  ordinal: number | null;
  excelRow: number | null;
  excelRowEnd: number | null;
  /** 1 дан катта бўлса — манбада merge блоки. */
  rowSpan: number;
  /** КИРИЛЛ */
  subject: string;
  ruling: LegalDateView;
  court: string | null;
  /** ТЕХНИК қиймат — ўгирилмайди. */
  caseNumber: string | null;
  /** `true` — айнан шу иш рақами манбада бошқа ёзувда ҳам учрайди. */
  caseNumberDuplicate: boolean;
  lawyer: string | null;
  hearing: LegalDateView;
  result: string | null;
  appealSummary: string | null;
  appealHearing: string | null;
  /** ⚠️ Устун манбада МАВЖУД, лекин 0/23 тўлдирилган — доим `null`. */
  appealPostponed: string | null;
  note: string | null;
  extras: LegalExtra[];
}

export interface LegalClaimRow {
  id: number;
  key: string;
  ordinal: number | null;
  excelRow: number | null;
  /** КИРИЛЛ */
  subject: string;
  respondent: string | null;
  /** ⚠️ МАНБАДАГИ ХОМ сон — қайта шкалаланмаган. */
  amountRaw: number | null;
  /** Манбадаги устун сарлавҳаси — АЙНАН. */
  amountUnitLabel: string;
  /** ⚠️ `true` → сарлавҳадаги бирлик ИШОНЧСИЗ. */
  amountUnitSuspect: boolean;
  /** ⚠️ Устун бор, 0/2 тўлдирилган. */
  sent: LegalDateView;
  /** ⚠️ Устун бор, 0/2 тўлдирилган. */
  deadline: string | null;
  /** ⚠️ Устун бор, 0/2 тўлдирилган. */
  response: string | null;
  /** ⚠️ Устун бор, 0/2 тўлдирилган. */
  note: string | null;
  extras: LegalExtra[];
}

export interface LegalReviewRow {
  id: number;
  key: string;
  ordinal: number | null;
  /** `true` — айнан шу `Т/р` манбада бошқа ёзувда ҳам учрайди. */
  ordinalDuplicate: boolean;
  excelRow: number | null;
  excelRowEnd: number | null;
  rowSpan: number;
  /** ⚠️ Сарлавҳа «Шартнома номи / предмети» дейди, катакда эса ЛАВОЗИМ. */
  contractName: string;
  counterparty: string | null;
  received: LegalDateView;
  /** 5-устун — сана (аслида ОЙ). */
  reviewed: LegalMonthView;
  /** 6-устун — сарлавҳаси 5-устун билан АЙНАН бир хил, мазмуни бошқа. */
  conclusion: string | null;
  extras: LegalExtra[];
}

/* -------------------------------------------------------------------------- */
/* ҲИСОБЛАНГАН кесимлар — биринчи экран учун                                   */
/* -------------------------------------------------------------------------- */

/**
 * Апелляция босқичига чиққан битта иш.
 *
 * ⚠️ «Чиққан» — иккита шикоят устунидан **камида биттаси** тўлдирилган.
 * Иккита устунни алоҳида санаш адаштирарди: манбада 2 та ишда «шикоят
 * мазмуни», 3 та ишда «шикоят кўриладиган сана» тўлдирилган, лекин булар
 * бир-бирининг устига тушади — АМАЛДА 3 та иш апелляцияга чиққан.
 */
export interface LegalAppealRow {
  key: string;
  ordinal: number | null;
  court: string | null;
  lawyer: string | null;
  /** «Суд қароридан норози томон шикояти қисқача мазмуни» тўлдирилганми. */
  hasSummary: boolean;
  /** «Шикоят кўриладиган сана ва натижаси» тўлдирилганми. */
  hasHearing: boolean;
}

/**
 * Суд ишларининг ВАҚТ ва БОСҚИЧ кесими — ҳаммаси `cases` дан ҳисобланади.
 *
 * ⚠️ Нега «суд натижаси» бўйича кесим ЙЎҚ: манбада `result` 23/23 тўлдирилган,
 * лекин у **эркин матн** (22 ноёб қиймат, 78–701 белги) — «ютилган / ютқазилган»
 * каби тасниф манбада умуман йўқ. Матндан тасниф чиқариш маълумот тўқиш
 * бўларди, шунинг учун натижа фақат ТЎЛИҚ матн ҳолида рўйхатда туради.
 * Ўрнига `resultDistinct` / `resultMinLen` / `resultMaxLen` — шу қарорнинг
 * манбадан ўлчанган асоси.
 */
export interface LegalCaseFlow {
  /** «Суд кўриладиган кун»: сана ўқилган / хом матн / устун бўш. */
  hearingIso: number;
  hearingAsText: number;
  hearingMissing: number;
  /** Энг эрта ва энг кеч мажлис (`YYYY-MM-DD`). `null` — сана умуман йўқ. */
  hearingFirst: string | null;
  hearingLast: string | null;
  /** Солиштириш санаси — «кутилаётган» айнан шу кундан ҳисобланади. */
  today: string;
  /**
   * ⚠️ Бугундан КЕЙИНГИ мажлислар. Манбада бўш чиқса панел блокни умуман
   * чизмайди: «маълумот йўқ» деб турган бўш блок шовқиндан бошқа нарса эмас.
   */
  upcoming: Array<{ key: string; date: string; court: string | null; ordinal: number | null }>;
  /**
   * Ойлар бўйича тақсимот — биринчи ойдан охиргисигача УЗЛУКСИЗ ўқ.
   *
   * ⚠️ Оралиқдаги `0` — ҲАҚИҚИЙ нол: ўша ойда мажлис бўлмаган. Бу «маълумот
   * йўқ» билан аралашмайди, чунки санаси ўқилмаган иш диаграммага умуман
   * кирмайди — у `hearingAsText` / `hearingMissing` да алоҳида турибди.
   */
  byMonth: Array<{ key: string; month: string; cases: number }>;
  /** «Иш тайинланган ажрим сана»: сана ўқилган / хом матн / устун бўш. */
  rulingIso: number;
  rulingAsText: number;
  rulingMissing: number;
  /** Энг кейинги ажрим санаси — маълумот қанчалик янгилигини кўрсатади. */
  rulingLast: string | null;
  /** Апелляция босқичига чиққан ишлар. */
  appealed: LegalAppealRow[];
  /** «Суд натижаси» матни ёзилган ишлар. */
  resultFilled: number;
  /** ⚠️ Ноёб натижа матнлари — тасниф йўқлигининг ўлчови. */
  resultDistinct: number;
  resultMinLen: number;
  resultMaxLen: number;
  /** «Изоҳ» устуни тўлдирилган ишлар. */
  noteFilled: number;
}

/** Шартнома экспертизасининг вақт кесими — `reviews` дан ҳисобланади. */
export interface LegalReviewFlow {
  /** «Келиб тушган кун» устунида сана ўқилган ёзувлар. */
  receivedIso: number;
  receivedFirst: string | null;
  receivedLast: string | null;
  /**
   * «Кўриб чиқилган» ойлар диапазони.
   *
   * ⚠️ Йили ШУБҲАЛИ ёзувлар (манбада 2001) диапазонга **қўшилмайди**: акс ҳолда
   * бутун бўлим «Март 2001 — Август 2026» бўлиб кўринарди ва диапазон ҳеч нарса
   * демасди. Қиймат манбада ўзгаришсиз қолади ва рўйхатда ⚠ белгиси билан
   * кўринади — бу яшириш эмас, ҳисобдан ЧИҚАРИШ, сабаби шу ерда ёзилган.
   */
  reviewedFirst: string | null;
  reviewedLast: string | null;
  /** ⚠️ Йили кетма-кетликдан чиққан ёзувлар сони. */
  yearSuspect: number;
  /** Контрагент номи кўрсатилган ёзувлар. */
  withCounterparty: number;
  /** Merge сабабли фарқ: физик Excel қатори − мантиқий ёзув. */
  mergedRows: number;
}

/**
 * Учала бўлимдаги белгиларнинг ТУРИ бўйича йиғма ҳисоби.
 *
 * Биринчи экрандаги қисқа хулоса учун: «20 та белги» деган ялпи сон қайси
 * турдаги муаммо эканини айтмайди, бу эса уни ўқишга арзимас қилиб қўярди.
 */
export interface LegalQualitySummary {
  /** Устун манбада БОР, лекин биронта ёзувда тўлдирилмаган. */
  emptyColumns: number;
  /** Ярмидан ками тўлдирилган устунлар. */
  sparseColumns: number;
  /** Такрорий `Т/р` ва такрорий иш рақамлари. */
  duplicates: number;
  /** Сарлавҳа такрори + сарлавҳа мазмунга мос эмас. */
  headerIssues: number;
  unitConflicts: number;
  dateAnomalies: number;
  /** Устун «кун» ваъда қилади, қиймат эса ой белгиси. */
  monthOnlyColumns: number;
  /** Merge блокидан қутқарилган катаклар. */
  extras: number;
  mergedBlocks: number;
  /** Бўлимлараро огоҳлантиришлар. */
  warnings: number;
}

export interface LegalSectionQuality {
  key: LegalSectionKey;
  /** КИРИЛЛ */
  title: string;
  sheet: string;
  records: number;
  /** ⚠️ `records` дан катта бўлса — merge блоклари бор. */
  physicalRows: number;
  columns: LegalColumnRow[];
  /** `filled === 0` — устун бор, маълумот йўқ. */
  emptyColumns: LegalColumnRow[];
  /** `0 < ratio < 0.5`. */
  sparseColumns: LegalColumnRow[];
  mergedBlocks: Array<{ key: string; excelRow: number; excelRowEnd: number; rowSpan: number }>;
  extras: LegalExtra[];
  duplicateOrdinals: Array<{ key: string; value: string; excelRows: number[] }>;
  duplicateCaseNumbers: Array<{ key: string; value: string; excelRows: number[] }>;
  duplicateHeaders: Array<{ key: string; header: string; fields: string[]; reason: string }>;
  headerConflicts: Array<{
    key: string;
    header: string;
    field: string;
    reason: string;
    samples: string[];
  }>;
  unitConflicts: Array<{
    key: string;
    header: string;
    declaredUnit: string;
    observedUnit: string;
    reason: string;
    values: Array<{ excelRow: number; value: number }>;
  }>;
  dateAnomalies: Array<{
    key: string;
    excelRow: number;
    column: string;
    value: string;
    year: number;
    expectedYear: number | null;
    reason: string;
  }>;
  monthOnlyDates: { column: string; records: number; reason: string } | null;
  warnings: string[];
  /** Шу бўлимдаги белгиларнинг умумий сони — сарлавҳадаги ҳисоб учун. */
  issues: number;
  /**
   * API майдони → «N / M» тўлдирилганлик ёрлиғи.
   *
   * ⚠️ Панелдаги ёрлиқларда («Шикоят иши қолдирилган кун (0/23)») сон
   * ҚАТТИҚ ЁЗИЛМАЙДИ: манба тўлдирилса ёрлиқ ўзи ўзгаради. Акс ҳолда
   * экранда эскирган сон қолиб, бўлимнинг ўз мақсадига — ҳалол
   * кўрсатишга — зид бўларди.
   */
  fillOf: (field: string) => string;
}

export interface LegalView {
  /** Манба файл номи. */
  source: string;
  /** ISO 8601 ёки `null`. */
  importedAt: string | null;
  totals: {
    courtCases: number;
    claims: number;
    contractReviews: number;
    /** Учала бўлим йиғиндиси — МАНТИҚИЙ ёзувлар. */
    records: number;
    /** ⚠️ `records` дан катта — merge блоклари сабабли. */
    physicalRows: number;
    /** ⚠️ ХОМ йиғинди, бирлиги ШУБҲАЛИ. */
    claimsAmountRawSum: number | null;
    claimsAmountUnitLabel: string;
    claimsAmountUnitSuspect: boolean;
  };
  sections: Array<{
    key: LegalSectionKey;
    /** КИРИЛЛ */
    title: string;
    sheet: string;
    records: number;
    physicalRows: number;
    columns: number;
    filledColumns: number;
    emptyColumns: number;
  }>;
  byLawyer: Array<{ key: string; label: string; cases: number }>;
  byCourt: Array<{ key: string; label: string; cases: number }>;
  cases: LegalCase[];
  claims: LegalClaimRow[];
  reviews: LegalReviewRow[];
  /** ҲИСОБЛАНГАН: суд ишларининг вақт ва босқич кесими. */
  caseFlow: LegalCaseFlow;
  /** ҲИСОБЛАНГАН: шартнома экспертизасининг вақт кесими. */
  reviewFlow: LegalReviewFlow;
  quality: {
    courtCases: LegalSectionQuality;
    claims: LegalSectionQuality;
    contractReviews: LegalSectionQuality;
    /** Бўлимлараро огоҳлантиришлар. */
    warnings: string[];
    /** Учала бўлимдаги белгиларнинг умумий сони. */
    issues: number;
    /** ҲИСОБЛАНГАН: белгиларнинг тури бўйича йиғма ҳисоби. */
    summary: LegalQualitySummary;
  };
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

function sectionQuality(key: LegalSectionKey, q: LegalSectionDataQuality): LegalSectionQuality {
  // Майдон → «N / M». Панелдаги ёрлиқлар шу ердан тўлади, қаттиқ ёзилган
  // сон билан эмас: манба тўлдирилса ёрлиқ ҳам ўзи ўзгаради.
  const fill = new Map(q.columnFill.map((c) => [c.field, `${c.filled}/${c.total}`]));

  const out: LegalSectionQuality = {
    key,
    title: LEGAL_SECTION_TITLE[key],
    sheet: q.sheet,
    records: q.recordCount,
    physicalRows: q.physicalRowCount,
    columns: columnRows(q.columnFill, key),
    emptyColumns: columnRows(q.emptyColumns, `${key}-empty`),
    sparseColumns: columnRows(q.sparseColumns, `${key}-sparse`),
    mergedBlocks: q.mergedBlocks.map((b) => ({
      key: `${key}-${b.excelRow}-${b.excelRowEnd}`,
      excelRow: b.excelRow,
      excelRowEnd: b.excelRowEnd,
      rowSpan: b.rowSpan,
    })),
    extras: extras(q.extras, `${key}-q`),
    duplicateOrdinals: q.duplicateOrdinals.map((d) => ({
      key: `${key}-ord-${d.value}`,
      value: d.value,
      excelRows: d.excelRows,
    })),
    duplicateCaseNumbers: q.duplicateCaseNumbers.map((d) => ({
      key: `${key}-case-${d.value}`,
      value: d.value,
      excelRows: d.excelRows,
    })),
    duplicateHeaders: q.duplicateHeaders.map((h, i) => ({
      key: `${key}-dh-${i}`,
      header: h.header,
      fields: h.fields,
      reason: h.reason,
    })),
    headerConflicts: q.headerMeaningConflicts.map((h, i) => ({
      key: `${key}-hc-${i}`,
      // ⚠️ Бу ЛОТИН эмас — сарлавҳа манбадагидек (кирилл) келади.
      header: h.header,
      field: h.field,
      reason: h.reason,
      samples: h.samples,
    })),
    unitConflicts: q.unitConflicts.map((u, i) => ({
      key: `${key}-uc-${i}`,
      header: u.header,
      declaredUnit: u.declaredUnit,
      observedUnit: u.observedUnit,
      reason: u.reason,
      values: u.values,
    })),
    dateAnomalies: q.dateAnomalies.map((d, i) => ({
      key: `${key}-da-${i}-${d.excelRow}`,
      excelRow: d.excelRow,
      column: d.column,
      value: d.value,
      year: d.year,
      expectedYear: d.expectedYear,
      reason: d.reason,
    })),
    monthOnlyDates: q.monthOnlyDates
      ? {
          column: q.monthOnlyDates.column,
          records: q.monthOnlyDates.records,
          reason: q.monthOnlyDates.reason,
        }
      : null,
    warnings: q.warnings,
    issues: 0,
    // Майдон топилмаса ёрлиқ УМУМАН қўйилмайди (бўш сатр) — «0/0» деб ёзиш
    // мавжуд бўлмаган ўлчовни ўйлаб топиш бўларди.
    fillOf: (field: string) => fill.get(field) ?? "",
  };

  // «Белги» — бу ХАТО эмас, диққат талаб қиладиган кузатув. Панел сарлавҳасида
  // сони кўрсатилади, шунда бўлим «тоза» кўринмайди.
  out.issues =
    out.emptyColumns.length +
    out.sparseColumns.length +
    out.duplicateOrdinals.length +
    out.duplicateCaseNumbers.length +
    out.duplicateHeaders.length +
    out.headerConflicts.length +
    out.unitConflicts.length +
    out.dateAnomalies.length +
    (out.monthOnlyDates ? 1 : 0) +
    out.extras.length +
    out.warnings.length;

  return out;
}

/* -------------------------------------------------------------------------- */
/* ҳисобланган кесимларни қуриш                                               */
/* -------------------------------------------------------------------------- */

/**
 * Бугунги сана `YYYY-MM-DD` да — **локал** вақт бўйича.
 *
 * ⚠️ `toISOString()` ЭМАС: у UTC'га ўтказади ва Тошкент вақтида (UTC+5) кун
 * эрталабки соатларда бир кунга орқага сурилиб кетарди. «Кутилаётган мажлис»
 * шу сана билан солиштирилади, шунинг учун фарқ муҳим.
 */
function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * `"2025-07"` дан `"2026-06"` гача узлуксиз ойлар рўйхати.
 *
 * Нега узлуксиз: диаграммада фақат мажлис бўлган ойлар қолдирилса, ўқ вақт ўқи
 * бўлмай қоларди ва «октябрда битта ҳам мажлис бўлмаган» деган ҳақиқат умуман
 * кўринмасди. Оралиқдаги нол — маълумотнинг йўқлиги эмас, ҳақиқий нол.
 */
function monthSpan(first: string, last: string): string[] {
  const out: string[] = [];
  let y = Number(first.slice(0, 4));
  let m = Number(first.slice(5, 7));
  const ey = Number(last.slice(0, 4));
  const em = Number(last.slice(5, 7));
  // 600 — қўпол чегара: манбадаги бузуқ сана циклни абадий айлантирмаслиги учун.
  for (let i = 0; i < 600 && (y < ey || (y === ey && m <= em)); i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Рўйхатдаги энг кичик/катта қиймат — бўш рўйхатда `null`. */
const minOf = (xs: string[]): string | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => (b < a ? b : a));
const maxOf = (xs: string[]): string | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => (b > a ? b : a));

function buildCaseFlow(cases: LegalCase[]): LegalCaseFlow {
  const today = todayIso();

  // ⚠️ Диаграмма ва диапазонга фақат ЎҚИЛГАН сана киради. Хом матн
  // («23.06.2025 й») парс қилинмайди — форматни тахмин қилиш маълумот тўқиш
  // бўларди. У ҳисобда алоҳида қатор бўлиб турибди ва рўйхатда ўз ҳолида,
  // ⚠ белгиси билан кўринади, яъни ҳеч қаерга йўқолмайди.
  const hearingIso = cases.map((c) => c.hearing.iso).filter((x): x is string => x !== null);
  const rulingIso = cases.map((c) => c.ruling.iso).filter((x): x is string => x !== null);

  const first = minOf(hearingIso);
  const last = maxOf(hearingIso);

  const counts = new Map<string, number>();
  hearingIso.forEach((iso) => {
    const m = iso.slice(0, 7);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  });
  const byMonth =
    first === null || last === null
      ? []
      : monthSpan(first.slice(0, 7), last.slice(0, 7)).map((m) => ({
          key: m,
          month: m,
          cases: counts.get(m) ?? 0,
        }));

  const upcoming = cases
    .filter((c) => c.hearing.iso !== null && c.hearing.iso > today)
    .map((c) => ({
      key: c.key,
      date: c.hearing.iso as string,
      court: c.court,
      ordinal: c.ordinal,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const appealed: LegalAppealRow[] = cases
    .filter((c) => c.appealSummary !== null || c.appealHearing !== null)
    .map((c) => ({
      key: c.key,
      ordinal: c.ordinal,
      court: c.court,
      lawyer: c.lawyer,
      hasSummary: c.appealSummary !== null,
      hasHearing: c.appealHearing !== null,
    }));

  const results = cases.map((c) => c.result).filter((x): x is string => x !== null);
  const lens = results.map((r) => r.length);

  return {
    hearingIso: hearingIso.length,
    hearingAsText: cases.filter((c) => c.hearing.asText).length,
    hearingMissing: cases.filter((c) => c.hearing.label === null).length,
    hearingFirst: first,
    hearingLast: last,
    today,
    upcoming,
    byMonth,
    rulingIso: rulingIso.length,
    rulingAsText: cases.filter((c) => c.ruling.asText).length,
    rulingMissing: cases.filter((c) => c.ruling.label === null).length,
    rulingLast: maxOf(rulingIso),
    appealed,
    resultFilled: results.length,
    resultDistinct: new Set(results).size,
    resultMinLen: lens.length === 0 ? 0 : Math.min(...lens),
    resultMaxLen: lens.length === 0 ? 0 : Math.max(...lens),
    noteFilled: cases.filter((c) => c.note !== null).length,
  };
}

function buildReviewFlow(reviews: LegalReviewRow[], mergedRows: number): LegalReviewFlow {
  const received = reviews.map((r) => r.received.iso).filter((x): x is string => x !== null);
  // ⚠️ Йили шубҳали ёзув диапазондан ЧИҚАРИЛАДИ — сабаби `LegalReviewFlow` да.
  const reviewed = reviews
    .filter((r) => !r.reviewed.yearSuspect)
    .map((r) => r.reviewed.month)
    .filter((x): x is string => x !== null);

  return {
    receivedIso: received.length,
    receivedFirst: minOf(received),
    receivedLast: maxOf(received),
    reviewedFirst: minOf(reviewed),
    reviewedLast: maxOf(reviewed),
    yearSuspect: reviews.filter((r) => r.reviewed.yearSuspect).length,
    withCounterparty: reviews.filter((r) => r.counterparty !== null).length,
    mergedRows,
  };
}

function qualitySummary(parts: LegalSectionQuality[], warnings: number): LegalQualitySummary {
  const sum = (f: (s: LegalSectionQuality) => number) =>
    parts.reduce((acc, s) => acc + f(s), 0);
  return {
    emptyColumns: sum((s) => s.emptyColumns.length),
    sparseColumns: sum((s) => s.sparseColumns.length),
    duplicates: sum((s) => s.duplicateOrdinals.length + s.duplicateCaseNumbers.length),
    headerIssues: sum((s) => s.duplicateHeaders.length + s.headerConflicts.length),
    unitConflicts: sum((s) => s.unitConflicts.length),
    dateAnomalies: sum((s) => s.dateAnomalies.length),
    monthOnlyColumns: sum((s) => (s.monthOnlyDates ? 1 : 0)),
    extras: sum((s) => s.extras.length),
    mergedBlocks: sum((s) => s.mergedBlocks.length),
    warnings,
  };
}

export function legalView(d: LegalAffairsDashboard): LegalView {
  const q = d.dataQuality;

  // Такрорий иш рақамлари ва `Т/р` лар ёзувнинг ўзида ҳам белгиланади: улар
  // фақат «маълумот сифати» бўлимида турса, рўйхатни ўқиётган одам икки
  // бир хил қаторни хатога йўйиши мумкин эди.
  const dupCaseNumbers = new Set(q.courtCases.duplicateCaseNumbers.map((x) => x.value));
  const dupReviewOrdinals = new Set(q.contractReviews.duplicateOrdinals.map((x) => x.value));

  const cases: LegalCase[] = d.courtCases.map((c: LegalCourtCase) => ({
    id: c.id,
    key: c.key,
    ordinal: c.ordinal,
    excelRow: c.excelRow,
    excelRowEnd: c.excelRowEnd,
    rowSpan: c.rowSpan,
    subject: c.subjectCyrillic,
    ruling: dateView(c.rulingDate, c.rulingDateTextCyrillic),
    court: txt(c.courtNameCyrillic),
    caseNumber: txt(c.caseNumber),
    caseNumberDuplicate: c.caseNumber !== null && dupCaseNumbers.has(c.caseNumber),
    lawyer: txt(c.lawyerCyrillic),
    hearing: dateView(c.hearingDate, c.hearingDateTextCyrillic),
    result: txt(c.resultCyrillic),
    appealSummary: txt(c.appealSummaryCyrillic),
    appealHearing: txt(c.appealHearingTextCyrillic),
    appealPostponed: txt(c.appealPostponedTextCyrillic),
    note: txt(c.noteCyrillic),
    extras: extras(c.extras, `case-${c.id}`),
  }));

  const claims: LegalClaimRow[] = d.claims.map((c: LegalClaim) => ({
    id: c.id,
    key: c.key,
    ordinal: c.ordinal,
    excelRow: c.excelRow,
    subject: c.subjectCyrillic,
    respondent: txt(c.respondentCyrillic),
    amountRaw: c.amountRaw,
    amountUnitLabel: c.amountUnitLabel,
    amountUnitSuspect: c.amountUnitSuspect,
    sent: dateView(c.sentDate, c.sentDateTextCyrillic),
    deadline: txt(c.deadlineTextCyrillic),
    response: txt(c.responseTextCyrillic),
    note: txt(c.noteCyrillic),
    extras: extras(c.extras, `claim-${c.id}`),
  }));

  const reviews: LegalReviewRow[] = d.contractReviews.map((r: LegalContractReview) => ({
    id: r.id,
    key: r.key,
    ordinal: r.ordinal,
    ordinalDuplicate: r.ordinal !== null && dupReviewOrdinals.has(String(r.ordinal)),
    excelRow: r.excelRow,
    excelRowEnd: r.excelRowEnd,
    rowSpan: r.rowSpan,
    contractName: r.contractNameCyrillic,
    counterparty: txt(r.counterpartyCyrillic),
    received: dateView(r.receivedDate, r.receivedDateTextCyrillic),
    reviewed: monthView(r),
    conclusion: txt(r.conclusionCyrillic),
    extras: extras(r.extras, `review-${r.id}`),
  }));

  const courtCasesQ = sectionQuality("courtCases", q.courtCases);
  const claimsQ = sectionQuality("claims", q.claims);
  const reviewsQ = sectionQuality("contractReviews", q.contractReviews);

  const quality = {
    courtCases: courtCasesQ,
    claims: claimsQ,
    contractReviews: reviewsQ,
    warnings: q.warnings,
    issues:
      courtCasesQ.issues + claimsQ.issues + reviewsQ.issues + q.warnings.length,
    summary: qualitySummary([courtCasesQ, claimsQ, reviewsQ], q.warnings.length),
  };

  return {
    source: d.meta.source,
    importedAt: d.meta.importedAt,
    totals: {
      courtCases: d.totals.courtCases,
      claims: d.totals.claims,
      contractReviews: d.totals.contractReviews,
      records: d.totals.records,
      physicalRows: d.totals.physicalRows,
      claimsAmountRawSum: d.totals.claimsAmountRawSum,
      claimsAmountUnitLabel: d.totals.claimsAmountUnitLabel,
      claimsAmountUnitSuspect: d.totals.claimsAmountUnitSuspect,
    },
    sections: d.sections.map((s) => ({
      key: s.section,
      title: s.titleCyrillic,
      sheet: s.sheet,
      records: s.recordCount,
      physicalRows: s.physicalRowCount,
      columns: s.columnCount,
      filledColumns: s.filledColumnCount,
      emptyColumns: s.emptyColumnCount,
    })),
    byLawyer: d.byLawyer.map((l) => ({
      key: l.lawyer,
      label: l.lawyerCyrillic,
      cases: l.cases,
    })),
    byCourt: d.byCourt.map((c) => ({
      key: c.court,
      label: c.courtCyrillic,
      cases: c.cases,
    })),
    cases,
    claims,
    reviews,
    caseFlow: buildCaseFlow(cases),
    // Merge фарқи бўлим бўйича олинади: «10 ёзув, 16 физик қатор» — айнан шу
    // варақнинг ҳолати, учала варақнинг йиғиндиси эмас.
    reviewFlow: buildReviewFlow(reviews, reviewsQ.physicalRows - reviewsQ.records),
    quality,
  };
}
