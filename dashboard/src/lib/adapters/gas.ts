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

/**
 * Манба матосидаги ўнлик хоналар сони.
 *
 * Postgres `numeric` аниқ, лекин JS'да у сузувчи нуқтага айланади ва
 * **қўшилганда** хатолик тўпланади: `112 679,04` ўрнига
 * `112 679,04000000001` чиқади. Бу ўйлаб топилган аниқлик эмас, ҳисоблаш
 * шовқини — экранда унга ўрин йўқ.
 *
 * Шунинг учун йиғиндилар манбанинг ўз аниқлигига қайтарилади: манбада нечта
 * ўнлик хона бўлса, шунча. Аниқлик **қўшилмайди** ва **йўқотилмайди**.
 */
function decimalsOf(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const dot = String(raw).trim().indexOf(".");
  return dot < 0 ? 0 : String(raw).trim().length - dot - 1;
}

/** Йиғиш шовқинини кесиб, қийматни `d` ўнлик хонага қайтариш. */
function round(v: number, d: number): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
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

  // Манбадаги энг узун ўнлик — барча йиғиндилар шунга қайтарилади.
  // Ҳисоблагич жуда узун каср бермайди, лекин чегара барибир қўйилади.
  let dec = 0;
  for (const r of rows) {
    const d = decimalsOf(r.tubehrdayCorrvolume);
    if (d > dec) dec = d;
  }
  dec = Math.min(dec, 6);

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
      value: round(value, dec),
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
    .map((o) => ({ ...o, total: round(o.total, dec), days: daysSeen.get(o.key)?.size ?? 0 }))
    // Номсиз нуқталар шкаланинг охирида турсин — нейтрал ранг шу ерда мантиқли.
    .sort((a, b) => Number(a.unnamed) - Number(b.unnamed) || b.total - a.total);

  return {
    points,
    objects,
    total: round(
      points.reduce((a, p) => a + p.value, 0),
      dec,
    ),
    max: round(max, dec),
    maxKey,
    skipped,
  };
}
