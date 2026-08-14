import { useCallback, useEffect, useState } from "react";

/**
 * Ҳисобот даври. Ойлар рўйхати `/filters` жавобидаги `dateRange` дан
 * генерация қилинади — интерфейсда қаттиқ ёзилган ой йўқ (локал базада 2 ой,
 * продакшнда 20 ой бўлиши мумкин).
 *
 * Ҳолат URL'да сақланади (`?from=&to=`), шунда даврни ҳавола билан улашиш
 * мумкин бўлади.
 */
export interface Period {
  from: string;
  to: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

export const monthStart = (month: string): string => `${month}-01`;

export function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  // Кейинги ойнинг 0-куни = жорий ойнинг охирги куни.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** `dateRange` дан `["2025-01", …, "2026-08"]`. */
export function monthsInRange(min: string, max: string): string[] {
  if (!DATE_RE.test(min) || !DATE_RE.test(max)) return [];
  const out: string[] = [];
  const [y0, m0] = min.slice(0, 7).split("-").map(Number);
  const [y1, m1] = max.slice(0, 7).split("-").map(Number);
  let y = y0;
  let m = m0;
  // Ҳимоя: нотўғри диапазонда чексиз цикл бўлмасин.
  for (let guard = 0; guard < 600 && (y < y1 || (y === y1 && m <= m1)); guard++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Танланган даврга тушадиган ойлар. */
export const monthsOf = (period: Period, all: string[]): string[] =>
  all.filter((m) => m >= monthOf(period.from) && m <= monthOf(period.to));

export const periodOfMonths = (first: string, last: string): Period => ({
  from: monthStart(first),
  to: monthEnd(last),
});

/* -------------------------------------------------------------------------- */
/* тайёр даврлар                                                              */
/* -------------------------------------------------------------------------- */

export type PresetId = "current" | "prev" | "last3" | "ytd" | "all";

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "current", label: "жорий ой" },
  { id: "prev", label: "ўтган ой" },
  { id: "last3", label: "3 ой" },
  { id: "ytd", label: "йил бошидан" },
  { id: "all", label: "бутун тарих" },
];

/**
 * «Жорий ой» — базадаги энг сўнгги ой (календарь ой эмас): маълумот
 * одатда бир неча кун/ҳафта кечикиб киритилади, шунинг учун календарь ойга
 * боғланиш бўш экран берарди.
 */
export function presetPeriod(id: PresetId, months: string[]): Period | null {
  if (months.length === 0) return null;
  const last = months[months.length - 1];
  switch (id) {
    case "current":
      return periodOfMonths(last, last);
    case "prev": {
      if (months.length < 2) return null;
      const prev = months[months.length - 2];
      return periodOfMonths(prev, prev);
    }
    case "last3": {
      // Базада 3 ойдан кам бўлса тугма таклиф қилинмайди — акс ҳолда у
      // «бутун тарих» билан бир хил бўлиб, фойдаланувчини чалғитарди.
      if (months.length < 3) return null;
      return periodOfMonths(months[months.length - 3], last);
    }
    case "ytd": {
      const year = last.slice(0, 4);
      const inYear = months.filter((m) => m.startsWith(year));
      if (inYear.length < 2) return null;
      return periodOfMonths(inYear[0], last);
    }
    case "all":
      return months.length < 2 ? null : periodOfMonths(months[0], last);
    default:
      return null;
  }
}

export function activePreset(period: Period, months: string[]): PresetId | null {
  for (const { id } of PRESETS) {
    const p = presetPeriod(id, months);
    if (p && p.from === period.from && p.to === period.to) return id;
  }
  return null;
}

/** Даврни мавжуд ойлар чегарасига келтиради. */
export function clampPeriod(period: Period | null, months: string[]): Period {
  if (months.length === 0) return period ?? { from: "", to: "" };
  const fallback = periodOfMonths(months[months.length - 1], months[months.length - 1]);
  if (!period || !DATE_RE.test(period.from) || !DATE_RE.test(period.to)) return fallback;

  let a = monthOf(period.from);
  let b = monthOf(period.to);
  if (a > b) [a, b] = [b, a];
  const first = months.find((m) => m >= a) ?? months[months.length - 1];
  const lastCandidates = months.filter((m) => m <= b);
  const last = lastCandidates.length ? lastCandidates[lastCandidates.length - 1] : first;
  if (first > last) return periodOfMonths(last, last);
  return periodOfMonths(first, last);
}

/* -------------------------------------------------------------------------- */
/* URL ҳолати                                                                 */
/* -------------------------------------------------------------------------- */

function readUrlPeriod(): Period | null {
  const q = new URLSearchParams(window.location.search);
  const from = q.get("from");
  const to = q.get("to");
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  return { from, to };
}

function writeUrlPeriod(p: Period): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get("from") === p.from && url.searchParams.get("to") === p.to) return;
  // Бошқа параметрлар (масалан `?theme=dark`) ва хэшдаги таб сақланади.
  url.searchParams.set("from", p.from);
  url.searchParams.set("to", p.to);
  window.history.replaceState(null, "", url.toString());
}

export function usePeriodState(months: string[]): [Period, (p: Period) => void] {
  const [period, setPeriod] = useState<Period>(() => clampPeriod(readUrlPeriod(), months));

  // URL — ташқи тизим: ҳолат ўзгарганда уни синхронлаб турамиз.
  useEffect(() => {
    if (period.from && period.to) writeUrlPeriod(period);
  }, [period]);

  const select = useCallback(
    (p: Period) => setPeriod((prev) => (prev.from === p.from && prev.to === p.to ? prev : p)),
    [],
  );

  return [period, select];
}
