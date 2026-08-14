/**
 * Ингичка ИОФ — тўхташ сабабларини изоҳ матнидан таснифлаш.
 *
 * API `/ingichka` фақат эркин матнли `note` майдонини беради, тайёр сабаб
 * гуруҳи йўқ. Шунинг учун таснифлаш клиент томонида қилинади: изоҳдаги
 * калит сўзлар бўйича. Матн русча ва аралаш ёзилган (қисқартмалар, нуқталар,
 * хато ёзилган сўзлар), шунинг учун қоидалар қисман сўз бўлаклари бўйича.
 *
 * Тартиб муҳим — биринчи мос келган қоида ғолиб. Масалан «эл.эн. ўчгани учун
 * водяная линия тозаланди» изоҳи «Электр таъминоти» га тушади, чунки бирламчи
 * сабаб шу.
 */

export interface StopLike {
  hours: number;
  note: string;
}

export const OTHER_REASON = "Бошқа сабаблар";
export const UNKNOWN_FAB = "Аниқланмаган";

/** [гуруҳ номи, калит сўзлар] — тартиб бўйича текширилади. */
const REASON_RULES: readonly (readonly [string, readonly string[]])[] = [
  ["Электр таъминоти", ["откл.эл", "отключение эл", "эл.эн", "эл-ии", "подстанц", "частотник"]],
  ["Насос (грат/концентрацион)", ["насос", "сальник"]],
  ["Сув линияси", ["водян", "вод.линия", "промывка", "прочистка", "забилась", "счетчик"]],
  ["Тарози / ўрнатиш ишлари", ["весов", "устан", "монтаж", "взвеш"]],
  ["Бутара / конвейер", ["бутар", "конвеер", "конвейер", "лент", "мусроправод", "бункер"]],
  ["Подшипник алмаштириш", ["подшипник", "подш-к", "подщипник"]],
  ["Синов / намуна (Куйтош)", ["проб", "опит", "куйтош"]],
];

/** Кичик ҳарф, `ё`→`е`, кетма-кет бўшлиқлар битта бўшлиққа. */
const norm = (s: string): string =>
  String(s ?? "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function classifyReason(note: string): string {
  const k = norm(note);
  if (!k) return OTHER_REASON;
  for (const [label, words] of REASON_RULES) {
    if (words.some((w) => k.includes(w))) return label;
  }
  return OTHER_REASON;
}

/**
 * Изоҳдан фабрика(лар)ни аниқлаш. Битта тўхташ бир нечта фабрикага тегишли
 * бўлиши мумкин («на всех 3-х фабриках», «ост.1-3 фаб.»), шундай ҳолда
 * соатлар улар орасида тенг тақсимланади.
 */
const FAB_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ["Фабрика-1", /(^|[^\d])1\s*ф|фаб-1|1ф-ка|1-3|1,3|всех 3/],
  ["Фабрика-2", /(^|[^\d])2\s*ф|фаб-2|2ф-ка|2фабрика|всех 3/],
  ["Фабрика-3", /(^|[^\d])3\s*ф|фаб-3|3ф-ка|1-3|1,3|всех 3/],
];

export function fabrikasOf(note: string): string[] {
  const k = norm(note);
  const found = FAB_PATTERNS.filter(([, re]) => re.test(k)).map(([name]) => name);
  return found.length ? found : [UNKNOWN_FAB];
}

export interface ReasonRow {
  name: string;
  hours: number;
  count: number;
}
export interface FabRow {
  name: string;
  hours: number;
}

export interface IngBreakdown {
  reasons: ReasonRow[];
  fabs: FabRow[];
  totalHours: number;
}

export function ingBreakdown(stops: readonly StopLike[]): IngBreakdown {
  const byReason = new Map<string, ReasonRow>();
  const byFab = new Map<string, number>();
  let totalHours = 0;

  for (const s of stops) {
    const h = s.hours || 0;
    totalHours += h;

    const reason = classifyReason(s.note);
    const row = byReason.get(reason) ?? { name: reason, hours: 0, count: 0 };
    row.hours += h;
    row.count += 1;
    byReason.set(reason, row);

    const fabs = fabrikasOf(s.note);
    const share = h / fabs.length;
    for (const f of fabs) byFab.set(f, (byFab.get(f) ?? 0) + share);
  }

  const round = (x: number) => Math.round(x * 100) / 100;
  return {
    reasons: [...byReason.values()]
      .map((r) => ({ ...r, hours: round(r.hours) }))
      .sort((a, b) => b.hours - a.hours),
    fabs: [...byFab.entries()]
      .map(([name, hours]) => ({ name, hours: round(hours) }))
      .sort((a, b) => b.hours - a.hours),
    totalHours: round(totalHours),
  };
}
