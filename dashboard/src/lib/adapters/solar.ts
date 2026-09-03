import type { SolarKpiRow, SolarStationRow } from "../../api/types";
import { dateLabel, dateTick } from "../format";

/**
 * Қуёш станциялари — станциялар справочниги ва кунлик ўлчовлар → панел
 * кўринишига.
 *
 * ═══ Нега `inverterPower` асосий кўрсаткич ══════════════════════════════
 *
 * Манбада бир кун учун бир нечта энергия сони бор: **ҳақиқатда ишлаб
 * чиқарилган** (`inverterPower`) ва **назарий** (`theoryPower`). Раҳбарнинг
 * «қанча энергия олдик?» деган саволига фақат биринчиси жавоб беради,
 * иккинчиси эса — «шароит идеал бўлганда қанча бўларди». Шунинг учун жами,
 * кунлик ўртача ва энг юқори кун **фақат** ҳақиқий ишлаб чиқаришдан
 * ҳисобланади; назарий сон унинг ўрнини **боса олмайди** ва у билан
 * аралаштирилмайди — иккови бир диаграммада фақат таққослаш учун, бир хил
 * ўлчов бирлигида (кВт·соат) ёнма-ён туради.
 *
 * ═══ Нега `Number()` алоҳида текширилади ════════════════════════════════
 *
 * Postgres `numeric` ва `bigint` устунлари TypeORM орқали **мато** бўлиб
 * келади (`"1234.50"`), `null` эса шундайлигича. `Number(null)` → `0`, яъни
 * тўғридан-тўғри конверсия «ўлчов келмаган» ни сохта нолга айлантирган
 * бўларди. Булутли кунда ҳақиқатан нол ишлаб чиқариш бўлиши мумкин — у
 * «ўлчов йўқ» билан бир нарса эмас, шунинг учун иккови ажратилади.
 *
 * ═══ Нега баъзи майдонлар қўшилмайди ════════════════════════════════════
 *
 * `reductionTotalCo2` / `reductionTotalCoal` (тонна) ва `radiationIntensity`
 * (кВт·соат/м²) кунлар бўйича **йиғилмайди**: манба ҳужжатида уларнинг
 * кунлик ёки ўсиб борувчи эканини аниқ айтадиган жой йўқ. Нотўғри йиғинди
 * ўйлаб топилган маълумот бўларди, шунинг учун улар фақат ўз қаторида,
 * батафсил жадвалда кўрсатилади.
 *
 * `installedCapacity` ҳам йиғилмайди — ўрнатилган қувват станцияларнинг ўз
 * справочнигидан олинади, кунлар бўйича қўшилса у сунъий равишда ўсиб
 * кетарди.
 *
 * ═══ Йиғиш шовқини ══════════════════════════════════════════════════════
 *
 * Сузувчи нуқтали қўшишда хатолик тўпланади (`112 679,04000000001`). Йиғинди
 * манбанинг ўз аниқлигига қайтарилади: манбада нечта ўнлик хона бўлса, шунча.
 * Аниқлик қўшилмайди ва йўқотилмайди.
 */

/** Манбада номи тўлдирилмаган станция. */
export const SOLAR_UNNAMED = "Номи кўрсатилмаган станция";

/** `numeric`/`bigint` мато → сон. Бўш, `null` ва нотўғри қиймат — `null`, нол эмас. */
function num(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** Манба матосидаги ўнлик хоналар сони. */
function decimalsOf(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** Йиғиш шовқинини кесиб, қийматни `d` ўнлик хонага қайтариш. */
function round(v: number, d: number): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** ISO вақт белгисидан кун калити: `'2026-08-14T00:00:00.000Z'` → `'2026-08-14'`. */
const dayOf = (iso: string | null | undefined): string =>
  typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";

/* -------------------------------------------------------------------------- */
/* станциялар справочниги                                                     */
/* -------------------------------------------------------------------------- */

export interface SolarStation {
  /** `stationCode` — фақат ички калит ва KPI билан улаш учун, экранга чиқмайди. */
  key: string;
  name: string;
  address: string | null;
  /** Ўрнатилган қувват, МВт. `null` — манбада кўрсатилмаган. */
  capacity: number | null;
  /** Тармоққа уланган сана — ўқиладиган кўринишда. */
  gridDate: string | null;
  /** Манбада номи тўлдирилмаган — нейтрал рангда кўрсатилади. */
  unnamed: boolean;
}

export interface SolarStationsVM {
  /** Қуввати бўйича камайиш тартибида; қуввати кўрсатилмаганлар охирида. */
  stations: SolarStation[];
  /** Фақат қуввати кўрсатилган станциялар йиғиндиси, МВт. Ҳеч бири бўлмаса — `null`. */
  totalCapacity: number | null;
  /** Қуввати кўрсатилган станциялар сони. */
  withCapacity: number;
  /** Қуввати манбада тўлдирилмаган станциялар сони. */
  noCapacity: number;
}

/** Сана матоси ўқиладиган кўринишга; формат кутилгандан бошқа бўлса — ўзгаришсиз. */
function gridDateLabel(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? dateLabel(s.slice(0, 10)) : s || null;
}

export function solarStationsVM(rows: SolarStationRow[]): SolarStationsVM {
  // Қувват йиғиндиси манбанинг энг узун ўнлигига қайтарилади.
  let dec = 0;
  for (const r of rows) {
    const d = decimalsOf(r.capacity);
    if (d > dec) dec = d;
  }
  dec = Math.min(dec, 6);

  const stations: SolarStation[] = rows.map((r) => {
    const name = r.stationName?.trim();
    return {
      key: r.stationCode,
      name: name || SOLAR_UNNAMED,
      address: r.address?.trim() || null,
      capacity: num(r.capacity),
      gridDate: gridDateLabel(r.gridConnectionDate),
      unnamed: !name,
    };
  });

  // Қуввати кўрсатилмаган станция рўйхатдан тушиб қолмайди — у бор, лекин
  // ўлчови йўқ. Шкалада охирида туради, йиғиндига эса кирмайди.
  stations.sort(
    (a, b) =>
      Number(a.capacity === null) - Number(b.capacity === null) ||
      (b.capacity ?? 0) - (a.capacity ?? 0),
  );

  const withCapacity = stations.filter((s) => s.capacity !== null);

  return {
    stations,
    totalCapacity: withCapacity.length
      ? round(
          withCapacity.reduce((a, s) => a + (s.capacity ?? 0), 0),
          dec,
        )
      : null,
    withCapacity: withCapacity.length,
    noCapacity: stations.length - withCapacity.length,
  };
}

/* -------------------------------------------------------------------------- */
/* кунлик ўлчовлар                                                            */
/* -------------------------------------------------------------------------- */

export interface SolarDayPoint {
  /** `'YYYY-MM-DD'`. */
  key: string;
  /** Диаграмма ўқи учун қисқа белги. */
  label: string;
  /** Тултип ва жадвал учун тўлиқ сана. */
  full: string;
  /** Ҳақиқатда ишлаб чиқарилган энергия, кВт·соат. */
  power: number;
  /** Назарий ишлаб чиқариш, кВт·соат. Тўлиқ бўлмаса `null`. */
  theory: number | null;
}

export interface SolarStationTotal {
  key: string;
  name: string;
  /** Давр бўйича ишлаб чиқарилган энергия, кВт·соат. */
  power: number;
  /** Шу станция бўйича ўлчов келган кунлар сони. */
  days: number;
  /** Самарадорлик коэффициентининг кунлик қийматлари ўртачаси, %. */
  pr: number | null;
  unnamed: boolean;
}

/** Батафсил жадвал қатори — кун ва станция кесимида, йиғиндисиз. */
export interface SolarKpiDetail {
  key: string;
  /** Саралаш учун хом кун калити (`'YYYY-MM-DD'`), экранга чиқмайди. */
  dayKey: string;
  day: string;
  station: string;
  power: number | null;
  theory: number | null;
  pr: number | null;
  radiation: number | null;
  co2: number | null;
  coal: number | null;
}

export interface SolarKpiVM {
  /** Кунлар — ўсиш тартибида. Ўлчов келмаган кун умуман йўқ (нол сифатида қўшилмайди). */
  points: SolarDayPoint[];
  /** Станциялар — ишлаб чиқариш ҳажми бўйича камайиш тартибида. */
  stations: SolarStationTotal[];
  /** Давр бўйича жами ишлаб чиқарилган энергия, кВт·соат. */
  total: number;
  max: number;
  /** Энг юқори кун — тўлиқ сана кўринишида. */
  maxKey: string | null;
  /** Самарадорлик коэффициентининг ўртачаси, %. Ўлчов бўлмаса `null`. */
  avgPr: number | null;
  /** Самарадорлик ўлчанган ёзувлар сони — ўртача нечта сон устидан олинганини айтади. */
  prCount: number;
  /**
   * Ҳақиқий ишлаб чиқариш келган ҳар бир ёзувда назарий сон ҳам борми.
   * Бўлмаса таққослаш диаграммаси чизилмайди: тўлиқ бўлмаган назарий йиғинди
   * ҳақиқий сон билан ёнма-ён қўйилса, фарқ ёлғон кўринарди.
   */
  theoryComplete: boolean;
  /** Батафсил жадвал учун барча қаторлар — кун ва станция бўйича. */
  rows: SolarKpiDetail[];
  /** Ишлаб чиқариш кўрсаткичи тўлдирилмагани учун ҳисобга кирмаган қаторлар сони. */
  skipped: number;
}

/**
 * `names` — `stationCode` → станция номи (справочникдан). Код экранга
 * чиқарилмайди: у ташқи тизимнинг техник калити, раҳбар учун маъноси йўқ.
 * Номи топилмаса қатор **тушириб қолдирилмайди** — нейтрал ўрин эгаллагич
 * билан кўрсатилади ва ҳажми жамига киради.
 *
 * `multiMonth` — давр бир нечта ойни қамрайдими: ўқ белгисига ой қўшилади.
 */
export function solarKpiVM(
  rows: SolarKpiRow[],
  names: Map<string, string>,
  multiMonth: boolean,
): SolarKpiVM {
  const byDay = new Map<string, { power: number; theory: number }>();
  const byStation = new Map<string, SolarStationTotal>();
  // Битта станцияда битта кун бир неча қатор бўлиши мумкин — кунлар алоҳида
  // саналади, шунинг учун такрорни ушлаб турадиган тўплам керак.
  const daysSeen = new Map<string, Set<string>>();
  const prSum = new Map<string, { sum: number; n: number }>();
  const details: SolarKpiDetail[] = [];

  let dec = 0;
  for (const r of rows) {
    const d = Math.max(decimalsOf(r.inverterPower), decimalsOf(r.theoryPower));
    if (d > dec) dec = d;
  }
  dec = Math.min(dec, 6);

  let skipped = 0;
  let theoryComplete = true;
  let prTotal = 0;
  let prCount = 0;

  for (const r of rows) {
    const power = num(r.inverterPower);
    const theory = num(r.theoryPower);
    const pr = num(r.performanceRatio);
    const day = dayOf(r.collectDate);
    const code = r.stationCode;
    const station = names.get(code)?.trim() || SOLAR_UNNAMED;

    details.push({
      key: r.id,
      dayKey: day,
      day: day ? dateLabel(day) : "—",
      station,
      power,
      theory,
      pr,
      radiation: num(r.radiationIntensity),
      co2: num(r.reductionTotalCo2),
      coal: num(r.reductionTotalCoal),
    });

    if (power === null || !day) {
      skipped += 1;
      continue;
    }

    if (theory === null) theoryComplete = false;

    const d = byDay.get(day) ?? { power: 0, theory: 0 };
    d.power += power;
    d.theory += theory ?? 0;
    byDay.set(day, d);

    const s =
      byStation.get(code) ??
      ({ key: code, name: station, power: 0, days: 0, pr: null, unnamed: !names.get(code)?.trim() } as SolarStationTotal);
    s.power += power;
    byStation.set(code, s);

    const seen = daysSeen.get(code) ?? new Set<string>();
    seen.add(day);
    daysSeen.set(code, seen);

    if (pr !== null) {
      prTotal += pr;
      prCount += 1;
      const acc = prSum.get(code) ?? { sum: 0, n: 0 };
      acc.sum += pr;
      acc.n += 1;
      prSum.set(code, acc);
    }
  }

  const points = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({
      key,
      label: dateTick(key, multiMonth),
      full: dateLabel(key),
      power: round(v.power, dec),
      theory: theoryComplete ? round(v.theory, dec) : null,
    }));

  let max = 0;
  let maxKey: string | null = null;
  for (const p of points) {
    if (p.power > max) {
      max = p.power;
      maxKey = p.full;
    }
  }

  const stations = [...byStation.values()]
    .map((s) => {
      const acc = prSum.get(s.key);
      return {
        ...s,
        power: round(s.power, dec),
        days: daysSeen.get(s.key)?.size ?? 0,
        // Ўртача — кунлик қийматлар устидан, оғирлик берилмасдан. Фоизни
        // қўшиб бўлмайди, шунинг учун бу ерда йиғинди эмас, ўртача.
        pr: acc && acc.n > 0 ? round(acc.sum / acc.n, 2) : null,
      };
    })
    // Номсиз станциялар шкаланинг охирида турсин — нейтрал ранг шу ерда мантиқли.
    .sort((a, b) => Number(a.unnamed) - Number(b.unnamed) || b.power - a.power);

  // Батафсил жадвал: янги кун тепада, кун ичида станция номи бўйича.
  // Санаси йўқ қаторлар (улар `skipped` га кирган) охирида қолади.
  details.sort(
    (a, b) =>
      Number(a.dayKey === "") - Number(b.dayKey === "") ||
      (a.dayKey < b.dayKey ? 1 : a.dayKey > b.dayKey ? -1 : 0) ||
      a.station.localeCompare(b.station),
  );

  return {
    points,
    stations,
    total: round(
      points.reduce((a, p) => a + p.power, 0),
      dec,
    ),
    max: round(max, dec),
    maxKey,
    avgPr: prCount > 0 ? round(prTotal / prCount, 2) : null,
    prCount,
    theoryComplete,
    rows: details,
    skipped,
  };
}

/* -------------------------------------------------------------------------- */
/* ўлчовлар чегараси — бўш ҳолат учун                                          */
/* -------------------------------------------------------------------------- */

export interface SolarSpan {
  /** Тизимдаги энг биринчи ўлчов куни, ўқиладиган кўринишда. */
  first: string | null;
  /** Тизимдаги энг сўнгги ўлчов куни, ўқиладиган кўринишда. */
  last: string | null;
  /** Ўлчов келган кунлар сони (такрорсиз). */
  days: number;
}

/**
 * Бутун тарихдаги ўлчов кунларининг чегараси.
 *
 * Фақат бўш ҳолат матнини аниқлаштириш учун ишлатилади ва **ҳеч қандай
 * кўрсаткич ҳисобламайди**: бу ердан экранга ҳажм ёки фоиз чиқмайди, фақат
 * сана. Шу сабабли қаторнинг ўлчови тўлдирилган-тўлдирилмагани текширилмайди
 * — саналар жадвалда бор, демак у кун тизимга тушган.
 */
export function solarSpan(rows: SolarKpiRow[]): SolarSpan {
  const days = new Set<string>();
  for (const r of rows) {
    const d = dayOf(r.collectDate);
    if (d) days.add(d);
  }
  if (days.size === 0) return { first: null, last: null, days: 0 };

  const sorted = [...days].sort();
  return {
    first: dateLabel(sorted[0]),
    last: dateLabel(sorted[sorted.length - 1]),
    days: days.size,
  };
}
