import { apiGet } from "./client";
import type {
  BalanceResponse,
  ChainResponse,
  CisternRow,
  CisternTxRow,
  DailyResponse,
  ElectricityObjectRow,
  ElectricityTypeRow,
  Envelope,
  FiltersData,
  HydrogenRow,
  IngichkaDailyRow,
  IngichkaMonthlyRow,
  KpiResponse,
  NarastaykaRow,
  OgarokDailyRow,
  OgarokMonthlyRow,
  PagedEnvelope,
  ProductionMonthlyRow,
  SalesMonthlyRow,
  SalesProductRow,
  SummaryData,
  TreeData,
} from "./types";

/**
 * Ҳар бир endpoint учун типли функция. Панеллар шу қаватдан пастга
 * тушмайди — URL, параметр номи ва конверт (`{success, data}`) шу ерда қолади.
 */

export interface Range {
  from: string;
  to: string;
}

const unwrap = async <T>(p: Promise<Envelope<T>>): Promise<T> => (await p).data;

export const getFilters = (signal?: AbortSignal): Promise<FiltersData> =>
  unwrap(apiGet<Envelope<FiltersData>>("/filters", {}, signal));

/**
 * Корхона миқёсидаги йиғма кўрсаткичлар.
 *
 * Ҳозирча экранда ишлатилмайди: у таянган «Корхона миқёсидаги якуний
 * кўрсаткичлар» блоки «Металлар баланси» сегментидан олиб ташланган. Қатор шу
 * қаватда қолдирилди — бу файл API'нинг тўлиқ типли кўзгуси (`getSalesMonthly`
 * изоҳига қаранг).
 */
export const getSummary = (r: Range, signal?: AbortSignal): Promise<SummaryData> =>
  unwrap(apiGet<Envelope<SummaryData>>("/summary", { ...r }, signal));

export const getProductionTree = (
  r: Range,
  opts: { depth?: "plant" | "workshop" | "product" } = {},
  signal?: AbortSignal,
): Promise<TreeData> =>
  unwrap(apiGet<Envelope<TreeData>>("/production/tree", { ...r, depth: opts.depth }, signal));

/**
 * Ой кесимидаги ишлаб чиқариш. Ҳозирча экранда ишлатилмайди — «Ойлик тренд»
 * блоки олиб ташланган. Тип ва имзо API кўзгуси сифатида сақланади.
 */
export const getProductionMonthly = (
  r: Range,
  opts: { level?: "plant" | "workshop" } = {},
  signal?: AbortSignal,
): Promise<ProductionMonthlyRow[]> =>
  unwrap(
    apiGet<Envelope<ProductionMonthlyRow[]>>(
      "/production/monthly",
      { ...r, level: opts.level },
      signal,
    ),
  );

/**
 * Кунлик (детал) қаторлар.
 *
 *  - `product` — ILIKE қидирув, яқин номли позицияларни ҳам ушлайди;
 *  - `workshop` — цехнинг каноник коди (бэкендда `COALESCE(f.name_correct,
 *    f.name)`), яъни `/production/tree` даги `workshops[].code` билан айнан
 *    бир хил қиймат;
 *  - `plant` — завод (`f.main_object`). «Белгиланмаган» заводда `main_object`
 *    бўш бўлгани учун у бу параметр билан изланмайди.
 *
 * Жавоб `for_day DESC` тартибида саҳифаланади — `limit` етмаса энг **эски**
 * кунлар тушиб қолади, энг сўнгги кун эса ҳар доим тўлиқ келади.
 */
export async function getNarastayka(
  r: Range,
  opts: { product?: string; workshop?: string; plant?: string; limit?: number; page?: number } = {},
  signal?: AbortSignal,
): Promise<{ rows: NarastaykaRow[]; total: number }> {
  const body = await apiGet<PagedEnvelope<NarastaykaRow>>(
    "/narastayka",
    {
      ...r,
      product: opts.product,
      workshop: opts.workshop,
      plant: opts.plant,
      limit: opts.limit,
      page: opts.page,
    },
    signal,
  );
  return { rows: body.data, total: body.total };
}

export const getElectricityByType = (
  r: Range,
  opts: { period?: "monthly" | "daily" } = {},
  signal?: AbortSignal,
): Promise<ElectricityTypeRow[]> =>
  unwrap(
    apiGet<Envelope<ElectricityTypeRow[]>>(
      "/electricity",
      { ...r, period: opts.period ?? "monthly", groupBy: "type" },
      signal,
    ),
  );

export const getElectricityByObject = (
  r: Range,
  opts: { type?: string; period?: "monthly" | "daily" } = {},
  signal?: AbortSignal,
): Promise<ElectricityObjectRow[]> =>
  unwrap(
    apiGet<Envelope<ElectricityObjectRow[]>>(
      "/electricity",
      { ...r, period: opts.period ?? "monthly", groupBy: "object", type: opts.type },
      signal,
    ),
  );

export const getHydrogen = (
  r: Range,
  opts: { kind?: "hydrogen" | "gas"; period?: "monthly" | "daily"; groupBy?: "object" } = {},
  signal?: AbortSignal,
): Promise<HydrogenRow[]> =>
  unwrap(
    apiGet<Envelope<HydrogenRow[]>>(
      "/hydrogen",
      { ...r, kind: opts.kind ?? "hydrogen", period: opts.period, groupBy: opts.groupBy },
      signal,
    ),
  );

export const getCisterns = (
  r: Range,
  opts: { period?: "monthly" | "daily" } = {},
  signal?: AbortSignal,
): Promise<CisternRow[]> =>
  unwrap(
    apiGet<Envelope<CisternRow[]>>("/cisterns", { ...r, period: opts.period ?? "monthly" }, signal),
  );

export async function getCisternsList(
  r: Range,
  opts: { limit?: number; page?: number } = {},
  signal?: AbortSignal,
): Promise<{ rows: CisternTxRow[]; total: number }> {
  const body = await apiGet<PagedEnvelope<CisternTxRow>>(
    "/cisterns/list",
    { ...r, limit: opts.limit, page: opts.page },
    signal,
  );
  return { rows: body.data, total: body.total };
}

export const getOgarokMonthly = (r: Range, signal?: AbortSignal): Promise<OgarokMonthlyRow[]> =>
  unwrap(apiGet<Envelope<OgarokMonthlyRow[]>>("/ogarok", { ...r, period: "monthly" }, signal));

export const getOgarokDaily = (r: Range, signal?: AbortSignal): Promise<OgarokDailyRow[]> =>
  unwrap(apiGet<Envelope<OgarokDailyRow[]>>("/ogarok", { ...r, period: "daily" }, signal));

export const getIngichkaMonthly = (r: Range, signal?: AbortSignal): Promise<IngichkaMonthlyRow[]> =>
  unwrap(apiGet<Envelope<IngichkaMonthlyRow[]>>("/ingichka", { ...r, period: "monthly" }, signal));

export const getIngichkaDaily = (r: Range, signal?: AbortSignal): Promise<IngichkaDailyRow[]> =>
  unwrap(apiGet<Envelope<IngichkaDailyRow[]>>("/ingichka", { ...r, period: "daily" }, signal));

/**
 * Ой кесимидаги СГП. Ҳозирча экранда ишлатилмайди — СГП панели маҳсулот
 * кесимидан (`/sales/products`) қурилган. Қатор шу қаватда қолдирилди:
 * бу файл API'нинг тўлиқ типли кўзгуси. Тренд кераклигида **`byUnit`**
 * устига қурилсин, `value_base` устига эмас (`SalesMonthlyRow` изоҳи).
 */
export const getSalesMonthly = (r: Range, signal?: AbortSignal): Promise<SalesMonthlyRow[]> =>
  unwrap(apiGet<Envelope<SalesMonthlyRow[]>>("/sales/monthly", { ...r }, signal));

export const getSalesProducts = (r: Range, signal?: AbortSignal): Promise<SalesProductRow[]> =>
  unwrap(apiGet<Envelope<SalesProductRow[]>>("/sales/products", { ...r }, signal));

/**
 * Металлар баланси — технологик занжир (хомашё → тайёр маҳсулот) ва ҳар бир
 * босқичда режа/факт. Жавоб ой кесимида келади: `months` даги ҳар бир ой
 * ҳар бир босқичнинг `values` калитида бор, маълумот бўлмаса `null`.
 *
 * Endpoint серверда ҳали бўлмаслиги мумкин — 404 `NotAvailableError` билан
 * ажратилади ва бўлим «серверда йўқ» ҳолатини кўрсатади, панел йиқилмайди.
 */
export const getBalance = (r: Range, signal?: AbortSignal): Promise<BalanceResponse> =>
  unwrap(apiGet<Envelope<BalanceResponse>>("/balance", { ...r }, signal));

/**
 * «Паспорт показателей» — 45 кўрсаткич битта жавобда, ой кесимида.
 *
 * `from`/`to` ойлик: жавобдаги `months` — сўралган оралиққа тушган ва камида
 * битта манбада ёзуви бор ойлар. Қиймат ойлар бўйича **қўшилмайди** (турли
 * бирлик, айримлари эса қолдиқ), шунинг учун панел битта ойни танлаб
 * кўрсатади — қаранг `adapters/kpi.ts` → `kpiMonth()`.
 *
 * Endpoint серверда бўлмаса 404 → `NotAvailableError`, бўлим «серверда йўқ»
 * ҳолатини кўрсатади ва қолган бўлимлар ишлашда давом этади.
 */
export const getKpi = (r: Range, signal?: AbortSignal): Promise<KpiResponse> =>
  unwrap(apiGet<Envelope<KpiResponse>>("/kpi", { ...r }, signal));

/**
 * «Цехлар занжири» — бутун комбинат технологик занжири (`Тех.цепочки.xlsx`
 * тузилмаси + базадаги қийматлар). `/balance` нинг кенгайтирилган ўринбосари:
 * W, Mo ва Re ни бирга, устига омбор, чиқинди, тўхташ ва ресурс сарфини беради.
 *
 * Жавоб ой кесимида: `months` даги ҳар бир ой ҳар бир босқичнинг `values`
 * калитида бор, маълумот бўлмаса `null`.
 */
export const getChain = (r: Range, signal?: AbortSignal): Promise<ChainResponse> =>
  unwrap(apiGet<Envelope<ChainResponse>>("/chain", { ...r }, signal));

/**
 * «Кунлик сводка» — 8 йўналиш, кунлар кесимида (`daily_svodka_log`).
 *
 * ⚠️ `from`/`to` **фақат `YYYY-MM-DD`** форматида; `YYYY-MM` берилса сервер
 * `400` қайтаради. Иккиси ҳам берилмаса жавоб охирги 31 кун билан келади ва
 * буни `range.source: "default"` кўрсатади.
 *
 * Жавоб ҳажми катта (31 кун ≈ 835 KB), шунинг учун чақирувчи оралиқни ўзи
 * чегаралайди — қаранг `adapters/daily.ts` → `dailyRange()`.
 */
export const getDaily = (r: Range, signal?: AbortSignal): Promise<DailyResponse> =>
  unwrap(apiGet<Envelope<DailyResponse>>("/daily", { ...r }, signal));
