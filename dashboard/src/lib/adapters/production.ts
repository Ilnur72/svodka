import type {
  NarastaykaRow,
  ProductionMonthlyRow,
  TreeData,
  UnitTotal,
  WeightTotal,
} from "../../api/types";
import { UNASSIGNED_PLANT, isUnknownUnit, plantLabel } from "../dataQuality";
import { fixWorkshop } from "../workshopFixes";
import { dateLabel, dateTick, monthLabel, monthTick } from "../format";

/**
 * Ишлаб чиқариш: `/production/tree` даражали жавобини панел ишлатадиган
 * текис рўйхат + завод гуруҳларига айлантиради.
 *
 * «Белгиланмаган» завод яширилмайди — у «Заводга боғланмаган» номи билан
 * алоҳида гуруҳ бўлади (API-BUGS №5). Базавий бирлиги йўқлиги учун унинг
 * қиймати бирлик кесимидаги йиғиндиларга қўшилмайди.
 */
export interface ProdItem {
  key: string;
  id: number;
  name: string;
  plant: string;
  plantLabel: string;
  workshop: string;
  workshopFull: string | null;
  unit: string | null;
  baseUnit: string | null;
  material: string | null;
  process: string | null;
  category: string | null;
  plan: number;
  fakt: number;
  percent: number | null;
  /** Завод/бирлиги аниқланмаган позиция. */
  unassigned: boolean;
  /** Манбадаги «всего» йиғинди сатри — йиғиндиларга қўшилмайди. */
  isTotal: boolean;
}

export interface PlantGroup {
  name: string;
  label: string;
  unassigned: boolean;
  workshopCount: number;
  productCount: number;
  byUnit: UnitTotal[];
  weight: WeightTotal | null;
}

export interface WorkshopOption {
  code: string;
  plant: string;
  /**
   * Рўйхатда кўринадиган ном: тўлиқ номи бор бўлса `код — тўлиқ ном`, акс
   * ҳолда фақат код. Завод ва цех иккита алоҳида фильтрда танлангани учун
   * бу ерда завод номи такрорланмайди.
   */
  label: string;
  /** Цехнинг тўлиқ номи (бэкенддаги `WORKSHOP_FULL_NAMES`); йўқ бўлса `null`. */
  fullName: string | null;
  count: number;
}

export interface ProdVM {
  items: ProdItem[];
  plants: PlantGroup[];
  workshops: WorkshopOption[];
  totals: { byUnit: UnitTotal[]; weight: WeightTotal | null };
  productCount: number;
}

export function fromTree(tree: TreeData): ProdVM {
  const items: ProdItem[] = [];
  const workshops: WorkshopOption[] = [];

  for (const plant of tree.plants) {
    const unassignedPlant = plant.name === UNASSIGNED_PLANT;
    for (const ws of plant.workshops ?? []) {
      workshops.push({
        code: ws.code,
        plant: plant.name,
        label: ws.fullName ? `${ws.code} — ${ws.fullName}` : ws.code,
        fullName: ws.fullName,
        count: ws.productCount,
      });
      for (const p of ws.products ?? []) {
        // Импорт цехни маҳсулот номидан ажратиб олгани учун бир нечта қатор
        // нотўғри цехга тушган — `workshopFixes.ts` га қаранг.
        const workshop = fixWorkshop(p.name, ws.code);
        items.push({
          key: `${plant.name}#${workshop}#${p.id}`,
          id: p.id,
          name: p.name,
          plant: plant.name,
          plantLabel: plantLabel(plant.name),
          workshop,
          workshopFull: workshop === ws.code ? ws.fullName : null,
          unit: p.unit,
          baseUnit: p.baseUnit,
          material: p.material,
          process: p.process,
          category: p.category,
          plan: p.plan ?? 0,
          fakt: p.fakt ?? 0,
          percent: p.percent,
          unassigned: unassignedPlant || isUnknownUnit(p.baseUnit),
          isTotal: Boolean(p.isTotal),
        });
      }
    }
  }

  const plants: PlantGroup[] = tree.plants.map((p) => ({
    name: p.name,
    label: plantLabel(p.name),
    unassigned: p.name === UNASSIGNED_PLANT,
    workshopCount: p.workshopCount,
    productCount: p.productCount,
    byUnit: p.totals?.byUnit ?? [],
    weight: p.totals?.weight ?? null,
  }));

  // Позиция сони API'дан эмас, ҳақиқий қаторлардан саналади: цех тузатилганда
  // (`workshopFixes.ts`) рўйхатдаги сон ҳам ўзи эргашсин.
  const counted = new Map<string, number>();
  for (const it of items) {
    const k = `${it.plant}#${it.workshop}`;
    counted.set(k, (counted.get(k) ?? 0) + 1);
  }
  for (const w of workshops) w.count = counted.get(`${w.plant}#${w.code}`) ?? 0;

  return {
    items,
    plants,
    workshops,
    totals: { byUnit: tree.totals?.byUnit ?? [], weight: tree.totals?.weight ?? null },
    productCount: tree.productCount,
  };
}

/* -------------------------------------------------------------------------- */
/* фильтр ва статистика                                                       */
/* -------------------------------------------------------------------------- */

/** «Барчаси» — ҳар бир фильтрнинг бўш ҳолати. */
export const FILTER_ALL = "ALL";

/**
 * Панелдаги фильтрлар тўплами.
 *
 * `plant` ва `workshop` — иерархик: аввал завод танланади, кейин цех рўйхати
 * фақат ўша заводники билан тўлади. Шунинг учун цех коди ягона калит сифатида
 * етарли (аввалги `завод#цех` калити керак эмас).
 */
export interface ProdFilter {
  plant: string;
  workshop: string;
  category: string;
  material: string;
  process: string;
  query: string;
}

export const EMPTY_FILTER: ProdFilter = {
  plant: FILTER_ALL,
  workshop: FILTER_ALL,
  category: FILTER_ALL,
  material: FILTER_ALL,
  process: FILTER_ALL,
  query: "",
};

const hit = (picked: string, value: string | null): boolean =>
  picked === FILTER_ALL || (value ?? "") === picked;

/** Фақат завод/цех кесими — фасет рўйхатлари шу тўпламдан ҳисобланади. */
export function scopeItems(items: ProdItem[], plant: string, workshop: string): ProdItem[] {
  return items.filter((x) => hit(plant, x.plant) && hit(workshop, x.workshop));
}

export function filterItems(items: ProdItem[], f: ProdFilter): ProdItem[] {
  const q = f.query.trim().toLowerCase();
  return scopeItems(items, f.plant, f.workshop).filter(
    (x) =>
      hit(f.category, x.category) &&
      hit(f.material, x.material) &&
      hit(f.process, x.process) &&
      (!q || x.name.toLowerCase().includes(q)),
  );
}

/* -------------------------------------------------------------------------- */
/* қўшимча кесимлар (категория / металл / жараён)                             */
/* -------------------------------------------------------------------------- */

export type FacetKey = "category" | "material" | "process";

export interface Facet {
  key: FacetKey;
  label: string;
  values: string[];
}

const FACET_LABELS: Record<FacetKey, string> = {
  category: "Категория",
  material: "Металл",
  process: "Жараён",
};

/** Шунчадан кам қиймати бор кесим кўрсатилмайди — у ҳеч нарсани ажратмайди. */
export const FACET_MIN_VALUES = 2;

/**
 * Кесим рўйхатлари `/filters` дан эмас, **дарахт маълумотининг ўзидан**
 * ҳосил қилинади: шунда танланган завод/цехда ҳақиқатан учрайдиган
 * қийматларгина чиқади, бўш вариант қолмайди ва қўшимча сўров керак эмас.
 *
 * Манба — `Справочники.xlsx` → «Нарастайка SPR» варағининг «Категория»,
 * «Металл», «процесс» устунлари; бэкенд уларни `narastayka_items` га ёзади
 * ва `/production/tree` да ҳар бир маҳсулот билан бирга қайтаради.
 */
export function facets(items: ProdItem[]): Facet[] {
  const keys: FacetKey[] = ["category", "material", "process"];
  return keys
    .map((key) => ({
      key,
      label: FACET_LABELS[key],
      values: [
        ...new Set(
          items
            .map((x) => x[key])
            .filter((v): v is string => typeof v === "string" && v.trim() !== ""),
        ),
      ].sort((a, b) => a.localeCompare(b, "ru")),
    }))
    .filter((f) => f.values.length >= FACET_MIN_VALUES);
}

export interface ProdStats {
  total: number;
  withPlan: number;
  met: number;
  /** Ҳар бир позиция бажарилишининг ўртачаси, 100% дан ошмайди. */
  score: number;
  zero: number;
}

export function prodStats(rows: ProdItem[]): ProdStats {
  // «Всего» сатрлари ўз таркибий қисмлари билан бирга саналмаслиги керак.
  const base = rows.filter((x) => !x.isTotal);
  const wp = base.filter((x) => x.plan > 0);
  const met = wp.filter((x) => x.fakt >= x.plan * 0.999).length;
  const score = wp.length
    ? (wp.reduce((a, x) => a + Math.min(x.fakt / x.plan, 1), 0) / wp.length) * 100
    : 0;
  return {
    total: base.length,
    withPlan: wp.length,
    met,
    score,
    zero: wp.filter((x) => x.fakt === 0).length,
  };
}

export interface DeviationRow extends ProdItem {
  /** Бажарилиш %, 300 да чекланган — битта чегара ҳолат диаграммани текисламасин. */
  pc: number;
}

export interface TotalRow extends ProdItem {
  /** Бажарилиш %, режа нол бўлса `null`. */
  pc: number | null;
}

/** Ҳар бир четланиш рўйхатида нечта позиция кўрсатилади. */
export const DEVIATION_LIMIT = 25;

/**
 * Четланиш рўйхатлари фақат **режаси бор** позициялардан тузилади: режа нол
 * бўлса бажарилиш фоизини ҳисоблаб бўлмайди (API ҳам `percent: null` қайтаради).
 *
 * Лекин уларни бутунлай яшириб қўйиш маълумот йўқотиш бўларди — «Получение
 * ТМА из 5 цеха по факту» каби қаторларда режа йўқ, факт эса 321 тн. Шунинг
 * учун улар `noPlan` да алоҳида қайтарилади ва панелда жадвал сифатида
 * кўрсатилади (фоиз эмас, факт).
 */
/**
 * Рўйхат шунча позициядан қисқа бўлса, чекка 25 талик эмас, **тўлиқ рўйхат**
 * кўрсатилади. Сабаби: битта цех танлаганда фойдаланувчи ўша цехни бутунлай
 * кўрмоқчи, «энг ёмон 25 та» ни эмас. Ўртадаги позициялар (масалан «Выпуск
 * перрената аммония» 76,7%) акс ҳолда ҳеч қайси рўйхатга тушмай қоларди.
 */
export const FULL_LIST_MAX = 60;

export function deviationRows(rows: ProdItem[]): {
  low: DeviationRow[];
  high: DeviationRow[];
  /** Барча режали позициялар, бажарилиш бўйича ўсиш тартибида. */
  all: DeviationRow[];
  /** `true` — тўлиқ рўйхат кўрсатилсин (позиция кам). */
  showAll: boolean;
  noPlan: ProdItem[];
  /** Манбадаги «всего» сатрлари — алоҳида кўрсатилади. */
  totals: TotalRow[];
} {
  const base = rows.filter((x) => !x.isTotal);
  const rank: DeviationRow[] = base
    .filter((x) => x.plan > 0)
    .map((x) => ({ ...x, pc: Math.min((x.fakt / x.plan) * 100, 300) }));
  const asc = [...rank].sort((a, b) => a.pc - b.pc);
  return {
    low: asc.slice(0, DEVIATION_LIMIT),
    high: [...rank].sort((a, b) => b.pc - a.pc).slice(0, DEVIATION_LIMIT),
    all: asc,
    showAll: rank.length > 0 && rank.length <= FULL_LIST_MAX,
    noPlan: base.filter((x) => !(x.plan > 0)).sort((a, b) => b.fakt - a.fakt),
    totals: rows
      .filter((x) => x.isTotal)
      .map((x) => ({ ...x, pc: x.plan > 0 ? (x.fakt / x.plan) * 100 : null }))
      .sort((a, b) => (b.fakt || 0) - (a.fakt || 0)),
  };
}

export interface UnitGroup {
  name: string;
  unit: string;
  items: ProdItem[];
}

/**
 * Ўлчов бирлиги оилалари бўйича энг йирик позициялар. Турли бирликдаги
 * қийматлар ҳеч қачон битта шкалага қўйилмайди — шунинг учун гуруҳлаш.
 */
export function unitGroups(rows: ProdItem[]): UnitGroup[] {
  const byUnit = new Map<string, ProdItem[]>();
  for (const x of rows) {
    if (x.plan <= 0 || x.isTotal) continue;
    const u = x.unit && x.unit.trim() ? x.unit.trim() : "—";
    const list = byUnit.get(u) ?? [];
    list.push(x);
    byUnit.set(u, list);
  }
  return [...byUnit.entries()]
    .map(([unit, list]) => ({
      unit,
      name: unit === "—" ? "Бирлиги аниқланмаган" : `Ўлчов бирлиги: ${unit}`,
      items: list
        .sort((a, b) => Math.max(b.fakt, b.plan) - Math.max(a.fakt, a.plan))
        .slice(0, 8),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}

/* -------------------------------------------------------------------------- */
/* маҳсулот карточкалари                                                      */
/* -------------------------------------------------------------------------- */

export interface ProdCard {
  key: string;
  name: string;
  workshop: string;
  plantLabel: string;
  unit: string | null;
  material: string | null;
  process: string | null;
  /** Танланган давр учун режа. */
  plan: number;
  /** Танланган давр бошидан йиғилган факт — «шу кунгача чиққани». */
  fakt: number;
  /** Бэкенд ҳисоблаган бажарилиш фоизи; режа нол бўлса `null`. */
  percent: number | null;
  /**
   * Даврнинг маълумот бор сўнгги куни бўйича режа/факт — даврий йиғиндидан
   * **фарқли** сон. Юкланмаган ёки ўша куни ёзув бўлмаса `null` (карточкада
   * бу қатор кўринмайди).
   */
  day: { label: string; plan: number; fakt: number } | null;
}

/**
 * Фильтр бўйича маҳсулот карточкалари.
 *
 * `isTotal` («…, всего») сатрлари **киритилмайди** — улар пастдаги
 * позицияларнинг йиғиндиси, gridга қўшилса битта миқдор икки марта кўринарди.
 * Улар панелда алоҳида «Йиғинди сатрлар» карточкасида қолади.
 *
 * Тартиб: аввал режаси бор позициялар бажарилиш фоизи бўйича **ўсиш**
 * тартибида (энг орқада қолгани биринчи — раҳбар шуни биринчи кўриши керак),
 * кейин режасиз позициялар факт бўйича камайиш тартибида.
 */
export function productCards(rows: ProdItem[], lastDay: LastDayVM | null): ProdCard[] {
  const planned: ProdCard[] = [];
  const noPlan: ProdCard[] = [];
  for (const x of rows) {
    if (x.isTotal) continue;
    const d = lastDay?.byProduct.get(normName(x.name));
    const card: ProdCard = {
      key: x.key,
      name: x.name,
      workshop: x.workshop,
      plantLabel: x.plantLabel,
      unit: x.unit,
      material: x.material,
      process: x.process,
      plan: x.plan,
      fakt: x.fakt,
      percent: x.percent,
      day: d && lastDay ? { label: lastDay.label, plan: d.plan, fakt: d.fakt } : null,
    };
    (x.plan > 0 ? planned : noPlan).push(card);
  }
  planned.sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0));
  noPlan.sort((a, b) => b.fakt - a.fakt);
  return [...planned, ...noPlan];
}

/* -------------------------------------------------------------------------- */
/* битта позициянинг кунлик динамикаси (/narastayka)                          */
/* -------------------------------------------------------------------------- */

export interface DailySeries {
  labels: string[];
  fullLabels: string[];
  plan: number[];
  fakt: number[];
  cumPlan: number[];
  cumFakt: number[];
  /** ILIKE қидирув бўйича мос келган ва **ҳисобга олинган** позиция номлари. */
  matched: string[];
  /**
   * Ҳисобдан чиқарилган «всего» йиғинди сатрлари номлари — панелда
   * фойдаланувчига нима ташлаб юборилгани айтилади.
   */
  excludedTotals: string[];
  /**
   * `true` — мос келган **барча** қатор «всего» эди (фойдаланувчи айнан
   * йиғинди позициясини танлаган), шунинг учун улар чиқарилмади.
   */
  totalsOnly: boolean;
  /** Бэкенддаги мос қаторларнинг умумий сони (`total`). */
  total: number;
  /** Жавобга ҳақиқатда сиққан қаторлар сони. */
  received: number;
  /** `true` — жавоб `limit` билан қирқилган, энг эски кунлар тушиб қолган. */
  truncated: boolean;
}

/**
 * Битта позициянинг кунлик динамикаси.
 *
 * **«Всего» сатрлари.** `/narastayka` — деталь рўйхат, шунинг учун у бошқа
 * endpoint'лардан фарқли равишда манбадаги «…, всего» қаторларини ўзида
 * қолдиради (бэкенд `narastaykaWhere(q)` ни `excludeTotals` сиз чақиради).
 * `product` эса ILIKE билан изланади — «Резцы» сўрови бир вақтда «Резцы всего»
 * ни ҳам, ҳар бир резец турини ҳам топади. Иккови қўшилса кунлик ва ўсиб
 * борувчи қиймат **икки баробар** бўларди.
 *
 * Шунинг учун улар `deviationRows().totals` даги ёндашув билан **ажратилади**,
 * яширилмайди: ҳисобга кирмайди, лекин `excludedTotals` да қайтарилади ва
 * панелда номи билан кўрсатилади. Агар мос келган ҳамма қатор «всего» бўлса —
 * фойдаланувчи айнан йиғинди позициясини танлаган, диаграмма бўш қолмаслиги
 * учун ўша қаторлар ишлатилади (`totalsOnly`).
 *
 * **Қирқилиш.** Жавоб `for_day DESC` тартибида сахифаланади, демак limit
 * етмаса энг **эски** кунлар тушиб қолади — диаграмма давр ўртасидан
 * бошланади ва ўсиб борувчи якун нотўғри бўлади. `total > received` бўлса
 * `truncated` билан хабар қилинади; чегаранинг ўзи `narastaykaLimit()` да.
 */
export function dailyFromNarastayka(
  res: { rows: NarastaykaRow[]; total: number },
  multiMonth: boolean,
): DailySeries {
  const { rows, total } = res;
  const totalRows = rows.filter((r) => r.isTotal);
  // Фойдаланувчи айнан «всего» позициясини танлаган ҳолат — ҳаммасини
  // чиқариб ташласак диаграмма бўш қоларди.
  const totalsOnly = rows.length > 0 && totalRows.length === rows.length;
  const used = totalsOnly ? rows : rows.filter((r) => !r.isTotal);

  const byDay = new Map<string, { plan: number; fakt: number }>();
  const matched = new Set<string>();
  for (const r of used) {
    matched.add(r.product);
    const slot = byDay.get(r.for_day) ?? { plan: 0, fakt: 0 };
    slot.plan += r.plan ?? 0;
    slot.fakt += r.fakt ?? 0;
    byDay.set(r.for_day, slot);
  }
  const days = [...byDay.keys()].sort();
  const plan = days.map((d) => byDay.get(d)?.plan ?? 0);
  const fakt = days.map((d) => byDay.get(d)?.fakt ?? 0);
  return {
    labels: days.map((d) => dateTick(d, multiMonth)),
    fullLabels: days.map(dateLabel),
    plan,
    fakt,
    cumPlan: cumulative(plan),
    cumFakt: cumulative(fakt),
    matched: [...matched],
    excludedTotals: totalsOnly ? [] : [...new Set(totalRows.map((r) => r.product))],
    totalsOnly,
    total,
    received: rows.length,
    truncated: total > rows.length,
  };
}

/** Бэкенддаги `MAX_LIMIT` (`production-report.service.ts`) — ундан катта сўралмайди. */
export const NARASTAYKA_MAX_LIMIT = 5000;
/** Қисқа даврда ҳам камида шунча қатор сўралади. */
export const NARASTAYKA_MIN_LIMIT = 400;
/**
 * Бир кунга нечта қатор кутилади. ILIKE қидируви одатда 1–15 та позицияни
 * ушлайди, 60 — тахминан тўрт баробар захира билан олинган чегара.
 */
export const NARASTAYKA_ROWS_PER_DAY = 60;

/**
 * `/narastayka` учун саҳифа ҳажми — давр узунлигидан ҳисобланади.
 *
 * Собит 400 та қатор бир ойлик даврда ~12 тадан ортиқ позиция мос келса ёки
 * 2+ ойлик давр танланса етмай қоларди, ва қирқилиш **жимгина** содир
 * бўларди. ILIKE қанча позицияни ушлашини олдиндан билиб бўлмагани учун
 * чегарани ошириш ўзи кифоя эмас — қирқилиш ҳолати `DailySeries.truncated`
 * да барибир текширилади.
 */
export function narastaykaLimit(from: string, to: string): number {
  const ms = Date.parse(to) - Date.parse(from);
  const days = Number.isFinite(ms) ? Math.floor(ms / 86_400_000) + 1 : 0;
  return Math.min(
    NARASTAYKA_MAX_LIMIT,
    Math.max(NARASTAYKA_MIN_LIMIT, days * NARASTAYKA_ROWS_PER_DAY),
  );
}

/* -------------------------------------------------------------------------- */
/* сўнгги кун кесими (/narastayka, битта цех)                                 */
/* -------------------------------------------------------------------------- */

export interface DayFact {
  plan: number;
  fakt: number;
}

export interface LastDayVM {
  /** Жавобдаги энг сўнгги кун, ISO: `2026-06-30`. */
  day: string;
  /** Ўқиладиган кўриниши: `30-июнь 2026`. */
  label: string;
  /** Нормаллаштирилган позиция номи → ўша куннинг режа/факти. */
  byProduct: Map<string, DayFact>;
}

/**
 * Битта цехнинг **сўнгги куни** бўйича режа/факт.
 *
 * Нега керак: дарахтдаги `fakt` — давр бошидан йиғилган якун («шу кунгача
 * чиққани»). Карточкада фақат ўша сон турса, «режа / факт / шу кунгача»
 * учталигидан иккитаси айнан бир хил рақам бўларди. Сўнгги кун эса
 * ҳақиқатан бошқа кесим — суткалик чиқим.
 *
 * `/narastayka` жавоби `for_day DESC` тартибида келгани учун `limit` етмай
 * қирқилса ҳам **энг сўнгги кун тўлиқ** келади: шунинг учун бу ерда
 * қирқилиш текширилмайди, жавобдаги максимал кун олинади. «Давр охирги
 * куни» эмас, айнан **маълумот бор** сўнгги кун — жорий ойда сводка бир-икки
 * кун кечикиши мумкин.
 *
 * «Всего» сатрлари ҳисобга олинмайди: карточкалар ҳам уларсиз тузилади.
 */
export function lastDayFacts(res: { rows: NarastaykaRow[] }): LastDayVM | null {
  let day = "";
  for (const r of res.rows) if (r.for_day && r.for_day > day) day = r.for_day;
  if (!day) return null;

  const byProduct = new Map<string, DayFact>();
  for (const r of res.rows) {
    if (r.for_day !== day || r.isTotal) continue;
    const k = normName(r.product);
    const slot = byProduct.get(k) ?? { plan: 0, fakt: 0 };
    slot.plan += r.plan ?? 0;
    slot.fakt += r.fakt ?? 0;
    byProduct.set(k, slot);
  }
  // Битта позицияга бир кунда бир нечта ёзув тушса — float дрейфи қолмасин.
  for (const [k, v] of byProduct) {
    byProduct.set(k, { plan: Number(v.plan.toFixed(3)), fakt: Number(v.fakt.toFixed(3)) });
  }
  return { day, label: dateLabel(day), byProduct };
}

/** Ном бўйича мослаштириш: бўшлиқ ва катта-кичик ҳарф фарқи ҳисобга олинмайди. */
const normName = (s: string): string => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Сўнгги кун сўрови учун саҳифа ҳажми. Битта цехда бир кунга ~20 тагача
 * ёзув тушади, жавоб эса кундан тескари тартибда келади — 400 қатор сўнгги
 * кунни ҳар доим тўлиқ қамрайди.
 */
export const NARASTAYKA_LAST_DAY_LIMIT = 400;

/** Ўсиб борувчи якун; float дрейфини олдини олиш учун яхлитланади. */
export function cumulative(values: number[], dec = 3): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of values) {
    acc += v || 0;
    out.push(Number(acc.toFixed(dec)));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* ойлик тренд (/production/monthly)                                          */
/* -------------------------------------------------------------------------- */

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  full: string;
  plan: number;
  fakt: number;
}

export interface MonthlyTrendVM {
  /** Фақат битта базавий бирлик (одатда `тн`) — қийматлар қўшилиши мумкин. */
  unit: string;
  points: MonthlyTrendPoint[];
  /** Базавий бирлиги аниқланмагани учун ҳисобдан чиқарилган ойлар сони. */
  skippedUnassigned: number;
  /** Мавжуд бошқа бирликлар — изоҳда эслатилади. */
  otherUnits: string[];
}

/**
 * Ойлик тренд фақат **битта** базавий бирлик бўйича қурилади: `тн`, у бўлмаса
 * энг кўп учрайдиган бирлик. Турли бирликларни битта устунга қўшиш мумкин эмас.
 */
export function monthlyTrend(rows: ProductionMonthlyRow[], months: string[]): MonthlyTrendVM {
  const units = new Map<string, number>();
  let skippedUnassigned = 0;
  for (const r of rows) {
    if (isUnknownUnit(r.base_unit)) {
      skippedUnassigned += 1;
      continue;
    }
    const u = (r.base_unit as string).trim();
    units.set(u, (units.get(u) ?? 0) + 1);
  }
  const unit =
    units.get("тн") !== undefined
      ? "тн"
      : ([...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—");

  const byMonth = new Map<string, { plan: number; fakt: number }>();
  for (const r of rows) {
    if (isUnknownUnit(r.base_unit) || (r.base_unit as string).trim() !== unit) continue;
    const slot = byMonth.get(r.month) ?? { plan: 0, fakt: 0 };
    slot.plan += r.plan ?? 0;
    slot.fakt += r.fakt ?? 0;
    byMonth.set(r.month, slot);
  }

  const keys = months.length ? months : [...byMonth.keys()].sort();
  const points = keys.map((m) => ({
    month: m,
    label: monthTick(m),
    full: monthLabel(m),
    plan: byMonth.get(m)?.plan ?? 0,
    fakt: byMonth.get(m)?.fakt ?? 0,
  }));

  return {
    unit,
    points,
    skippedUnassigned,
    otherUnits: [...units.keys()].filter((u) => u !== unit),
  };
}
