import { getToken, invalidateToken } from "./auth";

/**
 * Битта fetch обёртка: токен қўшади, хатоларни маънога эга турларга ажратади
 * ва `AbortSignal` ни узатади.
 *
 * Энг муҳим қарор — **404 хато эмас**. Продакшн серверда 12 endpoint'дан
 * фақат 3 таси мавжуд, қолгани `404` беради. Бу «маълумот келмади» эмас,
 * «бу бўлим серверда ҳали йўқ» дегани, шунинг учун алоҳида тур билан
 * ажратилади ва интерфейсда алоҳида (хато эмас) ҳолат сифатида чизилади.
 */
const API_BASE = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

/**
 * Газ интеграцияси базаси.
 *
 * Бэкендда газ — алоҳида модул (`@Controller('gas-integration')`), яъни
 * `production-report` нинг **ичида эмас, ёнида** туради. Шунинг учун унга
 * иккинчи база керак, лекин **иккинчи муҳит ўзгарувчиси киритилмайди**:
 * база `VITE_API_BASE` дан охирги сегментни олиб ташлаб ҳосил қилинади.
 * Шунда иккала муҳит ҳам ўз-ўзидан тўғри қолади:
 *
 *   `http://localhost:8085/production-report`      → `http://localhost:8085/gas-integration`
 *   `https://tmk.bgs.uz/api/production-report`     → `https://tmk.bgs.uz/api/gas-integration`
 *
 * (продакшндаги `/api` префиксини nginx қўшади — бэкендда глобал префикс йўқ.)
 */
export const GAS_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/gas-integration";

/**
 * Қуёш станциялари интеграцияси базаси.
 *
 * Худди газ каби — бэкендда алоҳида модул (`@Controller('fusion-solar')`),
 * `production-report` нинг ичида эмас. Учинчи муҳит ўзгарувчиси **киритилмайди**:
 * база айнан юқоридаги усул билан `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/fusion-solar`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/fusion-solar`
 */
export const SOLAR_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/fusion-solar";

/**
 * Молиявий ҳисобот модули базаси.
 *
 * Худди газ ва қуёш каби — бэкендда алоҳида модул (`@Controller('finance-report')`),
 * `production-report` нинг ичида эмас. Тўртинчи муҳит ўзгарувчиси **киритилмайди**:
 * база юқоридаги усул билан `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/finance-report`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/finance-report`
 */
export const FINANCE_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/finance-report";

/**
 * Геология лойиҳалари модули базаси.
 *
 * Худди газ, қуёш ва молия каби — бэкендда алоҳида модул
 * (`@Controller('geology-projects')`), `production-report` нинг ичида эмас.
 * Бешинчи муҳит ўзгарувчиси **киритилмайди**: база юқоридаги усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/geology-projects`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/geology-projects`
 */
export const GEOLOGY_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/geology-projects";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 404 — endpoint серверда мавжуд эмас. */
export class NotAvailableError extends ApiError {
  constructor(path: string) {
    super(`Бўлим серверда мавжуд эмас: ${path}`, 404);
    this.name = "NotAvailableError";
  }
}

/** 401 — токен йўқ ёки муддати ўтган. Янгиси хостдан қайта ўқилади. */
export class UnauthorizedError extends ApiError {
  constructor() {
    super("Сеанс муддати тугади. Хост тизимига қайта киринг.", 401);
    this.name = "UnauthorizedError";
  }
}

/** Тармоқ узилиши / CORS / сервер жавоб бермади. */
export class NetworkError extends ApiError {
  constructor() {
    super("Сервер билан боғланиб бўлмади. Тармоқни текширинг.", 0);
    this.name = "NetworkError";
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function buildUrl(base: string, path: string, params: QueryParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const q = qs.toString();
  return base + path + (q ? "?" + q : "");
}

/**
 * `base` — сўров қайси модулга кетишини белгилайди ва одатда берилмайди.
 * Иккинчи база фақат газ интеграцияси учун (`GAS_BASE`): у бэкендда алоҳида
 * модул. Токен қўшиш, 401/403/404 ни ажратиш ва `AbortSignal` иккала база
 * учун ҳам шу ягона жойда қолади — параллел fetch реализацияси йўқ.
 */
export async function apiGet<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
  base: string = API_BASE,
): Promise<T> {
  const token = getToken();
  if (!token) throw new UnauthorizedError();

  let res: Response;
  try {
    res = await fetch(buildUrl(base, path, params), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new NetworkError();
  }

  if (res.status === 401) {
    invalidateToken();
    throw new UnauthorizedError();
  }
  if (res.status === 404) throw new NotAvailableError(path);
  if (res.status === 403) throw new ApiError("Ушбу бўлимга рухсат йўқ (403).", 403);
  if (!res.ok) throw new ApiError(`Сервер хатоси (${res.status}).`, res.status);

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("Сервер жавобини ўқиб бўлмади.", res.status);
  }
}
