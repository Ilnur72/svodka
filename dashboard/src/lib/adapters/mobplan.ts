import { dateLabel, exact, monthLabel, monthTick, pctTxt } from "../format";
import type { MobplanPositionRow, MobplanResponse } from "../../api/types";

/**
 * «Кадрлар режаси» бўлими учун view-model.
 *
 * Панел API тузилмасини билмайди: у фақат шу файл тайёрлаган қийматларни
 * олади. Жавоб шакли ўзгарса — тузатиш шу ерда бўлади, панелга тегилмайди.
 *
 * ═══ Манба — бэкенд ════════════════════════════════════════════════════
 *
 * Маълумот `GET /mobplan` дан келади (`api/endpoints.ts` → `getMobplan`).
 * Аввал бу бўлим статик модулга (`lib/mobplan/mobplanSource.ts`) таянар эди;
 * маълумот базага кўчирилгач у модул **ўчирилди** — акс ҳолда битта рақамнинг
 * иккита ҳақиқат манбаи қолиб кетар эди.
 *
 * Сўров **параметрсиз**: манба вақт қатори эмас, битта ҳужжатнинг жорий
 * ҳолати. Шунинг учун юқоридаги давр танлагичи бу бўлимга таъсир қилмайди.
 *
 * ═══ Бу бўлимдаги энг муҳим талқин ══════════════════════════════════════
 *
 * 241 штат бирлигидан 25 таси банд, 216 таси вакант. Бу **орқада қолиш эмас**:
 * корхона ҳали ишга туширилмаган ва режанинг ўзи шундай тузилган — 241 тадан
 * 224 таси 2026 йилнинг иккинчи ярмига режалаштирилган. Шу сабабли:
 *
 *   - вакансия ҳолат ранги билан (`good/warn/crit`) бўялмайди. Ўша ранглар
 *     дашбордда «режа бажарилиши» маъносини ташийди, бу ерда эса баҳоланадиган
 *     режа бажарилиши йўқ — фақат жорий ҳолат ва келажак режаси бор;
 *   - «бажарилмаган», «орқада», «критик» каби сўзлар ишлатилмайди;
 *   - вакансия учун нейтрал ранг (`--rule`) олинади, банд учун `--s3`.
 *
 * Айнан шунинг учун бу файл `Status` типини умуман ишлатмайди.
 *
 * ═══ Бўш катак тўлдирилмайди ════════════════════════════════════════════
 *
 * Тасниф устунлари қисман тўлдирилган. Бўш катак «юқоридагидек» дегани эмас,
 * шунинг учун у юқоридаги сатрдан кўчирилмайди ва тахмин қилинмайди — у
 * `«Кўрсатилмаган»` номли **алоҳида гуруҳга** тушади ва бошқа гуруҳлар билан
 * бир қаторда, ўз штат бирлиги билан кўринади. Ҳар бир кесимнинг гуруҳлари
 * йиғиндиси шу сабабли доим тўлиқ штатга (241) тенг бўлади.
 *
 * ═══ Сон ════════════════════════════════════════════════════════════════
 *
 * Бу ердаги ҳамма сон — киши (штат бирлиги), яъни бутун сон. Шунинг учун
 * ҳамма жойда `exact()`; фоиз эса ҳисобланган қиймат бўлгани учун `pctTxt()`
 * (бир хона). Яхлитлаш йўқ.
 */

/** Тасниф устуни тўлдирилмаган сатрлар гуруҳи. */
export const MOB_UNKNOWN = "Кўрсатилмаган";

/** Ходим устунидаги «вакант» ёзуви — ҳолат, маълумот йўқлиги эмас. */
export const MOB_VAKANT = "вакант";

/** Бўш катак матни (тасниф устунларида). */
export const MOB_NO_VALUE = "—";

/**
 * Реестрда умуман йўқ кўрсаткич. Бу «нол» эмас ва «ҳали ҳисобланмаган» ҳам
 * эмас — манбада бундай устун йўқ, шунинг учун қиймат ўйлаб топилмайди.
 */
export const MOB_NO_DATA = "маълумот йўқ";

/** Манбадаги қиймат — яхлитланмайди. */
export const mobExact = (v: number): string => exact(v);

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

const share = (part: number, whole: number): number => (whole === 0 ? 0 : (part / whole) * 100);

/* -------------------------------------------------------------------------- */
/* умумий кўрсаткичлар                                                        */
/* -------------------------------------------------------------------------- */

export interface MobTotals {
  /** Рўйхатдаги лавозим сатрлари сони. */
  rows: number;
  /** Манбадаги «Лавозим номи» устунининг йиғиндиси — сатрлар сони эмас. */
  nomBirligi: number;
  shtat: number;
  band: number;
  vakansiya: number;
  bandPct: number;
  vakansiyaPct: number;
}

/* -------------------------------------------------------------------------- */
/* ёллаш режаси                                                               */
/* -------------------------------------------------------------------------- */

export interface MobMonthRow {
  /** `"2026-09"`. */
  key: string;
  /** «Сентябрь 2026». */
  label: string;
  /** Ўқ белгиси: «Сен». */
  tick: string;
  year: number;
  /** Шу ойда ёлланиши режалаштирилган киши. */
  hires: number;
  /** Шу ой охиридаги жами (ўсиб борувчи). */
  cum: number;
  /** Жами режадаги улуши. */
  cumPct: number;
  /** Устун устига сон ёзиладими — ҳар бир нуқтага эмас, фақат йирикларига. */
  labelled: boolean;
}

export interface MobQuarterRow {
  id: string;
  year: number;
  /** «2025 · I чорак». */
  label: string;
  /** Ўқ белгиси: «2025 I». */
  tick: string;
  hires: number;
  cum: number;
  /** Жами режадаги улуши. */
  pct: number;
}

const ROMAN = ["I", "II", "III", "IV"];

export interface MobYearPlan {
  year: number;
  hires: number;
  /** Жами режадаги улуши. */
  pct: number;
}

/* -------------------------------------------------------------------------- */
/* реестрда йўқ кўрсаткичлар                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Кадрлар дашбордида одатда кутиладиган, лекин **бу манбада умуман йўқ**
 * кўрсаткичлар. Улар экранда яширилмайди ва тахминий сон билан
 * тўлдирилмайди — очиқ «маълумот йўқ» бўлиб туради, чунки манба фақат штат
 * жадвали ва ёллаш режаси; булар бошқа ҳужжатлардан келади.
 */
export interface MobMissing {
  k: string;
  /** Кўрсаткич нимани англатиши — бир қаторда. */
  note: string;
}

export const MOB_MISSING: MobMissing[] = [
  { k: "Меҳнатга ҳақ тўлаш фонди", note: "ойлик сумма ва унинг тузилиши" },
  { k: "Кадрлар оқими", note: "ишга қабул ва бўшатиш ҳаракати" },
  { k: "Кадрлар иш юритиши", note: "буйруқ ва ҳужжат айланмаси статистикаси" },
  { k: "Муддати тугаётган ҳужжатлар", note: "амал қилиш муддати яқинлашган ҳужжатлар" },
  { k: "Фуқаролик-ҳуқуқий шартномалар", note: "шартномалар сони ва суммаси" },
  { k: "Хорижий мутахассислар", note: "сони ва иш рухсатномаси муддати" },
  { k: "Ўқитиш ва малака ошириш", note: "дастурлар ва қатнашчилар сони" },
  { k: "Иш графиклари", note: "сменалар ва иш вақти тақсимоти" },
  { k: "Таълим, жинс ва ёш", note: "ходимларнинг демографик тақсимоти" },
];

/* -------------------------------------------------------------------------- */
/* кесимлар                                                                   */
/* -------------------------------------------------------------------------- */

export interface MobGroup {
  key: string;
  name: string;
  /** Манбада катак бўш бўлган сатрлар гуруҳи. */
  unknown: boolean;
  rows: number;
  shtat: number;
  band: number;
  vakansiya: number;
  bandPct: number;
  /** Гуруҳнинг умумий штатдаги улуши. */
  shtatPct: number;
}

export type MobCutId =
  | "kategoriya"
  | "podrazdelenie"
  | "strukturnoe"
  | "guruh"
  | "xizmatchiIshchi"
  | "xodimToifasi"
  | "malakaDarajasi";

export interface MobCut {
  id: MobCutId;
  title: string;
  /** Алмаштиргич остидаги қисқа изоҳ. */
  hint: string;
  groups: MobGroup[];
  /** Манбада тўлдирилган сатрлар сони. */
  filled: number;
}

interface MobCutDef {
  title: string;
  hint: string;
  of: (p: MobplanPositionRow) => string | null;
}

/**
 * Кесимларнинг таърифи — `Record`, рўйхат эмас: шунда `CUT_DEFS[id]` доим
 * мавжуд бўлади ва чақирувчида «топилмаса нима» деган ҳолат умуман пайдо
 * бўлмайди.
 */
const CUT_DEFS: Record<MobCutId, MobCutDef> = {
  kategoriya: {
    title: "Ходимлар тоифаси",
    hint: "Манбадаги тоифа: АУП, ИТР, Рабочие, Служащий.",
    of: (p) => p.kategoriya,
  },
  podrazdelenie: {
    title: "Бўлинма",
    hint: "Йирик бўлинма кесими.",
    of: (p) => p.podrazdelenie,
  },
  strukturnoe: {
    title: "Таркибий бўлим",
    hint: "Энг тафсилотли кесим — секция ва хизматлар даражаси.",
    of: (p) => p.strukturnoe,
  },
  guruh: { title: "Гуруҳ", hint: "Ходимлар гуруҳи.", of: (p) => p.guruh },
  xizmatchiIshchi: {
    title: "Хизматчи / ишчи",
    hint: "Манбадаги ёзув ўзгартирилмаган.",
    of: (p) => p.xizmatchiIshchi,
  },
  xodimToifasi: {
    title: "Ходим тоифаси",
    hint: "Манбадаги белги; битта сатрда иккита белги бирга ёзилган бўлиши мумкин.",
    of: (p) => p.xodimToifasi,
  },
  malakaDarajasi: {
    title: "Малака даражаси",
    hint: "1 дан 7 гача.",
    of: (p) => p.malakaDarajasi,
  },
};

/**
 * Ҳалқада кўрсатиладиган кесимлар — алмаштиргич «Тоифа / Гуруҳ».
 * Тартиби қатъий, шунинг учун сегмент ранглари ҳам барқарор.
 */
export const MOB_SHARE_CUTS: MobCutId[] = ["kategoriya", "guruh"];

/** Тафсилот блокидаги алмаштиргич кесимлари. */
const MOB_SWITCH_CUTS: MobCutId[] = [
  "podrazdelenie",
  "strukturnoe",
  "guruh",
  "xizmatchiIshchi",
  "xodimToifasi",
  "malakaDarajasi",
];

/**
 * Гуруҳлар штат бўйича камайиш тартибида; `«Кўрсатилмаган»` эса доим охирида.
 * Тартиб қатъий ва ҳисобланадиган — фильтр ёки танлов уни ўзгартирмайди,
 * шунинг учун гуруҳларнинг ўрни ҳам, ранги ҳам бир хил бўлиб қолади.
 */
function buildCut(rows: MobplanPositionRow[], id: MobCutId, shtatAll: number): MobCut {
  const { title, hint, of } = CUT_DEFS[id];
  const byName = new Map<string, MobplanPositionRow[]>();
  for (const p of rows) {
    const raw = of(p);
    const name = raw === null ? MOB_UNKNOWN : raw;
    const list = byName.get(name);
    if (list) list.push(p);
    else byName.set(name, [p]);
  }

  const groups: MobGroup[] = [...byName.entries()].map(([name, list]) => {
    const shtat = sum(list.map((p) => p.shtat));
    const band = sum(list.map((p) => p.band));
    return {
      key: `${id}:${name}`,
      name,
      unknown: name === MOB_UNKNOWN,
      rows: list.length,
      shtat,
      band,
      vakansiya: sum(list.map((p) => p.vakansiya)),
      bandPct: share(band, shtat),
      shtatPct: share(shtat, shtatAll),
    };
  });

  groups.sort((a, b) => {
    if (a.unknown !== b.unknown) return a.unknown ? 1 : -1;
    if (b.shtat !== a.shtat) return b.shtat - a.shtat;
    return a.name.localeCompare(b.name, "ru");
  });

  return { id, title, hint, groups, filled: rows.filter((p) => of(p) !== null).length };
}

/**
 * Малака даражаси — ягона кесим, унда **табиий тартиб** штат бўйича
 * тартибдан устун: 1 дан 7 гача шкала, «Кўрсатилмаган» эса охирида. Устун
 * диаграммада шкалани катталик бўйича қайта тизиш ўқишни бузарди.
 */
function orderByLevel(cut: MobCut): MobCut {
  const level = (g: MobGroup): number => {
    if (g.unknown) return Number.POSITIVE_INFINITY;
    const n = Number(g.name);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };
  return {
    ...cut,
    groups: [...cut.groups].sort((a, b) => {
      const d = level(a) - level(b);
      return d !== 0 ? d : a.name.localeCompare(b.name, "ru");
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* лавозимлар рўйхати                                                         */
/* -------------------------------------------------------------------------- */

/** Матн катак: бўш бўлса сўниқ ёзилиши учун белги билан келади. */
export interface MobCell {
  v: string;
  /** Манбада катак бўш эди. */
  empty: boolean;
}

export interface MobPositionRow {
  id: string;
  lavozim: string;
  lavozimUz: MobCell;
  kategoriya: MobCell;
  podrazdelenie: MobCell;
  strukturnoe: MobCell;
  guruh: MobCell;
  mxskKod: MobCell;
  xizmatchiIshchi: MobCell;
  xodimToifasi: MobCell;
  razryad: MobCell;
  malakaDarajasi: MobCell;
  shtat: string;
  band: string;
  vakansiya: string;
  /** Ҳақиқий Ф.И.Ш. ёки «вакант». */
  xodim: string;
  vakant: boolean;
  /** «Октябрь 2026 · 2 та; Декабрь 2026 · 2 та». */
  planText: string;
}

const cell = (v: string | null): MobCell =>
  v === null ? { v: MOB_NO_VALUE, empty: true } : { v, empty: false };

const planText = (plan: number[], months: string[]): string =>
  plan
    .map((n, i) =>
      n > 0 && months[i] !== undefined ? `${monthLabel(months[i])} · ${exact(n)} та` : null,
    )
    .filter((x): x is string => x !== null)
    .join("; ");

/* -------------------------------------------------------------------------- */
/* энг катта вакансиялар                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Вакансия рўйхати — **лавозим** кесимида, чунки очиқ ўринни тўлдириш айнан
 * лавозим даражасида режалаштирилади. Сони нолга тенг лавозимлар рўйхатга
 * тушмайди: улар «маълумот йўқ» эмас, шунчаки очиқ ўрни йўқ.
 */
export interface MobVacancyRow {
  id: string;
  lavozim: string;
  /** Бўлинма ёки «Кўрсатилмаган» — сўниқ ёзилиши учун белги билан. */
  bolinma: MobCell;
  shtat: number;
  band: number;
  vakansiya: number;
  /** Лавозим ичидаги вакансия улуши. */
  pct: number;
  /** Энг катта вакансияга нисбатан узунлик, 0–100. */
  barPct: number;
}

/* -------------------------------------------------------------------------- */
/* банд лавозимдаги ходимлар                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ф.И.Ш. **фақат шу рўйхатда** кўринади — плитка, ҳалқа, диаграмма ва
 * сарлавҳада ишлатилмайди.
 */
export interface MobStaffRow {
  id: string;
  /** Манбадаги ёзув — қайта ёзилмаган. */
  name: string;
  lavozim: string;
  /** Аватар учун бош ҳарфлар. */
  initials: string;
  /** Битта катакда иккита исм ёзилган сатр. */
  multi: boolean;
}

/** Бош ҳарфлар: биринчи икки сўзнинг биринчи ҳарфи. */
function initialsOf(fio: string): string {
  const first = fio.split(",")[0] ?? fio;
  const parts = first.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

/* -------------------------------------------------------------------------- */
/* манба билан таққослаш                                                      */
/* -------------------------------------------------------------------------- */

export interface MobCheck {
  k: string;
  /**
   * `null` — манбада таққослайдиган сатр йўқ. Бу **номослик эмас**: текширув
   * ўтказилмади, шунинг учун «мос эмас» деб белгиланмайди.
   */
  ok: boolean | null;
  /** «241 = 241» ёки «24/24 ой». */
  detail: string;
}

const cmpTotal = (k: string, calc: number, sheet: number | null | undefined): MobCheck =>
  sheet === null || sheet === undefined
    ? { k, ok: null, detail: `${exact(calc)} · манбада жами сатри йўқ` }
    : { k, ok: calc === sheet, detail: `${exact(calc)} = ${exact(sheet)}` };

const cmpSeries = (k: string, calc: number[], sheet: number[] | null): MobCheck => {
  if (sheet === null) return { k, ok: null, detail: "манбада бу сатр йўқ" };
  const n = Math.max(calc.length, sheet.length);
  let match = 0;
  for (let i = 0; i < n; i++) if (calc[i] === sheet[i]) match++;
  return { k, ok: match === n && n > 0, detail: `${exact(match)}/${exact(n)} ой` };
};

/* -------------------------------------------------------------------------- */
/* тўлдирилганлик                                                             */
/* -------------------------------------------------------------------------- */

export interface MobFilled {
  k: string;
  filled: number;
  total: number;
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface MobVM {
  /** Импорт санаси — «12-август 2026» ёки «—». Файл ва варақ номи чиқарилмайди. */
  reportDate: string;
  /** Режа горизонти: «Янв 2025 — Дек 2026». */
  horizon: string;
  totals: MobTotals;
  months: MobMonthRow[];
  quarters: MobQuarterRow[];
  /** Ёллаш режасининг йиллар кесими — плиткадаги изоҳ учун. */
  years: MobYearPlan[];
  /** 2026 йилнинг иккинчи ярмига режалаштирилган киши. */
  lateHires: number;
  lateHiresPct: number;
  /** Режанинг биринчи ва охирги ойи (ёллаш бор ой). */
  firstHireMonth: string;
  lastHireMonth: string;
  /** Ҳалқали кесимлар — «Тоифа / Гуруҳ» алмаштиргичи учун. */
  shareCuts: MobCut[];
  /** Хизматчи ва ишчи нисбати — иккинчи ҳалқа. */
  ratio: MobCut;
  /** Малака даражаси — устун диаграмма, табиий тартибда (1…7, охирида бўшлари). */
  qualification: MobCut;
  /** Тоифа бўйича тўлдирилганлик — горизонтал йўлаклар. */
  fillByCat: MobCut;
  /** Энг йирик учта бўлинма — юқоридаги плиткалар учун. */
  divisionTop: MobGroup[];
  /** Таркибий бўлим кесими — горизонтал диаграмма учун. */
  structure: MobCut;
  /** Бўлинма кесими — ташкилий тузилма учун. */
  division: MobCut;
  /** Банд/вакансия кесимлари — алмаштиргич орқали. */
  cuts: MobCut[];
  vacancies: MobVacancyRow[];
  staff: MobStaffRow[];
  positions: MobPositionRow[];
  checks: MobCheck[];
  checksAllOk: boolean;
  filled: MobFilled[];
  /** Ф.И.Ш. ёзилган сатрлар сони. */
  namedRows: number;
  /** Ўша сатрлардаги банд штат бирлиги. */
  namedBand: number;
  /** Исмсиз қолган банд штат бирлиги. */
  bandWithoutName: number;
  /** Битта катакда иккита исм бор сатрлар сони. */
  multiNameRows: number;
}

export function mobplanVM(res: MobplanResponse): MobVM {
  const rows = res.rows;
  const mons = res.months;

  const shtat = sum(rows.map((p) => p.shtat));
  const band = sum(rows.map((p) => p.band));
  const vakansiya = sum(rows.map((p) => p.vakansiya));

  const totals: MobTotals = {
    rows: rows.length,
    nomBirligi: sum(rows.map((p) => p.nomBirligi)),
    shtat,
    band,
    vakansiya,
    bandPct: share(band, shtat),
    vakansiyaPct: share(vakansiya, shtat),
  };

  // --- ёллаш эгри чизиғи ---------------------------------------------------
  const hires = mons.map((_, i) => sum(rows.map((p) => p.plan[i] ?? 0)));
  const planTotal = sum(hires);
  // Ҳар бир устунга сон ёзилмайди: фақат энг йирик ойнинг бешдан бир қисмидан
  // ортиқлари белгиланади — қолгани тултип ва жадвалда қолади.
  const labelFrom = hires.length > 0 ? Math.max(...hires) / 5 : 0;

  let running = 0;
  const months: MobMonthRow[] = mons.map((key, i) => {
    running += hires[i];
    return {
      key,
      label: monthLabel(key),
      tick: monthTick(key),
      year: Number(key.slice(0, 4)),
      hires: hires[i],
      cum: running,
      cumPct: share(running, planTotal),
      labelled: hires[i] >= labelFrom && hires[i] > 0,
    };
  });

  const quarters: MobQuarterRow[] = [];
  for (const m of months) {
    const qi = Math.floor((Number(m.key.slice(5, 7)) - 1) / 3);
    const id = `${m.year}-Q${qi + 1}`;
    const last = quarters[quarters.length - 1];
    if (last && last.id === id) {
      last.hires += m.hires;
      last.cum = m.cum;
    } else {
      quarters.push({
        id,
        year: m.year,
        label: `${m.year} · ${ROMAN[qi]} чорак`,
        tick: `${m.year} ${ROMAN[qi]}`,
        hires: m.hires,
        cum: m.cum,
        pct: 0,
      });
    }
  }
  for (const q of quarters) q.pct = share(q.hires, planTotal);

  const lateHires = sum(
    quarters.filter((q) => q.year === 2026 && q.id >= "2026-Q3").map((q) => q.hires),
  );
  const hireMonths = months.filter((m) => m.hires > 0);

  const years: MobYearPlan[] = [];
  for (const m of months) {
    const last = years[years.length - 1];
    if (last && last.year === m.year) last.hires += m.hires;
    else years.push({ year: m.year, hires: m.hires, pct: 0 });
  }
  for (const y of years) y.pct = share(y.hires, planTotal);

  // --- кесимлар ------------------------------------------------------------
  const shareCuts = MOB_SHARE_CUTS.map((id) => buildCut(rows, id, shtat));
  const ratio = buildCut(rows, "xizmatchiIshchi", shtat);
  const qualification = orderByLevel(buildCut(rows, "malakaDarajasi", shtat));
  const fillByCat = buildCut(rows, "kategoriya", shtat);
  const structure = buildCut(rows, "strukturnoe", shtat);
  const division = buildCut(rows, "podrazdelenie", shtat);
  const cuts = MOB_SWITCH_CUTS.map((id) => buildCut(rows, id, shtat));

  // Плиткалардаги учта бўлинма қаттиқ ёзилмайди: кесим аллақачон штат бўйича
  // тартибланган, шунинг учун «Кўрсатилмаган»сиз биринчи учтаси олинади.
  const divisionTop = division.groups.filter((g) => !g.unknown).slice(0, 3);

  // --- энг катта вакансиялар ----------------------------------------------
  const vacancySorted = rows.filter((p) => p.vakansiya > 0).sort((a, b) => b.vakansiya - a.vakansiya);
  const vacancyMax = vacancySorted[0]?.vakansiya ?? 0;
  const vacancies: MobVacancyRow[] = vacancySorted.map((p) => ({
    id: p.id,
    lavozim: p.lavozimRu,
    bolinma: cell(p.podrazdelenie),
    shtat: p.shtat,
    band: p.band,
    vakansiya: p.vakansiya,
    pct: share(p.vakansiya, p.shtat),
    barPct: share(p.vakansiya, vacancyMax),
  }));

  // --- банд лавозимдаги ходимлар -------------------------------------------
  const named = rows.filter((p) => !p.vakant);
  const staff: MobStaffRow[] = named.map((p) => ({
    id: p.id,
    name: p.fio,
    lavozim: p.lavozimRu,
    initials: initialsOf(p.fio),
    multi: p.fio.includes(","),
  }));

  // --- лавозимлар рўйхати --------------------------------------------------
  const positions: MobPositionRow[] = rows.map((p) => ({
    id: p.id,
    lavozim: p.lavozimRu,
    lavozimUz: cell(p.lavozimUz),
    kategoriya: cell(p.kategoriya),
    podrazdelenie: cell(p.podrazdelenie),
    strukturnoe: cell(p.strukturnoe),
    guruh: cell(p.guruh),
    mxskKod: cell(p.mxskKod),
    xizmatchiIshchi: cell(p.xizmatchiIshchi),
    xodimToifasi: cell(p.xodimToifasi),
    razryad: cell(p.razryad),
    malakaDarajasi: cell(p.malakaDarajasi),
    shtat: exact(p.shtat),
    band: exact(p.band),
    vakansiya: exact(p.vakansiya),
    xodim: p.fio,
    vakant: p.vakant,
    planText: planText(p.plan, mons),
  }));

  // --- манба билан таққослаш ----------------------------------------------
  // Манбанинг ўз «жами» сатри API'дан келади (`sheetTotals` / `sheetMonthly` /
  // `sheetCumulative`). У сатрлар йиғиндисига **қўшилмайди** — бэкенд уларни
  // `rows` дан ажратиб беради, акс ҳолда ҳар бир сон икки марта саналарди.
  const st = res.sheetTotals;
  const checks: MobCheck[] = [
    cmpTotal("Штат бирлиги", shtat, st?.shtat),
    cmpTotal("Банд", band, st?.band),
    cmpTotal("Вакансия", vakansiya, st?.vakansiya),
    cmpTotal("Лавозим номи бирлиги", totals.nomBirligi, st?.nomBirligi),
    {
      k: "Банд + вакансия = штат",
      ok: band + vakansiya === shtat,
      detail: `${exact(band)} + ${exact(vakansiya)} = ${exact(shtat)}`,
    },
    cmpSeries("Ойлик ёллаш", hires, res.sheetMonthly),
    cmpSeries(
      "Ўсиб борувчи қатор",
      months.map((m) => m.cum),
      res.sheetCumulative,
    ),
    {
      k: "Режа жами = штат жами",
      ok: planTotal === shtat,
      detail: `${exact(planTotal)} = ${exact(shtat)}`,
    },
  ];

  const nullCount = (of: (p: MobplanPositionRow) => string | null): number =>
    rows.filter((p) => of(p) !== null).length;

  return {
    reportDate: res.source ? dateLabel(res.source.importedAt.slice(0, 10)) : MOB_NO_VALUE,
    horizon:
      mons.length > 0 ? `${monthLabel(mons[0])} — ${monthLabel(mons[mons.length - 1])}` : MOB_NO_VALUE,
    totals,
    months,
    quarters,
    years,
    lateHires,
    lateHiresPct: share(lateHires, planTotal),
    firstHireMonth: hireMonths[0]?.label ?? MOB_NO_VALUE,
    lastHireMonth: hireMonths[hireMonths.length - 1]?.label ?? MOB_NO_VALUE,
    shareCuts,
    ratio,
    qualification,
    fillByCat,
    divisionTop,
    structure,
    division,
    cuts,
    vacancies,
    staff,
    positions,
    checks,
    // «Мос эмас» фақат ҳақиқий номослик; таққослаш ўтказилмагани (`null`)
    // натижани бузмайди.
    checksAllOk: checks.every((c) => c.ok !== false),
    filled: [
      { k: "Бўлинма", filled: nullCount((p) => p.podrazdelenie), total: rows.length },
      { k: "Таркибий бўлим", filled: nullCount((p) => p.strukturnoe), total: rows.length },
      { k: "Ходимлар тоифаси", filled: nullCount((p) => p.kategoriya), total: rows.length },
      { k: "Гуруҳ", filled: nullCount((p) => p.guruh), total: rows.length },
      { k: "Ўзбекча номи", filled: nullCount((p) => p.lavozimUz), total: rows.length },
      { k: "МХСК коди", filled: nullCount((p) => p.mxskKod), total: rows.length },
      { k: "Хизматчи / ишчи", filled: nullCount((p) => p.xizmatchiIshchi), total: rows.length },
      { k: "Ходим тоифаси", filled: nullCount((p) => p.xodimToifasi), total: rows.length },
      { k: "Малака даражаси", filled: nullCount((p) => p.malakaDarajasi), total: rows.length },
      { k: "Разряд", filled: nullCount((p) => p.razryad), total: rows.length },
    ],
    namedRows: named.length,
    namedBand: sum(named.map((p) => p.band)),
    bandWithoutName: band - sum(named.map((p) => p.band)),
    multiNameRows: named.filter((p) => p.fio.includes(",")).length,
  };
}

/** Фоиз матни — бўлимнинг ҳамма жойида бир хил кўринишда. */
export const mobPct = (p: number): string => pctTxt(p);
