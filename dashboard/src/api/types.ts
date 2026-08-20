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
