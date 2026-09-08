import { ApiError, apiGet, FINANCE_BASE, GAS_BASE, GEOLOGY_BASE, SOLAR_BASE } from "./client";
import type {
  BalanceResponse,
  ChainResponse,
  CisternRow,
  CisternTxRow,
  DailyResponse,
  DashboardData,
  ElectricityObjectRow,
  ElectricityTypeRow,
  Envelope,
  FiltersData,
  FinanceReportDashboard,
  GasDayLogRow,
  GasEnvelope,
  GasObjectRow,
  GasStats,
  GeologyDashboard,
  HydrogenRow,
  IngichkaDailyRow,
  IngichkaMonthlyRow,
  KpiResponse,
  MobplanResponse,
  NarastaykaRow,
  OgarokDailyRow,
  OgarokMonthlyRow,
  PagedEnvelope,
  ProductionMonthlyRow,
  SalesMonthlyRow,
  SalesProductRow,
  SolarEnvelope,
  SolarKpiRow,
  SolarStationRow,
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
 * «Технологик металлар ишлаб чиқариш» дашборди — металл, ой ва завод
 * кесимида тайёр йиғма кўрсаткичлар, битта сўровда
 * (`production-report/docs/METAL_PRODUCTION_DASHBOARD_API.md`).
 *
 * `unit`/`excludeDobycha` атайин параметрга чиқарилмаган: бэкенднинг ўз
 * стандарт қиймати (`тн`, `true`) шу дашборд учун мўлжалланган ва уни
 * ўзгартириш турли ўлчов бирлигини аралаштириб юбориши ёки хомашё қазиш
 * ҳажмини (тайёр маҳсулотдан ўнлаб баробар катта) қўшиб қўйиши мумкин
 * (докс 2.1-бўлим).
 */
export const getDashboard = (
  r: Range,
  opts: {
    plant?: string;
    workshop?: string;
    material?: string;
    category?: string;
    process?: string;
  } = {},
  signal?: AbortSignal,
): Promise<DashboardData> =>
  unwrap(apiGet<Envelope<DashboardData>>("/dashboard", { ...r, ...opts }, signal));

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

/**
 * «Кадрлар режаси» — штат жадвали ва 24 ойлик ёллаш режаси.
 *
 * **Параметрсиз**: манба — битта ҳужжатнинг жорий ҳолати, вақт қатори эмас,
 * шунинг учун юқоридаги давр танлагичи бу сўровга таъсир қилмайди. Сервер
 * `forbidNonWhitelisted` билан ишлайди — `from`/`to` қўшилса `400` қайтади.
 *
 * Базага ҳали импорт қилинмаган бўлса жавоб `200` билан, лекин бўш келади
 * (`rows: []`, `source: null`) — бу хато эмас, «маълумот киритилмаган» ҳолати.
 */
export const getMobplan = (signal?: AbortSignal): Promise<MobplanResponse> =>
  unwrap(apiGet<Envelope<MobplanResponse>>("/mobplan", {}, signal));

/* -------------------------------------------------------------------------- */
/* gas-integration                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Газ модулининг конвертини очиш.
 *
 * `unwrap` дан фарқи — `success` текширилади: бу контроллер хатони ўзи ушлаб,
 * HTTP `200` билан `{ success: false, error }` қайтаради, `data` эса умуман
 * келмайди (`GasEnvelope` изоҳига қаранг). Текширилмаса панелга `undefined`
 * тушиб, «маълумот йўқ» билан «сервер хатоси» аралашиб кетарди.
 *
 * `ApiError` нинг статуси шу сабабли `200`: ҳақиқий HTTP статус шу — хато
 * танада келган. Бу `NotAvailableError` (404) билан аралашмайди.
 */
const unwrapGas = async <T>(p: Promise<GasEnvelope<T>>): Promise<T> => {
  const body = await p;
  if (!body.success || body.data === undefined) {
    throw new ApiError(
      body.error
        ? `Газ маълумотини ўқиб бўлмади: ${body.error}`
        : "Газ маълумотини ўқиб бўлмади.",
      200,
    );
  }
  return body.data;
};

/**
 * Ўлчов нуқталари справочниги.
 *
 * Ҳозирча экранда ишлатилмайди: кунлик ўлчовлар жавобида объект `gasObject`
 * сифатида бирга келади, шунинг учун панелга иккинчи сўров керак эмас. Қатор
 * шу қаватда қолдирилди — бу файл API'нинг тўлиқ типли кўзгуси
 * (`getSalesMonthly` изоҳига қаранг).
 */
export const getGasObjects = (signal?: AbortSignal): Promise<GasObjectRow[]> =>
  unwrapGas(apiGet<GasEnvelope<GasObjectRow[]>>("/objects", {}, signal, GAS_BASE));

/**
 * Кунлик газ ўлчовлари.
 *
 * ⚠️ Серверда `limit` **йўқ** — `from`/`to` доим берилади, акс ҳолда бутун
 * тарих битта жавобда келади. Сана формати `YYYY-MM-DD`.
 *
 * `corrected: true` — корреkция жадвалидан ўқийди (`GetTubeCorrDay`).
 * Параметр фақат `true` бўлганда юборилади: бэкенд уни `=== 'true'` деб
 * солиштиради, `false` матни эса кераксиз шовқин бўларди.
 */
export const getGasDayLogs = (
  r: Range,
  opts: { objectId?: number; corrected?: boolean } = {},
  signal?: AbortSignal,
): Promise<GasDayLogRow[]> =>
  unwrapGas(
    apiGet<GasEnvelope<GasDayLogRow[]>>(
      "/day-logs",
      { ...r, objectId: opts.objectId, corrected: opts.corrected ? "true" : undefined },
      signal,
      GAS_BASE,
    ),
  );

/**
 * Импорт ҳолати — даврга боғлиқ эмас.
 *
 * Панелда фақат бўш ҳолатни аниқлаштириш учун: «танланган даврда ўлчов йўқ»
 * билан «ўлчовлар тизимга ҳали умуман келмаган» бир хил экран эмас.
 */
export const getGasStats = (signal?: AbortSignal): Promise<GasStats> =>
  unwrapGas(apiGet<GasEnvelope<GasStats>>("/stats", {}, signal, GAS_BASE));

/* -------------------------------------------------------------------------- */
/* fusion-solar — қуёш станциялари                                            */
/* -------------------------------------------------------------------------- */

/**
 * Қуёш модулининг конвертини очиш.
 *
 * `unwrapGas` билан бир хил сабабга кўра `success` текширилади (контроллер
 * хатони HTTP `200` ичида қайтаради), устига **иккинчи текширув** бор:
 * `data` нинг `null` бўлиши. Бу модулда сервис хатода `null` қайтаради,
 * контроллер эса уни `success: true` билан ўраб юборади — текширилмаса
 * панелга «маълумот йўқ» деб бўш экран чиқиб, сервер хатоси кўринмай қоларди.
 *
 * `unwrapGas` билан бирлаштирилмади: иккови икки хил бэкенд модулининг
 * контракти ва бир-биридан мустақил ўзгаради; бу ерда қўшимча `null`
 * текшируви ҳам бор.
 */
const unwrapSolar = async <T>(p: Promise<SolarEnvelope<T>>): Promise<T> => {
  const body = await p;
  if (!body.success || body.data === undefined || body.data === null) {
    throw new ApiError(
      body.error
        ? `Қуёш станциялари маълумотини ўқиб бўлмади: ${body.error}`
        : "Қуёш станциялари маълумотини ўқиб бўлмади.",
      200,
    );
  }
  return body.data;
};

/**
 * Станциялар рўйхати — **базадан** (`getAllStations`), ташқи тизимга чиқмайди.
 *
 * Параметр йўқ: жавобда барча станциялар келади. Давр танлагичига ҳам боғлиқ
 * эмас — бу справочник, вақт қатори эмас, шунинг учун панелда доимий калит
 * билан бир марта сўралади.
 *
 * ⚠️ Ёндош `/station-list` **ишлатилмайди**: у ҳар сўровда ташқи тизимга
 * жонли боради (секин ва интеграция созланмаган бўлса `503`).
 */
export const getSolarStations = (signal?: AbortSignal): Promise<SolarStationRow[]> =>
  unwrapSolar(apiGet<SolarEnvelope<SolarStationRow[]>>("/stations", {}, signal, SOLAR_BASE));

/**
 * Кунлик ўлчовлар — **базадан**, сана оралиғи бўйича.
 *
 * `startDate` ва `endDate` — **мажбурий**: берилмаса сервер `200` билан
 * `{ success: false, error }` қайтаради (`unwrapSolar` уни хатога
 * айлантиради). Шунинг учун бу ерда иккови ҳам доим юборилади.
 *
 * Ёндош `/kpi` **атайин ишлатилмаган**: у бир бошқа нарса — ташқи тизимга
 * жонли чиқади, битта `stationCode` талаб қилади ва сана оралиғини қабул
 * қилмайди.
 *
 * Йўл `db-` префикси билан: шу модулнинг ўз конвенцияси (`db-devices`,
 * `db-device-data` — базадан ўқийдиган endpoint'лар).
 */
export const getSolarKpi = (
  r: Range,
  opts: { stationCode?: string } = {},
  signal?: AbortSignal,
): Promise<SolarKpiRow[]> =>
  unwrapSolar(
    apiGet<SolarEnvelope<SolarKpiRow[]>>(
      "/db-kpi",
      { startDate: r.from, endDate: r.to, stationCode: opts.stationCode },
      signal,
      SOLAR_BASE,
    ),
  );

/**
 * Ўлчовлар мавжуд бўлган сана чегараси — бўш ҳолатни аниқлаштириш учун.
 *
 * «Танланган даврда ўлчов йўқ» билан «ўлчовлар тизимга ҳали умуман келмаган»
 * бир хил экран эмас: биринчисида раҳбар бошқа даврни танлайди, иккинчисида
 * кутади. Газ бўлимида бу фарқни `getGasStats` беради.
 *
 * ⚠️ Қуёш модулида `stats` каби енгил endpoint йўқ, шунинг учун чегара
 * **ўша `db-kpi`** сўровига жуда кенг оралиқ бериб аниқланади. Шу сабабли
 * бу сўров панелда фақат давр бўш чиққанда ишга тушади (`useQuery` нинг
 * `enabled` байроғи) — одатдаги ҳолатда қўшимча трафик йўқ.
 *
 * Юқори чегара жорий йилдан бир йил олдинга олинади: сана қаттиқ ёзилса,
 * бир неча йилдан кейин у жимгина эскириб қоларди.
 */
export const getSolarKpiSpan = (signal?: AbortSignal): Promise<SolarKpiRow[]> =>
  getSolarKpi(
    { from: "2000-01-01", to: `${new Date().getUTCFullYear() + 1}-12-31` },
    {},
    signal,
  );

/* -------------------------------------------------------------------------- */
/* finance-report — алоҳида модул, `production-report` нинг ёнида             */
/* -------------------------------------------------------------------------- */

/**
 * «Молиявий кўрсаткичлар» бўлими учун 7 ойлик (Январь–Июль, йилсиз) манба.
 *
 * **Параметрсиз**: манба вақт қатори бўлса ҳам, у ҳозирча битта қатъий
 * қамров (7 ой) — юқоридаги давр танлагичи бу ерга таъсир қилмайди, худди
 * `getMobplan` каби.
 */
export const getFinanceReport = (signal?: AbortSignal): Promise<FinanceReportDashboard> =>
  unwrap(apiGet<Envelope<FinanceReportDashboard>>("/dashboard", {}, signal, FINANCE_BASE));

/* -------------------------------------------------------------------------- */
/* geology-projects — алоҳида модул, `production-report` нинг ёнида           */
/* -------------------------------------------------------------------------- */

/**
 * «Геология лойиҳалари» бўлими учун ягона манба: лойиҳалар, кесимлар ва
 * манба ҳужжати ҳақидаги маълумот битта сўровда келади.
 *
 * **Параметрсиз**: манба — 14.04.2026 ҳолатидаги битта тақдимот, вақт қатори
 * эмас. Шунинг учун юқоридаги давр танлагичи бу бўлимга таъсир қилмайди —
 * худди `getFinanceReport` ва `getMobplan` каби.
 *
 * Ёндош `GET /geology-projects` (ишларсиз ва ҳажмларсиз енгил рўйхат)
 * **атайин ишлатилмайди**: панелга ишлар ва ҳажмлар ҳам керак, иккита сўров
 * эса шу битта жавобнинг қисми бўларди.
 */
export const getGeologyDashboard = (signal?: AbortSignal): Promise<GeologyDashboard> =>
  unwrap(apiGet<Envelope<GeologyDashboard>>("/dashboard", {}, signal, GEOLOGY_BASE));
