import type { DashboardData } from "../../api/types";
import { materialLabel } from "./sales";
import { monthLabel } from "../format";

/**
 * «Технологик металлар ишлаб чиқариш» дашборди — `/dashboard` жавобидан
 * панел кўринишига.
 *
 * ═══ Ном ва «аниқланмаган» гуруҳ ═════════════════════════════════════════
 *
 * Бэкенд `material: null` учун ном бермайди (докс 4-бўлим): бу — маҳсулотга
 * металл тури умуман бириктирилмаган гуруҳ. Ном сифатида `sales.ts` даги
 * `materialLabel()` ишлатилади — у худди шу кодларни (`Mo`, `W`, `Re`, `Co`,
 * `Fe`, `Other`) «Сотиш ва қолдиқлар» панелида ҳам кўрсатади ва `null` учун
 * «Аниқланмаган» деб қайтаради; иккита панелда бир хил металл иккита хил
 * ном билан кўринмаслиги учун мавжуд рўйхат такрорланмайди.
 *
 * ═══ Ой ёрлиғи ═══════════════════════════════════════════════════════════
 *
 * Жавобдаги `months[].label` лотин ёзувида келади (`"May 2026"`) — интерфейс
 * матни кирилл бўлиши шарт, шунинг учун у экранга чиқарилмайди. Ўрнига
 * `key` дан аппнинг ўз `monthLabel()` и билан ёрлиқ қурилади.
 *
 * ═══ Нега `Number()` йўқ ═════════════════════════════════════════════════
 *
 * Бошқа адаптерлардан (`gas.ts`, `solar.ts`) фарқли — бу ерда сон майдонлари
 * ҳақиқатан `number`: хизмат уларни `::float` билан ҳисоблайди. Постгрес
 * `numeric` матоси муаммоси бу жавобга тегишли эмас.
 *
 * ═══ Режа ва фоиз кўрсатилмайди ═════════════════════════════════════════
 *
 * Жавобда `plan`/`totalPlan`/`percent`/`planDyn` бор, лекин топшириқдаги
 * скриншот ва бэкенднинг ўз «дашборд элементлари» жадвали (докс 5-бўлим)
 * уларни бирор экран элементига боғламайди — дашборд соф факт кўрсаткичи.
 * Шунинг учун улар view-model'га чиқарилмайди: кўрсатилмаган майдонни
 * панелга олиб кириш камида ишлатилмайдиган мурдор код, энг ёмон ҳолда эса
 * ноаниқ («реja» деб номланган, лекин ҳеч қаерда ишлатилмайдиган) сон бўлади.
 */

export interface MetalSeries {
  /** Барqaror калит — материал коди ёки `"unknown"`. */
  key: string;
  name: string;
  value: number;
  /** Умумий ҳажмдаги улуши, % — донут учун тайёр. */
  pct: number;
  /** Олдинги даврга нисбатан ўзгариш, %. Кўп ҳолатда `null`. */
  delta: number | null;
  /** Ойлик қатор, `months[]` билан бир тартибда. */
  dyn: number[];
  /** Металл тури бириктирилмаган — нейтрал рангда кўрсатилади. */
  unnamed: boolean;
}

export interface PlantTotal {
  key: string;
  name: string;
  value: number;
  monthly: number[];
}

export interface DashboardVM {
  months: { key: string; label: string }[];
  total: number;
  /** Жами ҳажмнинг олдинги даврга нисбатан ўзгариши, %. Кўп ҳолатда `null`. */
  totalDelta: number | null;
  /** Металл бириктирилмаган ҳажмнинг умумий ҳажмдаги улуши, %. */
  unknownShare: number;
  /** Ҳажм бўйича камайиш тартибида — бэкенддан шундай келади. */
  metals: MetalSeries[];
  /** Плиткалар учун — номи бор энг катта металлар, кўпи билан 4 та. */
  topMetals: MetalSeries[];
  /** Барча металлар йиғиндиси, ойлик. */
  monthly: number[];
  /** Ойлик кунлик ўртача ҳажм. */
  avgDaily: number[];
  /** Шу ойда маълумот мавжуд кунлар сони (`avgDaily` изоҳи учун). */
  days: number[];
  plants: PlantTotal[];
}

export function dashboardVM(d: DashboardData): DashboardVM {
  const months = d.months.map((m) => ({ key: m.key, label: monthLabel(m.key) }));

  const metals: MetalSeries[] = d.metals.map((m) => ({
    key: m.material ?? "unknown",
    name: materialLabel(m.material),
    value: m.value,
    pct: m.pct,
    delta: m.delta,
    dyn: m.dyn,
    unnamed: m.material === null,
  }));

  // Плиткалар учун фақат номи бор металлар — «аниқланмаган» гуруҳ «асосий
  // металл» эмас, у донут ва улушда алоҳида кўринади. Тартиб сақланади:
  // рўйхат бэкенддан ҳажм бўйича камайиш тартибида келади.
  const topMetals = metals.filter((m) => !m.unnamed).slice(0, 4);

  const plants: PlantTotal[] = d.plants.map((p) => ({
    key: p.name,
    name: p.name,
    value: p.value,
    monthly: p.monthly,
  }));

  return {
    months,
    total: d.total,
    totalDelta: d.totalDelta,
    unknownShare: d.unknownShare,
    metals,
    topMetals,
    monthly: d.monthly,
    avgDaily: d.avgDaily,
    days: d.days,
    plants,
  };
}
