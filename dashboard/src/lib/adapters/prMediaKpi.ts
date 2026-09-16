import type {
  PrMediaKpiCadencePeriod,
  PrMediaKpiDashboard,
  PrMediaKpiItem,
  PrMediaKpiMismatch,
} from "../../api/types";
import type { TokenName } from "../theme";

/**
 * «PR Media KPI — yillik reja» — `/pr-media-kpi/dashboard` жавобидан панел
 * кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `PR_Media_KPI.xlsx`, «Yillik xulosa» варағи: 3 категория, 11 кўрсаткич.
 * Бу вақт қатори эмас, битта ҳужжатнинг қотирилган ҳолати — шунинг учун
 * бўлим юқоридаги давр танлагичига боғланмаган.
 *
 * ═══ Бу РЕЖА ҳужжати — факт ЙЎҚ ═════════════════════════════════════════
 *
 * Манбада фақат мақсадлар бор. «Нечтаси бажарилди» деган маълумот ҳеч қаерда
 * йўқ, шунинг учун бу файлда «факт», «бажарилиш фоизи», «қолдиқ» тушунчаси
 * умуман йўқ ва бўлмайди ҳам: солиштириш учун иккинчи манба мавжуд эмас.
 *
 * Шу сабабли бу ерда ҳисобланадиган ягона нисбат — `cadenceCount` дан
 * келиб чиққан йиллик сон (`yearlyComputed`, бэкенд беради) ва унинг
 * манбадаги ёзув билан фарқи. Бу режанинг ўз ичидаги арифметика, бажарилиш
 * эмас.
 *
 * ═══ Йиғинди ҳамма жойда ҚЎШИЛАВЕРМАЙДИ ═════════════════════════════════
 *
 * Бэкенддаги `categories[].yearlyTotal` — `yearlyTargetNum` ларнинг оддий
 * йиғиндиси ва унинг ўлчови АРАЛАШ бўлиши мумкин. «Ijtimoiy tarmoqlar» да у
 * 1532: ичида постлар сони (96 + 96 + 240) билан бирга Telegram'нинг
 * обуначилар кўрсаткичи (1100) ҳам бор.
 *
 * Шунинг учун бу ерда ҳар бир қаторга `comparable` байроғи қўйилади ва ҳар
 * бир категория учун иккита алоҳида сон сақланади:
 *  · `yearlyTotal`  — бэкенддаги йиғинди, ЎЗГАРТИРИЛМАЙДИ (яширилмайди ҳам);
 *  · `countTotal`   — фақат «та» ўлчовидаги қаторлар йиғиндиси.
 * Экранда иккаласи ҳам, фарқининг сабаби ҳам очиқ ёзилади; категориялараро
 * диаграмма эса умуман чизилмайди.
 *
 * ═══ `null` нол эмас ════════════════════════════════════════════════════
 *
 * Telegram: `cadenceText` = «Qamrov 30%». Ундаги 30 — қамров фоизи, даврий
 * сон эмас, шунинг учун `cadenceCount` ва `yearlyComputed` = `null`. Бу
 * қатор диаграммага тушмайди (ўлчови бошқа) ва йиғиндидан жимгина
 * ташланмайди — экранда ўз матни билан қолади.
 *
 * ═══ Матндаги «+» йўқолмайди ════════════════════════════════════════════
 *
 * «240+» дан сон 240 ажратилади, лекин «камида» маъноси фақат матнда қолади.
 * Диаграмма сон билан чизилади, шунинг учун `atLeast` байроғи сақланади ва
 * экранда «устунда кўринмайди» деб ёзилади; жадвалда эса матннинг ўзи.
 *
 * ═══ Маълумот лотин ёзувида ═════════════════════════════════════════════
 *
 * `indicator`, `categoryName`, `cadenceText`, `yearlyTargetText`, `growthText`
 * ва `title` манбадагича — лотин. Улар таржима ҳам, транслитерация ҳам
 * қилинмайди. Кирилл фақат интерфейс матнида (сарлавҳа, изоҳ, ўлчов сўзи).
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "—";

/** Йилдаги такрорланиш сони — `yearlyComputed` шу жадвал бўйича ҳисобланган. */
export const PERIODS_PER_YEAR: Record<PrMediaKpiCadencePeriod, number> = {
  month: 12,
  quarter: 4,
};

/** Давр бирлигининг номи — «4 чорак», «12 ой» деб ёзиш учун. */
export const PERIOD_UNIT: Record<PrMediaKpiCadencePeriod, string> = {
  month: "ой",
  quarter: "чорак",
};

/** Даврийликнинг ўқиладиган номи — плиткалар ва изоҳларда бир хил ёзилиши учун. */
export const PERIOD_LABEL: Record<PrMediaKpiCadencePeriod, string> = {
  month: "ҳар ой",
  quarter: "ҳар чоракда",
};

/**
 * Категория ранглари.
 *
 * Токен номи сақланади (тайёр ранг эмас), чунки у иккита турли жойда керак:
 * CSS'да `var(--s1)` кўринишида, Recharts'да эса `usePalette()` дан олинган
 * аниқ қиймат сифатида (диаграмма кутубхонаси `var(--x)` ни тушунмайди).
 *
 * Рўйхат айлана бўйича ишлатилади: манбага тўртинчи категория қўшилса ҳам
 * у рангсиз қолмайди ва `I`/`II`/`III` га қотириб қўйилмаган.
 */
const CATEGORY_TOKENS: readonly TokenName[] = ["s1", "s2", "s3", "s4", "s5", "s6"];

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface PrKpiRow {
  key: string;
  categoryNo: string;
  /** Лотин, манбадагича. */
  categoryName: string;
  /** Лотин, манбадагича. */
  indicator: string;
  /** Лотин, манбадагича: «Har oy 10 ta», «Qamrov 30%». */
  cadenceText: string;
  cadenceCount: number | null;
  cadencePeriod: PrMediaKpiCadencePeriod | null;
  /** Йилдаги такрорланиш (12 / 4); даврийлиги аниқланмаса `null`. */
  periodsPerYear: number | null;
  /** Лотин, манбадагича: «120 ta», «240+», «1100+». */
  yearlyTargetText: string;
  yearlyTargetNum: number | null;
  yearlyComputed: number | null;
  /**
   * Матнда «+» бор — «камида» маъноси.
   *
   * Сонга ўтганда бу маъно йўқолади («240+» → 240), шунинг учун байроқ
   * алоҳида сақланади: диаграммада устун ҳақиқий мақсаддан ПАСТ туради ва
   * буни экранда айтиш керак.
   */
  atLeast: boolean;
  /** Лотин, манбадагича: «Obunachilar +50%». */
  growthText: string | null;
  growthPercent: number | null;
  /** Бэкенддаги `mismatches[]` нинг шу қаторга тегишли ёзуви. */
  mismatch: PrMediaKpiMismatch | null;
  /**
   * Даврийлиги сонга айлантирилмаган (Telegram: «Qamrov 30%»).
   *
   * Шунда йиллик ҳисоб УМУМАН йўқ — нол эмас. Қатор экрандан чиқмайди,
   * фақат ҳисобга кирмайди.
   */
  cadenceUnresolved: boolean;
  /**
   * Йиллик мақсади даврий нашрлар СОНИ («та»), шунинг учун бошқа қаторлар
   * билан битта шкалага қўйилиши ва йиғиндига кириши мумкин.
   *
   * Мезон маълумотдан келиб чиқади, номга қотирилмаган: даврийлиги сон
   * билан берилган қаторнинг йиллик мақсади ҳам ўша саноқда бўлади. Агар
   * даврийлик сон эмас, фоиз билан ёзилган бўлса (Telegram — «Qamrov 30%»),
   * мақсаднинг ўлчови бошқа нарса (манбада — обуначилар) ва уни постлар
   * сони билан бир шкалага қўйиб бўлмайди.
   */
  comparable: boolean;
  /** Категория ранги — `CATEGORY_TOKENS` дан. */
  token: TokenName;
  sortOrder: number;
}

export interface PrKpiCategory {
  /** `I` / `II` / `III`. */
  no: string;
  /** Лотин, манбадагича. */
  name: string;
  /** Бэкенд ҳисоблаган кўрсаткичлар сони. */
  count: number;
  /** Шу категориянинг қаторлари — `sortOrder` бўйича. */
  rows: PrKpiRow[];
  /**
   * Бэкенддаги `yearlyTotal` — ЎЗГАРТИРИЛМАЙДИ.
   *
   * ⚠️ Ўлчови аралаш бўлиши мумкин (`mixedUnits` га қаранг). Шунга қарамай
   * яширилмайди: манбада шундай ва экранда нима экани ёзилади.
   */
  yearlyTotal: number | null;
  /**
   * Фақат «та» ўлчовидаги қаторлар йиғиндиси — категория ичида маънога эга
   * ягона жами. Биронта шундай қатор бўлмаса `null` (0 эмас).
   */
  countTotal: number | null;
  /** `yearlyTotal` га бошқа ўлчовдаги қатор қўшилганми. */
  mixedUnits: boolean;
  /** Аралашма ясаган қаторлар — экранда ном билан кўрсатилади. */
  mixedRows: PrKpiRow[];
  /** Ўсиш кўрсаткичи берилган қаторлар. */
  growthRows: PrKpiRow[];
  token: TokenName;
}

export interface PrMediaKpiView {
  /** Ҳужжат сарлавҳаси — манбадан, ўзгартирилмайди (лотин). */
  title: string;
  source: string;
  categories: PrKpiCategory[];
  /** Барча қаторлар — `sortOrder` бўйича. */
  rows: PrKpiRow[];
  /** Йиллик мақсади «та» бўлган қаторлар — диаграммага фақат шулар тушади. */
  comparable: PrKpiRow[];
  /** Ўлчови бошқа бўлгани учун диаграммадан чиққанлар — рўйхат билан кўрсатилади. */
  incomparable: PrKpiRow[];
  /** Мақсади «камида» маъносида берилган қаторлар (матнда «+»). */
  atLeastRows: PrKpiRow[];
  /** Арифметикаси мос келмаган қаторлар — бэкенддаги `mismatches[]` тартибида. */
  mismatches: PrKpiRow[];
  /**
   * Бэкенд номувофиқлик деб белгилаган, лекин қаторлар рўйхатидан топилмаган
   * ёзувлар.
   *
   * Ҳозирги маълумотда бундай ҳолат йўқ (бэкенд иккала рўйхатни ҳам айнан
   * бир массивдан ясайди), лекин у жимгина ташлаб кетилмайди: акс ҳолда
   * экрандаги номувофиқликлар сони API даги сондан кам бўлиб қоларди.
   */
  orphanMismatches: PrMediaKpiMismatch[];
  /** Ўсиш кўрсаткичи берилган қаторлар. */
  growth: PrKpiRow[];
  /** Даврийлик кесими — кўрсаткичлар сони бўйича (ҳаммаси «та»). */
  cadence: { month: number; quarter: number; unresolved: number };
  /** Йиллик сони ҳисобланган қаторлар сони. */
  computedCount: number;
  /** Йиғиндиси аралаш ўлчовли категориялар. */
  mixedCategories: PrKpiCategory[];
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Биронта сон бўлмаса `null` қайтаради — 0 эмас.
 *
 * «Мақсад нол» ва «мақсад сонга айлантирилмади» бир хил эмас; иккинчиси
 * экранда «—» бўлиб кўринади, биринчиси эса ҳақиқий нол бўларди.
 */
const sumOrNull = (values: Array<number | null>): number | null => {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((s, v) => s + v, 0);
};

/** Битта API қаторини панел қаторига айлантиради. */
function toRow(
  it: PrMediaKpiItem,
  token: TokenName,
  mismatch: PrMediaKpiMismatch | null,
): PrKpiRow {
  // Даврийлик «сон + давр» жуфти бўлсагина ҳисобга яроқли. Иккисидан бири
  // етишмаса йиллик сон ҳисобланмайди — бэкенд ҳам айнан шундай қилган.
  const cadenceUnresolved = it.cadenceCount === null || it.cadencePeriod === null;

  return {
    key: it.key,
    categoryNo: it.categoryNo,
    categoryName: it.categoryName,
    indicator: it.indicator,
    cadenceText: it.cadenceText,
    cadenceCount: it.cadenceCount,
    cadencePeriod: it.cadencePeriod,
    periodsPerYear: it.cadencePeriod === null ? null : PERIODS_PER_YEAR[it.cadencePeriod],
    yearlyTargetText: it.yearlyTargetText,
    yearlyTargetNum: it.yearlyTargetNum,
    yearlyComputed: it.yearlyComputed,
    atLeast: it.yearlyTargetText.includes("+"),
    growthText: it.growthText,
    growthPercent: it.growthPercent,
    mismatch,
    cadenceUnresolved,
    // Диаграммага тушиш учун иккита шарт: ўлчови «та» бўлиши ва соннинг
    // ўзи мавжуд бўлиши. Иккинчиси усиз устун чизиб бўлмасди.
    comparable: !cadenceUnresolved && it.yearlyTargetNum !== null,
    token,
    sortOrder: it.sortOrder,
  };
}

export function prMediaKpiView(d: PrMediaKpiDashboard): PrMediaKpiView {
  // Тартиб бэкенддан `sortOrder` бўйича келади, лекин бу ерда ҳам очиқ
  // таъминланади: диаграмма қаторлари ва жадвал манбадаги ўқиш тартибидан
  // чиқиб кетмаслиги керак.
  const items = [...d.items].sort((a, b) => a.sortOrder - b.sortOrder);

  const mismatchOf = new Map(d.mismatches.map((m) => [m.key, m]));

  // Категория ранги рўйхатдаги ЎРНИ бўйича берилади (номига қотирилмаган) —
  // манбага янги категория қўшилса ҳам у рангсиз қолмайди.
  const tokenOf = new Map<string, TokenName>();
  const order: string[] = [];
  for (const c of d.categories) {
    if (!tokenOf.has(c.no)) {
      tokenOf.set(c.no, CATEGORY_TOKENS[tokenOf.size % CATEGORY_TOKENS.length]);
      order.push(c.no);
    }
  }
  // `categories[]` да учрамаган категория (бэкенд иккала рўйхатни бир
  // массивдан ясагани учун бўлмаслиги керак) қаторни экрандан йўқотмасин.
  for (const it of items) {
    if (!tokenOf.has(it.categoryNo)) {
      tokenOf.set(it.categoryNo, CATEGORY_TOKENS[tokenOf.size % CATEGORY_TOKENS.length]);
      order.push(it.categoryNo);
    }
  }

  const rows: PrKpiRow[] = items.map((it) =>
    toRow(
      it,
      tokenOf.get(it.categoryNo) ?? CATEGORY_TOKENS[0],
      mismatchOf.get(it.key) ?? null,
    ),
  );

  const metaOf = new Map(d.categories.map((c) => [c.no, c]));

  const categories: PrKpiCategory[] = order.map((no) => {
    const meta = metaOf.get(no);
    const catRows = rows.filter((r) => r.categoryNo === no);
    const mixedRows = catRows.filter((r) => !r.comparable && r.yearlyTargetNum !== null);

    return {
      no,
      // Ном `categories[]` дан, у йўқ бўлса қаторнинг ўзидан — иккала
      // ҳолатда ҳам лотин, манбадагича.
      name: meta?.name ?? catRows[0]?.categoryName ?? no,
      count: meta?.items ?? catRows.length,
      rows: catRows,
      yearlyTotal: meta?.yearlyTotal ?? sumOrNull(catRows.map((r) => r.yearlyTargetNum)),
      countTotal: sumOrNull(
        catRows.filter((r) => r.comparable).map((r) => r.yearlyTargetNum),
      ),
      // Йиғинди «аралаш» бўлади фақат бошқа ўлчовдаги қатор унга ҲАҚИҚАТАН
      // қўшилганда: сони `null` бўлган қатор йиғиндига умуман кирмайди ва
      // уни бузмайди ҳам.
      mixedUnits: mixedRows.length > 0,
      mixedRows,
      growthRows: catRows.filter((r) => r.growthText !== null),
      token: tokenOf.get(no) ?? CATEGORY_TOKENS[0],
    };
  });

  const byKey = new Map(rows.map((r) => [r.key, r]));

  return {
    title: d.title,
    source: d.meta.source,
    categories,
    rows,
    comparable: rows.filter((r) => r.comparable),
    incomparable: rows.filter((r) => !r.comparable),
    atLeastRows: rows.filter((r) => r.atLeast),
    // Тартиб бэкенддаги рўйхатга эргашади — экрандаги кетма-кетлик API
    // жавоби билан бир хил бўлиши учун.
    mismatches: d.mismatches
      .map((m) => byKey.get(m.key))
      .filter((r): r is PrKpiRow => r !== undefined),
    orphanMismatches: d.mismatches.filter((m) => !byKey.has(m.key)),
    growth: rows.filter((r) => r.growthText !== null),
    cadence: {
      month: rows.filter((r) => r.cadencePeriod === "month").length,
      quarter: rows.filter((r) => r.cadencePeriod === "quarter").length,
      unresolved: rows.filter((r) => r.cadenceUnresolved).length,
    },
    computedCount: rows.filter((r) => r.yearlyComputed !== null).length,
    mixedCategories: categories.filter((c) => c.mixedUnits),
  };
}
