import { useSyncExternalStore } from "react";
import type { LoginResponse } from "./types";

/**
 * Токен ишчи сеанс давомида `sessionStorage` да сақланади: build ичига
 * ёзилмайди, ойна ёпилганда ўчади ва бошқа таб'га кўчмайди.
 *
 * `useSyncExternalStore` ишлатилган, чунки токен React'дан ташқарида —
 * `api/client.ts` 401 жавобда уни ўзи ўчиради, интерфейс эса шу заҳоти
 * логин экранига қайтиши керак.
 */
const KEY = "uzktmk.token";

const AUTH_BASE = String(import.meta.env.VITE_AUTH_BASE ?? "").replace(/\/+$/, "");

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Бошқа таб/ойна токенни ўзгартирса ҳам синхрон қоламиз.
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    // Приват режимда sessionStorage ёпиқ бўлиши мумкин.
    return null;
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* сақлаб бўлмаса ҳам жорий сеанс ишлайверади */
  }
  emit();
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* игнор */
  }
  emit();
}

/** Жорий токен (йўқ бўлса `null`) — логин экрани шу асосда кўрсатилади. */
export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, () => null);
}

export class LoginError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "LoginError";
    this.status = status;
  }
}

/**
 * `POST {AUTH_BASE}/auth/login` → `{ success, data: { token } }`.
 * Муваффақиятли бўлса токен sessionStorage'га ёзилади.
 */
export async function login(email: string, password: string, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new LoginError("Сервер билан боғланиб бўлмади. Тармоқни текширинг.", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* JSON эмас — қуйида статус бўйича хабар берилади */
  }

  if (!res.ok) {
    const serverMsg = messageOf(body);
    // 401 да сервер инглизча умумий матн («Invalid credentials») қайтаради —
    // фойдаланувчига ўз тилидаги аниқ хабар кўрсатилади.
    if (res.status === 401) {
      throw new LoginError("Email ёки парол нотўғри. Қайтадан уриниб кўринг.", res.status);
    }
    // 400 да сервер майдонга оид аниқ хабар бериши мумкин — уни сақлаймиз.
    if (res.status === 400) {
      throw new LoginError(serverMsg ?? "Киритилган маълумот нотўғри.", res.status);
    }
    if (res.status === 403) {
      throw new LoginError(serverMsg ?? "Ушбу ҳисоб учун рухсат йўқ.", res.status);
    }
    throw new LoginError(serverMsg ?? `Сервер хатоси (${res.status}).`, res.status);
  }

  const token = (body as LoginResponse | null)?.data?.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new LoginError("Сервер жавобида токен топилмади.", res.status);
  }
  setToken(token);
}

/** Серверда `{ message: "..." }` ёки `{ message: ["..."] }` бўлиши мумкин. */
function messageOf(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const m = (body as { message?: unknown }).message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m) && typeof m[0] === "string") return m[0];
  return null;
}
