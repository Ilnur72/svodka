import type { ElectricityObjectRow, ElectricityTypeRow } from "../../api/types";
import { isEnergySubtotal } from "../dataQuality";
import { dateLabel, dateTick, monthLabel, monthTick } from "../format";

/**
 * Электр энергия: API жавобидан панел кутадиган кўринишга ўтказиш.
 *
 * Барча йиғиндилардан «ЭНЦ общ.» (`type: "Белгиланмаган"` / `object: "ЭНЦ общ."`)
 * сатри чиқарилади — у алоҳида истеъмолчи эмас, тўрт бўлинманинг (ЭНЦ, ВКЦ,
 * ЦПК, ЭРЦ) йиғиндиси. Уни қатор сифатида қўшиш энергияни икки марта
 * санашга олиб келади.
 *
 * Ҳозир бэкенд бу сатрни ўзи чиқариб ташлайди, шунинг учун филтр амалда ҳеч
 * нарсани ушламайди — регрессия қайтса ушлаб қолиш учун қолдирилган.
 */
export const EXTERNAL_TYPE = "Внешние потребители";

export interface EnergyPoint {
  key: string;
  /** Ўқдаги қисқа белги. */
  label: string;
  /** Тултипдаги тўлиқ ном. */
  full: string;
  internal: number;
  external: number;
  total: number;
}

export interface EnergyTrendVM {
  points: EnergyPoint[];
  internalTotal: number;
  externalTotal: number;
  total: number;
  granularity: "daily" | "monthly";
  /** Йиғиндидан чиқарилган такрорий сатрлар ҳажми — изоҳда кўрсатилади. */
  excluded: number;
}

export function energyTrend(
  rows: ElectricityTypeRow[],
  granularity: "daily" | "monthly",
  multiMonth: boolean,
): EnergyTrendVM {
  const byKey = new Map<string, { internal: number; external: number }>();
  let excluded = 0;

  for (const r of rows) {
    const key = r.day ?? r.month ?? "";
    if (!key) continue;
    const kwh = r.kwh ?? 0;
    if (isEnergySubtotal(r.type)) {
      excluded += kwh;
      continue;
    }
    const slot = byKey.get(key) ?? { internal: 0, external: 0 };
    if (r.type === EXTERNAL_TYPE) slot.external += kwh;
    else slot.internal += kwh;
    byKey.set(key, slot);
  }

  const points: EnergyPoint[] = [...byKey.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, v]) => ({
      key,
      label: granularity === "daily" ? dateTick(key, multiMonth) : monthTick(key),
      full: granularity === "daily" ? dateLabel(key) : monthLabel(key),
      internal: v.internal,
      external: v.external,
      total: v.internal + v.external,
    }));

  const internalTotal = points.reduce((a, p) => a + p.internal, 0);
  const externalTotal = points.reduce((a, p) => a + p.external, 0);

  return {
    points,
    internalTotal,
    externalTotal,
    total: internalTotal + externalTotal,
    granularity,
    excluded,
  };
}

/**
 * Худди `energyTrend`, лекин манба `groupBy=object` кесими.
 *
 * Нега керак: серверда `ЭНЦ общ.` йиғинди сатри `groupBy=type` кесимида
 * «Чирчик завод» ичига қўшиб юборилган (4 645 458 + 2 978 788 = 7 624 246),
 * шунинг учун уни тур кесимида ажратиб бўлмайди. `groupBy=object` да эса у
 * алоҳида сатр бўлиб қолган — иккала муҳитда ҳам. Шу сабабли ички/ташқи
 * бўлиниш обьект кесимидан ҳисобланади.
 *
 * @param all      барча обьектлар (`groupBy=object`)
 * @param external фақат ташқи истеъмолчилар (`groupBy=object&type=Внешние потребители`)
 */
export function energyTrendFromObjects(
  all: ElectricityObjectRow[],
  external: ElectricityObjectRow[],
  granularity: "daily" | "monthly",
  multiMonth: boolean,
): EnergyTrendVM {
  const externalNames = new Set(external.map((r) => r.object));
  const byKey = new Map<string, { internal: number; external: number }>();
  let excluded = 0;

  for (const r of all) {
    const key = r.day ?? r.month ?? "";
    if (!key) continue;
    const kwh = r.kwh ?? 0;
    if (isEnergySubtotal(r.object)) {
      excluded += kwh;
      continue;
    }
    const slot = byKey.get(key) ?? { internal: 0, external: 0 };
    if (externalNames.has(r.object)) slot.external += kwh;
    else slot.internal += kwh;
    byKey.set(key, slot);
  }

  const points: EnergyPoint[] = [...byKey.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, v]) => ({
      key,
      label: granularity === "daily" ? dateTick(key, multiMonth) : monthTick(key),
      full: granularity === "daily" ? dateLabel(key) : monthLabel(key),
      internal: v.internal,
      external: v.external,
      total: v.internal + v.external,
    }));

  const internalTotal = points.reduce((a, p) => a + p.internal, 0);
  const externalTotal = points.reduce((a, p) => a + p.external, 0);

  return {
    points,
    internalTotal,
    externalTotal,
    total: internalTotal + externalTotal,
    granularity,
    excluded,
  };
}

export interface EnergyObject {
  name: string;
  total: number;
}

/** Обьектлар кесими: ойлар бўйича йиғилади, йиғинди сатрлари чиқарилади. */
export function energyObjects(rows: ElectricityObjectRow[]): EnergyObject[] {
  const byName = new Map<string, number>();
  for (const r of rows) {
    if (isEnergySubtotal(r.object)) continue;
    byName.set(r.object, (byName.get(r.object) ?? 0) + (r.kwh ?? 0));
  }
  return [...byName.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export const indexOfMax = (a: number[]): number =>
  a.length === 0 ? -1 : a.indexOf(Math.max(...a));

export const indexOfMin = (a: number[]): number =>
  a.length === 0 ? -1 : a.indexOf(Math.min(...a));
