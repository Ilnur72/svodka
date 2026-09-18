import type {
  ProcurementPeriodKind,
  StateProcurementDashboard,
  StateProcurementFact,
} from "../../api/types";

/**
 * «Давлат харидлари 2025–2026» — `/state-procurement/dashboard` жавобидан
 * панел кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `Давлат Харидлари_2025_2026.xlsx`, ягона варақ `Харидлар маълумоти`.
 * Маълумот LONG форматда: битта факт = `(харид тури × давр слоти)`,
 * **10 тур × 8 слот = 80 факт**. Устига «Жами харидлар:» қатори — яна 8 та,
 * лекин улар `facts` да ЭМАС, алоҳида `totalRow` да.
 *
 * ═══ Йиғинди қатори икки марта ҳисобланмайди ════════════════════════════
 *
 * `production-report` даги `isTotal` билан айнан бир хил мантиқ: «Жами
 * харидлар:» қатори пастдаги қаторларнинг СУММАСИ ва ҳеч қандай ҳисобга
 * қўшилмайди. У панелда ЭТАЛОН сифатида, ҳисобланган йиғиндининг ЁНИДА
 * турадиган алоҳида блокда кўрсатилади — тенг бўлмаган жойда ҳақиқат
 * кўринади, тенглаштириб қўйилмайди.
 *
 * ⚠️ «Умумий» давр слотлари (`2025-TOTAL`, `2026-TOTAL`) ҳам чоракларнинг
 * йиғиндиси. Шунинг учун ҳар қандай ҳисобда фақат `quarter` слотлари
 * қўшилади — акс ҳолда ҳамма сон икки баробар чиқарди.
 *
 * ═══ `null` ≠ 0 ва ≠ «устун йўқ» ════════════════════════════════════════
 *
 * Уч ҳолат учта ХИЛ маънога эга ва улар аралаштирилмайди:
 *
 *   `null` + устун бор  → манбада кўрсатилмаган («маълумот йўқ»);
 *   `0`                 → ҳақиқий нол (ҳеч нарса харид қилинмаган);
 *   `hasTmbColumn:false`→ бу давр учун устун манбада УМУМАН ЙЎҚ.
 *
 * Учинчисини иккинчисига қўшиш ТМБ келажакда тўлдирилганда ҳам ҳеч нарса
 * ўзгармагандек кўрсатарди.
 *
 * ═══ Манба тузатилмайди ═════════════════════════════════════════════════
 *
 * Ёлғон «млрд сум» ёрлиғи, аномал катак (`G14 = 634 990`), файлнинг ўз
 * йиғиндисидаги номувофиқлик — ҳаммаси **манбадагидек** қолади. Адаптер
 * қийматни қайта шкалаламайди ва йиғиндини қайта ёзмайди, фақат белгини
 * ўзи билан олиб юради.
 *
 * ═══ Матн — КИРИЛЛ ══════════════════════════════════════════════════════
 *
 * API матн майдонларини ЛОТИН ёзувида беради, кириллчаси эса `*Cyrillic`
 * жуфтида — бу ерда ДОИМ кириллчаси олинади. Ягона истисно
 * `unitConflicts[].evidence[].purchaseTypeName`: унинг кириллча жуфти ЙЎҚ,
 * шунинг учун у `purchaseTypes` ва `totalRow` дан ясалган харита орқали
 * кириллга қайтарилади.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "маълумот йўқ";

/** Устуннинг ўзи манбада мавжуд бўлмаган ҳолат — «бўш» дан БОШҚА нарса. */
export const NO_COLUMN = "устун манбада йўқ";

/** Кўрсаткич номи — кирилл. Манбадаги сарлавҳалар билан бир хил атама. */
export const MEASURE_LABEL: Record<"count" | "amount" | "approvedTmb", string> = {
  count: "сони",
  amount: "шартнома суммаси",
  approvedTmb: "тасдиқланган ТМБ",
};

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Давр слотининг тўлиқ ёрлиғи: «2025 йил · I чорак» / «2025 йил умумий».
 *
 * ⚠️ `labelCyrillic` манбадагидек келади ва `2025-TOTAL` да охирида ПРОБЕЛ
 * бор — у шу ерда кесилади. Бу маълумотни ўзгартириш эмас: манбадаги хом
 * шакл API'да сақланиб қолади, кесилгани фақат экрандаги ёрлиқ.
 */
const slotLabel = (label: string, quarter: string | null): string => {
  const base = label.trim();
  const q = quarter === null ? null : quarter.trim();
  return q ? `${base} · ${q}` : base;
};

/** Диаграмма ўқи учун ихчам ёрлиқ: «2025 I чорак» / «2025 умумий». */
const slotShort = (year: number, kind: ProcurementPeriodKind, quarter: string | null): string =>
  kind === "total" ? `${year} умумий` : `${year} ${(quarter ?? "").trim()}`.trim();

/**
 * Йиғинди, лекин «биронта қиймат йўқ» ҳолати нолдан ажратилади: бирорта ҳам
 * сон бўлмаса `null` қайтади. Бэкенддаги `sumOrNull` билан бир хил мантиқ —
 * «0» билан «кўрсатилмаган» экранда бир хил кўринмаслиги учун.
 */
function sumOrNull(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  // Сузувчи нуқта шовқини йиғилиб кетмасин — 5 хонада қотирилади (манбадаги
  // энг узун каср 5 хонали: 466115.14549).
  return Number(nums.reduce((s, v) => s + v, 0).toFixed(5));
}

/**
 * Иккита қиймат «мос келди» дейиш мумкинми.
 *
 * ⚠️ `null` фақат `null` га мос келади: «кўрсатилмаган» ва «нол» бир хил
 * деб қаралса, манбадаги энг қизиқ номувофиқлик (Тендер 2026: чораклар
 * БЎШ, умумий слотда эса 0 деб эълон қилинган) умуман кўринмасди.
 *
 * Сузувчи нуқта учун кичик толеранс — бэкенддаги `byPeriod.matches` билан
 * бир хил чегара (0.001).
 */
const same = (a: number | null, b: number | null): boolean => {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= 0.001;
};

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

/** Битта харид тури × битта давр слоти. */
export interface ProcSlot {
  key: string;
  /** Давр калити (`2025-Q1` … `2026-TOTAL`) — гуруҳлаш учун. */
  periodKey: string;
  /** «2025 йил · I чорак» */
  label: string;
  /** «2025 I чорак» — диаграмма ўқи учун. */
  short: string;
  year: number;
  /** ⚠️ `total` — чораклар йиғиндиси, ҳисобга қўшилмайди. */
  kind: ProcurementPeriodKind;

  /** ⚠️ `null` — кўрсатилмаган, `0` — нол. */
  count: number | null;
  /** `true` — манбада катак МАТН эди (файлнинг ўз `SUM()` и уни ўтказиб юборган). */
  countWasText: boolean;
  countRawText: string | null;

  /** ХОМ қиймат — қайта шкалаланмаган. */
  amount: number | null;
  /** Манбадаги сарлавҳа — АЙНАН, имлоси билан. */
  amountUnitLabel: string;
  /** ⚠️ `true` — сарлавҳадаги бирлик қийматга ЗИД. */
  amountUnitSuspect: boolean;

  /** ⚠️ Ҳозирча ҳамма жойда `null`. */
  tmb: number | null;
  tmbUnitLabel: string | null;
  /** ⚠️ `false` — устун МАНБАДА ЙЎҚ; `true` + `tmb === null` — устун бор, бўш. */
  hasTmbColumn: boolean;

  /** Excel устун ҳарфлари — манбадаги катакни топиш учун. */
  columns: { count: string; amount: string; tmb: string | null } | null;
  excelRow: number | null;
}

/** «Умумий» слот ўз чоракларига тенг эмаслиги. */
export interface ProcSlotMismatch {
  key: string;
  /** Тур калити — гуруҳлаш учун (ном бўйича эмас: ном такрорланиши мумкин). */
  typeKey: string;
  /** КИРИЛЛ */
  type: string;
  /** «2026 йил умумий» */
  period: string;
  /** «сони» / «шартнома суммаси» */
  measure: string;
  /** Қайси чораклардан йиғилиши кутилади — ёрлиқлар. */
  parts: string[];
  /** Чораклардан ҲИСОБЛАНГАН. */
  computed: number | null;
  /** Умумий слотда ЭЪЛОН ҚИЛИНГАН. */
  declared: number | null;
  diff: number | null;
}

/**
 * Битта тур × битта йил: чораклардан ҲИСОБЛАНГАН ва манбанинг «умумий»
 * слотида ЭЪЛОН ҚИЛИНГАН қийматлар ёнма-ён.
 *
 * ⚠️ Бу — топшириқнинг асосий талаби: ўз йиғиндимизни манбанинг ўз
 * йиғиндиси билан СОЛИШТИРИБ кўрсатиш. Тенг бўлмаган жойда экранда
 * иккаласи ҳам қолади, тенглаштириб қўйилмайди.
 */
export interface ProcYearCheck {
  key: string;
  year: number;
  /** Умумий слотнинг калити (`2025-TOTAL`). */
  totalKey: string;
  /** Қайси чораклар қўшилгани — ёрлиқлар. */
  parts: string[];
  computedCount: number | null;
  computedAmount: number | null;
  declaredCount: number | null;
  declaredAmount: number | null;
  countMatches: boolean;
  amountMatches: boolean;
}

export interface ProcType {
  key: string;
  /** Манбадаги `Т/р` (1…10). */
  no: number | null;
  /** КИРИЛЛ */
  name: string;
  excelRow: number | null;
  /** 8 та слот, манба тартибида. */
  slots: ProcSlot[];
  /** Йил кесимида «ҳисобланган ↔ манбада эълон қилинган» солиштируви. */
  years: ProcYearCheck[];
  /** ⚠️ Фақат ЧОРАК слотлари — умумий слотлар қўшилмайди. */
  quartersCount: number | null;
  quartersAmount: number | null;
  /** Манбада эълон қилинган умумий слотлар — эталон. */
  declared2025Count: number | null;
  declared2025Amount: number | null;
  declared2026Count: number | null;
  declared2026Amount: number | null;
  /** Шу тур бўйича «умумий ↔ чораклар» номувофиқликлари. */
  slotMismatches: ProcSlotMismatch[];
  /** `true` — шу турда аномал катта сумма топилган. */
  hasOutlier: boolean;
}

export interface ProcPeriod {
  key: string;
  label: string;
  short: string;
  /**
   * Манбадаги давр сарлавҳаси — чораксиз («2026 йил 1 ярим йиллик»).
   *
   * ⚠️ Бу ЁРЛИҚ ЭМАС, МАЪЛУМОТ: манбанинг ўзи 2026 нинг тўлиқ йил эмаслигини
   * шу сарлавҳада айтади. Панел уни 2025 билан ёнма-ён қўйганда кўрсатиши
   * ШАРТ — акс ҳолда «харидлар камайди» деган ёлғон хулоса чиқарди.
   */
  base: string;
  /** Чорак ёрлиғи — «I чорак»; «умумий» слотларда `null`. */
  quarterLabel: string | null;
  year: number;
  kind: ProcurementPeriodKind;
  /** Харид турларидан ҲИСОБЛАНГАН. */
  computedCount: number | null;
  computedAmount: number | null;
  /** «Жами харидлар:» қаторида ЭЪЛОН ҚИЛИНГАН. */
  declaredCount: number | null;
  declaredAmount: number | null;
  matches: boolean;
  /** Нечта турда кўрсаткич кўрсатилган (`null` бўлмаган). */
  typesWithCount: number;
  typesWithAmount: number;
  amountUnitLabel: string;
  amountUnitSuspect: boolean;
  hasTmbColumn: boolean;
  columns: { count: string; amount: string; tmb: string | null };
}

/**
 * Қатордаги қолган чораклардан кескин ажралиб турган сумма.
 *
 * ⚠️ Бу тур АЛОҲИДА ном олган, чунки у иккита жойда керак: «Маълумот
 * сифати» рўйхатида ВА йил кўрсаткичининг ЁНИДА. Иккинчиси мажбурий —
 * аномал катак йил суммасининг ярмидан кўпини ташкил қилиши мумкин, ва
 * бундай сонни огоҳлантиришсиз кўрсатиш фойдаланувчини чалғитарди.
 */
export interface ProcOutlier {
  key: string;
  /** КИРИЛЛ */
  type: string;
  /** Давр ёрлиғи — «2025 йил · II чорак». */
  period: string;
  /**
   * Давр калити — аномалия қайси йил кўрсаткичига тегишли эканини шу
   * белгилайди.
   *
   * ⚠️ Йил АЛОҲИДА майдон сифатида сақланмайди: у метамаълумотдан
   * қидирилса, топилмаган ҳолат учун «йил 0» каби сохта қиймат керак
   * бўларди ва бундай аномалия жимгина ҳеч бир йилга тушмай қоларди.
   * Калит бўйича мослаштириш эса аниқ: мос келмаса — аномалия йил
   * карточкасида кўринмайди, лекин «Маълумот сифати» рўйхатида ТЎЛИҚ
   * қолади, яъни ҳеч нарса йўқолмайди.
   */
  periodKey: string;
  column: string;
  excelRow: number | null;
  value: number;
  medianOfOthers: number;
  ratio: number;
  /** Қийматнинг ЎЗ ДАВРИ йиғиндисидаги улуши, 0…1. */
  shareOfPeriod: number | null;
  reason: string;
}

/**
 * Битта йилнинг якуний кўрсаткичи — бўлимнинг БОШ рақами.
 *
 * ⚠️ Фақат `quarter` слотларидан йиғилади. Манбанинг «умумий» слоти ва
 * «Жами харидлар:» қатори бу ерга ҚЎШИЛМАЙДИ — улар аллақачон
 * чоракларнинг суммаси (`production-report` даги `isTotal` мантиғи).
 * Манбанинг ўз сони эса `declared*` да, ЁНМА-ЁН текшириш учун туради.
 */
export interface ProcYearTotal {
  key: string;
  year: number;
  /** Манбадаги давр сарлавҳаси — «2025 йил» / «2026 йил 1 ярим йиллик». */
  sourceLabel: string;
  /** Шу йилда манбада нечта ЧОРАК сloti бор. */
  quarters: number;
  /** Чорак ёрлиқлари — «I чорак», «II чорак»… */
  quarterLabels: string[];
  /**
   * `true` — йил ТЎЛИҚ ЭМАС (4 чоракдан кам).
   * ⚠️ Бундай йилни тўлиқ йил билан ёнма-ён қўйиш нотўғри таққослаш:
   * панел буни ёзиб қўйиши шарт.
   */
  partial: boolean;

  /** Чораклардан ҲИСОБЛАНГАН — бош рақам. */
  count: number | null;
  amount: number | null;
  /** Манбанинг ўз «умумий» слотида ЭЪЛОН ҚИЛИНГАН — эталон. */
  declaredCount: number | null;
  declaredAmount: number | null;
  countMatches: boolean;
  amountMatches: boolean;

  /** Шу йилга тушган аномал катаклар. */
  outliers: ProcOutlier[];
  /**
   * Аномал катаклар йиғиндисининг ЙИЛ суммасидаги улуши, 0…1.
   * `null` — аномалия йўқ ёки сумма кўрсатилмаган.
   */
  outlierShare: number | null;
  /** `true` — шу йилнинг бирор слотида сумма ёрлиғи ШУБҲАЛИ. */
  unitSuspect: boolean;
}

export interface ProcQuality {
  /**
   * Жами нечта солиштирув қилинган (8 давр × 2 кўрсаткич = 16).
   * ⚠️ Панел «N устундан M таси мос келди» деганини шу ердан ҳисоблайди —
   * қаттиқ ёзилган сон экранда эскириб қолмаслиги учун.
   */
  totalChecksCount: number;
  /** Файлнинг ўз йиғинди қатори қаторлар йиғиндисига мос келмаган устунлар. */
  totalMismatches: Array<{
    key: string;
    period: string;
    measure: string;
    column: string;
    computed: number | null;
    declared: number | null;
    diff: number | null;
    reason: string | null;
  }>;
  slotMismatches: ProcSlotMismatch[];
  /** Манбада МАВЖУД, лекин бутунлай бўш устунлар. */
  emptyColumns: Array<{
    key: string;
    column: string;
    header: string;
    period: string;
    measure: string;
    rowsChecked: number;
  }>;
  unitConflicts: Array<{
    key: string;
    period: string;
    column: string;
    header: string;
    declaredUnit: string;
    observedUnit: string;
    reason: string;
    /** Арифметик далил — тур бўйича «умумий ↔ чораклар йиғиндиси». */
    evidence: Array<{
      key: string;
      /** КИРИЛЛ — лотин номдан харита орқали қайтарилган. */
      type: string;
      declared: number | null;
      quartersSum: number | null;
      equal: boolean;
    }>;
  }>;
  /** `сони` катаги МАТН бўлган катаклар — йиғинди фарқининг сабаби. */
  textCountCells: Array<{
    key: string;
    excelRow: number | null;
    column: string;
    period: string;
    type: string;
    value: string;
    parsed: number | null;
  }>;
  outliers: ProcOutlier[];
  /** ⚠️ `0` қийматли катаклар БУ ЕРГА КИРМАЙДИ. */
  missingCells: Array<{
    key: string;
    period: string;
    measure: string;
    missing: number;
    total: number;
  }>;
  warnings: string[];
  /** Барча белгиларнинг сони — бўлим сарлавҳасидаги ҳисоб учун. */
  issues: number;
}

export interface ProcView {
  source: string;
  sheet: string;
  importedAt: string | null;
  totals: {
    facts: number;
    totalFacts: number;
    types: number;
    periods: number;
    /** ⚠️ Фақат ЧОРАК слотлари. */
    quartersCount: number | null;
    quartersAmount: number | null;
    amountUnitLabel: string;
  };
  /**
   * Йил кесимидаги якуний кўрсаткичлар — бўлимнинг БОШ рақамлари.
   * Манба тартибида (2025, сўнг 2026).
   */
  years: ProcYearTotal[];
  /** 8 давр слоти — 6 чорак + 2 умумий. */
  periods: ProcPeriod[];
  /** Фақат `quarter` слотлари — диаграммалар шулардан чизилади. */
  quarters: ProcPeriod[];
  /** 10 харид тури, манба тартибида. */
  types: ProcType[];
  /**
   * «Жами харидлар:» қатори — 8 та слот.
   * ⚠️ Бу ЭТАЛОН, ҳисобланган йиғиндига ҚЎШИЛМАЙДИ.
   */
  totalRow: ProcSlot[];
  quality: ProcQuality;
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Йил кесимида «чораклар йиғиндиси ↔ манбанинг умумий слоти».
 *
 * ⚠️ Йиғинди ФАҚАТ `quarter` слотларидан олинади: «умумий» слот аллақачон
 * чоракларнинг суммаси ва унга қўшилса сон икки баробар чиқарди
 * (`production-report` даги `isTotal` билан бир хил мантиқ).
 */
function yearChecks(typeKey: string, slots: ProcSlot[]): ProcYearCheck[] {
  const years = [...new Set(slots.map((s) => s.year))].sort((a, b) => a - b);

  return years.flatMap<ProcYearCheck>((year) => {
    const total = slots.find((s) => s.year === year && s.kind === "total");
    if (total === undefined) return [];
    const parts = slots.filter((s) => s.year === year && s.kind === "quarter");

    const computedCount = sumOrNull(parts.map((s) => s.count));
    const computedAmount = sumOrNull(parts.map((s) => s.amount));
    return [
      {
        key: `${typeKey}-${year}`,
        year,
        totalKey: total.periodKey,
        parts: parts.map((s) => s.label),
        computedCount,
        computedAmount,
        declaredCount: total.count,
        declaredAmount: total.amount,
        countMatches: same(computedCount, total.count),
        amountMatches: same(computedAmount, total.amount),
      },
    ];
  });
}

/**
 * Йил кесимидаги якуний кўрсаткич — бўлимнинг бош рақами.
 *
 * ⚠️ Йиғинди ФАҚАТ `quarter` слотларидан олинади. Манбанинг «умумий» слоти
 * (`2025-TOTAL`) ва «Жами харидлар:» қатори қўшилмайди — улар аллақачон
 * чоракларнинг суммаси. Манбанинг ўз сони `declared*` да ёнма-ён туради:
 * фарқ чиқса иккаласи ҳам экранда қолади, тенглаштирилмайди.
 */
function yearTotals(
  periods: ProcPeriod[],
  types: ProcType[],
  totalRow: ProcSlot[],
  outliers: ProcOutlier[],
): ProcYearTotal[] {
  const years = [...new Set(periods.map((p) => p.year))].sort((a, b) => a - b);

  return years.map((year) => {
    const quarters = periods.filter((p) => p.year === year && p.kind === "quarter");
    const total = totalRow.find((s) => s.year === year && s.kind === "total") ?? null;
    // Шу йилга тегишли БАРЧА давр калитлари — аномалияни йилга боғлаш учун.
    const ownKeys = new Set(periods.filter((p) => p.year === year).map((p) => p.key));

    // Йиғинди ТУР қаторларининг чорак слотларидан — давр кесимидан эмас:
    // манба қайси йўл билан ўқилмасин, натижа бир хил чиқиши керак.
    const cells = types.flatMap((t) =>
      t.slots.filter((s) => s.year === year && s.kind === "quarter"),
    );
    const count = sumOrNull(cells.map((s) => s.count));
    const amount = sumOrNull(cells.map((s) => s.amount));

    const own = outliers.filter((o) => ownKeys.has(o.periodKey));
    const outlierSum = own.reduce((s, o) => s + o.value, 0);

    return {
      key: String(year),
      year,
      // Манбанинг ЎЗ сарлавҳаси — «2026 йил 1 ярим йиллик» айнан шу ерда
      // йилнинг тўлиқ эмаслигини айтади.
      sourceLabel: quarters[0]?.base ?? String(year),
      quarters: quarters.length,
      // Йил карточкасининг ичида йил АЛЛАҚАЧОН сарлавҳада турибди — ёрлиқда
      // фақат чорак қолади («I чорак»), такрор бўлмасин.
      quarterLabels: quarters.map((p) => p.quarterLabel ?? p.short),
      partial: quarters.length < 4,
      count,
      amount,
      declaredCount: total ? total.count : null,
      declaredAmount: total ? total.amount : null,
      countMatches: same(count, total ? total.count : null),
      amountMatches: same(amount, total ? total.amount : null),
      outliers: own,
      outlierShare: own.length === 0 || amount === null || amount === 0 ? null : outlierSum / amount,
      unitSuspect: periods.some((p) => p.year === year && p.amountUnitSuspect),
    };
  });
}

export function procurementView(d: StateProcurementDashboard): ProcView {
  const periodMeta = new Map(d.periods.map((p) => [p.key, p]));

  const labelOf = (periodKey: string): string => {
    const p = periodMeta.get(periodKey);
    return p ? slotLabel(p.labelCyrillic, p.quarterLabelCyrillic) : periodKey;
  };

  // ⚠️ `evidence[].purchaseTypeName` ЛОТИН ва кириллча жуфти йўқ — харита
  // турлар рўйхатидан ва йиғинди қаторидан ясалади («Jami xaridlar:» ҳам
  // далилда иштирок этади).
  const cyrOfLatin = new Map<string, string>();
  for (const t of d.purchaseTypes) cyrOfLatin.set(t.name, t.nameCyrillic);
  for (const f of d.totalRow) cyrOfLatin.set(f.purchaseTypeName, f.purchaseTypeNameCyrillic);
  const cyr = (latin: string): string => cyrOfLatin.get(latin) ?? latin;

  const toSlot = (f: StateProcurementFact): ProcSlot => {
    const meta = periodMeta.get(f.periodKey);
    return {
      key: f.key,
      periodKey: f.periodKey,
      label: slotLabel(f.periodLabelCyrillic, f.quarterLabelCyrillic),
      short: slotShort(f.periodYear, f.periodKind, f.quarterLabelCyrillic),
      year: f.periodYear,
      kind: f.periodKind,
      count: f.count,
      countWasText: f.countWasText,
      countRawText: f.countRawText,
      amount: f.contractAmount,
      amountUnitLabel: f.amountUnitLabel,
      amountUnitSuspect: f.amountUnitSuspect,
      tmb: f.approvedTmb,
      tmbUnitLabel: f.tmbUnitLabel,
      hasTmbColumn: f.hasApprovedTmbColumn,
      columns: f.sourceColumns ?? meta?.columnLetters ?? null,
      excelRow: f.excelRow,
    };
  };

  const slotMismatch = (
    c: StateProcurementDashboard["dataQuality"]["totalSlotMismatches"][number],
    i: number,
  ): ProcSlotMismatch => ({
    key: `${c.purchaseTypeKey}-${c.periodKey}-${c.measure}-${i}`,
    typeKey: c.purchaseTypeKey,
    type: c.purchaseTypeNameCyrillic,
    period: labelOf(c.periodKey),
    measure: MEASURE_LABEL[c.measure],
    parts: c.partKeys.map(labelOf),
    computed: c.computed,
    declared: c.declared,
    diff: c.diff,
  });

  const allSlotMismatches = d.dataQuality.totalSlotMismatches.map(slotMismatch);
  const outlierTypes = new Set(d.dataQuality.amountOutliers.map((o) => o.purchaseTypeKey));

  const factsOf = new Map<string, StateProcurementFact[]>();
  for (const f of d.facts) {
    const list = factsOf.get(f.purchaseTypeKey);
    if (list) list.push(f);
    else factsOf.set(f.purchaseTypeKey, [f]);
  }
  const statOf = new Map(d.byType.map((t) => [t.purchaseTypeKey, t]));

  const types: ProcType[] = d.purchaseTypes.map((t) => {
    const stat = statOf.get(t.key) ?? null;
    // Слотлар манбадаги давр тартибида қўйилади (фактнинг ўз тартиби эмас):
    // ҳар бир карточкада қаторлар бир хил жойда туриши учун.
    const own = factsOf.get(t.key) ?? [];
    const byPeriod = new Map(own.map((f) => [f.periodKey, f]));
    const slots = d.periods
      .map((p) => byPeriod.get(p.key))
      .filter((f): f is StateProcurementFact => f !== undefined)
      .map(toSlot);

    return {
      key: t.key,
      no: t.no,
      name: t.nameCyrillic,
      excelRow: t.excelRow,
      slots,
      years: yearChecks(t.key, slots),
      quartersCount: stat ? stat.quartersCount : null,
      quartersAmount: stat ? stat.quartersAmount : null,
      declared2025Count: stat ? stat.declared2025Count : null,
      declared2025Amount: stat ? stat.declared2025Amount : null,
      declared2026Count: stat ? stat.declared2026Count : null,
      declared2026Amount: stat ? stat.declared2026Amount : null,
      slotMismatches: allSlotMismatches.filter((m) => m.typeKey === t.key),
      hasOutlier: outlierTypes.has(t.key),
    };
  });

  const statByPeriod = new Map(d.byPeriod.map((p) => [p.periodKey, p]));
  const periods: ProcPeriod[] = d.periods.map((p) => {
    const s = statByPeriod.get(p.key) ?? null;
    return {
      key: p.key,
      label: slotLabel(p.labelCyrillic, p.quarterLabelCyrillic),
      short: slotShort(p.year, p.kind, p.quarterLabelCyrillic),
      base: p.labelCyrillic.trim(),
      quarterLabel: p.quarterLabelCyrillic === null ? null : p.quarterLabelCyrillic.trim(),
      year: p.year,
      kind: p.kind,
      computedCount: s ? s.computedCount : null,
      computedAmount: s ? s.computedAmount : null,
      declaredCount: s ? s.declaredCount : null,
      declaredAmount: s ? s.declaredAmount : null,
      matches: s ? s.matches : true,
      typesWithCount: s ? s.typesWithCount : 0,
      typesWithAmount: s ? s.typesWithAmount : 0,
      amountUnitLabel: p.amountUnitLabel,
      amountUnitSuspect: p.amountUnitSuspect,
      hasTmbColumn: p.hasApprovedTmbColumn,
      columns: p.columnLetters,
    };
  });

  const q = d.dataQuality;
  const quality: ProcQuality = {
    totalChecksCount: q.totalChecks.length,
    totalMismatches: q.totalMismatches.map((c, i) => ({
      key: `${c.periodKey}-${c.measure}-${i}`,
      period: labelOf(c.periodKey),
      measure: MEASURE_LABEL[c.measure],
      column: c.column,
      computed: c.computed,
      declared: c.declared,
      diff: c.diff,
      reason: c.reason,
    })),
    slotMismatches: allSlotMismatches,
    emptyColumns: q.emptyColumns.map((c, i) => ({
      key: `${c.periodKey}-${c.column}-${i}`,
      column: c.column,
      header: c.header,
      period: labelOf(c.periodKey),
      measure: MEASURE_LABEL[c.measure],
      rowsChecked: c.rowsChecked,
    })),
    unitConflicts: q.unitConflicts.map((u, i) => ({
      key: `${u.periodKey}-${u.column}-${i}`,
      period: labelOf(u.periodKey),
      column: u.column,
      header: u.header,
      declaredUnit: u.declaredUnit,
      observedUnit: u.observedUnit,
      reason: u.reason,
      evidence: u.evidence.map((e, j) => ({
        key: `${u.periodKey}-ev-${j}`,
        type: cyr(e.purchaseTypeName),
        declared: e.declared,
        quartersSum: e.quartersSum,
        equal: e.equal,
      })),
    })),
    textCountCells: q.textCountCells.map((c, i) => ({
      key: `${c.periodKey}-${c.column}-${i}`,
      excelRow: c.excelRow,
      column: c.column,
      period: labelOf(c.periodKey),
      type: c.purchaseTypeNameCyrillic,
      value: c.value,
      parsed: c.parsed,
    })),
    outliers: q.amountOutliers.map((o, i) => ({
      key: `${o.purchaseTypeKey}-${o.periodKey}-${i}`,
      type: o.purchaseTypeNameCyrillic,
      period: labelOf(o.periodKey),
      periodKey: o.periodKey,
      column: o.column,
      excelRow: o.excelRow,
      value: o.value,
      medianOfOthers: o.medianOfOthers,
      ratio: o.ratio,
      shareOfPeriod: o.shareOfPeriod,
      reason: o.reason,
    })),
    missingCells: q.missingCells.map((m, i) => ({
      key: `${m.periodKey}-${m.measure}-${i}`,
      period: labelOf(m.periodKey),
      measure: MEASURE_LABEL[m.measure],
      missing: m.missing,
      total: m.total,
    })),
    warnings: q.warnings,
    issues: 0,
  };
  quality.issues =
    quality.totalMismatches.length +
    quality.slotMismatches.length +
    quality.emptyColumns.length +
    quality.unitConflicts.length +
    quality.textCountCells.length +
    quality.outliers.length +
    quality.warnings.length;

  // «Жами харидлар:» қатори — манба тартибида, БИР МАРТА ясалади: у ҳам
  // экранда эталон сифатида, ҳам йил кўрсаткичини текширишда керак.
  const totalSlots = d.periods
    .map((p) => d.totalRow.find((f) => f.periodKey === p.key))
    .filter((f): f is StateProcurementFact => f !== undefined)
    .map(toSlot);

  return {
    source: d.meta.source,
    sheet: d.meta.sheet,
    importedAt: d.meta.importedAt,
    totals: {
      facts: d.totals.facts,
      totalFacts: d.totals.totalFacts,
      types: d.totals.purchaseTypes,
      periods: d.totals.periods,
      quartersCount: d.totals.quartersCount,
      quartersAmount: d.totals.quartersAmount,
      amountUnitLabel: d.totals.amountUnitLabel,
    },
    years: yearTotals(periods, types, totalSlots, quality.outliers),
    periods,
    quarters: periods.filter((p) => p.kind === "quarter"),
    types,
    totalRow: totalSlots,
    quality,
  };
}
