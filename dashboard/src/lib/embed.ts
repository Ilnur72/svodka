/**
 * Дашборд иккита ҳолатда очилади ва улар бир хил қобиқни талаб қилмайди:
 *
 *   · **алоҳида саҳифа** — фойдаланувчи дашборднинг ўзини очади ва бўлимлар
 *     орасида юқоридаги таб қатори билан юради;
 *   · **хост иловасининг `iframe` и ичида** — у ерда бўлимни ХОСТ танлайди
 *     (`src="…/#registry"`, қаранг `lib/useHashTab.ts`). Дашборднинг ўз таб
 *     қатори бу ҳолда хостнинг менюси билан иккиланади ва экраннинг устидан
 *     иккинчи қаторни бекорга олади.
 *
 * Шунинг учун `iframe` ичида фақат ТАБ ҚАТОРИ чизилмайди. Сарлавҳа ва ундаги
 * «ДАВР» танлагичи ҚОЛАДИ: даврни фойдаланувчи iframe ичида ҳам ўзгартира
 * олиши керак, хост уни бошқармайди.
 *
 * Аниқлаш икки босқичли:
 *
 *   1. **Автоматик** — `window.self !== window.top`. Хост томонда ҳеч нарса
 *      қўшилмаса ҳам ишлайди, шунинг учун бу асосий йўл. Cross-origin'да ҳам
 *      хавфсиз: ойналарнинг ХОССАСИ эмас, ҳаволаси солиштирилади — браузер
 *      буни тўсмайди, `try/catch` керак эмас.
 *   2. **Қўлда бекор қилиш** — `chrome=none` (мажбуран яшир) ёки `chrome=full`
 *      (мажбуран кўрсат). Хост дашбордни iframe'сиз, лекин ўз менюси билан
 *      қўйса (`chrome=none`), ёки аксинча iframe ичида тўлиқ дашборд керак
 *      бўлса (`chrome=full`) шу керак бўлади. Номаълум қиймат (`chrome=xyz`)
 *      хато эмас — у эътиборсиз қолдирилади ва қобиқ автоматик аниқлашга
 *      тушади.
 *
 * Қиймат query'дан ҳам, хэшдан ҳам ўқилади (`?chrome=none` ва
 * `#prod&chrome=none`): хост қайси бирини ишлатишини билмаймиз — худди
 * токендаги каби (`api/auth.ts:bootstrapFromUrl()`).
 *
 * ⚠️ Ўқилгач қиймат манзилдан ДАРҲОЛ тозаланади ва `sessionStorage` га
 * кўчирилади. Иккала қадам ҳам мажбурий:
 *
 *   · тозалаш — хэшдаги `chrome=none` жойида қолса, `useHashTab` учун таб
 *     номи `prod` эмас, `prod&chrome=none` бўлиб кўринар ва у номаълум хэш
 *     сифатида `#obzor` га тушириб юборилар эди, яъни хостнинг танлаган
 *     бўлими йўқоларди;
 *   · сақлаш — тозалангандан кейин манзилда қиймат қолмайди, iframe ичида
 *     саҳифа қайта юкланса (`F5`) эса қобиқ жимгина алмашиб қолар эди.
 *     `sessionStorage` таб умрига боғлиқ: таб ёпилса қиймат ҳам кетади.
 *
 * `api/auth.ts` билан бир вақтда ишлайди ва тартиб аҳамиятсиз: иккови ҳам
 * манзилни ЎЗ навбати келганда `window.location.href` дан янгидан ўқийди ва
 * `replaceState` ни ўша заҳоти ёзади, шунинг учун `#prod&token=…&chrome=none`
 * шаклидан иккови ҳам ўзиникини олиб, `#prod` ни жойида қолдиради.
 */
const KEY = "tmk-chrome-bgs";

type Mode = "none" | "full";

const isMode = (v: string | null): v is Mode => v === "none" || v === "full";

/** Манзилдан ёки сеансдан олинган мажбурий режим (бўлмаса `null`). */
let override: Mode | null = null;

/**
 * Хэшдан `chrome=…` сегментини ажратиб олади ва ҚОЛГАНИНИ ўзгартирмай қайта
 * йиғади.
 *
 * ⚠️ Бу ерда `URLSearchParams` нинг `toString()` и АТАЙИН ишлатилмайди
 * (`api/auth.ts` даги токен тозалашидан фарқи шу): у қолган сегментларни қайта
 * кодлайди ва `#geology/12` каби иккинчи сегментли хэш `#geology%2F12` бўлиб
 * қолар, `useHashTab` эса уни номаълум таб деб `#obzor` га туширар эди.
 */
function splitChromeFromHash(hash: string): { value: string | null; rest: string } {
  let value: string | null = null;
  const keep: string[] = [];
  for (const part of hash.split("&")) {
    if (part.startsWith("chrome=")) value = part.slice("chrome=".length);
    else keep.push(part);
  }
  return { value, rest: keep.join("&") };
}

/**
 * Модул юкланганда **бир марта** ишлайди: `history.replaceState` — ён таъсир,
 * уни рендер вақтида қилиб бўлмайди.
 */
function bootstrapFromUrl(): void {
  if (typeof window === "undefined") return;

  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return;
  }

  let dirty = false;

  const fromQuery = url.searchParams.get("chrome");
  if (fromQuery !== null) {
    url.searchParams.delete("chrome");
    dirty = true;
  }

  let fromHash: string | null = null;
  const hash = url.hash.replace(/^#/, "");
  if (hash.includes("chrome=")) {
    const { value, rest } = splitChromeFromHash(hash);
    fromHash = value;
    url.hash = rest ? `#${rest}` : "";
    dirty = true;
  }

  // Қиймат фақат `none`/`full` бўлиши мумкин, шунинг учун уни декодлаш шарт
  // эмас; регистр ва ортиқча бўшлиқ эса кечирилади.
  const raw = (fromQuery ?? fromHash)?.trim().toLowerCase() ?? null;
  if (isMode(raw)) {
    override = raw;
    try {
      sessionStorage.setItem(KEY, raw);
    } catch {
      /* приват режимда ёзиб бўлмаса ҳам жорий саҳифа учун `override` етарли */
    }
  }

  // Номаълум қиймат ҳам манзилдан олиб ташланади — у хэшда қолса таб номини
  // бузарди.
  if (!dirty) return;
  try {
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* манзилни ўзгартириб бўлмаса, қиймат фақат манзил сатрида кўриниб қолади */
  }
}

bootstrapFromUrl();

if (override === null) {
  try {
    const stored = typeof window === "undefined" ? null : sessionStorage.getItem(KEY);
    if (isMode(stored)) override = stored;
  } catch {
    /* сеанс хранилищеси ёпиқ бўлса автоматик аниқлаш қолади */
  }
}

/**
 * Дашборд бошқа ойнанинг ичида турибдими.
 *
 * `window.top` cross-origin'да ҳам ўқилади (у `WindowProxy` қайтаради), фақат
 * унинг хоссаларига тегиб бўлмайди — бу ерда эса ҳавола солиштирилади, холос.
 * Ажратилган (detached) фреймда `window.top` `null` бўлиши мумкин: у ҳам
 * «ичида» деб ҳисобланади, чунки бу ҳолда ҳам мустақил саҳифа эмас.
 */
function inIframe(): boolean {
  if (typeof window === "undefined") return false;
  return window.self !== window.top;
}

/**
 * Бўлимлар таб қатори чизиладими.
 *
 * Фақат кўринишга тегади: таб ҲОЛАТИ (хэшдан ўқиш, `hashchange` билан
 * алмашиш) барибир ишлайверади, шунинг учун таблар яширилганда ҳам хост
 * `#registry` га ўтказа олади.
 */
export function tabsVisible(): boolean {
  if (override === "none") return false;
  if (override === "full") return true;
  return !inIframe();
}
