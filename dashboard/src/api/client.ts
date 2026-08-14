import { clearToken, getToken } from "./auth";

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

/** 401 — токен йўқ ёки муддати ўтган. Токен ўчирилади, логин экрани очилади. */
export class UnauthorizedError extends ApiError {
  constructor() {
    super("Сеанс муддати тугади. Қайта киринг.", 401);
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

function buildUrl(path: string, params: QueryParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const q = qs.toString();
  return API_BASE + path + (q ? "?" + q : "");
}

export async function apiGet<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<T> {
  const token = getToken();
  if (!token) throw new UnauthorizedError();

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new NetworkError();
  }

  if (res.status === 401) {
    clearToken();
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
