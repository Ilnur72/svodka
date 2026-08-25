import type {
  ChainCell,
  ChainHow,
  ChainResponse,
  ChainStep,
} from "../../api/types";
import type { Status } from "../../types";
import { statusOf } from "../format";

/**
 * «Цехлар занжири»: API жавобидан панел кутадиган кўринишга ўтказиш.
 *
 * ─── Нега тайёр `level` бўйича устун чизилмайди ───────────────────────────
 * `level` — файлдаги технологик даража, **граф чуқурлиги эмас**: 38 боғланишнинг
 * 20 таси битта даража ичида (масалан `nav-isxodnyy → nav-tfr`, иккиси ҳам 0-даража),
 * айримлари эса 3–4 даража сакрайди (`ing-itogo → othod-ogarok`). Даражани
 * тўғридан-тўғри устунга айлантирилса занжир узилиб кўринарди.
 *
 * Шунинг учун икки босқичли жойлаштириш:
 *   1. босқичлар **даража тасмаларига** (band) бўлинади — бу файлнинг ўз
 *      тузилмаси, ўзгартирилмайди;
 *   2. тасма ичида **йўлаклар** (track) ажратилади — тасма ичидаги боғланишлар
 *      бўйича боғлиқ компоненталар, ҳар бири ўз навбатида чуқурлик бўйича
 *      қаторларга ёйилади. Йўлак — кичик, ўқилади (энг каттаси 6 та тугун).
 *
 * Тасмалар орасидаги боғланишлар чизиқ билан эмас, манба карточкасидаги
 * «→» чипси билан кўрсатилади: улар узоқ масофага кетади ва чизиқ бўлса
 * бутун тузилмани кесиб ўтарди.
 *
 * ─── Кириши номаълум босқичлар ────────────────────────────────────────────
 * `inputKnown: false` (6 та) — файлнинг ўзи «не детализировано» деб ёзган.
 * Бундай босқичга **кирувчи чизиқ тортилмайди**. Иккитасида бэкенд шунга
 * қарамай `probable` ҳавола эълон қилган — у **йўқотилмайди**: чизиқ ўрнига
 * карточкада «эҳтимолий кириш» қатори бўлиб чиқади (`probableInputs`).
 *
 * ─── Техник майдонлар ─────────────────────────────────────────────────────
 * `excelRow`, `anchor`, `cells`, `row`, `source`, `pctSource`, `balanceStepId`
 * view-model'га **умуман ўтмайди**. `note` дан фақат мавжудлик олинади.
 */

/** Фоиз ўқининг юқори чегараси — KPI ва баланс билан бир хил шкала. */
export const CHAIN_PCT_MAX = 150;

/** Ўқдаги «100%» белгисининг ўрни (устун кенглигининг фоизи). */
export const CHAIN_PCT_REF_AT = (100 / CHAIN_PCT_MAX) * 100;

/** Манбада қиймат ўрнига «—» турган устун белгиси. */
const DASH = "—";

const isDash = (s: string | null | undefined): boolean =>
  s === null || s === undefined || s.trim() === "" || s.trim() === DASH;

/** IEEE-754 шовқинини кесиш — `adapters/balance.ts` даги `clean()` билан бир хил. */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

export interface ChainCellVM {
  plan: number | null;
  fakt: number | null;
  /** Бэкенддан келган фоиз — қайта ҳисобланмайди ва текширилмайди. */
  pct: number | null;
  /** Устун учун `0…CHAIN_PCT_MAX` оралиғига келтирилган фоиз. */
  barPct: number | null;
  /** Фоиз чегарадан ошган — устун кесилади, сон тўлиқ ёзилади. */
  anomaly: boolean;
  /** Факт бор, режа қўйилмаган — бажарилиш фоизи маънога эга эмас. */
  planless: boolean;
  /** Режа ҳам, факт ҳам йўқ (нол эмас — маълумот йўқ). */
  empty: boolean;
  how: ChainHow;
}

export interface ChainLinkVM {
  id: string;
  /** Мақсад тугуннинг ўқиладиган номи: сех ва чиқиш. */
  label: string;
  confidence: "exact" | "probable";
}

export interface ChainStepVM {
  id: string;
  level: number;
  stage: string;
  site: string;
  input: string;
  process: string;
  output: string;
  /** «—» бўлса `null`. */
  resource: string | null;
  /** «—» бўлса `null`. */
  waste: string | null;
  unit: string;
  /** `false` — манбада режа/факт умуман юритилмайди (омбор қаторлари). */
  available: boolean;
  /** `false` — кириш файлда «не детализировано»; чизиқ тортилмайди. */
  inputKnown: boolean;
  /** Манбада чеклов қайд этилган (изоҳ матни экранга чиқмайди). */
  hasLimit: boolean;
  /** Чизилмаган, лекин бэкенд эълон қилган эҳтимолий кириш манбалари. */
  probableInputs: string[];
  /**
   * Тасма ичида шу тугунга келувчи боғланишнинг ишончлилиги: чизиқ услубини
   * шу белгилайди (тўлиқ / узуқ). `null` — йўлакнинг боши, кирувчи чизиқ йўқ.
   * Бир нечта кириш бўлса эҳтиёткор томон танланади: биттаси `probable`
   * бўлса чизиқ узуқ бўлади.
   */
  inConfidence: "exact" | "probable" | null;
  /** Бошқа тасмага кетувчи боғланишлар — чип билан кўрсатилади. */
  outCross: ChainLinkVM[];
  /** Шу босқичга бириктирилган ресурс сарфи (занжир тугуни эмас). */
  resources: ChainStepVM[];
  cell: ChainCellVM | null;
  status: Status;
  /** Фоизи бор — рейтинг ва рангда қатнашади. */
  comparable: boolean;
}

export interface ChainTrackVM {
  key: string;
  /** Чуқурлик бўйича қаторлар: `rows[0]` — йўлак боши. */
  rows: ChainStepVM[][];
}

export interface ChainBandVM {
  level: number;
  /** Шу даражадаги такрорсиз `stage` қийматлари — файлдан, тўқилмаган. */
  stages: string[];
  tracks: ChainTrackVM[];
  stepCount: number;
}

export interface ChainCounts {
  good: number;
  warn: number;
  crit: number;
  mute: number;
  total: number;
}

export interface ChainVM {
  month: string;
  reference: string;
  months: string[];
  bands: ChainBandVM[];
  /** Барча босқич ва ресурслар — тўлиқ жадвал учун. */
  all: ChainStepVM[];
  counts: ChainCounts;
  /**
   * Боғланишлар ҳисоби. `exact`/`probable` — жами; `line` — тасма ичида
   * чизиқ билан, `chip` — тасмалар орасида «→» чипси билан, `suppressed` —
   * кириши аниқланмаган тугунга кетгани учун чизилмагани.
   */
  linkCounts: {
    exact: number;
    probable: number;
    line: number;
    chip: number;
    suppressed: number;
  };
  /** Кириши аниқланмаган босқичлар сони. */
  inputUnknownCount: number;
  /** Манбада режа/факт юритилмайдиган босқичлар сони. */
  unavailableCount: number;
  hasValues: boolean;
}

/* -------------------------------------------------------------------------- */
/* катак                                                                      */
/* -------------------------------------------------------------------------- */

function toCell(v: ChainCell | null | undefined): ChainCellVM | null {
  if (!v) return null;
  const plan = clean(v.plan);
  const fakt = clean(v.fakt);
  const pct = clean(v.pct);

  return {
    plan,
    fakt,
    pct,
    barPct: pct === null ? null : Math.max(0, Math.min(pct, CHAIN_PCT_MAX)),
    anomaly: pct !== null && pct > CHAIN_PCT_MAX,
    planless: pct === null && (plan === null || plan === 0) && fakt !== null,
    empty: plan === null && fakt === null,
    how: v.how,
  };
}

/** Тугуннинг қисқа ўқиладиган номи — «→» чипсида ва эҳтимолий киришда. */
const labelOf = (s: ChainStep): string => `${s.site} · ${s.output}`;

/* -------------------------------------------------------------------------- */
/* граф                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Йўлак ичидаги чуқурлик: энг узун йўл бўйича. Ота-она тугунлар турли
 * чуқурликда бўлса (масалан `c1-sdacha-sgp` га иккита қатордан келади)
 * тугун энг чуқурининг остида туради — шунда стрелка ҳеч қачон орқага
 * қарамайди.
 */
function depthMap(ids: string[], edges: Map<string, string[]>): Map<string, number> {
  const depth = new Map<string, number>();
  const inSet = new Set(ids);
  const visiting = new Set<string>();

  const walk = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    // Цикл манбада бўлмаслиги керак, лекин бўлса ҳам осилиб қолмаймиз.
    if (visiting.has(id)) return 0;
    visiting.add(id);

    let d = 0;
    for (const [from, tos] of edges) {
      if (!inSet.has(from) || !tos.includes(id)) continue;
      d = Math.max(d, walk(from) + 1);
    }
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };

  for (const id of ids) walk(id);
  return depth;
}

/** Йўналишсиз боғлиқ компоненталар — тасма ичидаги мустақил йўлаклар. */
function components(ids: string[], edges: Map<string, string[]>): string[][] {
  const parent = new Map<string, string>(ids.map((i) => [i, i]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    while (parent.get(x) !== r) {
      const nxt = parent.get(x) as string;
      parent.set(x, r);
      x = nxt;
    }
    return r;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const inSet = new Set(ids);
  for (const [from, tos] of edges) {
    if (!inSet.has(from)) continue;
    for (const to of tos) if (inSet.has(to)) union(from, to);
  }

  const byRoot = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    const list = byRoot.get(r);
    if (list) list.push(id);
    else byRoot.set(r, [id]);
  }
  // Манба тартиби сақланади: `ids` аллақачон файл тартибида келади.
  return [...byRoot.values()];
}

/* -------------------------------------------------------------------------- */
/* асосий кўриниш                                                             */
/* -------------------------------------------------------------------------- */

/** Кўрсатиладиган ой: сўралгани жавобда бўлмаса — рўйхатдаги охиргиси. */
export function chainMonth(res: ChainResponse, wanted: string | null): string {
  if (wanted && res.months.includes(wanted)) return wanted;
  return res.months[res.months.length - 1] ?? res.reference;
}

export function chainView(res: ChainResponse, month: string): ChainVM {
  const byId = new Map<string, ChainStep>(res.steps.map((s) => [s.id, s]));

  // Ресурслар занжир тугуни эмас — улар `resourceOf` орқали босқичга уланади.
  const resourcesOf = new Map<string, ChainStepVM[]>();
  const resourceList: ChainStepVM[] = [];

  const toVM = (
    s: ChainStep,
    opts: {
      probableInputs: string[];
      outCross: ChainLinkVM[];
      inConfidence: "exact" | "probable" | null;
    },
  ): ChainStepVM => {
    const cell = toCell(s.values[month]);
    const comparable = cell !== null && !cell.empty && cell.pct !== null && (cell.plan ?? 0) > 0;
    return {
      id: s.id,
      level: s.level,
      stage: s.stage,
      site: s.site,
      input: s.input,
      process: s.process,
      output: s.output,
      resource: isDash(s.resource) ? null : s.resource,
      waste: isDash(s.waste) ? null : s.waste,
      unit: s.unit,
      available: s.available,
      inputKnown: s.inputKnown,
      hasLimit: s.note !== null && s.note.trim() !== "",
      probableInputs: opts.probableInputs,
      inConfidence: opts.inConfidence,
      outCross: opts.outCross,
      resources: resourcesOf.get(s.id) ?? [],
      cell,
      status: comparable ? statusOf(cell.pct) : "mute",
      comparable,
    };
  };

  for (const r of res.resources) {
    const vm = toVM(r, { probableInputs: [], outCross: [], inConfidence: null });
    resourceList.push(vm);
    const list = resourcesOf.get(r.resourceOf) ?? [];
    list.push(vm);
    resourcesOf.set(r.resourceOf, list);
  }

  // ── Боғланишлар ────────────────────────────────────────────────────────────
  // Кириши номаълум тугунга ҳавола чизилмайди; у йўқотилмайди ҳам —
  // мақсад карточкасида «эҳтимолий кириш» бўлиб қолади.
  const drawn = new Map<string, string[]>(); // тасма ичида чизиладиганлар
  const crossOf = new Map<string, ChainLinkVM[]>();
  const probableInputsOf = new Map<string, string[]>();
  const inConfOf = new Map<string, "exact" | "probable">();
  let exact = 0;
  let probable = 0;
  let line = 0;
  let chip = 0;
  let suppressed = 0;

  for (const s of res.steps) {
    for (const link of s.next) {
      const target = byId.get(link.id);
      if (!target) continue;
      if (link.confidence === "exact") exact += 1;
      else probable += 1;

      if (!target.inputKnown) {
        suppressed += 1;
        const list = probableInputsOf.get(target.id) ?? [];
        list.push(labelOf(s));
        probableInputsOf.set(target.id, list);
        continue;
      }

      if (target.level === s.level) {
        const list = drawn.get(s.id) ?? [];
        list.push(target.id);
        drawn.set(s.id, list);
        line += 1;
        // Эҳтиёткор томон: биттаси `probable` бўлса чизиқ узуқ бўлади.
        if (link.confidence === "probable" || !inConfOf.has(target.id)) {
          inConfOf.set(target.id, link.confidence === "probable" ? "probable" : "exact");
        }
      } else {
        const list = crossOf.get(s.id) ?? [];
        list.push({ id: target.id, label: labelOf(target), confidence: link.confidence });
        crossOf.set(s.id, list);
        chip += 1;
      }
    }
  }

  const steps = res.steps.map((s) =>
    toVM(s, {
      probableInputs: probableInputsOf.get(s.id) ?? [],
      outCross: crossOf.get(s.id) ?? [],
      inConfidence: inConfOf.get(s.id) ?? null,
    }),
  );
  const vmById = new Map<string, ChainStepVM>(steps.map((s) => [s.id, s]));

  // ── Тасмалар ва йўлаклар ───────────────────────────────────────────────────
  const bands: ChainBandVM[] = res.levels
    .slice()
    .sort((a, b) => a.level - b.level)
    .map((lv) => {
      const ids = res.steps.filter((s) => s.level === lv.level).map((s) => s.id);
      const tracks = components(ids, drawn).map((ci) => {
        const depth = depthMap(ci, drawn);
        const maxDepth = Math.max(0, ...ci.map((id) => depth.get(id) ?? 0));
        const rows: ChainStepVM[][] = [];
        for (let d = 0; d <= maxDepth; d++) {
          const row = ci
            .filter((id) => (depth.get(id) ?? 0) === d)
            .map((id) => vmById.get(id))
            .filter((x): x is ChainStepVM => x !== undefined);
          if (row.length) rows.push(row);
        }
        return { key: ci[0], rows };
      });
      return { level: lv.level, stages: lv.stages, tracks, stepCount: ids.length };
    })
    .filter((b) => b.stepCount > 0);

  // Жадвал учун: босқичлар + ресурслар (ресурс занжирда тугун эмас, лекин
  // қиймати бор ва «ҳеч нарса яширилмайди» қоидасига кўра рўйхатда туради).
  const all = [...steps, ...resourceList];

  const counts: ChainCounts = { good: 0, warn: 0, crit: 0, mute: 0, total: all.length };
  for (const s of all) counts[s.status] += 1;

  return {
    month,
    reference: res.reference,
    months: res.months,
    bands,
    all,
    counts,
    linkCounts: { exact, probable, line, chip, suppressed },
    inputUnknownCount: res.steps.filter((s) => !s.inputKnown).length,
    unavailableCount: res.steps.filter((s) => !s.available).length,
    hasValues: all.some((s) => s.cell !== null && !s.cell.empty),
  };
}

/** Даража тасмасининг ўқиладиган сарлавҳаси: **файлдаги** босқич номлари. */
export const bandTitle = (b: ChainBandVM): string => b.stages.join(" · ");

/** Босқич нима учун баҳоланмаганини қисқа ўзбекча изоҳ билан беради. */
export function chainWhyMute(s: ChainStepVM): string | null {
  if (!s.available) return "манбада режа ва факт юритилмайди";
  if (!s.cell) return "босқич манба варағида топилмади";
  if (s.cell.empty) return "бу ой учун маълумот йўқ";
  if (s.cell.how === "aggregate" || s.cell.how === "meter") {
    return s.cell.planless ? "режа юритилмайди — фақат факт" : null;
  }
  if (s.cell.planless) return "режа қўйилмаган";
  return null;
}
