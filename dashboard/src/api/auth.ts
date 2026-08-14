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
 *
 * Хост қийматни `Bearer eyJ…` кўринишида сақлаши мумкин — префикс олиб
 * ташланади, чунки `Authorization` сарлавҳасини `api/client.ts` ўзи ясайди.
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

function readToken(): string | null {
  return (
    normalize(read(() => sessionStorage, KEY)) ??
    normalize(read(() => localStorage, KEY)) ??
    normalize(read(() => storageOf(window.parent), KEY)) ??
    normalize(read(() => storageOf(window.top), KEY))
  );
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
 * `401` дан кейин чақирилади: кэш ва сеанс нусхаси ташланади, шунда токен
 * хостдан қайтадан ўқилади. Хостнинг `localStorage` ига тегилмайди — у калит
 * бизники эмас ва уни ўчириш хост иловасини ҳам тизимдан чиқариб юборарди.
 */
export function invalidateToken(): void {
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
