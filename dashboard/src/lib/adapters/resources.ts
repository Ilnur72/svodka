import type {
  CisternRow,
  CisternTxRow,
  HydrogenRow,
  IngichkaDailyRow,
  IngichkaMonthlyRow,
  OgarokDailyRow,
  OgarokMonthlyRow,
} from "../../api/types";
import { dateLabel, dateTick, monthLabel, monthTick } from "../format";

/**
 * Огарок, Ингичка, цистерна ва водород бўлимлари учун view-model'лар.
 *
 * Огарок / Ингичка / Цистерна қийматлари ҳозирча текширилмаган
 * (`lib/dataQuality.ts` → `UNVERIFIED`): адаптер уларни ўзгартирмайди,
 * лекин интерфейс сон қийматларни `<Masked>` орқали яширади.
 */

/* -------------------------------------------------------------------------- */
/* огарок                                                                     */
/* -------------------------------------------------------------------------- */

export interface OgarokDay {
  day: string;
  label: string;
  full: string;
  time: string | null;
  machines: number;
  cups: number;
  physical: number;
}

export interface OgarokVM {
  days: OgarokDay[];
  total: number;
  machines: number;
  cups: number;
  deliveryDays: number;
  max: number;
  maxDay: string | null;
}

export function ogarokVM(
  daily: OgarokDailyRow[],
  monthly: OgarokMonthlyRow[],
  multiMonth: boolean,
): OgarokVM {
  const days: OgarokDay[] = [...daily]
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
    .map((r) => ({
      day: r.day,
      label: dateTick(r.day, multiMonth),
      full: dateLabel(r.day),
      time: r.time,
      machines: r.machines_count ?? 0,
      cups: r.cups_count ?? 0,
      physical: r.physical ?? 0,
    }));

  // Ойлик якун серверда алоҳида ҳисобланади — мавжуд бўлса ўша олинади.
  const total = monthly.length
    ? monthly.reduce((a, m) => a + (m.physical ?? 0), 0)
    : days.reduce((a, d) => a + d.physical, 0);
  const machines = monthly.length
    ? monthly.reduce((a, m) => a + (m.machines ?? 0), 0)
    : days.reduce((a, d) => a + d.machines, 0);
  const cups = monthly.length
    ? monthly.reduce((a, m) => a + (m.cups ?? 0), 0)
    : days.reduce((a, d) => a + d.cups, 0);
  const deliveryDays = monthly.length
    ? monthly.reduce((a, m) => a + (m.days ?? 0), 0)
    : new Set(days.map((d) => d.day)).size;

  let max = 0;
  let maxDay: string | null = null;
  for (const d of days) {
    if (d.physical > max) {
      max = d.physical;
      maxDay = d.day;
    }
  }

  return { days, total, machines, cups, deliveryDays, max, maxDay };
}

/* -------------------------------------------------------------------------- */
/* ингичка                                                                    */
/* -------------------------------------------------------------------------- */

export interface IngStop {
  key: string;
  day: string;
  full: string;
  start: string | null;
  end: string | null;
  hours: number;
  note: string;
}

export interface IngVM {
  stops: IngStop[];
  totalHours: number;
  events: number;
  daysWithStops: number;
  /** Тайёрлик коэффициенти: 3 фабрика × кунлар × 24 соат базасида. */
  availability: number | null;
}

export function ingichkaVM(
  daily: IngichkaDailyRow[],
  monthly: IngichkaMonthlyRow[],
  daysInPeriod: number,
): IngVM {
  const stops: IngStop[] = [...daily]
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
    .map((r, i) => ({
      key: `${r.day}#${r.repair_start ?? ""}#${i}`,
      day: r.day,
      full: dateLabel(r.day),
      start: r.repair_start,
      end: r.repair_end,
      hours: r.hours ?? 0,
      note: r.note ?? "",
    }));

  const totalHours = monthly.length
    ? monthly.reduce((a, m) => a + (m.hours ?? 0), 0)
    : stops.reduce((a, s) => a + s.hours, 0);
  const events = monthly.length
    ? monthly.reduce((a, m) => a + (m.stops ?? 0), 0)
    : stops.length;
  const daysWithStops = monthly.length
    ? monthly.reduce((a, m) => a + (m.days ?? 0), 0)
    : new Set(stops.map((s) => s.day)).size;

  const base = daysInPeriod * 24 * 3;
  return {
    stops,
    totalHours,
    events,
    daysWithStops,
    availability: base > 0 ? Math.max(0, (1 - totalHours / base) * 100) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* цистерналар                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Ўлчов бирлиги гуруҳи. Уччаласи ўзаро қўшилмайди ва бир диаграммага
 * ҳам тушмайди — ҳар бири ўз картасида, ўз шкаласида кўрсатилади.
 */
export type CisternKind = "cistern" | "tonne" | "other";

/**
 * Транспорт тури → ўлчов бирлиги гуруҳи.
 *
 * Ягона манба — сервернинг `transport_type` майдони (`Справочники.xlsx` →
 * «Цифстерны SPR» → `Тип транспорта`). Илгари бу ном бўйича regex билан
 * тахмин қилинарди (`/на\s*машин/`), лекин у `Серная к-та` ни ҳам,
 * `Вывоз кеков` ни ҳам «цистерна сони» деб хато таснифларди — шунинг учун
 * regex'га **fallback ҳам қилинмайди**: тури номаълум бўлса `other`.
 *
 * Сервер қиймати айнан уч сатр: `«цистерны»`, `«машины»`, `«Другое»`
 * (биринчи иккитаси кичик, учинчиси бош ҳарф билан ёзилади — солиштириш
 * шунинг учун регистрга боғлиқ эмас). Справочникка тўртинчи тур қўшилса у
 * `other` га тушади, яъни панел йиқилмайди ва қатор йўқолмайди.
 */
export function cisternKind(transportType: string | null | undefined): CisternKind {
  switch (String(transportType ?? "").trim().toLowerCase()) {
    case "машины":
      return "tonne";
    case "цистерны":
      return "cistern";
    default:
      // «Другое» ва боғланмаган (`null`) ёзувлар — бирлиги номаълум.
      return "other";
  }
}

export const CISTERN_KIND_LABEL: Record<CisternKind, string> = {
  cistern: "Цистерна сони (дона)",
  tonne: "Автотранспортда келтирилган (тонна)",
  other: "Бошқа юклар (манба бирлигида)",
};

/**
 * Ўлчов бирлигининг ёзилиши. `other` да бирлик номаълум — ўйлаб топилмайди,
 * сон бирликсиз кўрсатилади.
 */
export const CISTERN_KIND_UNIT: Record<
  CisternKind,
  { tile: string | null; short: string; series: string }
> = {
  cistern: { tile: "цистерна", short: " цис.", series: "Цистерна" },
  tonne: { tile: "т", short: " т", series: "Тонна" },
  other: { tile: null, short: "", series: "Қиймат" },
};

/** Номи ҳам, тури ҳам номаълум қатор шу ном билан кўринади — йўқолиб кетмайди. */
const UNKNOWN_NAME = "Номаълум юк";

/** Экранда кўринадиган ном: аввал `Реагент`, у йўқ бўлса варақ устуни. */
const positionName = (r: { reagent: string | null; material: string | null }): string =>
  r.reagent?.trim() || r.material?.trim() || UNKNOWN_NAME;

export interface CisternPosition {
  /** Гуруҳ калити — `«ном|тур»`. Ой кесимидаги `byKey` да ҳам айни шу калит. */
  key: string;
  /** Кўрсатиладиган ном — модда номи (`Реагент`). */
  name: string;
  /** Сервердаги транспорт тури, ўзгартирилмаган ҳолда; боғланмаган ёзувда `null`. */
  transport: string | null;
  value: number;
  deliveries: number;
  kind: CisternKind;
}

/**
 * Битта модда варақда икки устун билан келади (`Азотная к-та цистерны` ва
 * `Азотная к-та на машине(т)`). Улар **қўшилмайди** — бири цистерна сони,
 * иккинчиси тонна. Шунинг учун гуруҳлаш калити «модда + тур».
 */
const positionKey = (name: string, kind: CisternKind): string => `${name}|${kind}`;

/** Аралаш рўйхатда (масалан устки карточкаларда) турни ажратиб турадиган ёрлиқ. */
export const cisternLabel = (p: { name: string; transport: string | null }): string =>
  p.transport ? `${p.name} (${p.transport})` : p.name;

export interface CisternMonth {
  month: string;
  label: string;
  full: string;
  /** Калит — `CisternPosition.key`, яъни «модда + тур». */
  byKey: Record<string, number>;
}

export interface CisternTx {
  key: string;
  day: string;
  full: string;
  time: string | null;
  /**
   * Реестр — қатор даражасидаги манба кўриниши, шунинг учун бу ерда варақ
   * устунининг номи ўзгартирилмасдан қолади (ёнида «манба файл» устуни бор).
   * Йиғинди кўринишларда эса модда номи ишлатилади.
   */
  material: string;
  value: number;
  source: string;
}

export interface CisternVM {
  positions: CisternPosition[];
  months: CisternMonth[];
  tx: CisternTx[];
  txTotal: number;
  totalDeliveries: number;
}

export function cisternVM(
  rows: CisternRow[],
  txRows: CisternTxRow[],
  txTotal: number,
): CisternVM {
  const byPosition = new Map<string, CisternPosition>();
  const byMonth = new Map<string, Record<string, number>>();

  for (const r of rows) {
    const kind = cisternKind(r.transport_type);
    const name = positionName(r);
    const key = positionKey(name, kind);

    const p = byPosition.get(key) ?? {
      key,
      name,
      transport: r.transport_type?.trim() || null,
      value: 0,
      deliveries: 0,
      kind,
    };
    p.value += r.value ?? 0;
    p.deliveries += r.deliveries ?? 0;
    byPosition.set(key, p);

    const slot = r.month ?? r.day ?? "";
    if (!slot) continue;
    const month = byMonth.get(slot) ?? {};
    month[key] = (month[key] ?? 0) + (r.value ?? 0);
    byMonth.set(slot, month);
  }

  return {
    positions: [...byPosition.values()].sort((a, b) => b.value - a.value),
    months: [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, byKey]) => ({
        month,
        label: monthTick(month),
        full: monthLabel(month),
        byKey,
      })),
    tx: txRows.map((r, i) => ({
      key: `${r.day}#${r.time ?? ""}#${r.material ?? ""}#${i}`,
      day: r.day,
      full: dateLabel(r.day),
      time: r.time,
      material: r.material?.trim() || positionName(r),
      value: r.value ?? 0,
      source: r.source_file,
    })),
    txTotal,
    totalDeliveries: [...byPosition.values()].reduce((a, p) => a + p.deliveries, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* водород / газ                                                              */
/* -------------------------------------------------------------------------- */

export interface HydrogenPoint {
  key: string;
  label: string;
  full: string;
  value: number;
}

export interface HydrogenVM {
  points: HydrogenPoint[];
  total: number;
  max: number;
  maxKey: string | null;
}

export function hydrogenVM(rows: HydrogenRow[], multiMonth: boolean): HydrogenVM {
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const key = r.day ?? r.month ?? "";
    if (!key) continue;
    byKey.set(key, (byKey.get(key) ?? 0) + (r.value ?? 0));
  }
  const daily = rows.some((r) => r.day);
  const points = [...byKey.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({
      key,
      label: daily ? dateTick(key, multiMonth) : monthTick(key),
      full: daily ? dateLabel(key) : monthLabel(key),
      value,
    }));

  let max = 0;
  let maxKey: string | null = null;
  for (const p of points) {
    if (p.value > max) {
      max = p.value;
      maxKey = p.full;
    }
  }
  return {
    points,
    total: points.reduce((a, p) => a + p.value, 0),
    max,
    maxKey,
  };
}

export interface HydrogenObject {
  name: string;
  total: number;
}

export function hydrogenObjects(rows: HydrogenRow[]): HydrogenObject[] {
  const byName = new Map<string, number>();
  for (const r of rows) {
    const name = r.object ?? "—";
    byName.set(name, (byName.get(name) ?? 0) + (r.value ?? 0));
  }
  return [...byName.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}
