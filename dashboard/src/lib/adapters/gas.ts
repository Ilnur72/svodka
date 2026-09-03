import type { GasDayLogRow } from "../../api/types";
import { dateLabel, dateTick } from "../format";

/**
 * Табиий газ — кунлик ўлчовлар (`gas-integration/day-logs`) → панел кўринишига.
 *
 * ═══ Нега «корреkция қилинган ҳажм» ва фақат у ═══════════════════════════
 *
 * Ҳисоблагич иккита ҳажм беради: хом (`tubehrdayVolume`) ва стандарт
 * шароитга келтирилган (`tubehrdayCorrvolume`). Ҳисоб-китобда иккинчиси
 * ишлатилади. Шунинг учун бу ерда **фақат ўша** ўқилади; у тўлдирилмаган
 * қатор йиғиндига кирмайди ва **хом ҳажм билан алмаштирилмайди** — улар
 * бир хил ўлчов эмас, аралаштирилса экрандаги сон манбага мос келмай қоларди.
 * Ташлаб юборилган қаторлар сони `skipped` да қолади ва панелда очиқ айтилади.
 *
 * ═══ Нега `Number()` алоҳида текширилади ════════════════════════════════
 *
 * Postgres `numeric` устуни TypeORM орқали **мато** бўлиб келади (`"1234.5"`),
 * `null` эса шундайлигича. `Number(null)` → `0`, яъни тўғридан-тўғри
 * конверсия «маълумот йўқ» ни сохта нолга айлантирган бўларди. Нол сарф ва
 * ўлчов йўқлиги — бутунлай бошқа нарса, шунинг учун `null`/`NaN` ажратилади.
 *
 * ═══ Объект номи ════════════════════════════════════════════════════════
 *
 * Ном сифатида `objectName` ишлатилади. У бўш бўлса `tubeGuid` экранга
 * **чиқарилмайди** — у ташқи тизимнинг техник калити, раҳбар учун маъноси
 * йўқ. Ўрнига нейтрал ўрин эгаллагич қўйилади, лекин қатор тушириб
 * қолдирилмайди: унинг ҳажми жами билан бирга ҳисобланади.
 */

/** Манбада ном тўлдирилмаган ўлчов нуқтаси. */
export const GAS_UNNAMED = "Номи кўрсатилмаган ўлчов нуқтаси";

/** `numeric` мато → сон. Бўш, `null` ва нотўғри қиймат — `null`, нол эмас. */
function num(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export interface GasDayPoint {
  /** `'YYYY-MM-DD'`. */
  key: string;
  /** Диаграмма ўқи учун қисқа белги. */
  label: string;
  /** Тултип ва жадвал учун тўлиқ сана. */
  full: string;
  value: number;
}

export interface GasObjectTotal {
  key: string;
  name: string;
  total: number;
  /** Шу нуқта бўйича ўлчов келган кунлар сони. */
  days: number;
  /** Манбада номи тўлдирилмаган — нейтрал рангда кўрсатилади. */
  unnamed: boolean;
}

export interface GasVM {
  /** Кунлар — ўсиш тартибида. Ўлчов келмаган кун умуман йўқ (нол сифатида қўшилмайди). */
  points: GasDayPoint[];
  /** Ўлчов нуқталари — ҳажми бўйича камайиш тартибида. */
  objects: GasObjectTotal[];
  total: number;
  max: number;
  /** Энг юқори кун — тўлиқ сана кўринишида. */
  maxKey: string | null;
  /** Ҳажми тўлдирилмагани учун ҳисобга кирмаган қаторлар сони. */
  skipped: number;
}

/** `multiMonth` — давр бир нечта ойни қамрайдими: ўқ белгисига ой қўшилади. */
export function gasVM(rows: GasDayLogRow[], multiMonth: boolean): GasVM {
  const byDay = new Map<string, number>();
  const byObject = new Map<string, GasObjectTotal>();
  // Битта нуқтада битта кун бир неча қатор бўлиши мумкин — кунлар алоҳида
  // саналади, шунинг учун такрорни ушлаб турадиган тўплам керак.
  const daysSeen = new Map<string, Set<string>>();
  let skipped = 0;

  for (const r of rows) {
    const value = num(r.tubehrdayCorrvolume);
    const day = r.tubehrdayDatehrday;
    if (value === null || !day) {
      skipped += 1;
      continue;
    }

    byDay.set(day, (byDay.get(day) ?? 0) + value);

    const rawName = r.gasObject?.objectName?.trim();
    const key = String(r.gasObjectId);
    const o =
      byObject.get(key) ??
      ({ key, name: rawName || GAS_UNNAMED, total: 0, days: 0, unnamed: !rawName } as GasObjectTotal);
    o.total += value;
    byObject.set(key, o);

    const seen = daysSeen.get(key) ?? new Set<string>();
    seen.add(day);
    daysSeen.set(key, seen);
  }

  const points = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({
      key,
      label: dateTick(key, multiMonth),
      full: dateLabel(key),
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

  const objects = [...byObject.values()]
    .map((o) => ({ ...o, days: daysSeen.get(o.key)?.size ?? 0 }))
    // Номсиз нуқталар шкаланинг охирида турсин — нейтрал ранг шу ерда мантиқли.
    .sort((a, b) => Number(a.unnamed) - Number(b.unnamed) || b.total - a.total);

  return {
    points,
    objects,
    total: points.reduce((a, p) => a + p.value, 0),
    max,
    maxKey,
    skipped,
  };
}
