import { dateLabel, exact, monthLabel, monthTick, pctTxt } from "../format";
import type { MobplanPositionRow, MobplanResponse } from "../../api/types";

/**
 * «Кадрлар режаси» бўлими учун view-model.
 *
 * Панел API тузилмасини билмайди — у фақат шу файл тайёрлаган қийматларни
 * олади. Жавоб шакли ўзгарса тузатиш шу ерда бўлади, панелга тегилмайди.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `GET /mobplan` (`api/endpoints.ts` → `getMobplan`), **параметрсиз**: манба
 * вақт қатори эмас, битта ҳужжатнинг жорий ҳолати. Юқоридаги давр танлагичи
 * бу бўлимга таъсир қилмайди.
 *
 * Варақда 78 та лавозим сатри бор. Варақнинг ўз «жами» сатрлари (`Набор по
 * месяцам`, `По возрастанию`) `rows` га **тушмайди** — улар алоҳида
 * `sheetMonthly` / `sheetCumulative` / `sheetTotals` бўлиб келади. Уларни
 * сатрлар билан бирга қўшиш ҳар бир рақамни икки марта санарди; шунинг учун
 * улар фақат **текширув** учун ишлатилади (`checks`).
 *
 * ═══ Бу бўлимдаги энг муҳим талқин ══════════════════════════════════════
 *
 * 241 штат бирлигидан 25 таси банд, 216 таси вакант. Бу **орқада қолиш эмас**:
 * корхона ҳали ишга туширилмаган ва режанинг ўзи шундай тузилган. Шу сабабли:
 *
 *   - вакансия ҳолат ранги билан (`good/warn/crit`) бўялмайди — ўша ранглар
 *     дашбордда «режа бажарилиши» маъносини ташийди, бу ерда эса баҳоланадиган
 *     бажарилиш йўқ;
 *   - «бажарилмаган», «орқада», «критик» каби сўзлар ишлатилмайди;
 *   - вакансия учун нейтрал ранг (`--rule`), банд учун `--s3`.
 *
 * Айнан шунинг учун бу файл `Status` типини умуман ишлатмайди.
 *
 * ═══ Бўш катак тўлдирилмайди ════════════════════════════════════════════
 *
 * Тасниф устунлари қисман тўлдирилган. Бўш катак «юқоридагидек» дегани эмас:
 * у юқоридаги сатрдан кўчирилмайди, тахмин ҳам қилинмайди — «Кўрсатилмаган»
 * номли **алоҳида гуруҳга** тушади ва бошқа гуруҳ билан бир қаторда, ўз штат
 * бирлиги билан кўринади. Шунинг учун ҳар бир кесимнинг гуруҳлари йиғиндиси
 * доим тўлиқ штатга тенг бўлади.
 *
 * ═══ Манбада умуман йўқ кўрсаткич ═══════════════════════════════════════
 *
 * Кадрлар дашбордида одатда кутиладиган кўпчилик кўрсаткич (МҲТФ, кадрлар
 * оқими, таълим/жинс/ёш, ҳужжат муддатлари, ГПХ, экспатлар, ўқитиш, иш
 * графиклари) бу манбада **устун сифатида ҳам йўқ**. Улар нол билан ҳам,
 * тахмин билан ҳам тўлдирилмайди — очиқ «маълумот йўқ» бўлиб туради
 * (`MOB_NO_DATA_*` рўйхатлари).
 *
 * ═══ Сон ════════════════════════════════════════════════════════════════
 *
 * Бу ердаги ҳамма сон — киши (штат бирлиги), яъни бутун сон: ҳамма жойда
 * `exact()`. Фоиз ҳисобланган қиймат бўлгани учун `pctTxt()` (бир хона).
 * Яхлитлаш йўқ.
 */

/* -------------------------------------------------------------------------- */
/* умумий матн ва форматлаш                                                   */
/* -------------------------------------------------------------------------- */

/** Тасниф устуни тўлдирилмаган сатрлар гуруҳи. */
export const MOB_UNKNOWN = "Кўрсатилмаган";

/** Ходим устунидаги «вакант» ёзуви — ҳолат, маълумот йўқлиги эмас. */
export const MOB_VAKANT = "вакант";

/** Бўш катак матни (тасниф устунларида). */
export const MOB_NO_VALUE = "—";

/**
 * Манбада бундай устун умуман йўқ. Бу «нол» эмас ва «ҳали ҳисобланмаган» ҳам
 * эмас — қиймат ўйлаб топилмайди.
 */
export const MOB_NO_DATA = "маълумот йўқ";

/** Манбадаги қиймат — яхлитланмайди. */
export const mobExact = (v: number): string => exact(v);

/** Фоиз матни — бўлимнинг ҳамма жойида бир хил кўринишда. */
export const mobPct = (p: number): string => pctTxt(p);

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

const share = (part: number, whole: number): number => (whole === 0 ? 0 : (part / whole) * 100);

/* -------------------------------------------------------------------------- */
/* манбада йўқ кўрсаткичлар                                                   */
/* -------------------------------------------------------------------------- */

export interface MobNoDataItem {
  key: string;
  label: string;
}

export interface MobNoDataBlock {
  key: string;
  title: string;
  /** Нима учун йўқ — бир жумлада. */
  note: string;
  items: MobNoDataItem[];
}

const items = (...labels: string[]): MobNoDataItem[] =>
  labels.map((label, i) => ({ key: `${i}:${label}`, label }));

/** Плиткалардаги иккита кўрсаткич — манбада устуни йўқ. */
export const MOB_NO_DATA_TILES: { key: string; label: string; note: string }[] = [
  {
    key: "fot",
    label: "Меҳнатга ҳақ тўлаш фонди",
    note: "ойлик сумма — штат жадвалида иш ҳақи устуни йўқ",
  },
  {
    key: "oqim",
    label: "Кадрлар оқими",
    note: "ишга қабул ва бўшатиш ҳаракати — манбада ҳаракат ёзуви йўқ",
  },
];

/** Ҳалқалардаги учта кесим — манбада бундай устун йўқ. */
export const MOB_NO_DATA_DONUTS: { key: string; title: string; note: string }[] = [
  { key: "talim", title: "Таълим бўйича", note: "манбада таълим устуни йўқ" },
  { key: "jins", title: "Жинс бўйича", note: "манбада жинс устуни йўқ" },
  { key: "yosh", title: "Ёш бўйича", note: "манбада туғилган сана ва ёш устуни йўқ" },
];

/** Ўрта қатордаги учинчи карточка. */
export const MOB_NO_DATA_SCHEDULE: MobNoDataBlock = {
  key: "grafik",
  title: "Иш графиклари",
  note: "Манбада смена ва иш вақти устуни йўқ — график тақсимоти бошқа ҳужжатдан келади.",
  items: items("Смена бўйича тақсимот", "Иш вақти нормаси", "Навбатчилик"),
};

/** Пастки қатордаги бешта карточка — ҳар бирининг ҳамма кўрсаткичи йўқ. */
export const MOB_NO_DATA_CARDS: MobNoDataBlock[] = [
  {
    key: "kdp",
    title: "Кадрлар иш юритиши",
    note: "Буйруқ ва ҳаракат статистикаси штат жадвалида сақланмайди.",
    items: items("Ишга қабул", "Ўтказиш", "Бўшатиш", "Таътил", "Декрет таътили"),
  },
  {
    key: "hujjat",
    title: "Муддати тугаётган ҳужжатлар",
    note: "Ҳужжат муддатлари реестри — алоҳида манба, бу варақда йўқ.",
    items: items("Паспортлар", "Меҳнат шартномалари", "Тиббий кўрик", "Сертификатлар", "Визалар"),
  },
  {
    key: "gph",
    title: "Фуқаролик-ҳуқуқий шартномалар",
    note: "ГПХ шартномалари штат жадвалига кирмайди — улар штат бирлиги эмас.",
    items: items("Амалдаги шартномалар", "Пудратчилар", "Тўловлар"),
  },
  {
    key: "expat",
    title: "Хорижий мутахассислар",
    note: "Фуқаролик ва иш рухсатномаси устуни манбада йўқ.",
    items: items("Жами", "Давлат бўйича"),
  },
  {
    key: "oqitish",
    title: "Ўқитиш ва малака ошириш",
    note: "Ўқитиш дастурлари алоҳида ҳисобда — штат жадвалида қайд этилмайди.",
    items: items("Режа", "Бажарилиши", "Тайинланган", "Ўтган", "Соат"),
  },
];

/* -------------------------------------------------------------------------- */
/* умумий кўрсаткичлар                                                        */
/* -------------------------------------------------------------------------- */

export interface MobTotals {
  /** Рўйхатдаги лавозим сатрлари сони. */
  rows: number;
  /**
   * Манбадаги «Единица должности» устунининг йиғиндиси. Бу **сатрлар сони
   * эмас**: сатр алоҳида лавозим номи бирлиги бўлса 1, акс ҳолда 0.
   */
  nomBirligi: number;
  shtat: number;
  band: number;
  vakansiya: number;
  bandPct: number;
  vakansiyaPct: number;
}

/* -------------------------------------------------------------------------- */
/* кесимлар                                                                   */
/* -------------------------------------------------------------------------- */

export interface MobGroup {
  key: string;
  /** Манбадаги ёзувда — таржима ҳам, имло тузатиши ҳам йўқ. */
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

export interface MobCut {
  id: string;
  title: string;
  groups: MobGroup[];
  /** Манбада тўлдирилган сатрлар сони. */
  filled: number;
}

/**
 * Гуруҳлар штат бўйича камайиш тартибида; `«Кўрсатилмаган»` доим охирида.
 * Тартиб қатъий ва ҳисобланадиган — шунинг учун гуруҳларнинг ўрни ҳам,
 * ҳалқадаги ранги ҳам барқарор.
 */
function buildCut(
  rows: MobplanPositionRow[],
  id: string,
  title: string,
  of: (p: MobplanPositionRow) => string | null,
  shtatAll: number,
): MobCut {
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

  return { id, title, groups, filled: rows.filter((p) => of(p) !== null).length };
}

/* -------------------------------------------------------------------------- */
/* ташкилий тузилма                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ташкилий тузилма — манбадаги **иккита** устуннинг ҳақиқий номлари.
 *
 * `«Подразделение»` (A) аслида тоифа даражаси (Руководство · Специалситы ·
 * Производственный персонал), `«Структурное подразделение»` (B) эса асосан
 * ҳақиқий бўлинма (Управление · служба КИПиА · Секция сжигания…), лекин
 * ичида `ИТР` ва `Рабочий персонал` каби тоифа ёзувлари ҳам бор. Бу аралашув
 * **тузатилмайди ва бирлаштирилмайди** — манбадаги ҳолат шундай; фақат
 * экранда очиқ айтилади.
 */
export interface MobOrgRow {
  key: string;
  /** Қайси устундан келгани — `"A"` ёки `"B"`. */
  level: "A" | "B";
  name: string;
  unknown: boolean;
  rows: number;
  shtat: number;
  shtatPct: number;
}

const orgRows = (cut: MobCut, level: "A" | "B"): MobOrgRow[] =>
  cut.groups.map((g) => ({
    key: g.key,
    level,
    name: g.name,
    unknown: g.unknown,
    rows: g.rows,
    shtat: g.shtat,
    shtatPct: g.shtatPct,
  }));

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
  hires: number;
  /** Шу ой охиридаги жами (ўсиб борувчи). */
  cum: number;
  cumPct: number;
}

export interface MobQuarterRow {
  id: string;
  year: number;
  /** «2025 · I чорак». */
  label: string;
  /** Ўқ белгиси: «2025 I» — икки йил бўлгани учун йил ташлаб кетилмайди. */
  tick: string;
  hires: number;
  cum: number;
  /** Жами режадаги улуши. */
  pct: number;
}

export interface MobYearPlan {
  year: number;
  hires: number;
  pct: number;
  /** Шу йилдаги чораклар — босқичлар диаграммаси йил бўйича гуруҳланиши учун. */
  quarters: MobQuarterRow[];
}

const ROMAN = ["I", "II", "III", "IV"];

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
  /** Битта катакда иккита исм (масалан ҳайдовчилар). */
  multiName: boolean;
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
/* исмлар ҳисоби                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Исм билан боғлиқ ҳисоб. Экранда очиқ кўрсатилади: банд бирлик сони билан
 * исм ёзилган сатр сони **тенг эмас** — битта катакда иккита исм турган
 * сатрлар бор, битта банд бирлик эса умуман исмсиз. Исм ўйлаб топилмайди ва
 * йиғинди тўғриланмайди.
 */
export interface MobNameStats {
  /** Ф.И.Ш. ёзилган сатрлар сони. */
  named: number;
  /** «вакант» деб ёзилган сатрлар сони. */
  vakant: number;
  /** Битта катакда иккита исм бор сатрлар сони. */
  multi: number;
  /** Исм ёзилган сатрлардаги банд штат бирлиги. */
  namedBand: number;
  /** Исмсиз қолган банд штат бирлиги. */
  bandWithoutName: number;
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
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface MobVM {
  /** Импорт санаси — «26-август 2026» ёки «—». Файл ва варақ номи чиқмайди. */
  reportDate: string;
  /** Режа горизонти: «Январь 2025 — Декабрь 2026». */
  horizon: string;
  totals: MobTotals;
  /** Ёллаш режасининг жами йиғиндиси — штат билан таққосланади. */
  planTotal: number;
  /** Йиллар кесими, чораклари билан. */
  years: MobYearPlan[];
  /** Энг катта ёллаш режаси бор йил — плиткадаги «йил режаси». */
  mainYear: MobYearPlan | null;
  /** Қолган йиллар — плитка изоҳида очиқ айтилади, тушириб қолдирилмайди. */
  otherYears: MobYearPlan[];
  /** Асосий йилнинг иккинчи ярмига қўйилган ёллаш. */
  lateHires: number;
  lateHiresPct: number;
  months: MobMonthRow[];
  quarters: MobQuarterRow[];
  /** Ходимлар тоифаси (манбадаги «C» устуни) — ҳалқа. */
  kategoriya: MobCut;
  /** Таркибий бўлим (манбадаги «B» устуни) — бўлинмалар диаграммаси. */
  strukturnoe: MobCut;
  /** Бўлинма (манбадаги «A» устуни) — ташкилий тузилма учун. */
  podrazdelenie: MobCut;
  /** A ва B нинг ҳақиқий номлари, штат бирлиги билан. */
  org: MobOrgRow[];
  positions: MobPositionRow[];
  names: MobNameStats;
  checks: MobCheck[];
  checksAllOk: boolean;
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

  // --- ёллаш режаси --------------------------------------------------------
  const hires = mons.map((_, i) => sum(rows.map((p) => p.plan[i] ?? 0)));
  const planTotal = sum(hires);

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

  // Йиллар қаттиқ ёзилмайди: манба неча йилни қамраса, шунча йил чиқади.
  const years: MobYearPlan[] = [];
  for (const q of quarters) {
    const last = years[years.length - 1];
    if (last && last.year === q.year) {
      last.hires += q.hires;
      last.quarters.push(q);
    } else {
      years.push({ year: q.year, hires: q.hires, pct: 0, quarters: [q] });
    }
  }
  for (const y of years) y.pct = share(y.hires, planTotal);

  // «Йил режаси» плиткаси учун — энг катта ёллаш бор йил. Тенг бўлса кейинги
  // йил олинади, чунки режанинг оғирлиги доим олдинга сурилади.
  let mainYear: MobYearPlan | null = null;
  for (const y of years) if (mainYear === null || y.hires >= mainYear.hires) mainYear = y;
  const otherYears = mainYear === null ? [] : years.filter((y) => y.year !== mainYear!.year);

  const lateHires =
    mainYear === null
      ? 0
      : sum(mainYear.quarters.filter((q) => q.id.endsWith("Q3") || q.id.endsWith("Q4")).map((q) => q.hires));

  // --- кесимлар ------------------------------------------------------------
  const kategoriya = buildCut(rows, "kategoriya", "Ходимлар тоифаси", (p) => p.kategoriya, shtat);
  const strukturnoe = buildCut(rows, "strukturnoe", "Таркибий бўлим", (p) => p.strukturnoe, shtat);
  const podrazdelenie = buildCut(rows, "podrazdelenie", "Бўлинма", (p) => p.podrazdelenie, shtat);

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
    multiName: !p.vakant && p.fio.includes(","),
    planText: planText(p.plan, mons),
  }));

  const named = rows.filter((p) => !p.vakant);
  const namedBand = sum(named.map((p) => p.band));
  const names: MobNameStats = {
    named: named.length,
    vakant: rows.length - named.length,
    multi: named.filter((p) => p.fio.includes(",")).length,
    namedBand,
    bandWithoutName: band - namedBand,
  };

  // --- манба билан таққослаш ----------------------------------------------
  const st = res.sheetTotals;
  const checks: MobCheck[] = [
    cmpTotal("Штат бирлиги", shtat, st?.shtat),
    cmpTotal("Банд", band, st?.band),
    cmpTotal("Вакансия", vakansiya, st?.vakansiya),
    cmpTotal("Единица должности", totals.nomBirligi, st?.nomBirligi),
    {
      k: "Банд + вакансия = штат",
      ok: band + vakansiya === shtat,
      detail: `${exact(band)} + ${exact(vakansiya)} = ${exact(shtat)}`,
    },
    cmpSeries("Ойлик ёллаш (Набор по месяцам)", hires, res.sheetMonthly),
    cmpSeries(
      "Ўсиб борувчи қатор (По возрастанию)",
      months.map((m) => m.cum),
      res.sheetCumulative,
    ),
    {
      k: "Режа жами = штат жами",
      ok: planTotal === shtat,
      detail: `${exact(planTotal)} = ${exact(shtat)}`,
    },
  ];

  return {
    reportDate: res.source ? dateLabel(res.source.importedAt.slice(0, 10)) : MOB_NO_VALUE,
    horizon:
      mons.length > 0
        ? `${monthLabel(mons[0])} — ${monthLabel(mons[mons.length - 1])}`
        : MOB_NO_VALUE,
    totals,
    planTotal,
    years,
    mainYear,
    otherYears,
    lateHires,
    lateHiresPct: share(lateHires, planTotal),
    months,
    quarters,
    kategoriya,
    strukturnoe,
    podrazdelenie,
    org: [...orgRows(podrazdelenie, "A"), ...orgRows(strukturnoe, "B")],
    positions,
    names,
    checks,
    // «Мос эмас» фақат ҳақиқий номослик; таққослаш ўтказилмагани (`null`)
    // натижани бузмайди.
    checksAllOk: checks.every((c) => c.ok !== false),
  };
}
