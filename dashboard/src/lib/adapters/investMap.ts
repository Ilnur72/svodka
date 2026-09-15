import { pctTxt } from "../format";
import {
  INVEST_FIELD_LABEL,
  INVEST_PROJECTS,
  type InvestProject,
} from "../invest/investSource";
import {
  INVEST_KIND_COLOR,
  INVEST_KIND_COLOR_FALLBACK,
  INVEST_MAP_POINTS,
  MARKER_ANCHOR_Y,
  MARKER_ASSET_HEIGHT,
  MARKER_ASSET_WIDTH,
  MARKER_TOKEN,
  type InvestLabelSide,
  type InvestMarkerColor,
} from "../invest/investMapSource";
import { USD, investExact, investVM, type InvestField } from "./invest";

/**
 * «Лойиҳалар харитаси» бўлими учун view-model.
 *
 * Панел на реестр тузилмасини, на харита геометриясини билади: у фақат шу
 * файл тайёрлаган рўйхатни олади. Координата жадвали ва ранг мослиги
 * `lib/invest/investMapSource.ts` да, форматлаш эса `lib/adapters/invest.ts`
 * даги умумий қоидага бўйсунади — иккита бўлимда битта сон иккита хил
 * кўринишда чиқмаслиги учун.
 *
 * ═══ Нега `investVM()` дан фойдаланилади ════════════════════════════════
 *
 * Маркер ёрлиғидаги қисқа ном («Мискон», «Молибден куйиндисини…») айнан
 * «Инвестиция лойиҳалари» бўлимидаги ёрлиқ билан бир хил бўлиши керак —
 * акс ҳолда битта лойиҳа иккита бўлимда икки хил аталарди. Қисқартириш
 * мантиғи ноёбликка боғлиқ (бутун рўйхат бўйича ҳисобланади), шунинг учун у
 * иккинчи марта ёзилмайди: тайёр натижа `investVM().passports` дан олинади.
 *
 * ═══ Харитада кўринмаган лойиҳа йўқолмайди ══════════════════════════════
 *
 * Координата жадвалида `id` топилмаса (реестрга янги лойиҳа қўшилса), лойиҳа
 * харитага чизилмайди, лекин `offMap` рўйхатида қолади ва экранда харита
 * остида очиқ кўрсатилади. Худди шундай: ранг жадвалида йўқ тур захира
 * рангда чизилади ва `unknownKinds` да санаб ўтилади. Жимгина тушиб қолиш
 * ёки жимгина бошқа гуруҳга қўшилиш — иккиси ҳам бўлмайди.
 */

/** Харитадаги битта маркер. */
export interface InvestMapPin {
  id: string;
  /** Реестрдаги тўлиқ ном — карточка сарлавҳасида. */
  name: string;
  /** Маркер ёрлиғи учун қисқа ном — «Инвестиция лойиҳалари» билан бир хил. */
  short: string;
  /** Реестрдаги ҳудуд матни. Аниқ координата эмас — шундан тахмин чиқарилган. */
  region: string;
  /** Реестрдаги лойиҳа тури — маркер ранги шундан. */
  kind: string;
  /** Ранг калити — маркер расмининг файл номи ҳам шундан. */
  color: InvestMarkerColor;
  /** Легенда белгиси ва карточкадаги нуқта учун CSS токен. */
  token: string;
  /** Маркер расмининг манзили. */
  icon: string;
  /** Манбадаги бошланғич координата, градус (WGS 84). */
  home: { lon: number; lat: number };
  /**
   * Ёрлиқ маркернинг қайси ёнида чизилади. Ҳисобланмайди — манбадаги
   * жадвалдан олинади, чунки томон қўшни маркерларга боғлиқ.
   */
  labelSide: InvestLabelSide;
  /** Ёрлиқнинг вертикал силжиши, экран пикселида. */
  labelDy: number;
  /**
   * Маркер расмининг экрандаги силжиши, пикселда. Геодезик лангарга
   * тегмайди — фақат чизилиш ўрнини кўчиради.
   */
  offset: [number, number];
  /** Маркер силжитилган бўлса — сабаби, акс ҳолда `null`. */
  nudge: string | null;
  /** `public/invest/<id>.jpg` — файл бўлмаса карточка плашка кўрсатади. */
  img: { src: string; alt: string };
  /** Карточкадаги қаторлар — реестрдаги ёрлиқ ва қиймат билан. */
  rows: InvestField[];
}

/** Легенданинг битта қатори: ранг → лойиҳа тури → нечта лойиҳа. */
export interface InvestMapLegendItem {
  kind: string;
  color: InvestMarkerColor;
  token: string;
  count: number;
  /** Тур ранг жадвалида йўқ — захира рангда чизилган. */
  unknown: boolean;
}

/** Харитага тушмаган лойиҳа — рўйхатда қолади. */
export interface InvestMapOff {
  id: string;
  name: string;
  short: string;
  region: string;
}

/** Силжитилган маркер — изоҳда очиқ санаб ўтилади. */
export interface InvestMapNudge {
  short: string;
  reason: string;
}

export interface InvestMapVM {
  /** Маркер расмининг нисбати — экранда чўзилмаслиги учун. */
  markerRatio: number;
  /** Лангар нуқтаси, баландликнинг улуши сифатида. */
  markerAnchorY: number;
  pins: InvestMapPin[];
  legend: InvestMapLegendItem[];
  offMap: InvestMapOff[];
  nudges: InvestMapNudge[];
  /** Реестрдаги жами лойиҳалар сони. */
  total: number;
}

/** Реестрдаги ёрлиқ + тайёр матн. Панел форматлаш қоидасини билмайди. */
const field = (k: string, v: string, num: boolean): InvestField => ({ k, v, num });

/**
 * Карточкадаги қаторлар. Ёрлиқлар реестрдан (`INVEST_FIELD_LABEL`) олинади —
 * қисқартирилмайди ва қайта ёзилмайди, шунда «Инвестиция лойиҳалари»
 * бўлимидаги худди шу қатор билан бир хил ўқилади.
 *
 * Муддат — ягона истисно: реестрда у иккита катакда (бошланиш ва тугаш),
 * карточкада эса битта қаторда кўрсатилади. Иккала қиймат ҳам манбадагидек,
 * ўзгартирилмасдан ёнма-ён ёзилади.
 */
function rowsOf(p: InvestProject): InvestField[] {
  return [
    field(INVEST_FIELD_LABEL.totalCost, `${investExact(p.totalCost)} ${USD}`, true),
    field(INVEST_FIELD_LABEL.disbursed, `${investExact(p.disbursed)} ${USD}`, true),
    // Фоиз — ҳисобланган қиймат (манбада улуш турибди), шунинг учун `exact()`
    // эмас, доим `pctTxt()`: бўлимнинг қолган жойидаги фоизлар билан бир хил.
    field(INVEST_FIELD_LABEL.progressShare, pctTxt(p.progressShare * 100), true),
    field(INVEST_FIELD_LABEL.jobs, `${investExact(p.jobs)} та`, true),
    field("Муддат", `${p.startYear} – ${p.endYear}`, false),
  ];
}

export function investMapVM(): InvestMapVM {
  const base = import.meta.env.BASE_URL;
  // Қисқа номлар бутун рўйхат бўйича ҳисобланади — қаранг: файл боши.
  const shortById = new Map(investVM().passports.map((pp) => [pp.id, pp.short]));

  const pins: InvestMapPin[] = [];
  const offMap: InvestMapOff[] = [];
  const nudges: InvestMapNudge[] = [];

  for (const p of INVEST_PROJECTS) {
    const short = shortById.get(p.id) ?? p.name;
    const point = INVEST_MAP_POINTS[p.id];
    if (!point) {
      offMap.push({ id: p.id, name: p.name, short, region: p.region });
      continue;
    }
    const color = INVEST_KIND_COLOR[p.kind] ?? INVEST_KIND_COLOR_FALLBACK;
    if (point.nudge !== null) nudges.push({ short, reason: point.nudge });
    pins.push({
      id: p.id,
      name: p.name,
      short,
      region: p.region,
      kind: p.kind,
      color,
      token: MARKER_TOKEN[color],
      icon: `${base}marker/marker-${color}.png`,
      home: { lon: point.lon, lat: point.lat },
      labelSide: point.label,
      labelDy: point.labelDy,
      offset: point.offset,
      nudge: point.nudge,
      img: {
        // Файл номи қоидаси «Инвестиция лойиҳалари» бўлими билан бир хил —
        // битта лойиҳанинг сурати иккита бўлимда битта файлдан олинади.
        src: `${base}invest/${p.id}.jpg`,
        alt: `${p.name} — лойиҳа майдонининг сурати`,
      },
      rows: rowsOf(p),
    });
  }

  // Легенда тартиби — реестрда тур биринчи марта учраган тартиб: у жадвалдаги
  // тартибга ҳам, сонга ҳам боғланмайди, шунда реестр ўзгарганда легенда
  // сакрамайди.
  const byKind = new Map<string, InvestMapLegendItem>();
  for (const pin of pins) {
    const got = byKind.get(pin.kind);
    if (got) {
      got.count += 1;
      continue;
    }
    byKind.set(pin.kind, {
      kind: pin.kind,
      color: pin.color,
      token: pin.token,
      count: 1,
      unknown: INVEST_KIND_COLOR[pin.kind] === undefined,
    });
  }

  return {
    markerRatio: MARKER_ASSET_WIDTH / MARKER_ASSET_HEIGHT,
    markerAnchorY: MARKER_ANCHOR_Y,
    pins,
    legend: [...byKind.values()],
    offMap,
    nudges,
    total: INVEST_PROJECTS.length,
  };
}
