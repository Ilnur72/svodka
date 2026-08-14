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

export interface CisternMaterial {
  material: string;
  value: number;
  deliveries: number;
  /** Ўлчов бирлиги: цистерна сони ёки автотранспортдаги тонна. */
  kind: "cistern" | "tonne";
}

/**
 * Материал номидан ўлчов бирлигини аниқлаш.
 *
 * `цистерны` варағида иккита турдаги устун бор: цистерна **сони** (дона) ва
 * автомашинада келтирилган **тонна**. Уларни битта диаграммага қўйиб бўлмайди —
 * юзлаб тонна ёнида бир нечта цистерна устуни кўринмай кетади.
 *
 * Ном қоидаси `Справочники.xlsx` → «Цифстерны SPR» билан мос: «на машине» /
 * «на машину» бор бўлса — тонна, акс ҳолда цистерна сони.
 */
export const cisternKind = (material: string): "cistern" | "tonne" =>
  /на\s*машин/i.test(String(material ?? "")) ? "tonne" : "cistern";

export const CISTERN_KIND_LABEL: Record<"cistern" | "tonne", string> = {
  cistern: "Цистерна сони (дона)",
  tonne: "Автотранспортда келтирилган (тонна)",
};

export interface CisternMonth {
  month: string;
  label: string;
  full: string;
  byMaterial: Record<string, number>;
}

export interface CisternTx {
  key: string;
  day: string;
  full: string;
  time: string | null;
  material: string;
  value: number;
  source: string;
}

export interface CisternVM {
  materials: CisternMaterial[];
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
  const byMaterial = new Map<string, CisternMaterial>();
  const byMonth = new Map<string, Record<string, number>>();

  for (const r of rows) {
    const m = byMaterial.get(r.material) ?? {
      material: r.material,
      value: 0,
      deliveries: 0,
      kind: cisternKind(r.material),
    };
    m.value += r.value ?? 0;
    m.deliveries += r.deliveries ?? 0;
    byMaterial.set(r.material, m);

    const key = r.month ?? r.day ?? "";
    if (!key) continue;
    const slot = byMonth.get(key) ?? {};
    slot[r.material] = (slot[r.material] ?? 0) + (r.value ?? 0);
    byMonth.set(key, slot);
  }

  return {
    materials: [...byMaterial.values()].sort((a, b) => b.value - a.value),
    months: [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, byMat]) => ({
        month,
        label: monthTick(month),
        full: monthLabel(month),
        byMaterial: byMat,
      })),
    tx: txRows.map((r, i) => ({
      key: `${r.day}#${r.time ?? ""}#${r.material}#${i}`,
      day: r.day,
      full: dateLabel(r.day),
      time: r.time,
      material: r.material,
      value: r.value ?? 0,
      source: r.source_file,
    })),
    txTotal,
    totalDeliveries: [...byMaterial.values()].reduce((a, m) => a + m.deliveries, 0),
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
