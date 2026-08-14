import type { Status } from "../types";

/**
 * Сон форматлаш эски дашбоарддан ўзгаришсиз кўчирилган — экрандаги ҳар бир
 * рақам текширилган манба билан бир хил кўринишда қолиши учун.
 * Минглик ажратгич — пробел, ўнлик — вергул: `5 664`, `252,94`.
 */
export function nf(v: number | null | undefined, d = 0): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  const neg = v < 0;
  const abs = Math.abs(v);
  const s = abs.toFixed(d);
  const parts = s.split(".");
  const i = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const f = parts[1];
  return (neg ? "−" : "") + i + (f ? "," + f : "");
}

/**
 * Қиймат **яхлитланмайди** — манбада қандай бўлса шундай кўрсатилади.
 *
 * Нега керак: масалан «Вольфрамовые штабики из покупного концен.» факти
 * 14,108 т. Аввалги `smart()` уни 14,11 га айлантириб қўярди ва экрандаги
 * сон манбадаги сон билан мос келмасди.
 *
 * `String(v)` JS'нинг энг қисқа тўғри кўринишини беради (14.108 → "14.108",
 * 0.1+0.2 → "0.30000000000000004" эмас, чунки бу ерга келадиган қийматлар
 * API'дан ўқилган, ҳисобланмаган). Фақат ажратгич ва вергул қўйилади.
 */
export function exact(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  const neg = v < 0;
  const s = String(Math.abs(v));
  if (s.includes("e")) return nf(v, 6); // жуда кичик/катта — илмий кўриниш
  const [int, frac] = s.split(".");
  const i = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (neg ? "−" : "") + i + (frac ? "," + frac : "");
}

/**
 * Ихчам кўриниш — фақат ўқ белгилари ва жой тор бўлган ерлар учун.
 * Экрандаги **қиймат** ҳеч қачон бундан ўтмайди: у `exact()` билан чиқади.
 */
export function smart(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (Number.isInteger(v) && a < 1e7) return nf(v, 0);
  if (a >= 1000) return nf(v, 0);
  if (a >= 100) return nf(v, 1);
  if (a >= 1) return nf(v, 2);
  return nf(v, 3);
}

export const pctTxt = (p: number | null | undefined): string =>
  p === null || p === undefined ? "—" : nf(p, 1) + "%";

/** Режа бажарилиши чегаралари: ≥100 яхши, 85–99 диққат, <85 паст. */
export const statusOf = (p: number | null | undefined): Status =>
  p === null || p === undefined ? "mute" : p >= 100 ? "good" : p >= 85 ? "warn" : "crit";

/** Карточкадаги 3px чизиқ учун CSS ранг токени. */
export const stripeOf = (p: number | null | undefined): string =>
  p === null || p === undefined
    ? "var(--rule)"
    : p >= 100
      ? "var(--good)"
      : p >= 85
        ? "var(--warn)"
        : "var(--crit)";

/** Фоиз матни учун ранг токени (фон эмас, матн ранги). */
export const inkTokenOf = (p: number | null | undefined): string =>
  p === null || p === undefined
    ? "var(--ink-3)"
    : p >= 100
      ? "var(--good-ink)"
      : p >= 85
        ? "var(--warn-ink)"
        : "var(--crit-ink)";

export const M_UZ = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const monthIndex = (month: string): number => Number(month.slice(5, 7)) - 1;

/** `"2026-05"` → `"Май"`. */
export const monthShort = (month: string): string => M_UZ[monthIndex(month)] ?? month;

/**
 * Диаграмма ўқи учун қисқартма: `"2026-09"` → `"Сен"`.
 * Тўлиқ номи (йили билан) тултипда қолади — 10–20 ойли даврда тўлиқ номлар
 * ўқда бир-бирининг устига чиқиб кетади.
 */
export const monthTick = (month: string): string =>
  (M_UZ[monthIndex(month)] ?? month).slice(0, 3);

/** `"2026-05"` → `"Май 2026"`. */
export const monthLabel = (month: string): string =>
  `${monthShort(month)} ${month.slice(0, 4)}`;

/** `"2026-05-12"` → `"12-май 2026"`. */
export function dateLabel(iso: string): string {
  if (!iso || iso.length < 10) return iso || "—";
  const day = Number(iso.slice(8, 10));
  return `${day}-${(M_UZ[monthIndex(iso)] ?? "").toLowerCase()} ${iso.slice(0, 4)}`;
}

/**
 * Кунлик диаграмма ўқи учун қисқа белги: битта ой танланганда фақат кун
 * рақами, бир нечта ойда — `кун.ой` (акс ҳолда «1» такрорланиб қоларди).
 */
export const dateTick = (iso: string, withMonth: boolean): string =>
  withMonth ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : String(Number(iso.slice(8, 10)));

/** Даврнинг ўқиладиган номи: «Май 2026» ёки «Май 2026 — Июнь 2026». */
export function periodLabel(months: string[]): string {
  if (months.length === 0) return "—";
  if (months.length === 1) return monthLabel(months[0]);
  return `${monthLabel(months[0])} — ${monthLabel(months[months.length - 1])}`;
}

/**
 * Диаграмма ўқи учун ихчам сон: `54 811 646` → `54,8 млн`.
 * Фақат ўқ белгиларида ишлатилади — тултип, жадвал ва плиткаларда аниқ
 * қиймат қолади.
 */
export function compactNum(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return nf(v / 1e9, 1) + " млрд";
  if (a >= 1e6) return nf(v / 1e6, 1) + " млн";
  if (a >= 1e4) return nf(v / 1e3, 0) + " минг";
  return smart(v);
}

/** Ишорали ўзгариш матни: «+12,4%» / «−3,1%». */
export function deltaTxt(a: number, b: number): string {
  if (!a) return "—";
  const dp = ((b - a) / a) * 100;
  return (dp >= 0 ? "+" : "−") + nf(Math.abs(dp), 1) + "%";
}
