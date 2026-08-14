import { apiGet } from "./client";
import type {
  CisternRow,
  CisternTxRow,
  ElectricityObjectRow,
  ElectricityTypeRow,
  Envelope,
  FiltersData,
  HydrogenRow,
  IngichkaDailyRow,
  IngichkaMonthlyRow,
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

export const getSummary = (r: Range, signal?: AbortSignal): Promise<SummaryData> =>
  unwrap(apiGet<Envelope<SummaryData>>("/summary", { ...r }, signal));

export const getProductionTree = (
  r: Range,
  opts: { depth?: "plant" | "workshop" | "product" } = {},
  signal?: AbortSignal,
): Promise<TreeData> =>
  unwrap(apiGet<Envelope<TreeData>>("/production/tree", { ...r, depth: opts.depth }, signal));

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

/** Битта позициянинг кунлик қаторлари (`product` — ILIKE қидирув). */
export async function getNarastayka(
  r: Range,
  opts: { product?: string; limit?: number; page?: number } = {},
  signal?: AbortSignal,
): Promise<{ rows: NarastaykaRow[]; total: number }> {
  const body = await apiGet<PagedEnvelope<NarastaykaRow>>(
    "/narastayka",
    { ...r, product: opts.product, limit: opts.limit, page: opts.page },
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

export const getSalesMonthly = (r: Range, signal?: AbortSignal): Promise<SalesMonthlyRow[]> =>
  unwrap(apiGet<Envelope<SalesMonthlyRow[]>>("/sales/monthly", { ...r }, signal));

export const getSalesProducts = (r: Range, signal?: AbortSignal): Promise<SalesProductRow[]> =>
  unwrap(apiGet<Envelope<SalesProductRow[]>>("/sales/products", { ...r }, signal));
