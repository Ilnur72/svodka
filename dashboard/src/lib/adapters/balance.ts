import type {
  BalanceChain,
  BalanceHow,
  BalanceResponse,
  BalanceStep,
  BalanceValue,
} from "../../api/types";

/**
 * Металлар баланси: API жавобидан панел кутадиган кўринишга ўтказиш.
 *
 * Панел занжирнинг тузилишини билмайди — у шу ердан тайёр ҳолда келади:
 *
 *  - босқичлар `no` бўйича **даражаларга** гуруҳланади. Бир хил `no` —
 *    параллел тармоқлар (fan-out): улар ёнма-ён туради ва олдинги даражадан
 *    битта стрелка ҳаммасига бўлинади;
 *  - `no` сон бўлмаган қаторлар (`"—"`) занжирнинг ўзига кирмайди, лекин
 *    йўқолмайди — «справочно» деб охирида кўрсатилади;
 *  - занжирлар металл бўйича **гуруҳланади**. Рений иккита мустақил сайтдан
 *    келади (ГТЦ Навоий ва ГТЦ-1) — улар бирлаштирилмайди, ёнма-ён туради ва
 *    иккаласи ҳам якуний тугунга (`RE_TOTAL`) стрелка билан уланади;
 *  - фоиз **қайта ҳисобланмайди** — бэкенддан келгани сақланади. Аномал
 *    фоиз (масалан молибден проволокаси 1000%) яширилмайди: у `anomaly`
 *    билан белгиланади ва занжир карточкасида ⚠ бўлиб чиқади, сон эса
 *    тўлиқ ёзилади.
 */

/**
 * Аномал фоиз чегараси: ундан катта қиймат «одатдан ташқари» деб белгиланади
 * (`anomaly`) ва занжир карточкасида ⚠ билан кўрсатилади. Экспорт қилинмайди —
 * фақат шу файл ичида ишлатилади.
 */
const PCT_MAX = 150;

/** Занжирлар бирлашадиган якуний тугун калитининг охири (`RE_TOTAL`). */
const MERGE_KEY_SUFFIX = "_TOTAL";

/** Занжир номидаги гуруҳ ва тармоқ қисмларини ажратгич: `"Рений (Re) — ГТЦ-1"`. */
const TITLE_SPLIT = " — ";

/**
 * IEEE-754 шовқинини олиб ташлаш: `3.0000000000000013` → `3`,
 * `49.842000000000006` → `49.842`.
 *
 * Бу **яхлитлаш эмас** — қиймат double аниқлигида ўзгармайди, фақат сузувчи
 * нуқтали қўшишдан қолган артефакт кесилади. Усиз экранда манбада йўқ
 * «...0000013» думлари кўринарди. Шунинг учун `exact()` дан олдин, адаптер
 * қаватида қилинади: панелга тайёр қиймат боради.
 */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

export interface BalanceCellVM {
  plan: number | null;
  fakt: number | null;
  /** Бэкенддан келган ҳақиқий фоиз — матнда тўлиқ кўрсатилади. */
  pct: number | null;
  /** Ҳақиқий фоиз чегарадан ошган — устун кесилган, белги қўйилади. */
  anomaly: boolean;
  /** Режа = 0, факт > 0: бажарилиш фоизи маънога эга эмас. */
  planless: boolean;
  /** Режа ҳам, факт ҳам йўқ (нол эмас — маълумот йўқ). */
  empty: boolean;
  how: BalanceHow;
  row: number | null;
}

export interface BalanceStepVM {
  id: string;
  no: string;
  title: string;
  site: string;
  unit: string;
  marchOnly: boolean;
  note: string | null;
  /** Танланган ой учун қиймат; маълумот умуман бўлмаса `null`. */
  cell: BalanceCellVM | null;
}

export interface BalanceLevelVM {
  no: string;
  /** `no` сон эмас — занжир йўлига кирмайди, «справочно» сифатида чиқади. */
  aside: boolean;
  /** Битта даражадаги параллел тармоқлар. */
  steps: BalanceStepVM[];
}

export interface BalanceBranchVM {
  key: string;
  /** Тўлиқ ном — жадвал блокида сарлавҳа сифатида ишлатилади. */
  title: string;
  /** Гуруҳ номидан кейинги қисм: `"ГТЦ Навоий"`. Бўлмаса `null`. */
  sub: string | null;
  levels: BalanceLevelVM[];
  /** Занжирдаги барча босқичлар — жадвал (Б) блоки учун. */
  steps: BalanceStepVM[];
  /** Танланган ойда камида битта сон борми. */
  hasValues: boolean;
}

export interface BalanceGroupVM {
  key: string;
  /** `"Вольфрам (W)"` — занжир номининг ажратгичгача бўлган қисми. */
  title: string;
  metal: string;
  /** Мустақил тармоқлар: одатда битта, ренийда иккита. */
  branches: BalanceBranchVM[];
  /** Тармоқлар бирлашадиган якуний тугун (фақат ренийда). */
  merge: BalanceBranchVM | null;
}

export interface BalanceVM {
  /** Кўрсатилаётган ой. */
  month: string;
  /** Эталон ой — рўйхатда алоҳида белгиланади. */
  reference: string;
  months: string[];
  groups: BalanceGroupVM[];
  /** Танланган ойда бирорта сон борми — бўш ҳолатни аниқлаш учун. */
  hasValues: boolean;
}

function toCell(v: BalanceValue | null | undefined): BalanceCellVM | null {
  if (!v) return null;
  const plan = clean(v.plan);
  const fakt = clean(v.fakt);
  const pct = clean(v.pct);
  return {
    plan,
    fakt,
    pct,
    anomaly: pct !== null && pct > PCT_MAX,
    planless: pct === null && plan === 0 && fakt !== null && fakt > 0,
    empty: plan === null && fakt === null,
    how: v.how,
    row: v.row,
  };
}

function toStep(step: BalanceStep, month: string): BalanceStepVM {
  return {
    id: step.id,
    no: step.no,
    title: step.title,
    site: step.site,
    unit: step.unit,
    marchOnly: step.marchOnly,
    note: step.note,
    cell: toCell(step.values[month]),
  };
}

const hasNumber = (s: BalanceStepVM): boolean => s.cell !== null && !s.cell.empty;

/** Босқичларни `no` бўйича даражаларга гуруҳлайди. */
function toLevels(steps: BalanceStepVM[], order: Map<string, number>): BalanceLevelVM[] {
  const byNo = new Map<string, BalanceStepVM[]>();
  for (const s of steps) {
    const list = byNo.get(s.no);
    if (list) list.push(s);
    else byNo.set(s.no, [s]);
  }

  const levels: BalanceLevelVM[] = [];
  for (const [no, list] of byNo) {
    list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    levels.push({ no, aside: !isFinite(Number(no)), steps: list });
  }

  // Даража рақами бўйича: `no` сон бўлмаганлар (справочно) охирида қолади.
  // Тенг бўлса — манбадаги тартиб.
  levels.sort((a, b) => {
    const na = a.aside ? Number.POSITIVE_INFINITY : Number(a.no);
    const nb = b.aside ? Number.POSITIVE_INFINITY : Number(b.no);
    if (na !== nb) return na - nb;
    return (order.get(a.steps[0].id) ?? 0) - (order.get(b.steps[0].id) ?? 0);
  });
  return levels;
}

function toBranch(chain: BalanceChain, groupTitle: string, month: string): BalanceBranchVM {
  const order = new Map(chain.steps.map((s) => [s.id, s.order]));
  const steps = chain.steps.map((s) => toStep(s, month));
  const levels = toLevels(steps, order);
  const sub = chain.title.startsWith(groupTitle + TITLE_SPLIT)
    ? chain.title.slice(groupTitle.length + TITLE_SPLIT.length)
    : null;

  return {
    key: chain.key,
    title: chain.title,
    sub,
    levels,
    // Жадвал блоки занжир йўли бўйича ўқилиши учун даража тартибида берилади.
    steps: levels.flatMap((l) => l.steps),
    hasValues: steps.some(hasNumber),
  };
}

/**
 * Занжирларни металл бўйича гуруҳлайди ва ҳар гуруҳда якуний тугунни
 * (`*_TOTAL`) ажратади — у тармоқлар билан ёнма-ён эмас, улардан **кейин**
 * туради ва ҳаммаси унга уланади. Бундай тугун бўлмаса гуруҳ оддий
 * (битта ёки бир нечта мустақил тармоқ) бўлиб қолади.
 */
function toGroups(chains: BalanceChain[], month: string): BalanceGroupVM[] {
  const byMetal = new Map<string, BalanceChain[]>();
  for (const c of chains) {
    const list = byMetal.get(c.metal);
    if (list) list.push(c);
    else byMetal.set(c.metal, [c]);
  }

  const groups: BalanceGroupVM[] = [];
  for (const [metal, list] of byMetal) {
    const sorted = list.slice().sort((a, b) => a.order - b.order);
    const merge = sorted.length > 1 ? (sorted.find((c) => c.key.endsWith(MERGE_KEY_SUFFIX)) ?? null) : null;
    const branchChains = sorted.filter((c) => c !== merge);
    const head = branchChains[0] ?? sorted[0];
    const title = head ? head.title.split(TITLE_SPLIT)[0] : metal;

    groups.push({
      key: metal,
      title,
      metal,
      branches: branchChains.map((c) => toBranch(c, title, month)),
      merge: merge ? toBranch(merge, title, month) : null,
    });
  }

  groups.sort((a, b) => {
    const oa = Math.min(...chains.filter((c) => c.metal === a.metal).map((c) => c.order));
    const ob = Math.min(...chains.filter((c) => c.metal === b.metal).map((c) => c.order));
    return oa - ob;
  });
  return groups;
}

/** Кўрсатиладиган ой: сақланган танлов яроқсиз бўлса — рўйхатдаги охиргиси. */
export function balanceMonth(res: BalanceResponse, picked: string | null): string {
  if (picked && res.months.includes(picked)) return picked;
  return res.months[res.months.length - 1] ?? res.reference;
}

export function balanceView(res: BalanceResponse, month: string): BalanceVM {
  const groups = toGroups(res.chains, month);
  return {
    month,
    reference: res.reference,
    months: res.months,
    groups,
    hasValues: groups.some(
      (g) => g.branches.some((b) => b.hasValues) || (g.merge?.hasValues ?? false),
    ),
  };
}

/** `how` майдонининг ўқиладиган изоҳи; `exact` да изоҳ керак эмас. */
export function howNote(how: BalanceHow): string | null {
  if (how === "alias") return "қиймат синоним ном бўйича топилган";
  if (how === "composed") return "қиймат бир нечта сатрдан йиғилган";
  return null;
}
