/**
 * API жавоб шакллари.
 *
 * Ҳамма тип `reference/api-probe/*.json` — яъни серверга қилинган ҳақиқий
 * чақириқлар натижасидан ёзилган, `API_DOCS.md` дан эмас: ҳужжат бир неча
 * жойда амалдаги жавобдан фарқ қилади (қаранг: `reference/API-BUGS.md`).
 *
 * Шу сабабли деярли ҳар бир сон майдони `| null` бўлиши мумкин деб қаралади —
 * зондда `metal: null`, `hours: null`, `plan: null`, `baseUnit: null`,
 * `weight: null` ҳолатлари учради.
 */

export interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface PagedEnvelope<T> {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  data: T[];
}

/* -------------------------------------------------------------------------- */
/* /filters                                                                   */
/* -------------------------------------------------------------------------- */

export interface FiltersData {
  plants: { name: string; workshops: string[] }[];
  materials: string[];
  factories: string[];
  workshops: { code: string; plant: string; fullName: string | null }[];
  units: string[];
  /** Ҳозирча бўш массив қайтади — API-BUGS №6. */
  categories: string[];
  processes: string[];
  energyTypes: string[];
  chemicals: string[];
  /**
   * `chemicals` нинг тўлиқ шакли — ҳар бир варақ устуни ўз реагенти ва
   * транспорт тури билан. `reagent` бўйича гуруҳлаш шу ердан қурилади.
   */
  chemicalsDetailed: { name: string; reagent: string | null; transport_type: string | null }[];
  /** Такрорсиз тоза модда номлари; `reagent = null` бўлганлар кирмайди. */
  reagents: string[];
  dateRange: { min: string; max: string };
}

/* -------------------------------------------------------------------------- */
/* /production/tree, /summary                                                 */
/* -------------------------------------------------------------------------- */

export interface UnitTotal {
  /** `null` ёки `"—"` — маҳсулот `Справочники.xlsx` да топилмаган (API-BUGS №5). */
  baseUnit: string | null;
  plan: number | null;
  fakt: number | null;
  /** Режа = 0 бўлса `null` (0% деб кўрсатилмайди). */
  percent: number | null;
}

export interface WeightTotal {
  plan: number | null;
  fakt: number | null;
  percent: number | null;
}

export interface Totals {
  byUnit: UnitTotal[];
  /** Цехда оғирлик маҳсулоти бўлмаса `null`. */
  weight: WeightTotal | null;
}

export interface TreeProduct {
  id: number;
  name: string;
  shortName: string | null;
  unit: string | null;
  baseUnit: string | null;
  material: string | null;
  process: string | null;
  category: string | null;
  plan: number | null;
  fakt: number | null;
  percent: number | null;
  planBase: number | null;
  faktBase: number | null;
  /**
   * Манбадаги «всего» йиғинди сатри — пастдаги қаторларнинг йиғиндиси
   * (масалан `Ввод W концентрата, всего = ИОФ + покупной`).
   *
   * Бэкенд уларни `totals` / `byUnit` / `weight` ҳисобига **қўшмайди**,
   * лекин `products[]` да қайтаради. Фронтендда ҳам улар йиғиндиларга,
   * четланиш рўйхатларига ва ҳажм рейтингига кирмайди — акс ҳолда битта
   * миқдор икки марта саналарди. Улар алоҳида карточкада кўрсатилади.
   */
  isTotal?: boolean;
}

export interface TreeWorkshop {
  code: string;
  fullName: string | null;
  productCount: number;
  /** Шу тугундаги «всего» сатрлари сони. */
  totalRowCount?: number;
  totals: Totals | null;
  /** `depth=product` бўлгандагина келади. */
  products?: TreeProduct[];
}

export interface TreePlant {
  name: string;
  workshopCount: number;
  productCount: number;
  /** Шу заводдаги «всего» сатрлари сони (`productCount` га кирмайди). */
  totalRowCount?: number;
  totals: Totals | null;
  /** `depth=plant` бўлганда келмайди. */
  workshops?: TreeWorkshop[];
}

export interface TreeData {
  period: { from: string; to: string };
  depth: string;
  totals: Totals;
  plantCount: number;
  /** «Всего» сатрларисиз — улар `totalRowCount` да алоҳида саналади. */
  productCount: number;
  /** Жавобдаги «всего» сатрлари сони; ҳеч қайси `totals` га қўшилмаган. */
  totalRowCount: number;
  plants: TreePlant[];
}

export interface SummaryData {
  period: { from: string; to: string };
  production: { byUnit: UnitTotal[]; weight: WeightTotal | null };
  /** Экранда ишлатилмайди — электр панели `/electricity` дан ўқийди. */
  electricity: { kwh: number | null };
  hydrogen: { hydrogen: number | null; gas: number | null };
  cisterns: { value: number | null; deliveries: number | null };
  ogarok: { physical: number | null; metal: number | null };
  ingichka: { downtimeHours: number | null; stops: number | null };
  /**
   * СГП жамланмаси. ⚠️ Бир категория **бир нечта қатор** билан келади: бэкенд
   * `GROUP BY category, base_unit` қилади (тн / шт / м3 ўзаро қўшилмайди).
   * «Бир категория = бир қатор» деб қаралмасин — аввал `baseUnit` бўйича
   * ажратилсин, кейин йиғилсин.
   */
  sales: {
    category: string;
    /** Шу қатор қайси базавий бирликда; аниқланмаса `null` ёки `«—»`. */
    baseUnit: string | null;
    /** `true` — қолдиқ: давр охиридаги ҳолат, кунлар бўйича йиғилмайди. */
    isStock: boolean;
    value: number | null;
  }[];
}

/* -------------------------------------------------------------------------- */
/* /dashboard                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * «Технologik metallar ishlab chiqarish» дашборди — металл, ой ва завод
 * кесимида тайёр йиғма кўрсаткичлар, битта жавобда
 * (`docs/METAL_PRODUCTION_DASHBOARD_API.md`).
 *
 * Бошқа `production-report` жавобларидан фарқли — бу ерда сон майдонлари
 * **ҳақиқатан `number`**: хизмат ичида `::float` билан ҳисобланган
 * (`production-report.service.ts` → `dashboard()`), TypeORM'нинг `numeric`
 * матоси эмас. Шунинг учун `Number()` билан алоҳида айлантирилмайди —
 * `gas.ts`/`solar.ts` адаптерларидаги каби текширув бу ерда керак эмас.
 */
export interface DashboardMonth {
  /** `'YYYY-MM'`. */
  key: string;
  /**
   * Хизматнинг ўзи берган ёрлиқ, лотин ёзувида (масалан `"May 2026"`).
   * Экранга **чиқарилмайди** — интерфейс матни кирилл бўлиши керак, панел
   * `key` дан `format.ts` → `monthLabel()` орқали ўзиникини қуради.
   */
  label: string;
}

export interface DashboardMetal {
  /**
   * Металл коди (`"Mo"`, `"W"`, `"Re"`, `"Co"`, `"Fe"`, `"Other"`) ёки
   * **`null`** — маҳсулотга металл тури умуман бириктирилмаган
   * («аниқланмаган» гуруҳ). Бэкенд бу гуруҳ учун тайёр ном бермайди —
   * экранга чиқадиган матнни frontend танлайди (докс 4-бўлим).
   */
  material: string | null;
  value: number;
  plan: number;
  /** Умумий ҳажмдаги улуши, % — донут учун тайёр қиймат. */
  pct: number;
  /** Режа бажарилиши, % (`fakt/reja×100`) — давр таққослаш эмас (3.3-бўлим). */
  percent: number | null;
  /** Олдинги даврга нисбатан ўзгариш, %. Ҳозирги базада кўп ҳолатда `null`. */
  delta: number | null;
  previous: number | null;
  /** Ойлик қатор, `months[]` билан бир тартибда. */
  dyn: number[];
  planDyn: number[];
}

export interface DashboardPlant {
  name: string;
  /** Ойлик ҳажм, `months[]` билан бир тартибда. */
  monthly: number[];
  value: number;
}

export interface DashboardData {
  period: {
    from: string | null;
    to: string | null;
    /** Таққослаш учун автоматик ҳисобланган олдинги давр; `from`/`to` берилмаса `null`. */
    previous: { from: string; to: string } | null;
  };
  /** Ушбу жавобдаги барча сон шу бирликда (стандарт — `"тн"`). */
  unit: string;
  months: DashboardMonth[];
  total: number;
  totalPlan: number;
  totalPercent: number | null;
  /** Жами ҳажмнинг олдинги даврга нисбатан ўзгариши, %. Кўп ҳолатда `null`. */
  totalDelta: number | null;
  previousTotal: number | null;
  /** Металл бириктирилмаган ҳажмнинг умумий ҳажмдаги улуши, %. */
  unknownShare: number;
  /** Ҳажм бўйича камайиш тартибида сараланган (бэкенд томонидан). */
  metals: DashboardMetal[];
  /** Барча металлар йиғиндиси, ойлик. */
  monthly: number[];
  monthlyPlan: number[];
  /** Ойлик кунлик ўртача ҳажм. */
  avgDaily: number[];
  /** Шу ойда маълумот мавжуд кунлар сони. */
  days: number[];
  plants: DashboardPlant[];
}

/* -------------------------------------------------------------------------- */
/* /production/monthly, /narastayka                                           */
/* -------------------------------------------------------------------------- */

export interface ProductionMonthlyRow {
  /** `YYYY-MM` */
  month: string;
  /** Завод ёки цех номи (`level` га боғлиқ). */
  name: string;
  base_unit: string | null;
  plan: number | null;
  fakt: number | null;
}

export interface NarastaykaRow {
  for_day: string;
  product: string;
  short_name: string | null;
  material: string | null;
  factory: string | null;
  unit: string | null;
  base_unit: string | null;
  plan: number | null;
  fakt: number | null;
  plan_base: number | null;
  fakt_base: number | null;
  source_file: string;
  /**
   * Манбадаги «всего» йиғинди сатри — пастдаги қаторларнинг йиғиндиси
   * (маъноси `TreeProduct.isTotal` билан бир хил).
   *
   * ⚠️ `/narastayka` — деталь рўйхат бўлгани учун бошқа endpoint'лардан
   * фарқли равишда бу сатрларни **чиқариб ташламайди**. `product` ILIKE
   * қидируви бир вақтда «всего» ни ҳам, унинг таркибий қисмларини ҳам
   * топиши мумкин; иккиси қўшилса битта миқдор икки марта саналади.
   * Шунинг учун кунлик динамикада улар ажратилади —
   * `dailyFromNarastayka()` га қаранг.
   */
  isTotal?: boolean;
}

/* -------------------------------------------------------------------------- */
/* /electricity, /hydrogen                                                    */
/* -------------------------------------------------------------------------- */

/** `period=monthly` да `month`, `period=daily` да `day` келади. */
export interface ElectricityTypeRow {
  month?: string;
  day?: string;
  type: string;
  kwh: number | null;
}

export interface ElectricityObjectRow {
  month?: string;
  day?: string;
  object: string;
  kwh: number | null;
}

export interface HydrogenRow {
  month?: string;
  day?: string;
  object?: string;
  value: number | null;
}

/* -------------------------------------------------------------------------- */
/* /cisterns, /ogarok, /ingichka, /sales                                      */
/* -------------------------------------------------------------------------- */

export interface CisternRow {
  month?: string;
  day?: string;
  /**
   * Варақ устунининг сарлавҳаси (`sisterna_helper.name`), масалан
   * `«Аммиак на машине(т)»`. `LEFT JOIN` бўлгани учун боғланмаган эски
   * ёзувларда `null` бўлиши мумкин.
   */
  material: string | null;
  /** Тоза модда номи — `Реагент` устуни, масалан `«Азотная кислота»`. */
  reagent: string | null;
  /**
   * Ўлчов бирлигини аниқлайдиган ягона манба — ном бўйича тахмин эмас.
   * Ҳозирча айнан уч сатр келади, ёзилиши ҳам ўзгартирилмаган:
   * `«цистерны»` ва `«машины»` кичик, `«Другое»` бош ҳарф билан.
   * Справочникда топилмаган устун ва боғланмаган ёзувларда `null`
   * (масалан 05-2026 файлидаги «Вывоз кеков»). Справочникка тўртинчи қиймат
   * қўшилса ҳам адаптер йиқилмайди — қаранг `cisternKind()`.
   */
  transport_type: string | null;
  value: number | null;
  deliveries: number | null;
}

export interface CisternTxRow {
  day: string;
  time: string | null;
  material: string | null;
  reagent: string | null;
  transport_type: string | null;
  value: number | null;
  source_file: string;
}

export interface OgarokMonthlyRow {
  month: string;
  physical: number | null;
  metal: number | null;
  machines: number | null;
  cups: number | null;
  days: number | null;
}

export interface OgarokDailyRow {
  day: string;
  time: string | null;
  machines_count: number | null;
  cups_count: number | null;
  physical: number | null;
  metal: number | null;
  cumulative_physical: number | null;
  cumulative_metal: number | null;
}

export interface IngichkaMonthlyRow {
  month: string;
  hours: number | null;
  stops: number | null;
  days: number | null;
}

export interface IngichkaDailyRow {
  day: string;
  repair_start: string | null;
  repair_end: string | null;
  hours: number | null;
  note: string | null;
}

export interface SalesMonthlyRow {
  month: string;
  category: string;
  /**
   * ⚠️ Фақат **оғирлик оиласи** (`тн` / `т`) йиғиндиси: бэкенд бошқа
   * бирликларни бу сонга умуман қўшмайди. Аралашма эмас — аксинча,
   * кг / шт / м3 маҳсулотлар бу ерга **тушмайди**, шунинг учун бу сон
   * категория ҳажмини тўлиқ ифодаламайди.
   */
  value_base: number | null;
  /** Бирлик кесимида ажратилган йиғинди — категория ҳажмининг тўлиқ шакли. */
  byUnit?: SalesMonthlyByUnit[];
}

/** `/sales/products` — маҳсулот кесимидаги СГП. */
export interface SalesProductRow {
  id: number;
  name: string;
  unit: string | null;
  baseUnit: string | null;
  material: string | null;
  category: string | null;
  sgpCategory: string;
  /** `true` — қолдиқ (ҳолат): давр охиридаги қиймат, йиғилмайди. */
  isStock: boolean;
  value: number | null;
  valueBase: number | null;
  days: number | null;
  /** Қолдиқ учун — қайси кун ҳолати. */
  lastDay: string | null;
  /** Давр ичидаги мин/макс нисбати; 1 га яқин = барқарор. */
  spread: number | null;
  /** Бэкенд аниқлаган ўлчов бирлиги шубҳаси. */
  unitSuspect: boolean;
  /**
   * Шубҳа қандай аниқланган:
   *  - `spread` — автоматик: давр ичида қийматлар кескин фарқ қилган
   *  - `unit-label` — қўлдаги рўйхатдан (қиймат барқарор, автоматик топилмайди)
   */
  suspectReason?: "spread" | "unit-label" | null;
  /** Бэкенддаги ўқиладиган изоҳ — қайси бирлик кутилаётгани ҳақида. */
  suspectNote?: string | null;
}

export interface SalesMonthlyByUnit {
  baseUnit: string | null;
  value: number | null;
}

export interface StructureRow {
  name: string;
  workshopCount: number;
  productCount: number;
  workshops: { code: string; fullName: string | null; productCount: number }[];
}

/* -------------------------------------------------------------------------- */
/* /balance                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Металлар баланси — хомашёдан тайёр маҳсулотгача бўлган технологик занжир.
 *
 * Занжир варақдаги «баланс» блокидан йиғилади, шунинг учун ҳар бир қиймат
 * қандай топилгани (`how`) ва манба сатри (`row`) билан бирга келади —
 * рақамни варақда қайта топиш имконияти сақланади.
 */
export type BalanceHow =
  /** Сатр номи билан айнан топилди. */
  | "exact"
  /** Синоним/бошқа ёзилиши бўйича топилди. */
  | "alias"
  /** Бир нечта сатрдан йиғилди. */
  | "composed";

export interface BalanceValue {
  plan: number | null;
  fakt: number | null;
  /**
   * Варақнинг K устунидан олинган **хом** фоиз — қайта ҳисобланмайди ва
   * чегараланмайди. `1000%` дан катта бўлиши мумкин (масалан молибден
   * проволокаси), режа = 0 бўлса `null` (нолга бўлиш йўқ).
   */
  pct: number | null;
  how: BalanceHow;
  /** Манба варағидаги сатр рақами. */
  row: number | null;
}

export interface BalanceStep {
  /** Барқарор slug — рўйхат калити сифатида ишлатилади. */
  id: string;
  /**
   * Занжирдаги даража: `"1"`…`"7"`, ёки `"—"` — занжирда ўрни белгиланмаган
   * (справочно) қатор. **Бир хил `no` — параллел тармоқлар**: улар ёнма-ён
   * туради ва олдинги даражадан битта стрелка уларнинг ҳаммасига бўлинади.
   */
  no: string;
  /** Занжир ичидаги тартиб (1..N) — бир даража ичида ҳам тартибни беради. */
  order: number;
  title: string;
  site: string;
  /** `"тыс.т" | "т" | "тн" | "кг" | "м3"` — даражалар орасида қўшилмайди. */
  unit: string;
  anchor: string | null;
  /**
   * `true` — қатор фақат эталон ой варағида мавжуд, қолган ойларда маълумот
   * йўқ (барча ойлар `null`). Занжирдан олиб ташланмайди — йўлнинг боши
   * кўринишда қолиши керак.
   */
  marchOnly: boolean;
  /** ⚠ изоҳ — бўлса карточкада кўрсатилади. */
  note: string | null;
  /** Калит — `"YYYY-MM"`. `months` даги ҳар бир ой калит сифатида бор. */
  values: Record<string, BalanceValue | null>;
}

export interface BalanceChain {
  key: "W" | "MO" | "RE_NAVOIY" | "RE_GTC1" | "RE_TOTAL";
  title: string;
  metal: "W" | "MO" | "RE";
  order: number;
  steps: BalanceStep[];
}

export interface BalanceResponse {
  /** Эталон ой (`"2026-03"`) — қолган ойлар шу босқич номлари остида чиқади. */
  reference: string;
  /** Ўсиш тартибида, `"YYYY-MM"`. Узилишлар бўлиши мумкин. */
  months: string[];
  chains: BalanceChain[];
}

/* -------------------------------------------------------------------------- */
/* /kpi                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * «Паспорт показателей» — 45 кўрсаткич битта жавобда.
 *
 * Занжир (`/balance`) билан **устма-уст тушади**: 22 кўрсаткич айни пайтда
 * баланс босқичи ҳамдир (`inBalance`). Иккиси битта экранда бирга
 * чизилмайди — қайси бири қаерда кўрсатилиши `adapters/kpi.ts` да ҳал
 * қилинади.
 */
export type KpiSource =
  | "sex_svodka"
  | "elektr"
  | "ogarok"
  | "cisterns"
  | "ingichka"
  | "vodorod"
  | "ruziev";

/** `BalanceHow` устига `aggregate` — алоҳида жадвалдан олинган ойлик йиғинди. */
export type KpiHow = BalanceHow | "aggregate";

/**
 * Фоиз қаердан келгани.
 *
 *  - `source`   — варақнинг K устуни («Вып. в %») ҳақиқатан фоиз, хом ҳолда;
 *  - `computed` — бэкенд `fakt/plan × 100` дан ҳисоблаган. Иккита ресурс
 *    қаторида (№9, №11) манба блоки бир устунга сурилган ва K фоиз эмас,
 *    шунингдек `composed` / `aggregate` ҳоллари.
 *
 * Бу **келиб чиқиш** белгиси, ишончлилик белгиси эмас: иккала ҳолатда ҳам
 * `pct` тўғри. Шунинг учун view-model'га ўтказилмайди.
 */
export type KpiPctSource = "source" | "computed";

export interface KpiCell {
  plan: number | null;
  fakt: number | null;
  /**
   * Бажарилиш фоизи. `plan` 0/`null` бўлса `null`.
   *
   * Фронтендда **текширилмайди**: «фоиз режа/фактга ўхшамаса — бузуқ» деган
   * қоида нотўғри, чунки манбада ҳақиқий 1000% ҳам бор (№27 «Молибденовая
   * проволока», 2026-03: режа 10, факт 100). K устуни фоиз бўлмаган
   * қаторларни бэкенднинг ўзи ҳисоблаб беради — қаранг `pctSource`.
   */
  pct: number | null;
  pctSource: KpiPctSource;
  how: KpiHow;
  /** Манба варағидаги сатр рақами — фақат ички мантиқ учун, экранга чиқмайди. */
  row: number | null;
}

export interface KpiIndicator {
  /** Паспортдаги «№» 1..45 — барқарор рўйхат калити. */
  no: number;
  name: string;
  /** `Производство` / `Ресурсы` / `Отходы` / `Простои` … */
  category: string;
  /** `1 цех` / `Ингичка` / `ГТЦ Навоий` … */
  site: string;
  unit: string;
  source: KpiSource;
  /** `false` — манба варағи умуман импорт қилинмаган (№43, 44, 45). */
  available: boolean;
  /** `true` — кўрсаткич `/balance` занжирида босқич сифатида ҳам бор. */
  inBalance: boolean;
  balanceStepId: string | null;
  anchor: string | null;
  /**
   * Бэкенддаги ишлаб чиқувчи изоҳи (лотин ёзувида, mapping тафсилотлари
   * билан). Экранга **чиқарилмайди** — фақат «чеклов қайд этилган» белгиси
   * учун мавжудлиги ўқилади.
   */
  note: string | null;
  /** Калит — `months` даги ҳар бир ой. Қиймат `null` бўлиши мумкин, калит — йўқ. */
  values: Record<string, KpiCell | null>;
}

export interface KpiResponse {
  /** Барча манбаларнинг бирлашмаси — балансдагидан кенгроқ бўлиши мумкин. */
  months: string[];
  /** Эталон ой (`"2026-03"`). */
  reference: string;
  /** `no` бўйича тартибланган, 45 та. */
  kpis: KpiIndicator[];
}

/* -------------------------------------------------------------------------- */
/* /chain                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * «Цехлар занжири» (`Тех.цепочки.xlsx`) — хомашёдан тайёр маҳсулотгача бўлган
 * бутун комбинат технологик занжири: 43 босқич + 3 ресурс, 5 даража, 12 сех,
 * устига омбор, чиқинди ва тўхташлар.
 *
 * `/balance` нинг кенгайтирилган ўринбосари: W, Mo ва Re нинг ҳаммасини битта
 * тузилмада беради. Манба файлнинг режа/факт устунлари бузуқ бўлгани учун
 * ундан **фақат тузилма** олинади, қиймат эса ҳар доим базадан.
 */
export type ChainSource = "sex_svodka" | "cisterns" | "ogarok" | "ingichka";

/** `KpiHow` устига `meter` — режа варақдан, факт ҳисоблагичдан. */
export type ChainHow = KpiHow | "meter";

export interface ChainCell {
  plan: number | null;
  fakt: number | null;
  pct: number | null;
  pctSource: KpiPctSource;
  how: ChainHow;
  /** Манба варағидаги сатр — фақат ички мантиқ учун, экранга чиқмайди. */
  row: number | null;
}

export interface ChainLink {
  id: string;
  /**
   * `exact` — файлда алоҳида «Межцеховая передача» қатори бор ёки чиқиш/кириш
   * айнан бир хил номда (30 та); `probable` — файл матни боғланишни кўрсатади,
   * лекин алоҳида қатор йўқ (8 та). Иккиси турли чизиқ услуби билан чизилади.
   */
  confidence: "exact" | "probable";
}

export interface ChainStep {
  /** Барқарор slug — рўйхат калити ва `next` ҳаволаси. */
  id: string;
  /** `Тех.цепочки.xlsx` даги қатор — текшириш учун, экранга чиқмайди. */
  excelRow: number;
  /** Технологик даража 0..4. ⚠️ Бу **граф чуқурлиги эмас**: 38 боғланишнинг
   *  20 таси битта даража ичида, айримлари эса 3–4 даража сакрайди. */
  level: number;
  /** «Уровень» устуни — даражанинг умумий номи файлда йўқ, тўқилмаган. */
  stage: string;
  site: string;
  input: string;
  process: string;
  output: string;
  /** `"—"` бўлиши мумкин. */
  resource: string;
  /** `"—"` бўлиши мумкин. */
  waste: string;
  unit: string;
  source: ChainSource;
  /** `false` — манбада режа/факт йўқ (омбор қаторлари матн катаклари). */
  available: boolean;
  /**
   * `false` — файлнинг ўзи «не детализировано» деб ёзган: кириш қаердан
   * келиши номаълум. Бундай босқичга **кирувчи чизиқ тортилмайди**,
   * тахмин қилиш тақиқланган.
   */
  inputKnown: boolean;
  inBalance: boolean;
  balanceStepId: string | null;
  anchor: string | null;
  /** «Источник в Excel» — сўзма-сўз, экранга чиқмайди. */
  cells: string;
  note: string | null;
  next: ChainLink[];
  /** Калит — `months` даги ҳар бир ой. Қиймат `null` бўлиши мумкин. */
  values: Record<string, ChainCell | null>;
}

/** Ресурс — занжир **тугуни эмас**, босқичга бириктирилган сарф. */
export interface ChainResource extends ChainStep {
  /** `ChainStep.id` — қайси босқичга тегишли. */
  resourceOf: string;
}

export interface ChainResponse {
  months: string[];
  reference: string;
  /** Даражадаги такрорсиз `stage` қийматлари; умумий ном файлда йўқ. */
  levels: { level: number; stages: string[] }[];
  steps: ChainStep[];
  resources: ChainResource[];
}

/* -------------------------------------------------------------------------- */
/* /daily                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * «Кунлик сводка» — 8 йўналиш, кунлар кесимида.
 *
 * ⚠️ Бу `/balance` · `/kpi` · `/chain` дан **бошқа қатлам**: улар ойлик ва
 * «цеховые сводки» варағига таянади, бу эса кунлик сводка файлига
 * (`daily_svodka_log`). Иккиси бир-бирини алмаштирмайди ва аралаштирилмайди:
 * «Кунлик» устуни билан ойлик «С начала месяца» устуни бошқа-бошқа нарса.
 */
export type DailyBlockKey =
  | "ingichka"
  | "raw_supply"
  | "chirchiq"
  | "output"
  | "sales"
  | "stock_products"
  | "stock_materials"
  | "energy";

export type DailyLayout = "triple" | "stock" | "stock_note";

/** `computed` — бэкенд `fakt/plan × 100` дан ҳисоблаган; `null` — фоиз йўқ. */
export type DailyPctSource = "source" | "computed" | null;

/** «Кунлик» / «Ой бошидан» / «Йил бошидан» ойналарининг бири. */
export interface DailyWindow {
  plan: number | null;
  fakt: number | null;
  diff: number | null;
  /** Режа 0 ёки `null` бўлса `null` — нолга бўлинмайди. */
  pct: number | null;
  pctSource: DailyPctSource;
  /** Манбадаги «%» устуни **хом** ҳолда — яширилмайди, лекин асосий устунга чиқмайди. */
  pctRaw: number | null;
}

export interface DailyTripleCell {
  /** Манба варағидаги қатор — фақат ички мантиқ учун, экранга чиқмайди. */
  row: number;
  unit: string | null;
  day: DailyWindow;
  month: DailyWindow;
  year: DailyWindow;
}

/** Қолдиқ — оқим эмас, **ҳолат**: манбада режа/факт/% умуман йўқ. */
export interface DailyStockCell {
  row: number;
  unit: string | null;
  /** 6-блок «Омборда». */
  warehouse: number | null;
  /** 6-блок «Цехда». */
  workshop: number | null;
  /** 7-блок «Қолдиқ миқдори». */
  total: number | null;
  /** 7-блок «Муаммо» устуни — эркин матн. `"0"` бўлиши мумкин (муаммо йўқ). */
  note: string | null;
}

export interface DailyTripleTrend {
  current: string;
  previous: string;
  day: { faktDelta: number | null; faktPct: number | null };
  month: { faktDelta: number | null; faktPct: number | null };
  year: { faktDelta: number | null; faktPct: number | null };
}

export interface DailyStockTrend {
  current: string;
  previous: string;
  warehouseDelta: number | null;
  workshopDelta: number | null;
  totalDelta: number | null;
}

export interface DailyMetric {
  /** `блок|бўлим|ота|ном|бирлик` (+ `#N`) — барқарор калит, экранга чиқмайди. */
  key: string;
  name: string;
  unit: string | null;
  /** «Участок №1», «ВОЛЬФРАМ ишлаб чиқариш цикли», «Чирчиқ заводида:» … */
  section: string | null;
  /** «ш.ж.:» остидаги қатор учун устки қатор номи. */
  parent: string | null;
  /** «… жами» — йиғиндига **қўшилмайди**. */
  isTotal: boolean;
  /** «шундан …» / «ш.ж.» — устки қаторнинг бир қисми, йиғиндига қўшилмайди. */
  isSubset: boolean;
  occurrence: number;
  /**
   * Манбада кўрилган ўлчов бирликлари. Биттадан кўп бўлиши **кутилмайди**
   * (бирлик калитнинг бир қисми): «Қаттиқ қотишмалар» 2026-03-13 дан
   * `тн` → `кг` га ўтган ва шу сабабли **иккита алоҳида калит** бўлиб келади —
   * улар битта диаграммага қўшилмайди.
   */
  unitVariants: string[];
  /** Калит — кун (`YYYY-MM-DD`). Ҳар бир кун калити бор, қиймат `null` бўлиши мумкин. */
  values: Record<string, DailyTripleCell | DailyStockCell | null>;
  trend: DailyTripleTrend | DailyStockTrend | null;
}

export interface DailyBlock {
  /** 1..8, доим шу тартибда. */
  no: number;
  key: DailyBlockKey;
  title: string;
  layout: DailyLayout;
  /** Бэкенддаги лотин ёзувли изоҳ — экранга **чиқарилмайди**. */
  note: string;
  metrics: DailyMetric[];
}

export interface DailyProblemItem {
  no: number | null;
  text: string;
  row: number;
}

export interface DailyProblemDay {
  day: string;
  items: DailyProblemItem[];
  /** Варақ ости изоҳлари (`**` билан) — муаммо банди **эмас**, санаққа кирмайди. */
  notes: string[];
}

export interface DailyResponse {
  /** `YYYY-MM-DD`, ўсиш тартибида. */
  days: string[];
  latest: string | null;
  previous: string | null;
  /** `source: "default"` — фойдаланувчи оралиқ сўрамаган, охирги 31 кун берилган. */
  range: { from: string | null; to: string | null; source: "query" | "default" };
  available: { from: string | null; to: string | null; days: number };
  /** Доим 8 та, `no` тартибида. */
  blocks: DailyBlock[];
  problems: DailyProblemDay[];
}

/* -------------------------------------------------------------------------- */
/* /mobplan                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * «Кадрлар режаси» — корхонанинг штат жадвали ва 24 ойлик ёллаш режаси.
 *
 * Бошқа бўлимлардан фарқли ўлароқ бу endpoint **параметр олмайди**: манба —
 * битта ҳужжатнинг жорий ҳолати, вақт қатори эмас. Серверда `ValidationPipe`
 * `forbidNonWhitelisted` билан ишлайди, шунинг учун `from`/`to` юборилса
 * сўров `400` билан рад этилади.
 */
export interface MobplanSource {
  file: string;
  sheet: string;
  /** `'YYYY-MM-DDTHH:mm:ss'` — вақт минтақаси офсети **йўқ** (сервер локал вақти). */
  importedAt: string;
}

/**
 * Битта лавозим сатри.
 *
 * Тасниф майдонлари `string | null`: `null` — манбада катак бўш, яъни
 * «кўрсатилмаган». Бэкенд уни юқоридаги сатрдан тўлдирмайди ва бўш сатрга
 * айлантирмайди — маълумот йўқлиги шу ерда сақланади.
 *
 * Матн қийматлари манбадаги ёзувда келади (рус ва ўзбек тили аралаш, имло
 * хатоси билан) — қайта ёзилмайди ва таржима қилинмайди.
 */
export interface MobplanPositionRow {
  /** Барқарор ички калит (`'p01'…'p78'`). Интерфейсда кўрсатилмайди. */
  id: string;
  /** Манба варағидаги сатр рақами. Экранда кўрсатилмайди. */
  rowNo: number;
  podrazdelenie: string | null;
  strukturnoe: string | null;
  kategoriya: string | null;
  guruh: string | null;
  /** Манбада ҳамма сатрда тўлдирилган. */
  lavozimRu: string;
  lavozimUz: string | null;
  mxskKod: string | null;
  xizmatchiIshchi: string | null;
  xodimToifasi: string | null;
  razryad: string | null;
  malakaDarajasi: string | null;
  nomBirligi: number;
  shtat: number;
  band: number;
  vakansiya: number;
  /** Ҳақиқий Ф.И.Ш. ёки «вакант» — иккинчиси ҳам **аниқ маълумот**. */
  fio: string;
  vakant: boolean;
  /** `months` билан бир тартибда, 24 та сон. */
  plan: number[];
}

/**
 * Манбанинг ўз «жами» сатри. Ҳар бир майдон алоҳида `null` бўлиши мумкин —
 * варақда ўша катак бўш бўлса. Бу «нол» эмас: таққослаш ўтказилмайди.
 */
export interface MobplanSheetTotals {
  nomBirligi: number | null;
  shtat: number | null;
  band: number | null;
  vakansiya: number | null;
}

export interface MobplanResponse {
  /** Базага ҳали импорт қилинмаган бўлса `null` — бу хато эмас, ҳолат. */
  source: MobplanSource | null;
  /** `'2025-01' … '2026-12'`. Импорт қилинмаган базада бўш массив. */
  months: string[];
  /** Манбадаги тартибда. «Жами» сатрлари бу ерга **тушмайди**. */
  rows: MobplanPositionRow[];
  sheetTotals: MobplanSheetTotals | null;
  /** «Набор по месяцам» сатри — `months` билан бир тартибда. */
  sheetMonthly: number[] | null;
  /** «По возрастанию» сатри — ўсиб борувчи. */
  sheetCumulative: number[] | null;
}

/* -------------------------------------------------------------------------- */
/* gas-integration — алоҳида модул, `production-report` нинг ёнида            */
/* -------------------------------------------------------------------------- */

/**
 * Газ модулининг конверти `Envelope` дан бир жойда фарқ қилади: контроллер
 * хатони ўзи ушлаб, HTTP `200` билан `{ success: false, error }` қайтаради
 * (`backend/src/integrations/gas/gas-integration.controller.ts` — ҳар бир
 * ҳандлерда `catch`). Яъни муваффақиятсиз жавобда `data` **умуман бўлмайди**
 * ва `res.ok` буни ушлай олмайди. Шунинг учун `success` алоҳида текширилади —
 * қаранг `endpoints.ts` → `unwrapGas`.
 */
export interface GasEnvelope<T> {
  success: boolean;
  data?: T;
  total?: number;
  error?: string;
}

/** Ўлчов нуқтаси (ASUPG «tube» объекти). */
export interface GasObjectRow {
  id: number;
  /**
   * Ташқи тизимнинг техник калити. **Экранга чиқарилмайди** — раҳбар учун
   * маъноси йўқ. `objectName` бўш бўлса нейтрал ўрин эгаллагич ишлатилади.
   */
  tubeGuid: string;
  objectName: string | null;
  objectState: string | null;
  syncedAt: string | null;
  createdAt: string;
}

/**
 * Кунлик ўлчов (`GET gas-integration/day-logs`).
 *
 * ⚠️ **Барча сон майдонлари `string` бўлиб келади**, `number` эмас: Postgres
 * `numeric` устунини TypeORM мато сифатида қайтаради. Адаптерда аниқ
 * `Number()` қилинади ва `null` алоҳида қаралади — `Number(null)` → `0`
 * «маълумот йўқ» ни сохта нолга айлантириб қўяди.
 *
 * `gasObject` сўровда `leftJoinAndSelect` билан бирга келади.
 */
export interface GasDayLogRow {
  id: number;
  tubehrdayId: string;
  /** `'YYYY-MM-DD'`. */
  tubehrdayDatehrday: string;
  gasObjectId: number;
  gasObject: GasObjectRow | null;
  tubehrdayTemperature: string | null;
  tubehrdayDeltapressure: string | null;
  /** Хом ҳажм. **Корреkция қилинган ҳажмнинг ўрнини боса олмайди** — бошқа ўлчов. */
  tubehrdayVolume: string | null;
  /** Асосий кўрсаткич: корреkция қилинган ҳажм, м³. `null` бўлса қатор ҳисобга кирмайди. */
  tubehrdayCorrvolume: string | null;
  tubehrdayPressure: string | null;
  tubehrdayFloattime: string | null;
  tubehrVolumeC: string | null;
  tubehrCorrvolumeC: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * `GET gas-integration/stats` — импорт ҳолати.
 *
 * Жавобда техник хизмат майдонлари ҳам бор (`odata_base`, `objects_path`,
 * `token_file`). Улар **атайин типланмаган**: экранда ташқи тизимнинг манзили
 * ёки файл йўли кўринмаслиги керак, типланмаган майдонни эса тасодифан
 * чизиб қўйиб бўлмайди.
 */
export interface GasStats {
  objects: number;
  day_logs: number;
  day_correct_logs: number;
  hour_logs: number;
  moment_logs: number;
  /** Базадаги энг сўнгги кунлик ўлчов санаси, `'YYYY-MM-DD'`. */
  last_day_log: string | null;
  last_hour_log: string | null;
}

/* -------------------------------------------------------------------------- */
/* fusion-solar — алоҳида модул, `production-report` нинг ёнида               */
/* -------------------------------------------------------------------------- */

/**
 * Қуёш станциялари модулининг конверти.
 *
 * Газ модули билан **бир хил тузоқ**: контроллер хатони ўзи ушлаб, HTTP `200`
 * билан `{ success: false, error }` қайтаради — ҳар бир ҳандлерда `catch`
 * (`backend/src/integrations/fusion-solar/fusion-solar.controller.ts`). Демак
 * `res.ok` муваффақиятсизликни ушлай олмайди ва `success` алоҳида текширилади.
 *
 * Иккинчи тузоқ фақат шу модулда бор: **`success: true` бўлса ҳам `data: null`
 * келиши мумкин** — сервис `catch` ичида `null` қайтаради, контроллер эса уни
 * муваффақият деб ўрайди. Шунинг учун `data` да `null` ҳам кутилади ва
 * `unwrapSolar` уни рад этади.
 *
 * `GasEnvelope` билан бирлаштирилмади: иккови икки хил бэкенд модулининг
 * контракти, бир-биридан мустақил ўзгаради ва ҳар бири ўз модулига қараб
 * ҳужжатланган.
 */
export interface SolarEnvelope<T> {
  success: boolean;
  data?: T | null;
  count?: number;
  error?: string;
}

/**
 * Қуёш станцияси (`GET fusion-solar/stations` — базадан ўқийди).
 *
 * ⚠️ **`decimal` устунлар мато бўлиб келади** (`capacity`, `latitude`,
 * `longitude`): Postgres `numeric` ни TypeORM `string` сифатида қайтаради.
 * Адаптерда аниқ текширув билан сонга айлантирилади — `Number(null)` → `0`
 * «ўлчов йўқ» ни сохта нолга айлантириб қўярди.
 *
 * `stationCode` — ташқи тизимнинг техник калити (`"NE=12345678"` кўринишида).
 * **Экранга чиқарилмайди**, фақат ички калит ва KPI билан улаш учун.
 */
export interface SolarStationRow {
  id: string;
  stationCode: string;
  stationName: string | null;
  address: string | null;
  /** Ўрнатилган қувват, МВт. `decimal` → мато. */
  capacity: string | null;
  contactPerson: string | null;
  contactMethod: string | null;
  /** Тармоққа уланган сана — эркин мато, одатда `'YYYY-MM-DD'`. */
  gridConnectionDate: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Станциянинг бир кунлик ўлчови — базадан.
 *
 * ⚠️ Барча сон майдонлари **мато**: `decimal` устунлар ҳам, `bigint`
 * (`collectTime`) ҳам. Ҳаммаси адаптерда текширилиб айлантирилади.
 *
 * Экранга чиқмайдиган майдонлар атайин типланган, лекин ишлатилмайди:
 *  - `powerProfit` — ҳужжатда «пул бирлиги» деб турибди, **қайси валюта
 *    экани кўрсатилмаган**. Валютасиз пул сони ўйлаб топилган маълумот
 *    бўларди, шунинг учун чизилмайди;
 *  - `perpowerRatio` — синхронизация коди уни умуман ёзмайди
 *    (`fusion-solar.service.ts` даги KPI маппингида йўқ), яъни базада доим
 *    бўш;
 *  - `installedCapacity` — станциянинг қуввати, у `SolarStationRow.capacity`
 *    дан олинади; кунлар бўйича қўшилса ўрнатилган қувват сунъий равишда
 *    кўпайиб кетарди.
 */
export interface SolarKpiRow {
  id: string;
  stationCode: string;
  /** `bigint` → мато. Экранда ишлатилмайди. */
  collectTime: string;
  /** ISO вақт белгиси; кун калити сифатида биринчи 10 белги олинади. */
  collectDate: string;
  installedCapacity: string | null;
  /** Қуёш радиацияси, кВт·соат/м². */
  radiationIntensity: string | null;
  /** Назарий ишлаб чиқариш, кВт·соат. */
  theoryPower: string | null;
  /** Самарадорлик коэффициенти, %. */
  performanceRatio: string | null;
  /** Ҳақиқатда ишлаб чиқарилган энергия, кВт·соат — асосий кўрсаткич. */
  inverterPower: string | null;
  powerProfit: string | null;
  perpowerRatio: string | null;
  /** Кун бўйича камайтирилган CO₂, тонна. Кунлар бўйича **қўшилмайди**. */
  reductionTotalCo2: string | null;
  /** Кун бўйича тежалган кўмир, тонна. Кунлар бўйича **қўшилмайди**. */
  reductionTotalCoal: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* finance-report — алоҳида модул, `production-report` нинг ёнида             */
/* -------------------------------------------------------------------------- */

/**
 * Бир молиявий кўрсаткич қатори — ойлар бўйича қиймат.
 *
 * `key` — `lib/adapters/finance.ts` даги `FinRowKey` билан бир хил ва бир
 * хил тартибда келади (бэкенддаги `FINANCE_REPORT_ROWS` шу тартибни
 * такрорлайди). Адаптер `key` бўйича `Record`га йиғади — тартибга
 * ишонилмайди, лекин у ҳам мос.
 */
export interface FinanceReportRow {
  key: string;
  label: string;
  /** Сумма — минг сўм; нисбат/фоиз қаторлари учун бирликсиз. `months` билан бир тартибда. */
  values: number[];
}

/**
 * `/finance-report/dashboard` жавоби.
 *
 * ⚠️ `months` да **йил йўқ** — манбада (Word/Excel ҳужжат) йил кўрсатилмаган,
 * бэкенд ҳам уни ўйлаб топмайди. Шунинг учун бўлим давр танлагичига
 * боғланмаган (`FinPanel.tsx`).
 */
export interface FinanceReportDashboard {
  months: string[];
  rows: FinanceReportRow[];
}

/* -------------------------------------------------------------------------- */
/* geology-projects — алоҳида модул, `production-report` нинг ёнида           */
/* -------------------------------------------------------------------------- */

/**
 * Бу блок бэкенддаги `src/modules/geology-projects/geology-projects.types.ts`
 * нинг айнан кўзгуси. Умумий қоида: манбада катак тўлдирилмаган бўлса
 * майдон `null` келади — **нол эмас**. Шунинг учун адаптер ҳам, панел ҳам
 * `null` ни нолга айлантирмайди.
 */

/** Лойиҳа бўйича битта иш (режа ёки бажарилган). Барча майдон мажбурий. */
export interface GeologyWorkRow {
  id: number;
  projectNo: number;
  groupName: string;
  groupNo: number;
  shortName: string;
  work: string;
  /** Муддат манбадаги матн кўринишида, масалан «июнь 2026». */
  deadlineText: string;
  year: number;
  /** 1–12 */
  month: number;
  /** `Режа` | `Бажарилди` */
  status: string;
  sortOrder: number;
}

/** 2026 йил иш ҳажмлари — атиги 15 лойиҳада мавжуд. */
export interface GeologyVolumeRow {
  id: number;
  projectNo: number;
  groupName: string;
  groupNo: number;
  shortName: string;
  drillPlan: number | null;
  drillDone: number | null;
  samplePlan: number | null;
  sampleDone: number | null;
  trenchPlan: number | null;
  trenchDone: number | null;
  labPlan: number | null;
  budgetMlnUsd2026: number | null;
  /**
   * Фоизни **бэкенд** ҳисоблайди (1 хона). Режа йўқ/0 ёки бажарилгани
   * кўрсатилмаган бўлса `null` — фронтда қайта ҳисобланмайди.
   */
  drillPercent: number | null;
  samplePercent: number | null;
  trenchPercent: number | null;
}

export interface GeologyProjectRow {
  id: number;
  projectNo: number;
  /** `Шакллантирилаётган` | `Бошқарилаётган` */
  groupName: string;
  groupNo: number;
  name: string;
  shortName: string;
  /** `Конлар` | `Техноген` | `Бошқа` */
  category: string;
  direction: string;
  region: string | null;
  district: string | null;
  mineral: string;
  metals: string | null;
  oreReserve: string | null;
  metalReserve: string | null;
  costMlnUsd: number | null;
  funding: string | null;
  endYear: number | null;
  partner: string | null;
  plan2026: string | null;
  done2026: string | null;
  result: string | null;
  note: string | null;
  /** Манба тақдимотидаги слайд рақами — **экранда кўрсатилмайди**. */
  slideNo: number | null;
  /** Иш кўрсатилмаган лойиҳада бўш массив (10 та лойиҳа). */
  works: GeologyWorkRow[];
  /** Ҳажм кўрсатилмаган лойиҳада `null` (31 та лойиҳа). */
  volume: GeologyVolumeRow | null;
}

/** Кесим қатори. `key: null` — манбада қиймат кўрсатилмаган лойиҳалар. */
export interface GeologyCountItem {
  key: string | null;
  count: number;
}

export interface GeologyYearCountItem {
  year: number | null;
  count: number;
}

export interface GeologySummary {
  totalProjects: number;
  byGroup: GeologyCountItem[];
  byCategory: GeologyCountItem[];
  byDirection: GeologyCountItem[];
  byRegion: GeologyCountItem[];
  byEndYear: GeologyYearCountItem[];
  cost: {
    totalMlnUsd: number;
    projectsWithCost: number;
    projectsWithoutCost: number;
  };
  works: {
    total: number;
    projectsWithWorks: number;
    byStatus: GeologyCountItem[];
    byYear: GeologyYearCountItem[];
  };
  /**
   * ⚠️ `trenchDone: 0` — «канава бўйича ҳеч ким ҳисобот бермаган» дегани,
   * «ноль бажарилган» эмас. Фарқни `*DoneReported` ажратади: нечта лойиҳа
   * шу кўрсаткич бўйича ҳақиқий қиймат бергани. `*DoneReported === 0` бўлса
   * тегишли фоиз `null` келади ва экранда «0%» деб кўрсатилмайди.
   */
  volumes2026: {
    projectsWithVolumes: number;
    drillPlan: number;
    drillDone: number;
    drillDoneReported: number;
    samplePlan: number;
    sampleDone: number;
    sampleDoneReported: number;
    trenchPlan: number;
    trenchDone: number;
    trenchDoneReported: number;
    labPlan: number;
    budgetMlnUsd: number;
    drillPercent: number | null;
    samplePercent: number | null;
    trenchPercent: number | null;
  };
}

/** `/geology-projects/dashboard` жавоби — панел учун ҳаммаси битта сўровда. */
export interface GeologyDashboard {
  projects: GeologyProjectRow[];
  summary: GeologySummary;
  meta: {
    source: string;
    /** ISO сана, масалан `"2026-04-14"`. */
    asOf: string;
  };
}

/* -------------------------------------------------------------------------- */
/* project-schedule — лойиҳа графиклари (Gantt)                                */
/* -------------------------------------------------------------------------- */

/**
 * Бу блок бэкенддаги `src/modules/project-schedule/project-schedule.types.ts`
 * нинг айнан кўзгуси.
 *
 * ⚠️ Иккита қоида бутун блок бўйлаб амал қилади:
 *  1. `progress`, `avgProgress`, `sourceProgress`, `financePercent` — **улуш
 *     0…1**, фоиз эмас. Экранга чиқаришда 100 га кўпайтирилади (адаптерда).
 *  2. Манбада катак тўлдирилмаган бўлса майдон `null` келади — **нол эмас**.
 */

/** Қатор тури: манбадаги иерархия шу билан тикланади. */
export type ProjectScheduleTaskKind = "root" | "group" | "task";

export interface ProjectScheduleTaskRow {
  id: number;
  kind: ProjectScheduleTaskKind;
  taskNo: number | null;
  name: string;
  responsible: string | null;
  /** `YYYY-MM-DD` */
  planStart: string | null;
  planEnd: string | null;
  durationDays: number | null;
  /** УЛУШ 0…1 (фоиз эмас) */
  progress: number | null;
  /** Манбада «Исключить = ДА» — ҳисобга кирмайдиган қатор. */
  excluded: boolean;
  note: string | null;
  actualEnd: string | null;
  /**
   * Манбадаги «Фарқ» устуни. **Иккита турли маънога эга**:
   *  - `actualEnd` бор бўлса — `planEnd − actualEnd`, яъни муддатдан неча кун
   *    олдин (мусбат) ёки кеч (манфий) якунлангани;
   *  - `actualEnd` йўқ бўлса — Excel'даги тирик `TODAY()` формуласи қолдиғи,
   *    яъни оддийгина `planEnd − бугун`. Бу «кечикди» дегани эмас.
   *
   * Шунинг учун адаптер уни фақат `actualEnd` билан бирга ўқийди.
   */
  diffDays: number | null;
  /** «Молиявий ҳолати» устуни ($). */
  amount: number | null;
  /** Юқоридаги босқич номи (`kind: "task"` учун — ўз босқичи). */
  parentName: string | null;
  sortOrder: number;
  /** Бэкенд ҳисоблайди: `planEnd` ўтган ва `progress < 1` (фақат `kind: "task"`). */
  isOverdue: boolean;
  /** Бэкенд ҳисоблайди: `planEnd` яқин 30 кун ичида ва `progress < 1`. */
  isDueSoon: boolean;
}

export interface ProjectScheduleFinanceRow {
  id: number;
  category: string;
  totalAmount: number | null;
  paidAmount: number | null;
  /**
   * `true` — тоифа эмас, «қолган сумма» қатори. Йиғиндига **кирмайди**
   * (бэкенд уни `financeTotal` дан аллақачон чиқарган).
   */
  isTotal: boolean;
  sortOrder: number;
}

/** Битта лойиҳанинг **ишлардан ҳисобланган** кўрсаткичлари. */
export interface ProjectScheduleStats {
  taskCount: number;
  groupCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  /** 0…1; иш бўлмаса `null`. */
  avgProgress: number | null;
  overdueCount: number;
  dueSoonCount: number;
  planStart: string | null;
  planEnd: string | null;
  /** `planEnd` гача қолган кун; ўтиб кетган бўлса манфий. */
  daysLeft: number | null;
  taskAmountTotal: number;
  /** Молия жадвали, `isTotal` қаторисиз ($). */
  financeTotal: number | null;
  financePaid: number | null;
  /** 0…1 */
  financePercent: number | null;
}

export interface ProjectScheduleRow {
  id: number;
  key: string;
  title: string;
  sourceFile: string;
  sourceSheet: string;
  totalCostUsd: number | null;
  /** Манбадаги илдиз қатор фоизи (0…1) — ҳисобланган `avgProgress` эмас. */
  sourceProgress: number | null;
  deadlineDate: string | null;
  totalDays: number | null;
  remainingDays: number | null;
  importedAt: string | null;
  stats: ProjectScheduleStats;
  tasks: ProjectScheduleTaskRow[];
  finance: ProjectScheduleFinanceRow[];
}

export interface ProjectScheduleSummary {
  projectCount: number;
  taskCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  /** Барча ишлар бўйича ўртача (лойиҳалар ўртачаси ЭМАС), 0…1. */
  avgProgress: number | null;
  overdueCount: number;
  dueSoonCount: number;
  totalCostUsd: number;
  financeTotal: number;
  financePaid: number;
  financePercent: number | null;
  planStart: string | null;
  planEnd: string | null;
  nextDeadlines: { key: string; title: string; planEnd: string; daysLeft: number }[];
}

/** `/project-schedule/dashboard` жавоби — панел учун ҳаммаси битта сўровда. */
export interface ProjectScheduleDashboard {
  projects: ProjectScheduleRow[];
  summary: ProjectScheduleSummary;
  meta: {
    /** Ҳисоб-китоб қайси кунга нисбатан қилингани (`YYYY-MM-DD`). */
    today: string;
    /** `dueSoon` ойнаси, кун. */
    dueSoonDays: number;
    /** Энг сўнгги импорт вақти (ISO); ҳеч қачон импорт қилинмаган бўлса `null`. */
    lastImportedAt: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* invest-deck — «Инв. лойиҳалар 2026-2030» тақдимоти                          */
/* -------------------------------------------------------------------------- */

/**
 * Бу блок бэкенддаги `src/modules/invest-deck/invest-deck.types.ts` нинг
 * айнан кўзгуси.
 *
 * ⚠️ Учта қоида бутун блок бўйлаб амал қилади:
 *
 *  1. Манбада катак тўлдирилмаган бўлса майдон `null` келади — **нол эмас**.
 *     88 лойиҳадан IRR фақат 34 тасида, NPV 33, ROI 34, йиллар жадвали эса
 *     37 тасида бор. Бу маълумот сифати муаммоси эмас, манбанинг ўз ҳолати.
 *
 *  2. `kind: "branch"` қатори — лойиҳа ЭМАС, технопарк филиали бўйича
 *     **йиғма** слайд: ундаги молия жадвали ўша филиалдаги лойиҳаларнинг
 *     суммаси. `production-report` даги `isTotal` билан айнан бир хил мантиқ —
 *     шунинг учун у ҳеч қандай йиғиндига қўшилмайди ва лойиҳалар рўйхатига
 *     аралаштирилмайди. Бэкенд `totals`/`byCluster`/`byFinanceSource` ни
 *     ҳисоблашда уни аллақачон чиқариб ташлаган.
 *
 *  3. Пул бирлиги ҳамма жойда битта — **млн АҚШ доллари** (`...MlnUsd`).
 *     Матнли жуфти (`...Text`) манбадаги ёзувни айнан сақлайди.
 */

/** `project` — битта лойиҳа слайди; `branch` — филиал бўйича йиғма слайд. */
export type InvestDeckKind = "project" | "branch";

/**
 * Молиялаштириш манбаининг каноник калити.
 *
 * Манбада битта манба турлича ёзилган («Хамкор»/«Ҳамкор», «ЎзТМК АЖ»/«ЎзТМК»),
 * шунинг учун йиғинди ёрлиқ бўйича эмас, шу калит бўйича ҳисобланади. Асл
 * ёзув `label` да қолади.
 */
export type InvestDeckSourceKey =
  | "uztmk"
  | "uzttj"
  | "credit"
  | "attracted"
  | "partner"
  | "other";

/** Рўйхат учун қисқа шакл — болалар массивларисиз, фақат сонлари билан. */
export interface InvestDeckProjectRow {
  id: number;
  /** Тақдимотдаги слайд рақами — тафсилот endpoint'ининг калити ва deep-link. */
  slideNo: number;
  kind: InvestDeckKind;
  title: string;
  /** Манбадаги ёзув — БОШ ҲАРФЛАРДА («ВОЛЬФРАМ КЛАСТЕРИ»). */
  clusterName: string;
  /** «филиали» сўзисиз: «Чирчиқ», «Оҳангарон». Филиали йўқ кластерда `null`. */
  clusterBranch: string | null;
  financeTotalText: string | null;
  financeTotalMlnUsd: number | null;
  irrText: string | null;
  irrPercent: number | null;
  npvText: string | null;
  npvMlnUsd: number | null;
  roiText: string | null;
  roiYears: number | null;
  sortOrder: number;
  /** Слайдда қайси блок БОР эканини билиш учун — `0` = блок умуман йўқ. */
  counts: {
    works: number;
    finance: number;
    kpis: number;
    yearValues: number;
  };
}

export interface InvestDeckWorkRow {
  id: number;
  sortOrder: number;
  task: string;
  /** Муддат манбадаги матн кўринишида; кўрсатилмаган бўлса `null`. */
  term: string | null;
}

export interface InvestDeckFinanceRow {
  id: number;
  sortOrder: number;
  /** Манбадаги асл ёзув. Гуруҳлаш учун эмас — фақат кўрсатиш учун. */
  label: string;
  sourceKey: InvestDeckSourceKey;
  valueText: string | null;
  valueMlnUsd: number | null;
}

export interface InvestDeckKpiRow {
  id: number;
  /** Манбадаги тартиб рақами — жадвал шу бўйича сараланган. */
  no: number;
  label: string;
  valueText: string;
}

/**
 * «Йиллар» жадвалининг битта катаги — **узун (long) шаклда**.
 *
 * ⚠️ `year` — СОН ЭМАС, САТР: манбада оралиқ ҳам учрайди («2029-2030»).
 * Бўш катак умуман келмайди (импорт уни ёзмайди), шунинг учун бурилган
 * жадвалда тешиклар бўлади — улар нолга айлантирилмайди.
 */
export interface InvestDeckYearValueRow {
  id: number;
  metric: string;
  year: string;
  valueText: string;
  valueNum: number | null;
  sortOrder: number;
}

/** `GET /invest-deck/:slideNo` жавоби — тўлиқ тафсилот. */
export interface InvestDeckProjectDetail extends InvestDeckProjectRow {
  works: InvestDeckWorkRow[];
  /** «Жами:» қатори бу ерда ЙЎҚ — у `financeTotalText`/`...MlnUsd` да. */
  finance: InvestDeckFinanceRow[];
  kpis: InvestDeckKpiRow[];
  years: InvestDeckYearValueRow[];
  /** Энг яқин мавжуд слайдлар — бўшлиқларни ҳисобга олади. */
  neighbors: { prev: number | null; next: number | null };
}

/** Кластер (+филиал) кесими. Битта кластер бир нечта қаторда бўлиши мумкин. */
export interface InvestDeckClusterStat {
  name: string;
  branch: string | null;
  /** Шу қатордаги лойиҳалар сони (`kind: "project"` бўйича). */
  projects: number;
  /** Биронта лойиҳада ҳам сон бўлмаса `null` — нол эмас. */
  financeMlnUsd: number | null;
}

/**
 * Молиялаштириш манбаси кесими.
 *
 * Рўйхат ДОИМ тўлиқ (олтита калит) ва доим бир хил тартибда келади — манба
 * базада учрамаса ҳам `count: 0` билан қайтади. Шунинг учун `count === 0`
 * бўлган қаторни чизмаслик қарори фронтда қабул қилинади.
 */
export interface InvestDeckSourceStat {
  sourceKey: InvestDeckSourceKey;
  label: string;
  totalMlnUsd: number | null;
  /** Шу манба учраган молия қаторлари сони. */
  count: number;
}

/** `/invest-deck/dashboard` жавоби — панел учун ҳаммаси битта сўровда. */
export interface InvestDeckDashboard {
  totals: {
    /** Фақат `kind: "project"` — филиал йиғмалари кирмайди. */
    projects: number;
    /** Турли `clusterName` сони (филиал бўйича бўлинмайди). */
    clusters: number;
    financeTotalMlnUsd: number | null;
  };
  byCluster: InvestDeckClusterStat[];
  byFinanceSource: InvestDeckSourceStat[];
  /** Лойиҳалар ҲАМ, филиал йиғмалари ҲАМ — ажратиш `kind` бўйича. */
  projects: InvestDeckProjectRow[];
  meta: {
    source: string;
    /** ISO сана, масалан `"2026-08-03"`. */
    asOf: string;
  };
}

/* -------------------------------------------------------------------------- */
/* export-targets — «Экспортнинг мақсадли кўрсаткичлари 2024-2030»             */
/* -------------------------------------------------------------------------- */

/**
 * Бу блок бэкенддаги `src/modules/export-targets/export-targets.types.ts`
 * нинг айнан кўзгуси. Манба — `1.1 Рынок - экспорт 2024-2030.xlsx`,
 * «экспорт» варағи: 8 маҳсулот × 8 давр = 64 катак.
 *
 * ⚠️ Учта қоида бутун блок бўйлаб амал қилади:
 *
 *  1. **2026 йил ИККИ МАРТА учрайди** ва бу хато эмас: `2026-actual`
 *     (январь–август, яъни ҚИСМАН йил) ва `2026-forecast` (тўлиқ йил
 *     прогнози). Шунинг учун даврнинг табиий калити йилнинг ўзи эмас,
 *     `periodKey` = йил + тур. Иккисини битта 2026 устунига йиғиш —
 *     икки марта ҳисоблаш; ёнма-ён вақт қаторига қўйиш эса сохта «ўсиш»
 *     кўрсатади. `kind` ва `note` айнан шуни ажратиш учун келади.
 *
 *  2. **`null` — нол ЭМАС.** 64 катакдан 42 таси тўлган, 22 таси бўш.
 *     2024 йилда фақат молибден, 2025 ва 2026 да вольфрам/молибден/рений
 *     бўйича маълумот бор. Бўш катакни нол деб чизиш «экспорт бор эди,
 *     кейин тушди» деган ёлғон манзара берарди.
 *
 *  3. **`volume` ни маҳсулотлар бўйлаб ҚЎШИБ БЎЛМАЙДИ** — ўлчов бирлиги
 *     маҳсулотга боғлиқ (`тонна` / `млн дона` / `минг тонна`). Фақат
 *     `valueThousandUsd` (минг АҚШ доллари) йиғиндиси маънога эга.
 */

/** `actual` — «(амалда)», рўй берган экспорт; `forecast` — «(прогноз)», мақсад. */
export type ExportTargetPeriodKind = "actual" | "forecast";

export interface ExportTargetPeriod {
  /** `2024-actual`, `2026-actual`, `2026-forecast`, … — `values[]` шу калит билан боғланади. */
  periodKey: string;
  year: number;
  kind: ExportTargetPeriodKind;
  /** Манбадаги матн: «2026 йил (амалда)». */
  label: string;
  /** «Январь-Август» — давр ҚИСМАН йил эканини айтади; бошқаларда `null`. */
  note: string | null;
  sortOrder: number;
  /**
   * Маҳсулот қаторларидан ҲИСОБЛАНГАН йиғинди (минг АҚШ доллари).
   * Биронта маҳсулотда ҳам қиймат бўлмаса `null` — нол эмас.
   *
   * ⚠️ Бу `sourceTotals[]` даги манба йиғиндисидан ФАРҚ қилиши мумкин;
   * иккаласи атайин алоҳида қайтарилади.
   */
  totalValueThousandUsd: number | null;
}

export interface ExportTargetProduct {
  /** Манбадаги «Т/р» (1…8) — `values[]` шу рақам билан боғланади. */
  rowNo: number;
  name: string;
  /** «тонна» / «млн дона» / «минг тонна». */
  unit: string | null;
  sortOrder: number;
}

export interface ExportTargetValue {
  rowNo: number;
  periodKey: string;
  /** ⚠️ `null` = маълумот ЙЎҚ, экспорт ноль эмас. */
  volume: number | null;
  valueThousandUsd: number | null;
}

/**
 * Экспорт географияси — битта ЙИЛ ва ўша йили экспорт қилинган давлатлар.
 *
 * ⚠️ Манбаси БОШҚА: бу маълумот Excel файлида йўқ, бэкендда алоҳида жадвалда
 * туради. Шунинг учун у `periods[]` билан боғланмаган ва боғланмаслиги ҳам
 * керак: географии бутун ЙИЛ учун, `periodKey` (амалда/прогноз) тушунчаси бу
 * ерда умуман йўқ. 2026 йил `periods` да ИККИ марта учрайди (`2026-actual`,
 * `2026-forecast`), бу рўйхатда эса БИР марта — `year` бўйича боғлаш рўйхатни
 * икки марта чиқарарди.
 *
 * ⚠️ Массивда фақат маълумот БОР йиллар бўлади (ҳозирча 2024–2026).
 * 2027–2030 учун ёзув умуман йўқ — бўш `countries: []` эмас. Уларни «0 та
 * давлат» деб кўрсатиш «у йили экспорт бўлмайди» деган ёлғон маъно берарди.
 */
export interface ExportTargetGeography {
  /** Оддий йил (2024), `periodKey` эмас. */
  year: number;
  /** Русча номлар, МАНБАДАГИ тартибда — алифбо бўйича қайта сараланмайди. */
  countries: string[];
  /** `countries.length` — бэкенд ҳисоблаб беради, базада сақланмайди. */
  count: number;
}

/** Манбадаги «ЖАМИ» қатори — ҳисобланган йиғинди билан солиштириш учун. */
export interface ExportTargetSourceTotal {
  periodKey: string;
  valueThousandUsd: number | null;
}

/** `GET /export-targets/dashboard` жавоби — панел учун ҳаммаси битта сўровда. */
export interface ExportTargetsDashboard {
  /** Ҳужжат сарлавҳаси (манбадаги A1 катаги). */
  title: string;
  periods: ExportTargetPeriod[];
  products: ExportTargetProduct[];
  /** `products × periods` ТЎЛИҚ тўри — бўш катаклар ҳам `null` билан келади. */
  values: ExportTargetValue[];
  sourceTotals: ExportTargetSourceTotal[];
  /**
   * Экспорт географияси, йил ЎСИШ тартибида. Жадвал билан боғлиқ эмас:
   * бошқа манбадан келади ва фақат географияси маълум йилларни қамрайди.
   */
  geography: ExportTargetGeography[];
  meta: {
    /** Импорт қилинган файл номи. */
    source: string;
  };
}

/* -------------------------------------------------------------------------- */
/* pr-media-kpi — «PR Media KPI — yillik reja»                                 */
/* -------------------------------------------------------------------------- */

/**
 * Бу блок бэкенддаги `src/modules/pr-media-kpi/pr-media-kpi.types.ts` нинг
 * айнан кўзгуси. Манба — `PR_Media_KPI.xlsx`, «Yillik xulosa» варағи:
 * 3 категория, 11 кўрсаткич.
 *
 * ⚠️ Тўртта қоида бутун блок бўйлаб амал қилади:
 *
 *  1. **Бу РЕЖА ҳужжати — фактик бажарилиш ЙЎҚ.** Манбада фақат мақсадлар
 *     бор, ҳеч қаерда «нечтаси бажарилди» ёзилмаган. Шунинг учун бу ерда
 *     «факт», «бажарилди %», «қолдиқ» каби майдон йўқ ва уни ўйлаб топиб
 *     ҳам бўлмайди: ҳисоблаш учун иккинчи манба мавжуд эмас. Панелда
 *     прогресс-бар чизиш — солиштирадиган факти бўлмаган сонни «эришилган»
 *     деб кўрсатиш бўларди.
 *
 *  2. **`null` — нол ЭМАС.** Сон матндан ажратилмаса `null` бўлиб қолади ва
 *     нолга айлантирилмайди. Энг муҳим ҳолат — Telegram: `cadenceText` =
 *     «Qamrov 30%», ундаги 30 ҚАМРОВ фоизи, даврий сон эмас. Шунинг учун
 *     `cadenceCount` = `null` (30 эмас) ва `yearlyComputed` = `null`.
 *
 *  3. **Матн ва сон бирга келади.** «240+» дан сон 240 ажратилади, лекин
 *     «+» («камида») фақат матнда сақланиб қолади. Шунинг учун экранда
 *     `yearlyTargetText` кўрсатилади, `yearlyTargetNum` эса диаграмма ва
 *     ҳисоб учун ишлатилади.
 *
 *  4. **Маълумотнинг ўзи ЛОТИН ёзувида** (`Tashqi PR`, `Har oy 10 ta`,
 *     `Obunachilar +50%`) — манбадагича қолади: таржима ҳам, транслитерация
 *     ҳам қилинмайди. Кириллга ўгирилгани фақат интерфейс матни.
 */

/** `month` — «Har oy …» (йилига 12 марта), `quarter` — «Har chorakda …» (йилига 4 марта). */
export type PrMediaKpiCadencePeriod = "month" | "quarter";

export interface PrMediaKpiItem {
  /** Барқарор калит: `tv`, `linkedin`, `telegram`, … — импорт шу бўйича upsert қилади. */
  key: string;
  /** `I` / `II` / `III`. */
  categoryNo: string;
  /** `Tashqi PR` / `Ijtimoiy tarmoqlar` / `Kontent` — лотин, манбадагича. */
  categoryName: string;
  /** Кўрсаткич номи — лотин, манбадагича. */
  indicator: string;
  /** Манбадаги МАТН: «Har oy 10 ta», «Qamrov 30%». */
  cadenceText: string;
  /**
   * `cadenceText` дан ажратилган сон (10).
   *
   * ⚠️ ФОИЗ сон сифатида олинмайди: «Qamrov 30%» да даврий сон ЙЎҚ, шунинг
   * учун бу ерда `null` — 30 эмас.
   */
  cadenceCount: number | null;
  /** «Har oy» → `month`, «Har chorakda» → `quarter`; аниқланмаса `null`. */
  cadencePeriod: PrMediaKpiCadencePeriod | null;
  /** Манбадаги МАТН: «120 ta», «240+», «1100+». */
  yearlyTargetText: string;
  /** `yearlyTargetText` дан ажратилган сон (120, 240, 1100). */
  yearlyTargetNum: number | null;
  /**
   * `cadenceCount` × йилдаги даврлар сони (ой → 12, чорак → 4).
   *
   * ⚠️ `yearlyTargetNum` дан ФАРҚ қилиши мумкин ва бу хато эмас — манбадаги
   * номувофиқлик. Иккаласи атайин алоҳида сақланади, бири иккинчисини
   * босиб кетмайди; фарқ қилганлари `mismatches[]` да рўйхатланади.
   */
  yearlyComputed: number | null;
  /** «Obunachilar +50%» — фақат ижтимоий тармоқларда; қолганларида `null`. */
  growthText: string | null;
  /** `growthText` дан ажратилган фоиз (50, 20). */
  growthPercent: number | null;
  /** Манбадаги қатор тартиби (1…11). */
  sortOrder: number;
}

export interface PrMediaKpiCategory {
  /** `I` / `II` / `III`. */
  no: string;
  /** Лотин, манбадагича. */
  name: string;
  /** Шу категориядаги кўрсаткичлар СОНИ — бэкенд рўйхатдан ҳисоблайди. */
  items: number;
  /**
   * `yearlyTargetNum` йиғиндиси. Биронта қаторда ҳам сон бўлмаса `null` —
   * 0 ЭМАС: «мақсад нол» ва «мақсад сонга айлантирилмади» бир хил эмас.
   *
   * ⚠️ Бу МАҚСАДЛАР йиғиндиси ва ўлчов бирлиги АРАЛАШ бўлиши мумкин:
   * «Ijtimoiy tarmoqlar» да у 1532 — ичида постлар сони (96+96+240) билан
   * бирга Telegram'нинг обуначилар кўрсаткичи (1100) ҳам бор. Шунинг учун
   * бу сон категориялараро таққослаш учун ЯРОҚСИЗ.
   */
  yearlyTotal: number | null;
}

/**
 * Арифметикаси мос келмаган қатор.
 *
 * Ҳозир битта: «Xalqaro nashrlar» — ҳар чоракда 4 та × 4 = 16, лекин манбада
 * йиллик мақсад 20 деб ёзилган. Манба ТУЗАТИЛМАГАН ва бу жимгина
 * йўқолмаслиги керак — шунинг учун алоҳида рўйхат. Манба янгиланганда
 * рўйхат узайиши мумкин.
 */
export interface PrMediaKpiMismatch {
  key: string;
  indicator: string;
  /** `cadenceCount` × даврлар сони. */
  computed: number;
  /** Манбада ёзилгани. */
  stated: number;
}

/** `GET /pr-media-kpi/dashboard` жавоби — панел учун ҳаммаси битта сўровда. */
export interface PrMediaKpiDashboard {
  /**
   * Ҳужжат сарлавҳаси — `PR Media KPI — yillik reja`.
   *
   * ⚠️ КОНСТАНТА: модулда ҳужжат даражасидаги жадвал йўқ, шунинг учун у
   * бэкенддаги `pr-media-kpi.constants.ts` дан келади, базадан эмас.
   */
  title: string;
  /** Манбадаги тартибда: I → II → III (алифбо эмас). */
  categories: PrMediaKpiCategory[];
  /** 11 та қатор, `sortOrder` бўйича. */
  items: PrMediaKpiItem[];
  /** Бўш массив = барча қаторда арифметика мос келди. */
  mismatches: PrMediaKpiMismatch[];
  meta: {
    /** Импорт қилинган файл номи — бу ҳам константа. */
    source: string;
  };
}

/* -------------------------------------------------------------------------- */
/* cameras — алоҳида модул, `production-report` нинг ёнида                     */
/* -------------------------------------------------------------------------- */

/**
 * Битта камера — `GET /cameras` жавобидаги ҳолида.
 *
 * ⚠️ Бу модул `{ success, data }` КОНВЕРТИНИ ишлатмайди: контроллер
 * `{ factories: [...] }` ни тўғридан-тўғри қайтаради (бэкенд:
 * `camera.controller.ts` → `renderFactoryCamerasPage`). Шунинг учун
 * `endpoints.ts` да бу ягона сўров `unwrap()` дан ўтмайди.
 *
 * `login`, `password` ва `stream_link` майдонлари бэкендда ЎЧИРИЛАДИ —
 * бу ерда ҳам йўқ ва кутилмайди.
 */
export interface CameraRow {
  id: number;
  factory_id: number;
  /** Кўпинча «Navoi 2 PTZ 10.85.0.202» — номнинг охирида IP туради. */
  model: string | null;
  brand: string | null;
  ip_address: string | null;
  /** WebRTC стримнинг калити. Бўлмаса катак стрим кўрсата олмайди. */
  stream_uuid: string | null;
  /** Масалан `https://tmkstream.bgs.uz`. */
  webrtc_server: string | null;
  /** Одатда `0`. `null` бўлса `0` деб олинади. */
  channel: number | null;
  has_ptz: boolean;
  status: "active" | "inactive" | "maintenance" | "broken";
  /** `upload` базасига нисбий йўл: `camera-screenshots/camera_4.jpg`. */
  screenshot_url: string | null;
}

/** Зaвод ва унинг камералари — жавобнинг бирламчи гуруҳлаши. */
export interface CameraFactoryGroup {
  id: number;
  name: string;
  cameras: CameraRow[];
}

/** `GET /cameras` жавоби. Конверт йўқ — юқоридаги изоҳга қаранг. */
export interface CamerasResponse {
  factories: CameraFactoryGroup[];
}

/* -------------------------------------------------------------------------- */
/* map — алоҳида модул, `production-report` нинг ёнида                         */
/* -------------------------------------------------------------------------- */

/**
 * `GET /map/objects` жавоби. Типлар бэкенднинг `src/modules/map/map.types.ts`
 * файлидан **кўчирилган** (ўйлаб топилмаган) ва жонли жавоб билан
 * солиштириб текширилган (2026-09-16, `https://tmk.bgs.uz/api/map/objects?lang=uz`).
 *
 * ═══ Битта массив, `type` дискриминатори ════════════════════════════════
 *
 * Уччала қатлам ҳам — завод/кон (`factory`), геология лойиҳаси (`geology`) ва
 * инвестиция лойиҳаси (`invest`) — БИТТА `items[]` массивида, бир хил
 * конвертда келади. Турга ХОС майдонлар `detail` ичида.
 */
export const MAP_ITEM_TYPES = ["factory", "geology", "invest"] as const;

export type MapItemType = (typeof MAP_ITEM_TYPES)[number];

/** `exact` — аҳамиятли сўзлар тўлиқ мос; `partial` — қисман/қўшни шакл. */
export type MapMatchConfidence = "exact" | "partial";

/** Координата қаердан олингани. `linked` — боғланган бошқа элементдан. */
export type MapCoordsSource = "own" | "linked";

/**
 * Нуқта қанчалик аниқ. `region` — ТАХМИНИЙ (вилоят маркази), у ерда бир
 * нечта лойиҳа устма-уст туради.
 *
 * ⚠️ `MapLinkRef.confidence` даги `exact` билан аралаштирманг: у боғланиш
 * ишончлилиги, бу эса ЖОЙЛАШУВ аниқлиги — бутунлай бошқа ўлчов.
 */
export type MapCoordsAccuracy = "exact" | "region";

/** Бошқа элементга ҳавола. `confidence` — боғланиш ЭВРИСТИК бўлгани учун. */
export interface MapLinkRef {
  type: MapItemType;
  /** Боғланган элементнинг `MapItem.id` си */
  id: string;
  name: string | null;
  confidence: MapMatchConfidence;
}

/**
 * Харитадаги битта элемент — уччала тур учун ҳам АЙНАН шу шакл.
 *
 * ⚠️ Координатаси йўқ элемент ҳам келади (`lat: null`) — ҳеч нарса ташлаб
 * юборилмайди. Жонли жавобда бундай элемент 8 та (ҳаммаси `geology`).
 */
export interface MapItem {
  /** Барқарор ва уникал: `factory-91`, `geology-12`, `invest-miskon` */
  id: string;
  type: MapItemType;
  /**
   * ⚠️ ЛОТИН ёзувида — `?lang=uz` сўралганда ҳам. Кириллча шакли
   * `nameCyrillic` да. Сводка бутунлай кирилл, шунинг учун адаптер доим
   * `nameCyrillic` ни афзал кўради.
   */
  name: string | null;
  /** Ўша номнинг манбадаги кириллча шакли. Жонли жавобда 55 тасида ҳам бор. */
  nameCyrillic: string | null;
  /** ЛОТИН */
  region: string | null;
  /** Жонли жавобда 5 та геология лойиҳасида `null`. */
  regionCyrillic: string | null;
  /** `region` нинг биринчи бўлаги (верguлгача) — вилоят кесими учун. ЛОТИН. */
  regionGroup: string | null;
  /**
   * КЎРСАТИШ учун кенглик/узунлик.
   *
   * ⚠️ Бу нуқта устма-уст тушиш сабабли озгина СИЛЖИТИЛГАН бўлиши мумкин
   * (`coordsDisplaced: true`). Базадаги қиймат доим `sourceLat`/`sourceLon` да.
   */
  lat: number | null;
  lon: number | null;
  /**
   * `true` — нуқта бошқа элемент билан устма-уст тушгани учун бэкенд томонидан
   * АТАЙИН силжитилган. Жонли жавобда 25 та.
   *
   * ⚠️ Фронтендда ИККИНЧИ марта силжитилмайди — қаранг: `MapCanvas`.
   */
  coordsDisplaced: boolean;
  /** Силжитишдан олдинги, базадаги ҳақиқий нуқта. */
  sourceLat: number | null;
  sourceLon: number | null;
  /**
   * `own` — элементнинг ўз координатаси; `linked` — боғланган элементдан
   * МЕРОС (таҳминий!); `null` — координата умуман йўқ.
   */
  coordsSource: MapCoordsSource | null;
  /** `coordsSource === 'linked'` бўлганда — манба элементнинг `id` си. */
  linkedFrom: string | null;
  /**
   * `exact` — аниқ объект координатаси; `region` — ТАХМИНИЙ, вилоят маркази;
   * `null` — координата йўқ, ёки у мерос, ёки базада аниқлик эълон қилинмаган.
   *
   * `coordsAccuracy !== null` бўлса `coordsSource` ДОИМ `'own'`.
   */
  coordsAccuracy: MapCoordsAccuracy | null;
  /**
   * Кимёвий белгилар (`["Au","Ag"]`).
   *
   * ⚠️ Жонли жавобда 55 элементнинг ҲАММАСИДА бўш (`[]`): геология жадвалида
   * кимёвий белги устуни йўқ, металл номлари эса `detail.metalsCyrillic` /
   * `detail.mineralCyrillic` да эркин матн ҳолида. Шунинг учун карточка
   * қаторлари `elements` устига қурилмайди.
   */
  elements: string[];
  /**
   * ЛОТИН. `factory` да техник ҳолат коди (ўгирилмайди), `geology` да гуруҳ
   * номи, `invest` да лойиҳа ҳолати.
   */
  status: string | null;
  /**
   * ⚠️ Номига қарамай ДОИМ кирилл эмас: `factory` да техник код
   * (`REGISTRATION`, `STARTED`), `invest` да лотин матн
   * (`Amalga oshirilayotgan loyiha`). Базадаги қиймат шундай — яширилмайди.
   */
  statusCyrillic: string | null;
  /**
   * УЛУШ 0…1 (фоиз ЭМАС). Жонли жавобда: `invest` да 7/7 тўлган,
   * `geology` да 46 тасида ҳам `null`, `factory` да биттасида `0`.
   */
  progress: number | null;
  costMlnUsd: number | null;
  markerIcon: string | null;
  /** Боғланган бошқа элементлар (турлар аралаш). */
  links: MapLinkRef[];
  /**
   * Турга хос тўлиқ маълумот — `type` га қараб таркиби бошқача, шунинг учун
   * тип `unknown`: ундан ўқишда тип текшируви қилинади, `as` билан
   * мажбурлаб ташланмайди (қаранг: `lib/adapters/mapObjects.ts`).
   *
   * Матн майдонларининг кириллча шакли `*Cyrillic` қўшимчали жуфтликда
   * (`fullName` / `fullNameCyrillic`).
   *
   * ⚠️ `invest` да реестрнинг `type` устуни бу ерда `investType` деб аталади:
   * юқоридаги `type` дискриминатор сифатида банд.
   */
  detail: Record<string, unknown>;
}

export interface MapCountItem {
  key: string | null;
  count: number;
}

export interface MapTypeCounts {
  factory: number;
  geology: number;
  invest: number;
}

export interface MapSummary {
  totalItems: number;
  byType: MapTypeCounts;
  /** Ўз координатаси бор элементлар. */
  withOwnCoords: number;
  /** Координатани боғланган элементдан мерос қилиб олганлар (таҳминий). */
  withLinkedCoords: number;
  /** Координатаси умуман йўқ — харитага нуқта сифатида тушмайди. */
  withoutCoords: number;
  linkedItems: number;
  totalLinks: number;
  byElement: MapCountItem[];
  byStatus: MapCountItem[];
  byRegion: MapCountItem[];
  byMarkerIcon: MapCountItem[];
}

/**
 * ⚠️ `lat`/`lon` бу ерда — МАНБАДАГИ (силжитилмаган) нуқта. Бу маълумот
 * сифати кўрсаткичи: «базада бу ёзувлар битта нуқтада».
 */
export interface MapDuplicateCoordGroup {
  lat: number;
  lon: number;
  items: { id: string; type: MapItemType; name: string | null }[];
}

export interface MapInvalidCoordItem {
  id: string;
  name: string | null;
  raw: string | null;
  reason: "unparseable" | "out-of-bounds";
  swappedWouldBeValid: boolean;
}

export interface MapRawValueItem {
  id: string;
  name: string | null;
  raw: string | null;
}

export interface MapTestRecordItem {
  id: string;
  name: string | null;
  reasons: string[];
}

export interface MapAmbiguousMatchItem {
  itemId: string;
  itemName: string | null;
  candidates: { id: string; name: string | null; score: number }[];
  chosenId: string;
}

export interface MapInvestDataIssue {
  id: string;
  name: string | null;
  issue: string;
}

export interface MapDataQuality {
  duplicateCoords: MapDuplicateCoordGroup[];
  invalidCoords: MapInvalidCoordItem[];
  malformedMarkerIcon: MapRawValueItem[];
  importanceLooksLikeType: MapRawValueItem[];
  missingObjectType: number;
  missingElements: number;
  possibleTestRecords: MapTestRecordItem[];
  ambiguousMatches: MapAmbiguousMatchItem[];
  /** Координатаси ҳам, боғланиши ҳам йўқ — харитага умуман тушмайди. */
  itemsWithoutAnyCoords: { id: string; type: MapItemType; name: string | null }[];
  investIssues: MapInvestDataIssue[];
}

/** Қайси фильтр қўлланганини жавобнинг ЎЗИДА айтади. */
export interface MapFiltersMeta {
  applied: boolean;
  layer: MapItemType[] | null;
  investType: string[] | null;
  excluded: MapTypeCounts;
  totalBeforeFilter: number;
}

export interface MapObjectsMeta {
  lang: string;
  generatedAt: string;
  counts: MapTypeCounts;
  filters: MapFiltersMeta;
  /** Боғлаш эвристик — ҳисоботда очиқ кўрсатилади. */
  matchStrategy: string;
  /**
   * ⚠️ ВАҚТИНЧАЛИК. `factory` жадвалида демо ёзувлар бор, шунинг учун жавобга
   * фақат РЕАЛ заводлар тушади. Демо ёзувлар базадан ўчирилгач бу уччала
   * майдон жавобдан бутунлай йўқолади — шунинг учун улар ихтиёрий.
   */
  factoryFilter?: "real-only";
  factoryFilterNote?: string;
  factoriesInDb?: number;
  factoriesFiltered?: number;
}

/** `GET /map/objects` жавоби — ҳаммаси битта сўровда (~148 КБ). */
export interface MapObjectsResponse {
  /** ҲАММАСИ шу ерда: factory + geology + invest. */
  items: MapItem[];
  summary: MapSummary;
  dataQuality: MapDataQuality;
  meta: MapObjectsMeta;
}
