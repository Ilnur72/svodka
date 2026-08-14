/**
 * Маълумот сифати бўйича марказий жой.
 *
 * Импортда топилган хатолар шу файлда бошқарилади. Бэкенд тузатилгач, шу
 * ердаги биттагина қаторни ўзгартириш кифоя — панеллар, жадваллар ва
 * баннерлар ўзи ўзгаради.
 */

/* -------------------------------------------------------------------------- */
/* 1. Электр энергия — йиғинди сатрлари                                       */
/* -------------------------------------------------------------------------- */

/**
 * Excel «Электроэнергия» варағидаги йиғинди сатрлари. Улар алоҳида
 * истеъмолчи эмас — импорт уларни ҳам қатор сифатида олгани учун энергия
 * икки марта ҳисобланади — умумий йиғинди сезиларли ошиб кетади.
 */
export const ENERGY_SUBTOTAL_ROWS = ["ЭНЦ общ.", "Итого:", "По комб-ту:"];

/**
 * `groupBy=type` кесимида ўша `ЭНЦ общ.` сатри «Белгиланмаган» тури билан
 * келади (у `Справочники.xlsx` да йўқ, шунинг учун заводга бириктирилмаган).
 */
export const ENERGY_SUBTOTAL_TYPE = "Белгиланмаган";

export function isEnergySubtotal(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.trim();
  return n === ENERGY_SUBTOTAL_TYPE || ENERGY_SUBTOTAL_ROWS.includes(n);
}

export const ENERGY_SUBTOTAL_NOTE =
  "«ЭНЦ общ.» йиғинди сатри такрорий ҳисобни олдини олиш учун чиқарилган " +
  "(ЭНЦ + ВКЦ + ЦПК + ЭРЦ). Манба файлдаги «По комб-ту:» якуни билан мос.";

/* -------------------------------------------------------------------------- */
/* 2. Текширилмаган бўлимлар                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Бу бўлимларда манба қийматларининг ўзи бузуқ. Панеллар, жадваллар ва
 * тузилма қурилади, лекин **сон қийматлар кўрсатилмайди** — уларнинг ўрнида
 * `<Masked>` чипи туради ва тепада қизил баннер бўлади.
 *
 * Бэкенд тузатилгач: тегишли қаторни шу объектдан ўчириш кифоя.
 */
export const UNVERIFIED: Record<string, { bug: string }> = {
  /* Ҳозир бўш: барча бўлимлар манба билан солиштириб текширилган ва
     ниқобдан чиқарилган.

     Ўлчов бирлиги шубҳали СГП маҳсулотлари бўлим даражасида эмас, **қатор
     даражасида** белгиланади — қуйидаги `isSgpSuspect` га қаранг.

     Янги хато топилса, шу ерга қатор қўшилади:
       areaKey: { bug: "нима нотўғри ва нима учун сон кўрсатилмайди" } */
};

export function isUnverified(area: string): boolean {
  return Object.hasOwn(UNVERIFIED, area);
}

/** Бўлим калитининг ўзбекча номи — футер матнини қўлда ёзиб эскиртирмаслик учун. */
const AREA_LABELS: Record<string, string> = {
  ingichka: "Ингичка",
  ogarok: "Огарок",
  cisterns: "цистерна",
  sgp: "СГП",
};

/** «Огарок, Ингичка, цистерна ва СГП» — `UNVERIFIED` дан ҳосил бўлади. */
export function unverifiedAreasText(): string {
  const names = Object.keys(UNVERIFIED).map((k) => AREA_LABELS[k] ?? k);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " ва " + names[names.length - 1];
}

export function unverifiedReason(area: string): string | null {
  return UNVERIFIED[area]?.bug ?? null;
}

/** Ниқобланган қиймат ўрнида кўринадиган матн. */
export const MASK_TEXT = "текширилмоқда";
export const MASK_TEXT_LONG = "Маълумот текширилмоқда";

/* -------------------------------------------------------------------------- */
/* 3. СГП — ўлчов бирлиги шубҳали маҳсулотлар                                 */
/* -------------------------------------------------------------------------- */

/**
 * Ўлчов бирлиги шубҳаси **бэкендда** аниқланади (API-BUGS №8б) ва
 * `unitSuspect` / `suspectReason` / `suspectNote` майдонлари орқали келади.
 * Бу ерда қўлда рўйхат сақланмайди — акс ҳолда иккита рўйхат вақт ўтиб
 * бир-биридан узоқлашади. Рўйхат: `production-report.service.ts` →
 * `SGP_UNIT_SUSPECT`.
 *
 * Икки тур:
 *  - `spread` — автоматик: давр ичида қийматлар кескин фарқ қилган
 *    (қиймат ой ўртасида тахминан 1000 баробар сакрайди — тоннадан
 *    килограммга ўтилган)
 *  - `unit-label` — қўлдаги рўйхатдан: қиймат барқарор бўлгани учун автоматик
 *    топилмайди, лекин у ишлаб чиқариш суръатига умуман мос келмайди
 *
 * Ниқоб бўлим даражасида эмас, **қатор даражасида**: маҳсулотларнинг
 * аксарияти тоза, фақат шубҳалилари яширилади.
 */
export interface SgpSuspectLike {
  name: string;
  unitSuspect?: boolean;
  suspectReason?: "spread" | "unit-label" | null;
  suspectNote?: string | null;
  spread?: number | null;
}

export const isSgpSuspect = (p: SgpSuspectLike): boolean => Boolean(p.unitSuspect);

/** Ниқоб остидаги сабаб — тултипда кўрсатилади. */
export function sgpSuspectReason(p: SgpSuspectLike): string | null {
  if (!isSgpSuspect(p)) return null;
  if (p.suspectNote) return p.suspectNote;
  if (p.suspectReason === "unit-label")
    return "ўлчов бирлиги манбада нотўғри ёзилган (қўлдаги рўйхатдан).";
  const s = p.spread;
  return (
    "давр ичида ўлчов бирлиги алмашганга ўхшайди" +
    (s ? ` — қийматлар ${nfSpread(s)} баробар фарқ қилади` : "") +
    ". Сон кўрсатилмайди."
  );
}

const nfSpread = (s: number): string =>
  s >= 1000 ? Math.round(s / 100) * 100 + "+" : String(Math.round(s));

/** Қисқа ёрлиқ — қайси турдаги шубҳа экани. */
export const sgpSuspectKind = (p: SgpSuspectLike): string =>
  p.suspectReason === "unit-label" ? "бирлик ёрлиғи" : "давр ичида сакраш";

/* -------------------------------------------------------------------------- */
/* 4. Заводга боғланмаган позициялар                                          */
/* -------------------------------------------------------------------------- */

/** `/production/tree` да бириктирилмаган позициялар шу ном билан келади. */
export const UNASSIGNED_PLANT = "Белгиланмаган";
export const UNASSIGNED_PLANT_LABEL = "Заводга боғланмаган";
export const UNASSIGNED_PLANT_NOTE =
  "бу позициялар «Справочники.xlsx» да йўқ — асосан 10-цех ва РМУ. Базавий " +
  "бирлиги аниқланмагани учун улар бирлик кесимидаги йиғиндиларга қўшилмайди.";

export const plantLabel = (name: string): string =>
  name === UNASSIGNED_PLANT ? UNASSIGNED_PLANT_LABEL : name;

/** Базавий бирлиги аниқланмаган: API `null` ёки `"—"` қайтаради. */
export const isUnknownUnit = (baseUnit: string | null | undefined): boolean =>
  baseUnit == null || baseUnit.trim() === "" || baseUnit.trim() === "—";
