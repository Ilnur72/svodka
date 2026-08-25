/**
 * Инвестиция лойиҳалари реестрининг статик манбаси — 7 та лойиҳа.
 *
 * ═══ Нега статик модул ═══════════════════════════════════════════════════
 *
 * Бу маълумот бэкенд базасида умуман йўқ: `production-report` модули фақат
 * ишлаб чиқариш сводкаларини билади. Шунинг учун қийматлар шу ерда, кўчириш
 * пайтидаги ҳолида турибди — API сўрови ҳам, тармоқ қатлами ҳам оралиқда йўқ.
 * Манба янгиланса, шу файл қайта ёзилади (қиймат ўзгартирилмайди, фақат
 * янгиси қўйилади). Айнан шу ёндашув «Молиявий кўрсаткичлар» бўлимида ҳам
 * ишлатилган — `lib/finance/financeSource.ts`.
 *
 * Файл қўлда терилмаган: реестрдан ўқилган қийматлар генератор орқали
 * кўчирилган ва ҳар бир катак кутилган типга мослиги текширилган, шунинг
 * учун бу ерда «терилиш» хатоси бўлиши мумкин эмас.
 *
 * ═══ Бирлик ═════════════════════════════════════════════════════════════
 *
 * `totalCost`, `disbursed`, `npv`, `annualOutputUsd` — **млн АҚШ доллари**.
 * `payback` — йил. `areaHa` — гектар. `durationMonths` — ой.
 *
 * ═══ Улуш сифатида сақланган иккита майдон ══════════════════════════════
 *
 * `progressShare` ва `irrShare` манбада **улуш**: 0,7 = 70%, 0,189 = 18,9%.
 * Улар шу ҳолида қолдирилган — фоизга ўтказиш адаптернинг иши, чунки
 * `0.7 * 100` сузувчи нуқтада 70.00000000000001 беради ва бу қиймат
 * манбадаги сон эмас, **ҳисобланган** сон бўлади (форматлаш ҳам шунга мос).
 *
 * ═══ Сон ўрнида матн ════════════════════════════════════════════════════
 *
 * `payback`, `irrShare`, `npv` ва `annualOutputQty` устунларида манбада
 * сон ҳам, матн ҳам учрайди. Энг кўп учрайдигани — «ТИАда аниқланади»:
 * бу **бўш катак эмас**, балки «ҳали ҳисобланмаган» деган аниқ маълумот.
 * Иккови бир-биридан фарқланади ва экранда ҳам бошқача кўрсатилади:
 * матн — ўз ҳолида, бўш катак — «маълумот йўқ».
 *
 * `annualOutputQty` устуни **аралаш ўлчовда**: олтита лойиҳада тонна,
 * биттасида «50 000 000 дона». Шу сабабли у ҳеч қаерда қўшилмайди ва
 * битта шкалага қўйилмайди — фақат лойиҳанинг ўз карточкасида кўрсатилади.
 *
 * ═══ Реестрдан олинмаган қаторлар ═══════════════════════════════════════
 *
 * Реестрда лойиҳалардан кейин яна бешта қатор бор, лекин уларда фақат
 * ҳужжатлар ҳолати устуни тўлдирилган — бу ochiluvchi рўйхатнинг қиймат
 * манбаи, лойиҳа эмас. Улар лойиҳа сифатида кўчирилмаган; рўйхатнинг ўзи
 * `INVEST_DOC_STATES` да сақланган (гуруҳлаш тартиби учун).
 */

/** Сон, матн ёки бўш бўлиши мумкин бўлган катак. */
export type InvestCell = number | string | null;

export interface InvestProject {
  /** Барқарор ички калит. Интерфейсда ҳеч қачон кўрсатилмайди. */
  id: string;
  /** Корхона номи. Манбадаги устун: B. */
  enterprise: string;
  /** Лойиҳа номи. Манбадаги устун: C. */
  name: string;
  /** Жойлашган ҳудуди. Манбадаги устун: D. */
  region: string;
  /** Лойиҳа мақсади. Манбадаги устун: E. */
  goal: string;
  /** Лойиҳа тури. Манбадаги устун: F. */
  kind: string;
  /** Бажарилиш. Манбадаги устун: G. */
  progressShare: number;
  /** Лойиҳа ҳолати. Манбадаги устун: H. */
  state: string;
  /** Муҳимлиги (1–10). Манбадаги устун: I. */
  priority: number;
  /** Қайта ишлаш қуввати. Манбадаги устун: J. */
  capacity: string;
  /** Амалга ошириш муддати. Манбадаги устун: K. */
  durationMonths: number;
  /** Бошланиш санаси. Манбадаги устун: L. */
  startYear: string;
  /** Тугаш санаси (режа). Манбадаги устун: M. */
  endYear: string;
  /** Умумий қиймати. Манбадаги устун: N. */
  totalCost: number;
  /** Ўзлаштирилган маблағ (январь–июнь). Манбадаги устун: O. */
  disbursed: number;
  /** Қоплаш муддати — сон, матн ёки бўш. Манбадаги устун: P. */
  payback: InvestCell;
  /** IRR — сон, матн ёки бўш. Манбадаги устун: Q. */
  irrShare: InvestCell;
  /** NPV — сон, матн ёки бўш. Манбадаги устун: R. */
  npv: InvestCell;
  /** Иш ўринлари сони. Манбадаги устун: S. */
  jobs: number;
  /** Ишлаб чиқариладиган маҳсулот тури. Манбадаги устун: T. */
  product: string | null;
  /** Йиллик ишлаб чиқариш (қиймат). Манбадаги устун: U. */
  annualOutputUsd: number | null;
  /** Йиллик ишлаб чиқариш (натура) — сон, матн ёки бўш. Манбадаги устун: V. */
  annualOutputQty: InvestCell;
  /** ТИА / ТИҲ ҳолати. Манбадаги устун: W. */
  fsState: string;
  /** Қурилиш бошланиши. Манбадаги устун: X. */
  buildStart: string | null;
  /** Монтаж ва ишга тушириш. Манбадаги устун: Y. */
  commissioning: string | null;
  /** Қурилиш лойиҳа-смета ҳужжатлари ҳолати. Манбадаги устун: AC. */
  docState: string | null;
  /** Лойиҳа майдони. Манбадаги устун: AD. */
  areaHa: number | null;
  /** Ускуналар рўйхати. Манбадаги устун: AE. */
  equipment: string;
  /** Объект тури. Манбадаги устун: AG. */
  objectKind: string;
  /** Молиялаштириш манбаи. Манбадаги устун: AJ. */
  funding: string;
  /** Асосий хатарлар. Манбадаги устун: AK. */
  risks: string;
}

/** Лойиҳа майдонининг калити — «барча майдонлар» рўйхати учун. */
export type InvestFieldKey = Exclude<keyof InvestProject, "id">;

/** Интерфейсда кўринадиган ёрлиқлар — кирилл ўзбекча. */
export const INVEST_FIELD_LABEL: Record<InvestFieldKey, string> = {
  enterprise: "Корхона номи",
  name: "Лойиҳа номи",
  region: "Жойлашган ҳудуди",
  goal: "Лойиҳа мақсади",
  kind: "Лойиҳа тури",
  progressShare: "Бажарилиш",
  state: "Лойиҳа ҳолати",
  priority: "Муҳимлиги (1–10)",
  capacity: "Қайта ишлаш қуввати",
  durationMonths: "Амалга ошириш муддати",
  startYear: "Бошланиш санаси",
  endYear: "Тугаш санаси (режа)",
  totalCost: "Умумий қиймати",
  disbursed: "Ўзлаштирилган маблағ (январь–июнь)",
  payback: "Қоплаш муддати",
  irrShare: "IRR",
  npv: "NPV",
  jobs: "Иш ўринлари сони",
  product: "Ишлаб чиқариладиган маҳсулот тури",
  annualOutputUsd: "Йиллик ишлаб чиқариш (қиймат)",
  annualOutputQty: "Йиллик ишлаб чиқариш (натура)",
  fsState: "ТИА / ТИҲ ҳолати",
  buildStart: "Қурилиш бошланиши",
  commissioning: "Монтаж ва ишга тушириш",
  docState: "Қурилиш лойиҳа-смета ҳужжатлари ҳолати",
  areaHa: "Лойиҳа майдони",
  equipment: "Ускуналар рўйхати",
  objectKind: "Объект тури",
  funding: "Молиялаштириш манбаи",
  risks: "Асосий хатарлар",
};

/** Майдонларнинг реестрдаги тартиби — карточкадаги тўлиқ рўйхат шу тартибда. */
export const INVEST_FIELD_ORDER: InvestFieldKey[] = [
  "enterprise",
  "name",
  "region",
  "goal",
  "kind",
  "progressShare",
  "state",
  "priority",
  "capacity",
  "durationMonths",
  "startYear",
  "endYear",
  "totalCost",
  "disbursed",
  "payback",
  "irrShare",
  "npv",
  "jobs",
  "product",
  "annualOutputUsd",
  "annualOutputQty",
  "fsState",
  "buildStart",
  "commissioning",
  "docState",
  "areaHa",
  "equipment",
  "objectKind",
  "funding",
  "risks",
];

export const INVEST_PROJECTS: InvestProject[] = [
  {
    id: "miskon",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "\"Мискон\" мис-порфирли конини ўзлаштириш",
    region: "Тошкент вилояти Пискент тумани",
    goal: "Конда мавжуд мис, молибден, кумуш, олтин ва бошқа элементларни халқаро стандартлар асосида захираларини баҳолаш ҳамда лойиҳанинг дастлабки ТИАсини (PFS) ишлаб чиқиш",
    kind: "Геология-қидирув ишлари",
    progressShare: 0.7,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "геология-қидирув ишлари",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2026 йил",
    totalCost: 21.5,
    disbursed: 7.5,
    payback: null,
    irrShare: null,
    npv: null,
    jobs: 0,
    product: null,
    annualOutputUsd: null,
    annualOutputQty: null,
    fsState: "Лойиҳанинг халқаро дастлабки техник-иқтисодий асослари (PFS) ишлаб чиқилмоқда",
    buildStart: null,
    commissioning: null,
    docState: null,
    areaHa: null,
    equipment: "Мавжуд эмас",
    objectKind: "Геология-қидирув ишлари",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари",
    risks: "Мавжуд эмас",
  },
  {
    id: "molibdenGmc",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "Молибден куйиндисини қайта ишлаш бўйича янги гидрометаллургия цехини қуриш",
    region: "Тошкент вилояти Оҳангарон тумани",
    goal: "Молибден куйиндисини қайта ишлаш орқали молибден уч оксидини (MO3) ишлаб чиқариш",
    kind: "Янги қурилиш",
    progressShare: 0.01,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "5 минг тонна",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2027 йил",
    totalCost: 41,
    disbursed: 0.5,
    payback: "ТИАда аниқланади",
    irrShare: null,
    npv: null,
    jobs: 117,
    product: "Молибден уч оксид",
    annualOutputUsd: 87.3,
    annualOutputQty: 2000,
    fsState: "ТИА ишлаб чиқилган",
    buildStart: "2026 йил",
    commissioning: "2027 йил август",
    docState: "Ishlab chiqilmagan",
    areaHa: 10,
    equipment: "Мавжуд эмас",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари, Кредит",
    risks: "Мавжуд эмас",
  },
  {
    id: "kukun",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "Кукун металллургияси асосида деталлар ишлаб чиқаришни ташкил этиш",
    region: "Тошкент вилояти Оҳангарон тумани",
    goal: "Металл кукунидан автомобиль эҳтиёт қисмларини ишлаб чиқариш",
    kind: "Янги қурилиш",
    progressShare: 0.35,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "50 млн дона",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2026 йил",
    totalCost: 15.3,
    disbursed: 0,
    payback: 5.8,
    irrShare: 0.189,
    npv: 5.13,
    jobs: 50,
    product: "Автомобиль эхтиёт қисмлари",
    annualOutputUsd: 11.5,
    annualOutputQty: "50 000 000 дона",
    fsState: "ТИА ишлаб чиқилган",
    buildStart: "2026 йил",
    commissioning: "2026 йил декабрь",
    docState: "Ishlab chiqilgan",
    areaHa: 2.2,
    equipment: "Мавжуд",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари",
    risks: "Мавжуд эмас",
  },
  {
    id: "ingichka",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "\"Ингичка\" конида волфрам чиқиндиларини қайта ишлаш ҳажмини кенгайтириш",
    region: "Самарқанд вилояти Каттақўрғон тумани",
    goal: "Техноген чиқиндиларини қайта ишлаш орқали вольфрам концентрати ишлаб чиқариш ҳажмини ошириш",
    kind: "Кенгайтириш",
    progressShare: 0.55,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "1,95 млн тонна",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2026 йил",
    totalCost: 11,
    disbursed: 0.5,
    payback: null,
    irrShare: null,
    npv: null,
    jobs: 145,
    product: "Вольфрам концентрати",
    annualOutputUsd: 33.3,
    annualOutputQty: 1170,
    fsState: "ТИА ишлаб чиқилган",
    buildStart: "2026 йил",
    commissioning: "2026 йил ноябрь",
    docState: "Ishlab chiqilgan",
    areaHa: null,
    equipment: "Мавжуд",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари",
    risks: "Мавжуд эмас",
  },
  {
    id: "sarikul",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "\"Сарикўл\" волфрам конини ўзлаштириш",
    region: "Самарқанд вилояти Нуробод тумани",
    goal: "Вольфрам маъданини қайта ишлаш орқали вольфрам концентратини ишлаб чиқиш",
    kind: "Янги қурилиш",
    progressShare: 0.05,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "600 минг тонна",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2027 йил",
    totalCost: 100,
    disbursed: 4.3,
    payback: "ТИАда аниқланади",
    irrShare: "ТИАда аниқланади",
    npv: "ТИАда аниқланади",
    jobs: 300,
    product: "Вольфрам концентрати",
    annualOutputUsd: 143,
    annualOutputQty: 2200,
    fsState: "Лойиҳанинг халқаро техник-иқтисодий асослари (FS) ва ТИАси ишлаб чиқилмоқда",
    buildStart: "2026 йил",
    commissioning: "2027 йил сентябрь",
    docState: "Ishlab chiqilmagan",
    areaHa: null,
    equipment: "Мавжуд эмас",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари, Кредит",
    risks: "Мавжуд эмас",
  },
  {
    id: "volframGmc",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "Волфрам концентратини қайта ишлаш янги гидрометалллургия цехини қуриш",
    region: "Самарқанд вилояти Нуробод тумани",
    goal: "Вольфрам концентратини қайта ишлаш орқали вольфрам уч оксиди (WO3) ишлаб чиқариш",
    kind: "Янги қурилиш",
    progressShare: 0.01,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "5 минг тонна",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2027 йил",
    totalCost: 54.6,
    disbursed: 0.5,
    payback: "ТИАда аниқланади",
    irrShare: null,
    npv: null,
    jobs: 67,
    product: "Вольфрам уч оксид",
    annualOutputUsd: 327.8,
    annualOutputQty: 2650,
    fsState: "ТИА ишлаб чиқилган",
    buildStart: "2026 йил",
    commissioning: "2027 йил август",
    docState: "Ishlab chiqilmagan",
    areaHa: 9.6,
    equipment: "Мавжуд эмас",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари, Кредит",
    risks: "Мавжуд эмас",
  },
  {
    id: "sulfat",
    enterprise: "\"ЎзТМК\" АЖ",
    name: "Сульфат кислотаси ишлаб чиқариш",
    region: "Навоий вилояти Кармана тумани",
    goal: "Сульфат кислота ишлаб чиқариш орқали “Навоийуран” ДКнинг эҳтиёжини қондириш",
    kind: "Янги қурилиш",
    progressShare: 0.65,
    state: "Amalga oshirilayotgan loyiha",
    priority: 10,
    capacity: "500 минг тонна",
    durationMonths: 12,
    startYear: "2025 йил",
    endYear: "2026 йил",
    totalCost: 54.45,
    disbursed: 14.9,
    payback: 5.4,
    irrShare: 0.25,
    npv: 54.7,
    jobs: 220,
    product: "Сульфат кислота",
    annualOutputUsd: 33,
    annualOutputQty: 500000,
    fsState: "ТИА ишлаб чиқилган",
    buildStart: "2026 йил",
    commissioning: "2026 йил ноябрь",
    docState: "Ishlab chiqilgan",
    areaHa: null,
    equipment: "Мавжуд",
    objectKind: "Завод",
    funding: "Ўз маблағлари, ЎзТТЖ маблағлари, Кредит",
    risks: "Мавжуд эмас",
  },
];

/**
 * Реестрда мавжуд, лекин **биронта лойиҳада ҳам тўлдирилмаган** устунлар.
 * Улар устун сифатида чизилмайди (бўш устун экранни ифлослайди), лекин
 * яширилмайди ҳам — бўлим остида очиқ санаб ўтилади.
 */
export const INVEST_EMPTY_FIELDS: string[] = [
  "Лойиҳа коди",
  "Ускуна тўлов шартлари",
  "Таклифлар қабул қилинмоқда",
  "Харажатлар таркиби (қисқа)",
  "Изоҳ / махсус майдонлар",
];

/** Юқоридагилардан ташқари яна 3 та устун сарлавҳасиз ва бўш. */
export const INVEST_UNNAMED_EMPTY_COUNT = 3;

/**
 * Қурилиш лойиҳа-смета ҳужжатлари ҳолатининг реестрдаги тўлиқ рўйхати —
 * босқичлар тартибида. Лойиҳалар бу қийматларнинг фақат бир қисмида
 * турибди; қолган босқичларда лойиҳа йўқлиги ҳам маълумот.
 */
export const INVEST_DOC_STATES: string[] = [
  "Ishlab chiqilmagan",
  "Ishlab chiqilmoqda",
  "Ishlab chiqilgan",
  "Shaharsozlik ekspertizada",
  "Shaharsozlik ijobiy ekspertizasi olingan",
];
