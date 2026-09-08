import { UZ_MAP_HEIGHT, UZ_MAP_WIDTH, UZ_REGIONS } from "../geo/uzbekistan";
import type { GeoProject } from "./geology";

/**
 * «Геология лойиҳалари» — рўйхатнинг харита кўриниши учун адаптер.
 *
 * ═══ Нега аниқ жадвал, солиштириш эмас ══════════════════════════════════
 *
 * Манбадаги `region` — эркин ёзилган кирилл матн, харита файлидаги калитлар
 * эса лотин. Иккови орасида ном бўйича мослик ЙЎҚ ва уни ясаб бўлмайди:
 * манбада «Сурх**а**ндарё» (а билан), харитада эса «Сурх**о**ндарё» (о
 * билан) — фуззи солиштириш шу қаторни жимгина йўқотган бўларди. Битта
 * катакда иккита ва учта вилоят ҳам бор («Қашқадарё, Сурхандарё»).
 *
 * Шунинг учун мослик — **қўлда ёзилган аниқ жадвал**. У маълумотдаги ҳамма
 * қийматни қамрайди ва ҳар бир қатор кўз билан текширилган.
 *
 * ═══ Харитадан ташқаридаги лойиҳалар йўқолмайди ═════════════════════════
 *
 * «Республика (нефть-газ конлари)», «Республика ҳудуди», «Ғарбий Ўзбекистон»
 * ва ҳудуди умуман кўрсатилмаган қаторлар бирор вилоятга тегишли эмас. Улар
 * харитага чизилмайди, лекин `offMap` рўйхатида тўлиқ қолади ва экранда
 * харита остида ўз карточкасида кўрсатилади. Жадвалда учрамаган **янги**
 * қиймат ҳам шу ерга тушади — сездирмай тушиб қолмайди.
 *
 * ═══ Битта лойиҳа бир нечта вилоятда ════════════════════════════════════
 *
 * Икки ва уч вилоятли лойиҳа ҳар бир вилоятида кўринади, шунинг учун
 * маркерлардаги сонлар йиғиндиси лойиҳалар сонидан катта бўлади. Бу хато
 * эмас: лойиҳа ҳақиқатан ҳам ўша вилоятларнинг ҳаммасига тегишли. Экранда
 * иккала сон ҳам очиқ ёзилади (`mapped` ва `markers`).
 */

/* -------------------------------------------------------------------------- */
/* вилоят номларининг жадвали                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `project.region` (бэкенддан келган матн) → харита калит(лар)и.
 *
 * Бўш массив — қиймат маълум, лекин вилоятга тегишли эмас (республика
 * миқёсидаги ёки ноаниқ ҳудуд). Жадвалда умуман йўқ қиймат ҳам, `null` ҳам
 * худди шундай — харитадан ташқарида.
 */
const REGION_KEYS: Record<string, readonly string[]> = {
  Тошкент: ["toshkent"],
  Навоий: ["navoiy"],
  Самарқанд: ["samarqand"],
  Жиззах: ["jizzax"],
  Қашқадарё: ["qashqadaryo"],
  Қорақалпоғистон: ["karakalpakstan"],
  // Манбада «Сурхандарё», харитада «Сурхондарё» — шунинг учун жадвал.
  "Қашқадарё, Сурхандарё": ["qashqadaryo", "surxondaryo"],
  "Навоий, Бухоро, Самарқанд": ["navoiy", "buxoro", "samarqand"],
  "Республика (нефть-газ конлари)": [],
  "Республика ҳудуди": [],
  "Ғарбий Ўзбекистон": [],
};

/* -------------------------------------------------------------------------- */
/* геометрия                                                                  */
/* -------------------------------------------------------------------------- */

export interface GeoBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Бутун мамлакат — хаританинг бошланғич кўриниши. */
export const UZ_FULL_BOX: GeoBox = { x: 0, y: 0, w: UZ_MAP_WIDTH, h: UZ_MAP_HEIGHT };

const ASPECT = UZ_MAP_WIDTH / UZ_MAP_HEIGHT;

/**
 * Path'нинг чегара тўртбурчаги. Манба файлидаги контурларда фақат `M`, `L`
 * ва `Z` (абсолют) буйруқлари бор — иккови ҳам аниқ иккитадан сон олади,
 * `Z` эса умуман сон олмайди. Шунинг учун сонларни жуфтлаб ўқиш кифоя.
 */
function bboxOf(d: string): GeoBox {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  if (nums) {
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]);
      const y = Number(nums[i + 1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return UZ_FULL_BOX;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Энг кичик фокус кенглиги — жуда кичик вилоятда ҳаддан ортиқ яқинлашмаслик учун. */
const MIN_FOCUS_W = 190;

/**
 * Вилоят чегарасидан `viewBox` ясаш: атрофига жой қолдирилади, нисбат
 * хаританики билан бир хил сақланади (акс ҳолда контур чўзилиб кетарди) ва
 * натижа мамлакат чегарасидан ташқарига сирғалмайди.
 */
export function focusBoxOf(b: GeoBox, pad = 0.22): GeoBox {
  let w = Math.max(b.w * (1 + pad * 2), MIN_FOCUS_W);
  let h = Math.max(b.h * (1 + pad * 2), MIN_FOCUS_W / ASPECT);

  // Нисбатни хаританикига келтириш — фақат катталаштириш билан.
  if (w / h < ASPECT) w = h * ASPECT;
  else h = w / ASPECT;

  // Бутун харитадан катта бўлиб кетмасин.
  if (w > UZ_MAP_WIDTH) {
    w = UZ_MAP_WIDTH;
    h = UZ_MAP_HEIGHT;
  }

  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? lo : Math.min(Math.max(v, lo), hi));
  return {
    x: clamp(cx - w / 2, 0, UZ_MAP_WIDTH - w),
    y: clamp(cy - h / 2, 0, UZ_MAP_HEIGHT - h),
    w,
    h,
  };
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoMapRegion {
  key: string;
  nameUz: string;
  /** Маркер маркази — вилоят маркази, лойиҳанинг ҳақиқий жойи эмас. */
  cx: number;
  cy: number;
  d: string;
  box: GeoBox;
  /** Кириш тартиби сақланади — рўйхатдаги тартиб билан бир хил ўқилсин. */
  projects: GeoProject[];
  count: number;
}

export interface GeoMapView {
  /** Ўн тўртта вилоят — лойиҳаси йўқлари ҳам, нейтрал рангда чизилиши учун. */
  regions: GeoMapRegion[];
  /** Ҳудудга боғланмаган лойиҳалар — харита остида кўрсатилади. */
  offMap: GeoProject[];
  /** Харитага тушган лойиҳалар сони (такрорсиз). */
  mapped: number;
  /** Маркерлардаги сонлар йиғиндиси — кўп вилоятли лойиҳа туфайли каттароқ. */
  markers: number;
  /** Бир нечта вилоятга тегишли лойиҳалар сони — сонлар фарқининг сабаби. */
  multi: number;
  /** Лойиҳаси бор вилоятлар сони. */
  activeRegions: number;
  /** Энг катта вилоят сони — ранг интенсивлиги ва маркер ўлчами шунга нисбатан. */
  max: number;
}

const SHAPE_KEYS = new Set(UZ_REGIONS.map((r) => r.key));

/**
 * Лойиҳалар рўйхатидан харита кўриниши. Кириш сифатида **фильтрланган**
 * рўйхат берилади — шунда фильтр харитадаги сонларга ҳам таъсир қилади.
 */
export function geoMapView(projects: GeoProject[]): GeoMapView {
  const byKey = new Map<string, GeoProject[]>();
  const offMap: GeoProject[] = [];
  let mapped = 0;
  let multi = 0;

  for (const p of projects) {
    // Жадвалда йўқ қиймат ҳам, `null` ҳам — харитадан ташқарида. Калит
    // харита файлида мавжудлиги ҳам текширилади: нотўғри калит туфайли
    // лойиҳа умуман кўринмай қолмаслиги керак.
    const keys = (p.region === null ? [] : (REGION_KEYS[p.region] ?? [])).filter((k) =>
      SHAPE_KEYS.has(k),
    );
    if (keys.length === 0) {
      offMap.push(p);
      continue;
    }
    mapped += 1;
    if (keys.length > 1) multi += 1;
    for (const k of keys) {
      const list = byKey.get(k);
      if (list) list.push(p);
      else byKey.set(k, [p]);
    }
  }

  const regions: GeoMapRegion[] = UZ_REGIONS.map((r) => {
    const list = byKey.get(r.key) ?? [];
    return {
      key: r.key,
      nameUz: r.nameUz,
      cx: r.cx,
      cy: r.cy,
      d: r.d,
      box: bboxOf(r.d),
      projects: list,
      count: list.length,
    };
  });

  let markers = 0;
  let activeRegions = 0;
  let max = 0;
  for (const r of regions) {
    markers += r.count;
    if (r.count > 0) activeRegions += 1;
    if (r.count > max) max = r.count;
  }

  return { regions, offMap, mapped, markers, multi, activeRegions, max: Math.max(max, 1) };
}

/**
 * Маркер радиуси — вилоятдаги лойиҳалар сонига қараб 12…26 px.
 *
 * Илдиз шкаласи: доиранинг **юзи** сонга мутаносиб бўлсин, диаметри эмас —
 * акс ҳолда 11 та лойиҳали Тошкент 1 талик вилоятдан ўн бир баравар эмас,
 * юз баравар катта кўринарди.
 */
export const markerRadius = (count: number, max: number): number => {
  const lo = 12;
  const hi = 26;
  if (max <= 1) return hi;
  const k = (Math.sqrt(count) - 1) / (Math.sqrt(max) - 1);
  return lo + Math.max(0, Math.min(1, k)) * (hi - lo);
};
