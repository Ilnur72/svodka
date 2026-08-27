/**
 * «Лойиҳалар паспорти» бўлимининг view-model'и.
 *
 * ═══ Асосий қоида ═══════════════════════════════════════════════════════
 *
 * Ҳужжатда бўлмаган ҳеч нарса бу ердан чиқмайди. Бу адаптер **ҳисобламайди**:
 * сумма қўшмайди, фоиз чиқармайди, муддат ҳисобламайди, ҳолат/тайёрлик
 * даражаси бермайди. У фақат ҳужжат матнини кўринишга бўлади — сана, KPI ва
 * сон **матннинг ичидан ажратилади**, ўйлаб топилмайди.
 *
 * Ҳар бир ажратиш қоидаси битта тамойилга бўйсунади: **тегишли шакл
 * топилмаса, сатр оддий матн бўлиб қолади**. Ярим топилган сана
 * тўлдирилмайди, ноаниқ сон «тахминан» деб кўрсатилмайди.
 *
 * ═══ Матнга тегиладиган иккита жой (иккови ҳам шакл, мазмун эмас) ═══════
 *
 *  1. Сатр бошидаги рўйхат белгиси (`-`, `–`, `—`, `•`) олиб ташланади: у
 *     ҳужжат матни эмас, Word'даги маркер, ва экранда ўз маркеримиз билан
 *     икки марта кўринарди.
 *  2. Вақт чизиғида сатр боши сана бўлса («2026 йил январь ойида …»), ўша
 *     сана матндан кесилиб, ўз устунига қўйилади — бир хил ёзув икки марта
 *     чизилмаслиги учун. Сана матн **ичида** бўлса (масалан «… 2025 йил 13
 *     мартда шартнома тузилди»), жумла бузилмаслиги учун ҳеч нарса
 *     кесилмайди: сана белги сифатида кўрсатилади, матн бутун қолади.
 *
 * Бошқа ҳеч қаерда матн ўзгармайди — ҳарф ҳам, тиниш белгиси ҳам.
 */

import {
  PROJECTS,
  PROJECT_SECTION_LABEL,
  type ProjectRecord,
  type ProjectSectionKey,
} from "../projects/projectsSource";

/* ═══ Матндан ажратиш қоидалари ═══════════════════════════════════════ */

/** Word рўйхатининг маркери — матн эмас, шакл. */
const BULLET = /^[-–—•]\s*/u;

const clean = (s: string): string => s.replace(BULLET, "").trim();

/**
 * Ой номи — ўзакка ҳужжатда учрайдиган қўшимчалар. Қўшимчалар рўйхати
 * атайин ёпиқ: очиқ `\p{L}*` бўлса «майдон» сўзи «май» ойи деб ўқиларди.
 */
const MONTH = "(?:январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр)";
// Муқобиллар узундан қисқага: акс ҳолда «августдада» да «да» биринчи мос
// келиб, матнда осилиб қолган «да» қоларди.
const SUF = "(?:дада|ида|дан|нинг|да|га|ь|и)?";
const M = `${MONTH}${SUF}(?:\\s+ой\\p{L}*)?`;

/**
 * Сатр бошидаги вақт белгиси. Тартиб муҳим: аниқроқ шакл олдин синалади.
 * Ҳеч бири мос келмаса — `null`, сатр белгисиз қолади.
 */
const AT_START: RegExp[] = [
  // 13.03.2025
  /^\d{1,2}\.\d{2}\.\d{4}/u,
  // «Жорий йилнинг 9 август куни»
  new RegExp(`^Жорий йил\\p{L}*\\s+\\d{1,2}\\s+${M}(?:\\s+куни)?`, "u"),
  // «2026 йил 25 сентябрда», «2026 йил январь ойида», «2027 йил мартда»
  new RegExp(`^20\\d\\d\\s+йил\\p{L}*(?:\\s+\\d{1,2})?\\s+${M}`, "u"),
  // «25 сентябрда …» — йилсиз кун ва ой
  new RegExp(`^\\d{1,2}\\s+${M}`, "u"),
  // «августда», «Сентябрь ойида», «Декабрь»
  new RegExp(`^${M}`, "iu"),
  // «2026 йил Технологик асбоб-ускуна…», «2025 йилда …»
  /^20\d\d\s+йил\p{L}*/u,
];

/**
 * Сатр ичидаги (боши эмас) сана — фақат **йили бор** шакллар. Йилсиз ой
 * матн ўртасида изоҳ бўлиши мумкин, шунинг учун у белги сифатида олинмайди.
 */
const INSIDE: RegExp[] = [
  /\d{1,2}\.\d{2}\.\d{4}/u,
  new RegExp(`20\\d\\d\\s+йил\\p{L}*\\s+\\d{1,2}\\s+${M}`, "u"),
  new RegExp(`20\\d\\d\\s+йил\\p{L}*\\s+${M}`, "u"),
];

/** Белгидан кейинги ортиқча тиниш белгиси кесилади, ичи ўзгармайди. */
const trimMark = (s: string): string => s.replace(/[\s.,;:]+$/u, "").trim();

/** Вақт чизиғининг битта воқеаси. Белги бўлмаслиги мумкин. */
export interface ProjectEvent {
  marker: string | null;
  text: string;
}

export function dateMarker(text: string): string | null {
  return splitEvent(text).marker;
}

/**
 * Сатрни «вақт белгиси + матн» га бўлади.
 *
 * Белги фақат сатрнинг ўзидан олинади. Сатр боши сана бўлса, у матндан
 * кесилади (қолгани бўш бўлиб қолса — кесилмайди). Сана матн ичида бўлса,
 * матн бутун қолади. Сана умуман бўлмаса — `marker: null` ва сатр оддий
 * матн: бу ерда ҳеч қандай сана тахмин қилинмайди.
 */
export function splitEvent(text: string): ProjectEvent {
  const line = clean(text);
  for (const re of AT_START) {
    const m = re.exec(line);
    if (!m) continue;
    const rest = line.slice(m[0].length).trim();
    return rest ? { marker: trimMark(m[0]), text: rest } : { marker: null, text: line };
  }
  for (const re of INSIDE) {
    const m = re.exec(line);
    if (m) return { marker: trimMark(m[0]), text: line };
  }
  return { marker: null, text: line };
}

/**
 * «Ёрлиқ + сон + бирлик» шаклидаги сатр — масалан
 * «умумий захира WO₃ 5 200 тонна;». Шарти қаттиқ:
 *
 *  · ёрлиқда рақам бўлмайди — «2025 йил - 4006 кг, 2026 йил - 5103 кг»
 *    каби кўп қийматли сатр бутун матн бўлиб қолади;
 *  · бирликда ҳам рақам бўлмайди ва у сатрнинг охиригача етади;
 *  · мос келмаса — `null`, сатр оддий матн сифатида чизилади.
 */
const KPI =
  /^(?<label>[^\d]{3,}?)\s(?<num>\d+(?:[ \u00A0\u202F]\d{3})*(?:[.,]\d+)?)\s*(?<unit>[^\d]{0,26})$/u;

export interface ProjectKpi {
  label: string;
  /** Сон — ҳужжатдаги ёзилиши билан, яхлитланмайди. */
  value: string;
  /** Бирлик — ҳужжатдаги сўз(лар). Бўлмаслиги мумкин. */
  unit: string | null;
}

export function splitKpi(text: string): ProjectKpi | null {
  const line = clean(text).replace(/[.;]$/u, "");
  const m = KPI.exec(line);
  if (!m?.groups) return null;
  const label = m.groups.label.trim().replace(/[-–—:]$/u, "").trim();
  const unit = m.groups.unit.trim();
  if (label.length < 3) return null;
  return { label, value: m.groups.num, unit: unit || null };
}

/** Матн бўлаги: сон ёки оддий матн. Сон қўшилмайди, фақат ажратилади. */
export interface TextPart {
  t: string;
  num: boolean;
}

// `(?:\s*%)?` — бўшлиқ фақат фоиз белгиси билан бирга олинади, акс ҳолда
// сондан кейинги бўшлиқ ҳам «сон» бўлагига тушиб қоларди.
const NUM = /\d+(?:[ \u00A0\u202F]\d{3})*(?:[.,]\d+)?(?:\s*%)?/gu;

/**
 * Матндаги сон бўлакларини ажратади — уларни экранда каттароқ кўрсатиш учун.
 * Матннинг ўзи ўзгармайди: бўлакларни кетма-кет улаганда айнан манба сатри
 * чиқади.
 */
export function numberParts(text: string): TextPart[] {
  const s = clean(text);
  const out: TextPart[] = [];
  let last = 0;
  for (const m of s.matchAll(NUM)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: s.slice(last, i), num: false });
    out.push({ t: m[0], num: true });
    last = i + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), num: false });
  return out;
}

/**
 * Мақсад сатрининг **охиридаги** қавс — ҳужжатда жой номи шу ерда ёзилади
 * («… (Навоий вилояти, Кармана тумани).»). Ўрта қавслар («(пруток)»,
 * «(5N – 99,999%)») олинмайди, чунки улар жой эмас. Ичида рақам бўлса ҳам
 * олинмайди.
 */
const PLACE = /\(([^()\d]{2,60})\)\s*[.;]?\s*$/u;

export function placeOf(goal: string | undefined): string | null {
  if (!goal) return null;
  const m = PLACE.exec(clean(goal));
  return m ? m[1].trim() : null;
}

/* ═══ View-model ══════════════════════════════════════════════════════ */

/** Мақсад бўлимидаги қўшимча сатр: KPI шаклида ёки оддий матн. */
export type ProjectDetail = { kind: "kpi"; kpi: ProjectKpi } | { kind: "text"; text: string };

/** Қиймат бўлимининг сатри: йил ажратилса — алоҳида, акс ҳолда фақат матн. */
export interface ProjectCostLine {
  year: string | null;
  text: string;
}

export interface ProjectPassportVM {
  id: string;
  title: string;
  /** Ҳужжат файли номи, кенгайтмасиз. */
  sourceLabel: string;
  place: string | null;
  goal: { text: string; details: ProjectDetail[] } | null;
  cost: { headline: string; lines: ProjectCostLine[] } | null;
  done: ProjectEvent[];
  plan: { year: number | null; items: ProjectEvent[] } | null;
  results: string[];
  /** Бўлим сарлавҳалари — ҳужжат бўйича. */
  label: Readonly<Record<ProjectSectionKey, string>>;
}

export interface ProjectListItem {
  id: string;
  title: string;
  source: string;
  sourceLabel: string;
  /** Карточкадаги қисқа сатр — мақсаднинг биринчи сатри. Бўлмаса `null`. */
  lead: string | null;
}

const sourceLabel = (s: string): string => s.replace(/\.docx$/iu, "").trim();

/** Қиймат сатри бошидаги «2026 йилда» — алоҳида белги сифатида. */
const COST_YEAR = /^(20\d\d\s+йил\p{L}*)\s+/u;

function costLine(text: string): ProjectCostLine {
  const line = clean(text);
  const m = COST_YEAR.exec(line);
  return m ? { year: m[1], text: line.slice(m[0].length).trim() } : { year: null, text: line };
}

const events = (lines: readonly string[]): ProjectEvent[] => lines.map(splitEvent);

/**
 * Режа бўлимининг сарлавҳаси. Йил ҳужжатдан келади; бўлмаса йилсиз ёзилади —
 * қаттиқ ёзилган «2026» ҳеч қаерда йўқ.
 */
export function planTitle(year: number | null): string {
  return year === null
    ? PROJECT_SECTION_LABEL.reja
    : `${year} йилда ${PROJECT_SECTION_LABEL.reja.toLowerCase()}`;
}

function passportOf(p: ProjectRecord): ProjectPassportVM {
  const s = p.sections;
  const maqsad = s.maqsad ?? [];
  const qiymat = s.qiymat ?? [];
  const reja = s.reja ?? [];

  return {
    id: p.id,
    title: p.title,
    sourceLabel: sourceLabel(p.source),
    place: placeOf(maqsad[0]),
    // Биринчи сатр — мақсаднинг ўзи, қолганлари тавсиф. Бўлим бўш бўлса
    // блок умуман чизилмайди.
    goal:
      maqsad.length > 0
        ? {
            text: clean(maqsad[0]),
            details: maqsad.slice(1).map((line): ProjectDetail => {
              const kpi = splitKpi(line);
              return kpi ? { kind: "kpi", kpi } : { kind: "text", text: clean(line) };
            }),
          }
        : null,
    // Биринчи сатр — умумий қиймат ёзуви (ҳужжатдаги шаклида), қолганлари
    // тақсимот. Бу ерда ҳеч нарса қўшилмайди ва фоизга айлантирилмайди.
    cost:
      qiymat.length > 0
        ? { headline: clean(qiymat[0]), lines: qiymat.slice(1).map(costLine) }
        : null,
    done: events(s.bajarilgan ?? []),
    plan: reja.length > 0 ? { year: p.rejaYear, items: events(reja) } : null,
    results: (s.natija ?? []).map(clean),
    label: PROJECT_SECTION_LABEL,
  };
}

/** Рўйхат кўриниши — ҳужжатдаги тартибда. */
export function projectList(): ProjectListItem[] {
  return PROJECTS.map((p) => ({
    id: p.id,
    title: p.title,
    source: p.source,
    sourceLabel: sourceLabel(p.source),
    lead: p.sections.maqsad?.[0] ? clean(p.sections.maqsad[0]) : null,
  }));
}

/** Манба ҳужжатлари — фильтр учун, маълумотнинг ўзидан. */
export function projectSources(): { value: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of PROJECTS) map.set(p.source, (map.get(p.source) ?? 0) + 1);
  return [...map].map(([value, count]) => ({ value, label: sourceLabel(value), count }));
}

/** Паспорт — фақат сўралган лойиҳаники. Топилмаса `null`. */
export function projectPassport(id: string): ProjectPassportVM | null {
  const p = PROJECTS.find((x) => x.id === id);
  return p ? passportOf(p) : null;
}

/**
 * Қидирув — сарлавҳа ва барча бўлим матни бўйича. Ҳеч қандай «оқиллик» йўқ:
 * оддий кичик ҳарфли ичкичакка текшируви.
 */
export function projectMatches(id: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return false;
  if (p.title.toLowerCase().includes(q)) return true;
  for (const lines of Object.values(p.sections)) {
    for (const l of lines) if (l.toLowerCase().includes(q)) return true;
  }
  return false;
}
