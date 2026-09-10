import type { ChainResponse, ChainStep } from "../../api/types";
import type { Status } from "../../types";
import { statusOf } from "../format";

/**
 * «Технологик жараён» — заводнинг тўртта технологик схемаси.
 *
 * ═══ 1. Манба ва нима ўзгартирилмайди ═════════════════════════════════════
 *
 * Тузилма манбаи — **«Баланс (2).pptx»** (`svodka/` илдизида), 1–4 слайдлар.
 * Босқичларнинг номи, реагентлар, шароитлар (pH, ҳарорат) ва режимлар
 * слайддан **сўзма-сўз** олинган: рус тилидаги технологик атамалар,
 * ускуна номлари ва кимёвий формулалар таржима қилинмайди ва
 * қисқартирилмайди (`Автоклавное выщелачивание`, `Эл. печь СТН-1,6`).
 * Ўзбекча фақат биз қўшган нарса: ёрлиқ, сарлавҳа ва изоҳ.
 *
 * Слайддаги имло ҳам сақланган (`Подговка пульпы`, `Огорок продукта`,
 * `Глицирин`) — бу манбанинг ўз матни, тузатиш уни манбадан узиб қўярди.
 *
 * ═══ 2. Ёрдамчи ёзувлар қаерга бирикади ═══════════════════════════════════
 *
 * Слайдда реагент, оқим, чиқинди ва шароит ёзувлари **қутилар орасида**
 * туради, стрелка эса `.pptx` да алоҳида шакл — уни ўқиб «бу ёзув айнан
 * шу босқичники» деб айтиб бўлмайди. Шунинг учун ҳеч қандай семантик
 * тахмин қилинмайди, механик қоида ишлатилади:
 *
 *   · слайддаги `y` координатаси иккита кетма-кет босқич **орасида** бўлса —
 *     ёзув ўша **боғловчи** (стрелка) ёнида чизилади (`before`);
 *   · босқич билан **бир қаторда** (бир хил `y`) бўлса — босқичнинг ўзига
 *     бирикади (`chips`);
 *   · 4-слайд «илон» шаклида жойлашган (`y` монотон эмас), у ерда энг яқин
 *     босқич 2D масофа бўйича олинган.
 *
 * Координаталар: `Баланс (2).pptx` дан ажратилган шакллар рўйхати
 * (дюймда, юқоридан пастга). Ёзувнинг ўзи ҳеч қачон ўзгартирилмайди —
 * фақат қаерда чизилиши ҳал қилинади.
 *
 * 1-слайд учун координата йиғилмаган, шунинг учун ундаги реагентлар
 * (`Тех. вода`, `HNO₃`, `Масло Т-92`, `Ксантогенат`) айрим босқичга
 * **бириктирилмайди** — схема даражасидаги рўйхат бўлиб қолади.
 *
 * ═══ 3. Сон қаердан келади ════════════════════════════════════════════════
 *
 * Схемадаги 60 дан ортиқ босқичнинг фақат учдан бирида ўлчов бор.
 * Қиймат **фақат** `/chain` дан олинади (`ChainStep.values[ой]`), босқич
 * билан боғланиш `metrics[].id` орқали қатъий белгиланган. Ўлчови йўқ
 * босқичга сон қўйилмайди ва «0» ёзилмайди — у жараён босқичи сифатида,
 * номи ва шароити билан чизилади.
 *
 * ═══ 4. Кимёвий формулалар ════════════════════════════════════════════════
 *
 * Матн ичида `_N` — пастки индекс, `^N` — юқори индекс белгиси
 * (`Na_2WO_4` → Na₂WO₄, `kg/m^3` → kg/m³). Бу **кўриниш** белгиси:
 * формуланинг ўзи ўзгармайди, чизишни `panels/tex/TexFlow.tsx` даги
 * `Chem` бажаради.
 */

export type TexSchemeId = "ing" | "c4" | "c5" | "mo";

export const TEX_SCHEME_IDS: readonly TexSchemeId[] = ["ing", "c4", "c5", "mo"];

export const isTexSchemeId = (v: string | null): v is TexSchemeId =>
  v !== null && (TEX_SCHEME_IDS as readonly string[]).includes(v);

/**
 * Иконка идентификатори. Расм эмас — `panels/tex/icons.tsx` даги inline SVG
 * йўли; янги пакет қўшилмайди, ранг `currentColor` дан олинади.
 */
export type TexIconId =
  | "factory"
  | "flask"
  | "furnace"
  | "mine"
  | "box"
  | "clock"
  | "stack"
  | "bolt"
  | "h2"
  | "drop"
  | "swap"
  | "thermo"
  | "ph"
  | "layers"
  | "scale"
  | "conveyor"
  | "bubbles"
  | "dry"
  | "reactor"
  | "filter"
  | "crystal"
  | "press"
  | "sieve"
  | "mix"
  | "mill"
  | "waste"
  | "dot";

/** Ёзув тури — ранг **ёлғиз** маъно ташимайди, ёнида матнли изоҳ туради. */
export type TexChipKind = "reagent" | "flow" | "waste" | "cond" | "control";

export interface TexChip {
  kind: TexChipKind;
  text: string;
}

/** Босқич ичида йиғиладиган узун матн (масалан қайтариш режими). */
export interface TexDetail {
  title: string;
  lines: string[];
}

export interface TexMetricRef {
  /** `/chain` даги `steps[].id` ёки `resources[].id`. */
  id: string;
  /** Экрандаги ўзбекча ёрлиқ (формула бўлса `_N` белгиси билан). */
  label: string;
}

export type TexStageKind = "input" | "process" | "product" | "result";

interface TexStageDef {
  key: string;
  /** Слайддаги ном — ўзгартирилмайди. */
  title: string;
  kind: TexStageKind;
  /** Олдинги босқич билан орасидаги ёзувлар. */
  before?: TexChip[];
  /** Босқич билан бир қатордаги ёзувлар. */
  chips?: TexChip[];
  /** Охирги босқичдан кейинги ёзувлар. */
  after?: TexChip[];
  details?: TexDetail[];
  image?: { file: string; alt: string };
  metrics?: TexMetricRef[];
  note?: string;
}

interface TexLaneDef {
  key: string;
  title?: string;
  note?: string;
  stages: TexStageDef[];
}

/**
 * Юқоридаги плитка.
 *
 *  · `metric` — сон **фақат** `/chain` дан. `id` жавобда бўлмаса плитка
 *    умуман чизилмайди (бўш жой эгалловчи ҳам қўйилмайди).
 *  · `stages` — схемадаги босқич сони; бу тузилманинг ўз факти, API'га
 *    тегишли эмас.
 *  · `fact` — схеманинг ўзгармас факти (масалан «2 фабрика»).
 */
export type TexKpiDef =
  | { kind: "metric"; id: string; label: string; icon: TexIconId }
  | { kind: "stages"; label: string; icon: TexIconId }
  | { kind: "fact"; label: string; value: string; icon: TexIconId; note?: string };

/**
 * «Асосий параметрлар» катаги: ёрлиқ — ўзбекча кирилл (биз қўшганимиз),
 * қиймат — слайддаги рус матни, сўзма-сўз.
 */
export interface TexParamDef {
  icon: TexIconId;
  label: string;
  value: string;
}

interface TexSchemeDef {
  id: TexSchemeId;
  /** Алмаштиргичдаги ёрлиқ. */
  label: string;
  hint: string;
  /** Слайд сарлавҳаси — рус тилида, ўзгартирилмайди. */
  title: string;
  /** Схема иконкаси (юқоридаги катта карточка). */
  icon: TexIconId;
  /**
   * Жараён қайси бўлинмада кечади — тасма субтитрида турадиган **ҳақиқий**
   * ном. Макетдаги «Цех 1 · Подготовительный» каби ўйлаб топилган цех
   * тасниф(лар)и ишлатилмайди: манбада улар йўқ.
   */
  plant: string;
  /**
   * Чизиқли схемада биринчи тасмага («Хомашё ва тайёргарлик») тушадиган
   * босқичлар сони. Бўлиниш **жойлашувга** асосланган (манбадаги тартиб),
   * технологик тасниф эмас — манбада эълон қилинган босқич гуруҳи йўқ.
   */
  headCount?: number;
  /** Параллел линиялар (1-схемада иккита фабрика), акс ҳолда биттаси. */
  lanes: TexLaneDef[];
  /** Линиялар бирлашгандан кейинги умумий қисм. */
  tail?: TexStageDef[];
  /** Ён тармоқ (5 цехдаги кек тармоғи). */
  branches?: TexLaneDef[];
  /** Слайддаги умумий изоҳлар. */
  notes?: string[];
  /** Босқичга бириктирилмаган реагент/ресурс рўйхати. */
  resources?: TexChip[];
  /** Оқимдаги ўрни слайдда кўрсатилмаган ускуна. */
  equipment?: { file: string; alt: string; title: string; note: string }[];
  /** Юқоридаги плиткалар қатори. */
  kpis: TexKpiDef[];
  /** «Асосий параметрлар» — слайд матни. */
  params: TexParamDef[];
  /** «Энергоресурслар» — бўлмаса карточка чизилмайди. */
  energy?: TexMetricRef[];
  /** «Йўқотиш ва чиқинди» — бўлмаса карточка чизилмайди. */
  losses?: TexMetricRef[];
  /** «Маҳсулот» — режага нисбатан прогресс билан. */
  products?: TexMetricRef[];
  extrasTitle: string;
  extras: TexMetricRef[];
}

/* -------------------------------------------------------------------------- */
/* ёзув ясагичлар                                                             */
/* -------------------------------------------------------------------------- */

const rg = (text: string): TexChip => ({ kind: "reagent", text });
const fl = (text: string): TexChip => ({ kind: "flow", text });
const ws = (text: string): TexChip => ({ kind: "waste", text });
const cn = (text: string): TexChip => ({ kind: "cond", text });
const ct = (text: string): TexChip => ({ kind: "control", text });

export const TEX_CHIP_LABEL: Record<TexChipKind, string> = {
  reagent: "Реагент",
  flow: "Оралиқ оқим",
  waste: "Чиқинди / кек",
  cond: "Шароит",
  control: "Назорат нуқтаси",
};

export const TEX_CHIP_COLOR: Record<TexChipKind, string> = {
  reagent: "var(--s2)",
  flow: "var(--s1)",
  waste: "var(--ink-3)",
  cond: "var(--s3)",
  control: "var(--warn)",
};

export const TEX_STAGE_STRIPE: Record<TexStageKind, string> = {
  input: "var(--s3)",
  process: "var(--rule)",
  product: "var(--s1)",
  result: "var(--s2)",
};

/* -------------------------------------------------------------------------- */
/* 1-схема — Ингичка вольфрам бойитиш фабрикаси                                */
/* -------------------------------------------------------------------------- */

/**
 * Иккала фабрика **бир хил** ускуна кетма-кетлигини ишлатади, шунинг учун
 * босқичлар бир жойда ёзилади ва ускуна расми такрорланади — слайдда ҳам
 * шундай. Фарқи фақат хвостохранилище рақами ва «Весы» да ўлчанадиган
 * участкалар.
 */
const ingLane = (fab: 1 | 2, metrics: TexMetricRef[]): TexStageDef[] => [
  { key: `f${fab}-hvost`, title: `Хвостохранилище №${fab}`, kind: "input" },
  { key: `f${fab}-zagruzka`, title: "Участок загрузки", kind: "process" },
  {
    key: `f${fab}-conveyor`,
    title: "Конвейер",
    kind: "process",
    image: { file: "conveyor.png", alt: "Конвейер — ускуна тури иллюстрацияси" },
  },
  {
    key: `f${fab}-scrubber`,
    title: "Скруббер",
    kind: "process",
    image: { file: "scrubber.jpg", alt: "Скруббер — ускуна тури иллюстрацияси" },
  },
  {
    key: `f${fab}-spiral`,
    title: "Винтовой сепаратор",
    kind: "process",
    image: { file: "spiral.png", alt: "Винтовой сепаратор — ускуна тури иллюстрацияси" },
  },
  {
    key: `f${fab}-table`,
    title: "Гравитационный стол",
    kind: "process",
    image: { file: "table.png", alt: "Гравитационный стол — ускуна тури иллюстрацияси" },
  },
  { key: `f${fab}-vesy`, title: "Весы", kind: "product", metrics },
];

const ING: TexSchemeDef = {
  id: "ing",
  label: "Ингичка фабрикаси",
  hint: "Иккита параллел линия: хвостохранилищедан гравитацион бойитиш ва флотация орқали вольфрам концентратигача.",
  title: "Ингичка вольфрам бойитиш фабрикаси",
  icon: "factory",
  plant: "Ингичка бойитиш фабрикаси",
  lanes: [
    {
      key: "fab1",
      title: "Фабрика №1",
      note: "550-600 тонн за смену (12 часов)",
      stages: ingLane(1, [
        { id: "ing-uch1-gravikoncentrat", label: "Уч. №1 — натурал гравиконцентрат" },
      ]),
    },
    {
      key: "fab2",
      title: "Фабрика №2",
      note: "400-450 тонн за смену (12 часов)",
      stages: ingLane(2, [
        { id: "ing-uch2-gravikoncentrat", label: "Уч. №2 — натурал гравиконцентрат" },
        { id: "ing-uch3-gravikoncentrat", label: "Уч. №3 — натурал гравиконцентрат" },
      ]),
    },
  ],
  tail: [
    {
      key: "flotaciya",
      title: "Участок флотации",
      kind: "process",
      image: { file: "flotation.png", alt: "Участок флотации — ускуна тури иллюстрацияси" },
      note: "Продолжительность одного цикла процесса флотации составляет 2 часа.",
    },
    {
      key: "sushka",
      title: "Участок сушки концентратов",
      kind: "process",
      image: {
        file: "drying.jpg",
        alt: "Участок сушки концентратов — ускуна тури иллюстрацияси",
      },
    },
    {
      key: "koncentrat",
      title: "Вольфрамовый концентрат",
      kind: "result",
      metrics: [
        { id: "ing-itogo-gravikoncentrat", label: "Натурал гравиконцентрат, жами (уч. 1–3)" },
      ],
    },
  ],
  notes: ["Каждые 8 часов горная техника — перемещается на другое хвостохранилище."],
  resources: [rg("Тех. вода"), rg("HNO_3"), rg("Масло Т-92"), rg("Ксантогенат")],
  equipment: [
    {
      file: "mill.jpg",
      alt: "Мелница (мельница) — ускуна тури иллюстрацияси",
      title: "Мелница (мельница)",
      note: "Слайддаги ускуналар рўйхатида бор, лекин оқимдаги ўрни кўрсатилмаган — шунинг учун босқичлар орасига қўйилмади.",
    },
  ],
  kpis: [
    {
      kind: "metric",
      id: "ing-pererabotano-otvalov",
      label: "Қайта ишланган руда",
      icon: "mine",
    },
    {
      kind: "metric",
      id: "ing-itogo-gravikoncentrat",
      label: "Гравиконцентрат",
      icon: "box",
    },
    { kind: "metric", id: "ing-postavka-iof", label: "4 цехга юборилди", icon: "swap" },
    { kind: "metric", id: "prostoy-ingichka", label: "Простой", icon: "clock" },
    { kind: "stages", label: "Босқичлар", icon: "stack" },
    { kind: "fact", label: "Линиялар", value: "2 фабрика", icon: "factory" },
  ],
  params: [
    {
      icon: "conveyor",
      label: "Фабрика №1 унумдорлиги",
      value: "550-600 тонн за смену (12 часов)",
    },
    {
      icon: "conveyor",
      label: "Фабрика №2 унумдорлиги",
      value: "400-450 тонн за смену (12 часов)",
    },
    {
      icon: "clock",
      label: "Флотация цикли",
      value: "Продолжительность одного цикла процесса флотации составляет 2 часа",
    },
    {
      icon: "mine",
      label: "Тоғ техникасининг кўчиши",
      value: "Каждые 8 часов горная техника — перемещается на другое хвостохранилище",
    },
  ],
  losses: [
    { id: "othod-ogarok", label: "Огарок (чиқинди)" },
    { id: "othod-metall-v-ogarke", label: "Металл в огарке" },
  ],
  products: [
    { id: "ing-itogo-gravikoncentrat", label: "Натурал гравиконцентрат, жами (уч. 1–3)" },
  ],
  extrasTitle: "Фабрика бўйича бошқа кўрсаткичлар",
  extras: [
    { id: "ing-pererabotano-otvalov", label: "Қайта ишланган руда, жами (уч. 1–3)" },
    { id: "ing-postavka-iof", label: "4 цехга юборилган концентрат" },
    { id: "prostoy-ingichka", label: "Фабрика тўхташи (простой)" },
    { id: "othod-ogarok", label: "Огарок (чиқинди)" },
    { id: "othod-metall-v-ogarke", label: "Металл в огарке" },
  ],
};

/* -------------------------------------------------------------------------- */
/* 2-схема — 4 цех ПРМиТС, вольфрам гидрометаллургияси                        */
/* -------------------------------------------------------------------------- */

const C4: TexStageDef[] = [
  {
    key: "c4-koncentrat",
    title: "Вольфрамовый концентрат",
    kind: "input",
    metrics: [{ id: "ing-postavka-iof", label: "Ингичкадан келган концентрат" }],
  },
  { key: "c4-pulpa", title: "Подговка пульпы", kind: "process", before: [rg("Na_2СO_3")] },
  { key: "c4-avtoklav", title: "Автоклавное выщелачивание", kind: "process" },
  { key: "c4-filtr-1", title: "Фильтрация", kind: "process", before: [fl("Na_2WO_4")] },
  {
    key: "c4-sio2",
    title: "Очистка р-ра Na_2WO_4 от SiO_2",
    kind: "process",
    before: [
      cn("1. Температура (80-85) °С"),
      cn("2. pH 9,0-9,5"),
      cn("3. При отсутствии нитрата аллюминия pH 7,0-7,5"),
      rg("HNO_3"),
      rg("Al(NO_3)_3"),
    ],
  },
  {
    key: "c4-filtr-2",
    title: "Фильтрация",
    kind: "process",
    before: [
      fl("Na_2WO_4 с содер. WO_3 > 50kg/m^3"),
      ws("Кек с содер. WO_3 <20% от исходного"),
      rg("HNO_3"),
    ],
  },
  {
    key: "c4-sorbciya-prep",
    title: "Подготовка р-ра Na_2WO_4 к сорбции",
    kind: "process",
    chips: [cn("pH 2,5-4,0")],
  },
  {
    key: "c4-filtr-3",
    title: "Фильтрация",
    kind: "process",
    // Слайдда бир хил матнли иккита ёзув бор (турли жойда) — иккови ҳам
    // қолдирилди, биттаси «такрор» деб олиб ташланмади.
    before: [ws("W содер. осадок WO_3 > 1,5%"), ws("W содер. осадок WO_3 > 1,5%")],
  },
  {
    key: "c4-sorbciya",
    title: "Сорбция вольфрама, Десорбция вольфрама",
    kind: "process",
    before: [fl("(NH_4)_2WO_4"), rg("Mg(NO_3)_2")],
  },
  { key: "c4-pas", title: "Очистка р-ра (NH_4)_2WO_4 от P,As", kind: "process" },
  {
    key: "c4-filtr-4",
    title: "Фильтрация",
    kind: "process",
    before: [
      fl("осветвленный раствор (NH_4)_2WO_4"),
      fl("Na_2WO_4 с содер.WO_3 < 0.05kg/m^3"),
    ],
    chips: [ws("W содер. осадок WO_3 > 1,5%")],
  },
  {
    key: "c4-uparka",
    title: "Упарка и кристаллизация ПВА (паравольфрамат аммония)",
    kind: "process",
  },
  { key: "c4-filtr-5", title: "Фильтрация", kind: "process", before: [fl("Кристаллы ПВА")] },
  { key: "c4-prokalka", title: "Сушка, прокалка кристаллов ПВА", kind: "process" },
  {
    key: "c4-angidrid",
    title: "Вольфрамовый ангидрид",
    kind: "result",
    before: [
      ws("кек с содержанием WO_4 <1,5% на шлам накопитель"),
      fl("Маточный раствор с содер. WO_3 < 50kg/m^3"),
    ],
    metrics: [{ id: "c4-vypusk-wo3", label: "WO_3 (вольфрам ангидриди техн.), жами" }],
  },
];

const SCHEME_C4: TexSchemeDef = {
  id: "c4",
  label: "4 цех — вольфрам",
  hint: "Вольфрам гидрометаллургияси: концентратдан автоклав, сорбция ва ПВА кристаллари орқали вольфрам ангидридигача.",
  title: "Графическая схема технологического процесса 4 цеха ПРМиТС",
  icon: "flask",
  plant: "4 цех ПРМиТС",
  headCount: 2,
  lanes: [{ key: "c4", stages: C4 }],
  kpis: [
    {
      kind: "metric",
      id: "ing-postavka-iof",
      label: "Кирувчи концентрат",
      icon: "drop",
    },
    { kind: "metric", id: "c4-vypusk-wo3", label: "Тайёр маҳсулот WO_3", icon: "box" },
    {
      kind: "metric",
      id: "c4-resurs-elektroenergiya",
      label: "Электр энергия",
      icon: "bolt",
    },
    { kind: "stages", label: "Босқичлар", icon: "stack" },
    { kind: "fact", label: "Бўлинма", value: "4 цех ПРМиТС", icon: "factory" },
  ],
  params: [
    { icon: "thermo", label: "Ҳарорат", value: "Температура (80-85) °С" },
    { icon: "ph", label: "pH — SiO_2 дан тозалаш", value: "pH 9,0-9,5" },
    { icon: "ph", label: "pH — сорбцияга тайёрлаш", value: "pH 2,5-4,0" },
    { icon: "layers", label: "Чўкмадаги вольфрам", value: "WO_3 > 1,5%" },
    { icon: "drop", label: "Эритмадаги концентрация", value: "WO_3 > 50 kg/m^3" },
  ],
  energy: [{ id: "c4-resurs-elektroenergiya", label: "Электр энергия сарфи" }],
  products: [{ id: "c4-vypusk-wo3", label: "WO_3 (вольфрам ангидриди техн.), жами" }],
  extrasTitle: "Цехдан кейинги ҳаракат ва ресурс",
  extras: [
    { id: "c4-peredacha-wo3", label: "1 ва 3 цехга узатилди" },
    { id: "c1-priem-wo3", label: "1 цех қабул қилди" },
    { id: "c4-resurs-elektroenergiya", label: "4 цех электр энергия сарфи" },
  ],
};

/* -------------------------------------------------------------------------- */
/* 3-схема — 5 цех ПРМиТС, молибден гидрометаллургияси                        */
/* -------------------------------------------------------------------------- */

const C5: TexStageDef[] = [
  {
    key: "c5-ogarok",
    title: "Огорок продукта",
    kind: "input",
    metrics: [{ id: "c5-vvod-mo", label: "Мо в переработке (кириш)" }],
  },
  { key: "c5-razmol", title: "Размол", kind: "process" },
  {
    key: "c5-vyshelachivanie",
    title: "I, II, III стадия содового выщелачивания ОППМ",
    kind: "process",
    chips: [cn("1. Температура не менее 65 °С"), cn("2. Соотношение Т:Ж 1:(5-7)")],
  },
  { key: "c5-filtr-1", title: "Фильтрация фильтр пресс рамный", kind: "process" },
  {
    key: "c5-podgotovka",
    title: "Подготовка раствора (Na_2MoO_4) молибдата натрия на сорбцию",
    kind: "process",
    before: [ws("Кек"), fl("раствор молибдата натрия"), rg("HNO_3")],
  },
  {
    key: "c5-sorbciya",
    title: "Сорбция и десорбция молибдена",
    kind: "process",
    before: [rg("NH_4OH"), cn("pH 3,0-3,5")],
  },
  {
    key: "c5-osazhdenie",
    title: "Осаждение ТМА",
    kind: "process",
    before: [fl("раствор молибдата аммония"), cn("pH 2,5-3,0")],
  },
  {
    key: "c5-nutch",
    title: "Фильтрация в нутч фильтр",
    kind: "process",
    before: [cn("1. Температура раствора 30-35 °С"), cn("2. pH 1,8-2,2")],
  },
  {
    key: "c5-tma",
    title: "ТМА тетрамолибдат аммония",
    kind: "result",
    metrics: [{ id: "c5-vypusk-tma", label: "ТМА (MoO_3 га ҳисобланган), жами" }],
  },
];

const C5_BRANCH: TexStageDef[] = [
  {
    key: "c5-promyvka",
    title: "Промывка кека с водой",
    kind: "process",
    chips: [ws("Кек после 3-стадийного выщелачивания")],
  },
  {
    key: "c5-filtr-2",
    title: "Фильтрация фильтр пресс рамный",
    kind: "process",
    before: [
      fl("Маточный раствор отправляются далее на сорбцию и десорбцию (II участок)"),
    ],
    after: [
      fl("Промывной молибденсодержащий раствор направляется на сорбцию I участок"),
      ws("Кек с содержанием Mo общ >3% направляется на II участок"),
    ],
  },
];

const SCHEME_C5: TexSchemeDef = {
  id: "c5",
  label: "5 цех — молибден",
  hint: "Молибден гидрометаллургияси: огарокдан уч босқичли сода билан ювиш, сорбция ва чўктириш орқали ТМА гача.",
  title: "Графическая схема технологического процесса 5 цеха ПРМиТС",
  icon: "flask",
  plant: "5 цех ПРМиТС",
  headCount: 2,
  lanes: [{ key: "c5", stages: C5 }],
  kpis: [
    { kind: "metric", id: "c5-vvod-mo", label: "Ввод молибдена", icon: "drop" },
    { kind: "metric", id: "c5-vypusk-tma", label: "ТМА чиқарилди", icon: "box" },
    { kind: "metric", id: "c5-peredacha-tma", label: "1 цехга узатилди", icon: "swap" },
    { kind: "stages", label: "Босқичлар", icon: "stack" },
    { kind: "fact", label: "Бўлинма", value: "5 цех ПРМиТС", icon: "factory" },
  ],
  params: [
    { icon: "thermo", label: "Ювиш ҳарорати", value: "Температура не менее 65 °С" },
    { icon: "layers", label: "Қаттиқ:Суюқ нисбати", value: "Т:Ж 1:(5-7)" },
    { icon: "ph", label: "pH — сорбция", value: "pH 3,0-3,5" },
    { icon: "ph", label: "pH — ТМА чўктириш", value: "pH 2,5-3,0" },
    { icon: "thermo", label: "Эритма ҳарорати", value: "Температура раствора 30-35 °С" },
    { icon: "ph", label: "pH — нутч фильтр", value: "pH 1,8-2,2" },
  ],
  products: [{ id: "c5-vypusk-tma", label: "ТМА (MoO_3 га ҳисобланган), жами" }],
  branches: [
    {
      key: "c5-branch",
      title: "Кек тармоғи (ён оқим)",
      stages: C5_BRANCH,
    },
  ],
  extrasTitle: "Цехдан кейинги ҳаракат",
  extras: [{ id: "c5-peredacha-tma", label: "1 цехга узатилди" }],
};

/* -------------------------------------------------------------------------- */
/* 4-схема — молибден маҳсулотлари                                            */
/* -------------------------------------------------------------------------- */

const MO: TexStageDef[] = [
  { key: "mo-tma", title: "ТМА, АМК", kind: "input", chips: [ct("Металл содержания")] },
  {
    key: "mo-prokalka",
    title: "Прокалка АМК или ТМА (Эл. печь прокалка)",
    kind: "process",
    chips: [
      cn("1. Температура 350 °С ± 20 °С"),
      cn("2. Загрузка АМК или ТМА в трубу за 1 час (40-70)±5кг"),
    ],
  },
  {
    key: "mo-moo3",
    title: "MoO_3",
    kind: "product",
    chips: [ct("Весы")],
    metrics: [{ id: "c1-moo3-vnutrennee", label: "МоО_3 ички истеъмолга" }],
  },
  {
    key: "mo-vosstanovlenie-1",
    title: "Первое восстановление (Эл. печь СТН-1,6)",
    kind: "process",
    details: [
      {
        title: "Технологический режим — Первое восстановление (Эл. печь СТН-1,6)",
        lines: [
          "1. Навеска MoO_3 в одну лодку: (1200 ÷ 2000) ± 50г.",
          "2. Расход водорода на муфель: 4 ÷8 м^3/ч",
          "3. Продвижка лодочек в мин, 15 ÷20 мин.",
          "4. Температура по зонам:",
          "I-зона: 500-550 °С ± 20 °С",
          "II-зона: 550-600 °С ± 20 °С",
          "III-зона: 550-600 °С ± 20 °С",
          "IV-зона: 550-600 °С ± 20 °С",
          "V-зона: 500-550 °С ± 20 °С",
        ],
      },
    ],
  },
  { key: "mo-moo2", title: "MoO_2", kind: "product", chips: [ct("Весы")] },
  { key: "mo-prosev-1", title: "Просев", kind: "process", chips: [ct("Весы")] },
  {
    key: "mo-vosstanovlenie-2",
    title: "Второе восстановление (Эл. печь СТН-1,6)",
    kind: "process",
    details: [
      {
        title: "Технологический режим — Второе восстановление (Эл. печь СТН-1,6)",
        lines: [
          "1. Навеска MoO_2 в одну лодку: (1200 ÷ 2000) ± 50г.",
          "2. Расход водорода на муфель: 6 ÷ 12 м^3/ч",
          "3. Продвижка лодочек в мин, 30 мин.",
          "4. Температура по зонам:",
          "I-зона: 850-900 °С ± 20 °С",
          "II-зона: 900-950 °С ± 20 °С",
          "III-зона: 900-950 °С ± 20 °С",
          "IV-зона: 900-950 °С ± 20 °С",
          "V-зона: 850-900 °С ± 20 °С",
        ],
      },
    ],
  },
  { key: "mo-mo", title: "Mo", kind: "product" },
  {
    key: "mo-prosev-2",
    title: "Просев",
    kind: "process",
    chips: [ct("Весы"), ct("O_2 содержания")],
  },
  {
    key: "mo-usrednenie",
    title: "Усреднение",
    kind: "process",
    chips: [
      rg("Технический спирт C₂H₅OH"),
      rg("Глицирин C₂H₅NO₂"),
      ct("O_2, металл содержания"),
      ct("Развед лаборатория"),
    ],
  },
  { key: "mo-pressovka", title: "Прессовка (Гидр. пресс Д-1037)", kind: "process" },
  {
    key: "mo-predspekanie",
    title: "Предварительное спекание (Эл. печь ЦЭП-214) (Эл. печь ЦЭП-223)",
    kind: "process",
    chips: [ct("Весы")],
  },
  {
    key: "mo-spekanie",
    title: "Высокое темп-е спекание (Эл. печь СТВ-9,15)",
    kind: "process",
    chips: [ct("Весы")],
  },
  {
    key: "mo-gotovoe",
    title:
      "Готовое изделия ОТК (Штабик МЧ, Пластина МЧ, Брикет Mo, Штабик компакт, Лигатура)",
    kind: "result",
    chips: [ct("Определение плотности")],
    metrics: [
      { id: "c1-brikety", label: "Молибден брикетлари (товар)" },
      { id: "c1-shtabiki-osedanie", label: "Молибден штабиклари (оседание)" },
    ],
  },
];

const SCHEME_MO: TexSchemeDef = {
  id: "mo",
  label: "Молибден маҳсулотлари",
  hint: "ТМА/АМК дан прокалка, икки босқичли қайтариш, прессовка ва спекание орқали тайёр молибден маҳсулотигача.",
  title: "Технологическая схема производства молибденовых изделий",
  icon: "furnace",
  plant: "1 цех",
  headCount: 1,
  lanes: [{ key: "mo", stages: MO }],
  kpis: [
    { kind: "metric", id: "c1-moo3-vnutrennee", label: "МоО_3", icon: "box" },
    { kind: "metric", id: "c1-brikety", label: "Молибден брикетлари", icon: "box" },
    {
      kind: "metric",
      id: "c1-shtabiki-osedanie",
      label: "Молибден штабиклари",
      icon: "box",
    },
    {
      kind: "metric",
      id: "c1-resurs-elektroenergiya",
      label: "Электр энергия",
      icon: "bolt",
    },
    { kind: "metric", id: "c1-resurs-vodorod", label: "Водород", icon: "h2" },
    { kind: "stages", label: "Босқичлар", icon: "stack" },
    { kind: "fact", label: "Бўлинма", value: "1 цех", icon: "factory" },
  ],
  params: [
    { icon: "thermo", label: "Прокалка ҳарорати", value: "Температура 350 °С ± 20 °С" },
    { icon: "furnace", label: "Биринчи қайтариш зоналари", value: "500-600 °С ± 20 °С" },
    { icon: "furnace", label: "Иккинчи қайтариш зоналари", value: "850-950 °С ± 20 °С" },
    { icon: "h2", label: "Водород сарфи — 1-қайтариш", value: "4 ÷ 8 м^3/ч" },
    { icon: "h2", label: "Водород сарфи — 2-қайтариш", value: "6 ÷ 12 м^3/ч" },
    { icon: "scale", label: "Навеска", value: "(1200 ÷ 2000) ± 50 г" },
  ],
  energy: [
    { id: "c1-resurs-elektroenergiya", label: "Электр энергия сарфи" },
    { id: "c1-resurs-vodorod", label: "Водород сарфи" },
  ],
  products: [
    { id: "c1-brikety", label: "Молибден брикетлари (товар)" },
    { id: "c1-shtabiki-osedanie", label: "Молибден штабиклари (оседание)" },
  ],
  extrasTitle: "Кейинги ҳаракат",
  extras: [
    { id: "c1-sdacha-sgp", label: "СГП га топширилди" },
    { id: "c11-priem-shtabikov", label: "11 цех қабул қилди (штабиклар)" },
    { id: "c11-provoloka", label: "Молибден проволокаси (11 цех)" },
  ],
};

const SCHEMES: Record<TexSchemeId, TexSchemeDef> = {
  ing: ING,
  c4: SCHEME_C4,
  c5: SCHEME_C5,
  mo: SCHEME_MO,
};

export const TEX_SCHEMES: readonly { id: TexSchemeId; label: string; hint: string }[] =
  TEX_SCHEME_IDS.map((id) => ({
    id,
    label: SCHEMES[id].label,
    hint: SCHEMES[id].hint,
  }));

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface TexValueVM {
  key: string;
  label: string;
  /** `/chain` даги манба сатри — сон қаердан келгани кўриниб турсин. */
  site: string;
  output: string;
  unit: string;
  plan: number | null;
  fakt: number | null;
  pct: number | null;
  status: Status;
  /** Ўтган ойнинг факти — фарқ шу ердан ҳисобланади. */
  prevFakt: number | null;
  /** Босқич ўлчанади, лекин танланган ойда катак йўқ. */
  missing: boolean;
  /**
   * Танланган ойда **факт сони бор**. `missing` дан фарқи бор ва иккови
   * экранда бошқача ёзилади:
   *   · `missing` — жавобда шу ой учун катак умуман йўқ («маълумот йўқ»);
   *   · катак бор, лекин `fakt === null` — қатор мавжуд, сон тўлдирилмаган
   *     («ҳисобот берилмаган», масалан `othod-metall-v-ogarke` ҳамма ойда).
   * Иккала ҳолатда ҳам 0 ёзилмайди.
   */
  reported: boolean;
  /**
   * Сўнгги ойлар факти (эскидан янгига), кўрсатилган ой билан тугайди.
   * Маълумоти йўқ ой `null` бўлиб қолади — `Sparkline` уни нол деб чизмайди,
   * чизиқни ўша ерда узади.
   */
  spark: (number | null)[];
}

export interface TexStageVM {
  key: string;
  title: string;
  kind: TexStageKind;
  icon: TexIconId;
  /** Линия ичидаги тартиб рақами — навигация учун, манбада йўқ. */
  no: number;
  before: TexChip[];
  chips: TexChip[];
  after: TexChip[];
  /** `chips` дан ажратилган шароит ёзувлари — карточкадаги шароит қатори. */
  conds: TexChip[];
  /** `chips` дан қолгани — реагент/оқим/чиқинди/назорат. */
  marks: TexChip[];
  details: TexDetail[];
  image: { src: string; alt: string } | null;
  values: TexValueVM[];
  note: string | null;
}

/**
 * Рангли тасма — босқичларнинг гуруҳи.
 *
 * ⚠️ Гуруҳлаш **фақат манба тасдиқлаган** даражада: 1-схемада манбада
 * ҳақиқий тузилма бор (иккита фабрика + умумий қисм), қолган учтасида эса
 * эълон қилинган босқич гуруҳи йўқ — шунинг учун нейтрал, **жойлашувга**
 * асосланган уч бўлиниш ишлатилади (`headCount` + охирги босқич). Макетдаги
 * «Цех 1 · Подготовительный / Цех 2 · Химический / Цех 3 · Кристаллизация»
 * ишлатилмайди: у бизнинг манбамизга зид (2-слайд бутунлай 4 цехга тегишли).
 */
export interface TexBandVM {
  key: string;
  /** Тасманинг биринчи босқичи рақами: `"01"`, `"05"`, `"10"`. */
  no: string;
  title: string;
  /** Ҳақиқий бўлинма номи. */
  subtitle: string;
  /** Категорик ранг токени (`--s1`/`--s2`/`--s3`) — ҳолат ранги эмас. */
  token: string;
  stages: TexStageVM[];
}

export interface TexKpiVM {
  key: string;
  label: string;
  icon: TexIconId;
  /** Тайёр матн (босқич сони, бўлинма номи) ёки `null` — у ҳолда `value` бор. */
  text: string | null;
  note: string | null;
  value: TexValueVM | null;
}

export interface TexParamVM {
  key: string;
  icon: TexIconId;
  label: string;
  value: string;
}

export interface TexLaneVM {
  key: string;
  title: string | null;
  note: string | null;
  stages: TexStageVM[];
}

export interface TexSchemeVM {
  id: TexSchemeId;
  label: string;
  title: string;
  /** Бир қаторлик тавсиф (`hint`). */
  desc: string;
  icon: TexIconId;
  plant: string;
  bands: TexBandVM[];
  branches: TexLaneVM[];
  kpis: TexKpiVM[];
  params: TexParamVM[];
  energy: TexValueVM[];
  losses: TexValueVM[];
  products: TexValueVM[];
  notes: string[];
  resources: TexChip[];
  equipment: { src: string; alt: string; title: string; note: string }[];
  extrasTitle: string;
  extras: TexValueVM[];
  /** Схемадаги жами босқич ва улардан нечтасида ўлчов борлиги. */
  stageCount: number;
  measuredCount: number;
  /** Спарклайн ойлари (эскидан янгига) — изоҳ матни учун. */
  sparkMonths: string[];
}

/**
 * Режа/факт қиймати — тўртта ўнлик хонагача.
 *
 * ⚠️ Бу **яхлитлаш эмас, шовқинни кесиш**. `/chain` жавобидаги сон
 * қийматларнинг катта қисмида икколик сузувчи нуқта думи бор:
 *
 *   `c1-moo3-vnutrennee` 2026-07 → `plan: 175.79999999999995` (манбада 175,8)
 *   `c1-moo3-vnutrennee` 2026-07 → `fakt: 136.59199999999998` (манбада 136,592)
 *   `ing-pererabotano-otvalov` 2026-07 → `plan: 91.30000000000004` (манбада 91,3)
 *   `c1-moo3-vnutrennee` 2026-09 → `plan: 44.4111827756939`   (ҳисобланган режа)
 *
 * `toPrecision(15)` буларнинг ҳаммасини тузатмайди (`44.4111827756939` ва
 * `94.49999999999994` шундай қолади), шунинг учун `exact()` экранга
 * **арифметика хатосини** чиқариб қўяр эди.
 *
 * ─── Нега 4 хона, 3 эмас ─────────────────────────────────────────────────
 *
 * Шу панелдаги 21 та кўрсаткичнинг ҳамма ойлари текширилди
 * (`GET /chain?from=2026-01-01&to=2026-08-31`, шовқин кесилгандан кейинги
 * ўнлик хона тақсимоти): 1 хона — 136 та, 2 — 30, 3 — 83, **4 — 14**,
 * ундан узуни — 8 та (ҳаммаси ҳисобланган `plan`).
 *
 * Яъни манбада **тўртта хонали ҳақиқий қийматлар бор**:
 *   `c4-vypusk-wo3` 2026-07 fakt = 35,6343
 *   `c5-vypusk-tma` 2026-08 fakt = 186,6173
 *   `c1-priem-wo3`  2026-02 fakt = 8,8995   (жавобда `8.899499999999998`)
 *
 * Учта хонага яхлитланса шу 14 та қийматнинг **ҳақиқий рақами** йўқолар эди
 * (`35,6343 → 35,634`, `8,8995 → 8,899`) — бу шовқинни олиб ташлаш эмас,
 * аниқликни йўқотиш бўларди. Тўртта хона эса юқоридаги мисолларнинг
 * ҳаммасини тўғрилайди ва биронта ҳақиқий рақамга тегмайди:
 *   `175.79999999999995 → 175,8` · `44.4111827756939 → 44,4112`
 *   `94.49999999999994 → 94,5`   · `8.899499999999998 → 8,8995`
 *
 * `null` `null` бўлиб қолади — 0 га айланмайди.
 */
function round4(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Math.round(v * 10000) / 10000;
}

/**
 * Фоизга **тегилмайди**: у бэкенддан келади ва экранда `pctTxt()` уни
 * барибир битта ўнлик хонагача форматлайди. Бу ерда яхлитланса
 * `99,96 → 100,0` бўлиб ҳолат ранги (`statusOf`) сакраб кетарди —
 * шунинг учун фақат IEEE-754 думи кесилади.
 */
function cleanPct(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

const imgSrc = (file: string): string => `${import.meta.env.BASE_URL}tex-shema/${file}`;

/** `"2026-08"` → `"2026-07"`. `lib/period.ts` даги `monthMinus` билан бир хил. */
function prevMonthOf(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Босқич иконкаси — слайддаги **номидан** аниқланади, биринчи мос келган
 * қоида ишлайди. Қоидалар қотирилган ва тартиби аҳамиятли:
 * «Сушка, прокалка кристаллов ПВА» да ҳам `сушк`, ҳам `кристалл` бор —
 * шунинг учун `dry` `crystal` дан олдин турибди; «Подготовка … на сорбцию»
 * тайёргарлик босқичи, шунинг учун `flask` `сорбц` дан олдин.
 *
 * Мос қоида топилмаса: маҳсулот/натижа қутиси — `box`, қолгани нейтрал `dot`.
 * Ном ҳеч қачон ўзгартирилмайди, фақат ёнидаги белги танланади.
 */
const STAGE_ICON_RULES: readonly [RegExp, TexIconId][] = [
  [/хвостохранилищ/i, "mine"],
  [/конвейер|загрузк/i, "conveyor"],
  [/скруббер|промывк/i, "drop"],
  [/фильтрац/i, "filter"],
  [/сушк|прокалк/i, "dry"],
  [/подготовка|подговка|очистка/i, "flask"],
  [/автоклав|выщелачивани/i, "reactor"],
  [/сорбц/i, "swap"],
  [/кристаллизац|упарка|осаждение/i, "crystal"],
  [/печь|восстановлени|спекани/i, "furnace"],
  [/прессовк/i, "press"],
  [/просев/i, "sieve"],
  [/усреднени/i, "mix"],
  [/размол|мелниц/i, "mill"],
  [/флотац/i, "bubbles"],
  [/сепаратор|стол/i, "layers"],
  [/весы/i, "scale"],
];

function stageIcon(title: string, kind: TexStageKind): TexIconId {
  for (const [re, icon] of STAGE_ICON_RULES) if (re.test(title)) return icon;
  return kind === "process" ? "dot" : "box";
}

function valueOf(
  step: ChainStep,
  ref: TexMetricRef,
  month: string,
  prev: string,
  sparkMonths: string[],
): TexValueVM {
  const cell = step.values[month] ?? null;
  const prevCell = step.values[prev] ?? null;
  const pct = cleanPct(cell?.pct);
  const fakt = round4(cell?.fakt);
  return {
    key: ref.id,
    label: ref.label,
    site: step.site,
    output: step.output,
    unit: step.unit,
    plan: round4(cell?.plan),
    fakt,
    pct,
    status: statusOf(pct),
    // Ўтган ой ҳам шу ерда яхлитланади — «ўтган ойга нисбатан» фарқи
    // (`deltaTxt`) экрандаги иккита сондан ҳисоблансин, ундан бошқасидан эмас.
    prevFakt: round4(prevCell?.fakt),
    missing: cell === null,
    reported: cell !== null && fakt !== null,
    spark: sparkMonths.map((m) => round4(step.values[m]?.fakt)),
  };
}

function stageVM(
  def: TexStageDef,
  no: number,
  index: Map<string, ChainStep>,
  month: string,
  prev: string,
  sparkMonths: string[],
): TexStageVM {
  const values: TexValueVM[] = [];
  for (const ref of def.metrics ?? []) {
    const step = index.get(ref.id);
    // Босқич биркитилган `id` жавобда бўлмаса — сон **ўйлаб топилмайди**,
    // босқич оддий жараён босқичи бўлиб қолади.
    if (step) values.push(valueOf(step, ref, month, prev, sparkMonths));
  }
  const before = def.before ?? [];
  const chips = def.chips ?? [];
  const after = def.after ?? [];
  // Учовининг ҳаммаси битта карточкада кўрсатилади: `before` — шу босқичга
  // кирувчи стрелка ёнидаги ёзув, яъни барибир **шу** босқичнинг ўқилиши.
  // Провенанс йўқолмайди — `before`/`chips`/`after` VM'да алоҳида қолади.
  const all = [...before, ...chips, ...after];
  return {
    key: def.key,
    title: def.title,
    kind: def.kind,
    icon: stageIcon(def.title, def.kind),
    no,
    before,
    chips,
    after,
    // Шароит ёзувлари карточкада алоҳида қатор бўлади — қолгани чип бўлиб
    // пастда туради. Ажратиш фақат кўриниш учун, матн ўзгармайди.
    conds: all.filter((c) => c.kind === "cond"),
    marks: all.filter((c) => c.kind !== "cond"),
    details: def.details ?? [],
    image: def.image ? { src: imgSrc(def.image.file), alt: def.image.alt } : null,
    values,
    note: def.note ?? null,
  };
}

/**
 * Спарклайнда неча ой кўрсатилади. `TexPanel` сўровни айнан шунча ойга
 * кенгайтиради — иккови бир жойдан ўқисин, акс ҳолда чизиқ жимгина
 * қисқариб қоларди.
 */
export const SPARK_MONTHS = 6;

/** Тасма ранглари — категорик токенлар. Ҳолат ранги (`--good`…) эмас. */
const BAND_TOKENS = ["var(--s1)", "var(--s2)", "var(--s3)"] as const;

const bandNo = (stages: TexStageVM[]): string =>
  String(stages[0]?.no ?? 1).padStart(2, "0");

/**
 * Схема тузилмаси (қотирилган, презентациядан) + `/chain` дан келган
 * жорий ой қийматлари.
 *
 * `month` — даврнинг охирги ойи. У жавобдаги ойлар орасида бўлмаса
 * босқичлар сонсиз қолади (тахминий ой олинмайди).
 */
export function buildTexScheme(
  res: ChainResponse,
  id: TexSchemeId,
  month: string,
): TexSchemeVM {
  const def = SCHEMES[id];
  const prev = prevMonthOf(month);
  const index = new Map<string, ChainStep>();
  for (const s of res.steps) index.set(s.id, s);
  // Ресурс занжир тугуни эмас, лекин ўлчов бўлиб бирикади (4 цех электр сарфи).
  for (const r of res.resources) index.set(r.id, r);

  // Спарклайн ойлари: жавобдаги ойлардан кўрсатилаётган ойгача бўлган
  // охирги олтитаси. Жавобда камроқ ой бўлса шунчаси олинади — етмаган ой
  // тўқилмайди. Кўрсатиладиган **қиймат** барибир фақат `month` дан.
  const sparkMonths = res.months.filter((m) => m <= month).slice(-SPARK_MONTHS);

  const mk = (s: TexStageDef, no: number) => stageVM(s, no, index, month, prev, sparkMonths);
  const values = (refs: TexMetricRef[] | undefined): TexValueVM[] => {
    const out: TexValueVM[] = [];
    for (const ref of refs ?? []) {
      const step = index.get(ref.id);
      // Жавобда `id` бўлмаса — плитка/сатр умуман чизилмайди.
      if (step) out.push(valueOf(step, ref, month, prev, sparkMonths));
    }
    return out;
  };

  const lanes: TexLaneVM[] = def.lanes.map((lane) => ({
    key: lane.key,
    title: lane.title ?? null,
    note: lane.note ?? null,
    stages: lane.stages.map((s, i) => mk(s, i + 1)),
  }));

  // Умумий қисм рақамлашни линиядан кейин давом эттиради — иккала линия
  // бир хил узунликда, шунинг учун ягона рақам чиқади.
  const laneLen = def.lanes[0]?.stages.length ?? 0;
  const tail: TexStageVM[] = (def.tail ?? []).map((s, i) => mk(s, laneLen + i + 1));

  const branches: TexLaneVM[] = (def.branches ?? []).map((lane) => ({
    key: lane.key,
    title: lane.title ?? null,
    note: lane.note ?? null,
    stages: lane.stages.map((s, i) => mk(s, i + 1)),
  }));

  const all = [...lanes, ...branches].flatMap((l) => l.stages).concat(tail);
  // Параллел линиялар бир хил кетма-кетликни такрорлайди — «схемадаги
  // босқич» сифатида улар бир марта саналади.
  const stageCount = def.lanes.length > 1 ? laneLen + tail.length : all.length;
  const measuredCount = all.filter((s) => s.values.length > 0).length;

  const bands = buildBands(def, lanes, tail);

  const kpis: TexKpiVM[] = [];
  for (const k of def.kpis) {
    if (k.kind === "stages") {
      kpis.push({
        key: "stages",
        label: k.label,
        icon: k.icon,
        text: String(stageCount),
        note: `${measuredCount} тасида ўлчов бор`,
        value: null,
      });
      continue;
    }
    if (k.kind === "fact") {
      kpis.push({
        key: `fact-${k.label}`,
        label: k.label,
        icon: k.icon,
        text: k.value,
        note: k.note ?? null,
        value: null,
      });
      continue;
    }
    const step = index.get(k.id);
    // Кўрсаткич жавобда йўқ бўлса плитка чизилмайди — бўш жой эгалловчи ҳам
    // қўйилмайди.
    if (!step) continue;
    kpis.push({
      key: k.id,
      label: k.label,
      icon: k.icon,
      text: null,
      note: null,
      value: valueOf(step, { id: k.id, label: k.label }, month, prev, sparkMonths),
    });
  }

  const energy = values(def.energy);
  const losses = values(def.losses);
  const products = values(def.products);

  // Пастдаги карточкаларда ва юқоридаги плиткаларда аллақачон чиққан
  // кўрсаткич «бошқа кўрсаткичлар» рўйхатида такрорланмайди.
  const shown = new Set<string>([
    ...kpis.map((k) => k.key),
    ...energy.map((v) => v.key),
    ...losses.map((v) => v.key),
    ...products.map((v) => v.key),
  ]);
  const extras = values(def.extras).filter((v) => !shown.has(v.key));

  return {
    id,
    label: def.label,
    title: def.title,
    desc: def.hint,
    icon: def.icon,
    plant: def.plant,
    bands,
    branches,
    kpis,
    params: def.params.map((p) => ({ key: `${p.label}-${p.value}`, ...p })),
    energy,
    losses,
    products,
    notes: def.notes ?? [],
    resources: def.resources ?? [],
    equipment: (def.equipment ?? []).map((e) => ({
      src: imgSrc(e.file),
      alt: e.alt,
      title: e.title,
      note: e.note,
    })),
    extrasTitle: def.extrasTitle,
    extras,
    stageCount,
    measuredCount,
    sparkMonths,
  };
}

/**
 * Босқичларни рангли тасмаларга бўлиш.
 *
 *  · Параллел линияли схемада (1-схема) тасма = линия, устига умумий қисм.
 *    Бу — манбадаги ҳақиқий тузилма.
 *  · Чизиқли схемада уч бўлиниш **жойлашув** бўйича: биринчи `headCount` та,
 *    охирги битта, қолгани ўртада. Босқич камайиб қолса бўш тасма
 *    чизилмайди.
 */
function buildBands(
  def: TexSchemeDef,
  lanes: TexLaneVM[],
  tail: TexStageVM[],
): TexBandVM[] {
  const out: TexBandVM[] = [];
  const push = (key: string, title: string, subtitle: string, stages: TexStageVM[]) => {
    if (stages.length === 0) return;
    out.push({
      key,
      no: bandNo(stages),
      title,
      subtitle,
      token: BAND_TOKENS[out.length % BAND_TOKENS.length],
      stages,
    });
  };

  if (lanes.length > 1) {
    for (const lane of lanes) {
      push(lane.key, lane.title ?? "Линия", lane.note ?? def.plant, lane.stages);
    }
    push(
      "tail",
      "Умумий қисм (флотация → қуритиш → концентрат)",
      "Иккала фабрика линияси шу ерда бирлашади",
      tail,
    );
    return out;
  }

  const stages = lanes[0]?.stages ?? [];
  const head = Math.min(def.headCount ?? 1, Math.max(stages.length - 1, 0));
  push("head", "Хомашё ва тайёргарлик", def.plant, stages.slice(0, head));
  push("mid", "Жараён", def.plant, stages.slice(head, Math.max(stages.length - 1, head)));
  push("result", "Тайёр маҳсулот", def.plant, stages.slice(Math.max(stages.length - 1, head)));
  return out;
}
