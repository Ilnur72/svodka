import { useSyncExternalStore } from "react";

/**
 * Дашборд ўз логин экранига эга эмас: у хост илованинг саҳифасида `iframe`
 * ичида очилади ва токенни ўша хостдан олади.
 *
 * Манбалар кетма-кетлиги (биринчи топилгани ишлатилади):
 *
 *   1. `?token=…` ёки `#token=…` — хост iframe манзилига қўшган бўлса.
 *      Ўқилгач манзилдан дарҳол тозаланади ва `sessionStorage` га кўчирилади,
 *      токен браузер тарихида ва «ссылкани нусхалаш» да қолиб кетмаслиги учун.
 *   2. `localStorage["tmk-token-bgs"]` — дашборд хост билан **бир origin** да
 *      бўлса, хост ёзган калит тўғридан-тўғри ўқилади.
 *   3. Ота-ойна (`window.parent`, `window.top`) нинг `localStorage` и — фақат
 *      same-origin'да ўқилади; cross-origin'да браузер тўсади, хато ютилади
 *      ва навбат кейинги манбага ўтади.
 *   4. `.env` (`VITE_API_TOKEN`) — **фақат `npm run dev` да** ва фақат
 *      юқоридаги учаласи ҳам топилмаса. Prod build'да бу манба умуман йўқ,
 *      қаранг: `devToken()`.
 *
 * Ҳеч бир манбада токен бўлмаса `getToken()` `null` қайтаради ва илова
 * дашборд ўрнига «кириш ҳуқуқи йўқ» экранини чизади (`App.tsx`). Бу ҳолатда
 * биронта API сўрови ҳам юборилмайди: `apiGet` токенсиз `fetch` га умуман
 * етиб бормайди.
 *
 * Хост қийматни `Bearer eyJ…` кўринишида сақлаши мумкин — префикс олиб
 * ташланади, чунки `Authorization` сарлавҳасини `api/client.ts` ўзи ясайди.
 *
 * ⚠️ 2026-09-03 да бу занжир бир марта «фақат .env» деб соддалаштирилган
 * эди — natijada ҳақиқий хост (iframe) орқали очилган дашборд ишламай
 * қолди, чунки ЯГОНА ишлайдиган йўл айнан шу занжир эди. 2026-09-04 да
 * тикланди. `.env` фақат ЗАХИРА, биринчи манба эмас — қаранг: `devToken()`.
 */
const KEY = "tmk-token-bgs";

const listeners = new Set<() => void>();

/**
 * Ўқилган токен кэшланади: `useSyncExternalStore` `getSnapshot` ни тез-тез
 * чақиради, у эса ҳар сафар бир хил стринг қайтариши шарт — акс ҳолда React
 * чексиз қайта рендер қилади.
 */
let cached: string | null | undefined;

function emit(): void {
  cached = undefined;
  listeners.forEach((l) => l());
}

/** Бегона калитлар (хостнинг бошқа ҳолати) бекорга қайта рендер қилмасин. */
function onStorage(e: StorageEvent): void {
  if (e.key === null || e.key === KEY) emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Хост (бир origin'даги ота-ойна ёки бошқа таб) токенни янгиласа, `storage`
  // ҳодисаси шу ойнага ҳам келади — кэшни бекор қилиб қайта ўқиймиз.
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** `Bearer …` префикси ва ортиқча бўшлиқлар олиб ташланади. */
function normalize(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().replace(/^Bearer\s+/i, "").trim();
  return t.length > 0 ? t : null;
}

/**
 * Хранилище thunk орқали олинади: cross-origin ота-ойнада ва cookie ўчирилган
 * браузерда `localStorage` нинг **ўзига мурожаат** `SecurityError` беради,
 * шунинг учун ўқиш ҳам, олиш ҳам битта `try` ичида туриши керак.
 */
function read(store: () => Storage | undefined, key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Манзилдаги токенни `sessionStorage` га кўчиради ва манзилдан тозалайди.
 * Модул юкланганда **бир марта** ишлайди: буни рендер вақтида қилиб бўлмайди,
 * чунки `history.replaceState` — ён таъсир.
 *
 * Query ва hash иккови ҳам қаралади: хост қайси бирини ишлатишини билмаймиз,
 * дашборд эса hash'ни бўлимлар учун ишлатади (`#prod`) — шунинг учун
 * `#prod&token=…` шакли ҳам тўғри ажратилади ва `#prod` жойида қолади.
 */
function bootstrapFromUrl(): void {
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return;
  }

  const fromQuery = url.searchParams.get("token");
  if (fromQuery) url.searchParams.delete("token");

  let fromHash: string | null = null;
  const hash = url.hash.replace(/^#/, "");
  if (hash.includes("token=")) {
    const params = new URLSearchParams(hash);
    fromHash = params.get("token");
    if (fromHash) {
      params.delete("token");
      // Бўлим номи (`#prod`) қиймати йўқ калит бўлиб қолади — `=` тозаланади.
      const rest = params.toString().replace(/=(?=&|$)/g, "");
      url.hash = rest ? `#${rest}` : "";
    }
  }

  const token = normalize(fromQuery ?? fromHash);
  if (!token) return;

  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* приват режимда ёзиб бўлмаса ҳам қуйидаги манбалар қолади */
  }
  try {
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* манзилни ўзгартириб бўлмаса, токен фақат манзил сатрида кўринади */
  }
}

bootstrapFromUrl();

/**
 * Манбалар — юқоридаги кетма-кетликда. Ҳар бири thunk: рўйхат бир марта
 * тузилади, лекин ўқиш фақат навбат келганда бўлади, яъни биринчи манбада
 * токен бор бўлса cross-origin `window.parent` га умуман тегилмайди.
 */
const SOURCES: ReadonlyArray<() => string | null> = [
  () => read(() => sessionStorage, KEY),
  () => read(() => localStorage, KEY),
  () => read(() => storageOf(window.parent), KEY),
  () => read(() => storageOf(window.top), KEY),
  devToken,
];

/**
 * `401` олган токенлар — қаранг: `invalidateToken()`.
 *
 * Фақат жорий саҳифа умри давомида сақланади ва ҳеч қаерга ёзилмайди:
 * саҳифа қайта юкланса рўйхат тозаланади, яъни хост токенни янгилаган
 * бўлса дашборд ўзи тикланади.
 */
const rejected = new Set<string>();

function readToken(): string | null {
  for (const source of SOURCES) {
    const t = normalize(source());
    if (t !== null && !rejected.has(t)) return t;
  }
  return null;
}

/**
 * Захира: `.env` (ёки `.env.local`, у устун) даги `VITE_API_TOKEN` —
 * **фақат `npm run dev` да**.
 *
 * Энг охирида турибди: хостдан ёки манзил сатридан келган ҳақиқий токен
 * ҳар доим ундан устун, шунинг учун бу қиймат хост орқали очилганда ҳеч
 * нарсани ўзгартирмайди.
 *
 * ⚠️ `import.meta.env.DEV` қоровули МАЖБУРИЙ ва олиб ташланмайди. Усиз
 * қиймат `npm run build` натижасига ҳам тушар эди — деплой қилинган `dist/`
 * ни очган ҳар ким токенни devtools орқали ўқиб, дашбордни кўра оларди.
 * Яъни қоровулсиз бу ерда «захира» эмас, ҳамма учун очиқ калит турар эди.
 *
 * Vite `import.meta.env.DEV` ни build вақтида `false` матни билан
 * АЛМАШТИРАДИ, шунинг учун қуйидаги эрта `return` дан кейинги қатор prod
 * bundle'да ўлик кодга айланади ва минификатор уни токен сатри билан бирга
 * бутунлай олиб ташлайди. Текшириш: `grep -r "eyJ" dist/` → 0 та.
 *
 * ⚠️ `import.meta.env` га ЯЛПИ мурожаат қилинмайди (`const e = import.meta.env`
 * ёки `import.meta.env["VITE_API_TOKEN"]` каби) — ундай ёзилса Vite бутун env
 * объектини, яъни токенни ҳам, bundle ичига сериялаб қўяди ва қоровул
 * фойдасиз бўлиб қолади.
 */
function devToken(): string | null {
  if (!import.meta.env.DEV) return null;
  return normalize(import.meta.env.VITE_API_TOKEN);
}

/** Ўзи (iframe'да эмас) бўлса такрор ўқилмайди. */
function storageOf(w: Window | null): Storage | undefined {
  return !w || w === window ? undefined : w.localStorage;
}

/** Жорий токен (топилмаса `null`). */
export function getToken(): string | null {
  if (cached === undefined) cached = readToken();
  return cached;
}

/**
 * `401` дан кейин чақирилади: муддати тугаган токен ишлатилмайдиган деб
 * белгиланади, сеанс нусхаси ва кэш ташланади — шунда токен манбалардан
 * қайтадан ўқилади.
 *
 * Хостнинг `localStorage` ига ТЕГИЛМАЙДИ: у калит бизники эмас ва уни
 * ўчириш хост иловасини ҳам тизимдан чиқариб юборарди. Шунинг учун эски
 * қиймат ўша ерда қолади — уни иккинчи марта ўқиб олмаслик учун `rejected`
 * рўйхати керак. Усиз, токен айнан ўша калитдан келган ҳолатда, `getToken()`
 * ўша эскирган қийматни қайтаравериб турар ва фойдаланувчи «кириш ҳуқуқи
 * йўқ» экрани ўрнига бўлимлардаги хато ҳолатларини кўрар эди.
 */
export function invalidateToken(): void {
  const spent = getToken();
  if (spent !== null) rejected.add(spent);
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* игнор */
  }
  emit();
}

/** Токен ўзгарса интерфейс ўзи янгиланади — алоҳида редирект керак эмас. */
export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, () => null);
}
