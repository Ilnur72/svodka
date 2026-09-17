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

/**
 * Лойиҳа графиклари модули базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул
 * (`@Controller('project-schedule')`), `production-report` нинг ичида эмас.
 * Олтинчи муҳит ўзгарувчиси **киритилмайди**: база ўша усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/project-schedule`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/project-schedule`
 */
export const SCHEDULE_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/project-schedule";

/**
 * «Инв. лойиҳалар 2026-2030» тақдимоти модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул
 * (`@Controller('invest-deck')`), `production-report` нинг ичида эмас.
 * Еттинчи муҳит ўзгарувчиси **киритилмайди**: база ўша усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/invest-deck`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/invest-deck`
 */
export const INVEST_DECK_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/invest-deck";

/**
 * «Экспортнинг мақсадли кўрсаткичлари 2024-2030» модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул
 * (`@Controller('export-targets')`), `production-report` нинг ичида эмас.
 * Саккизинчи муҳит ўзгарувчиси **киритилмайди**: база ўша усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/export-targets`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/export-targets`
 */
export const EXPORT_TARGETS_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/export-targets";

/**
 * «PR Media KPI — yillik reja» модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул
 * (`@Controller('pr-media-kpi')`), `production-report` нинг ичида эмас.
 * Тўққизинчи муҳит ўзгарувчиси **киритилмайди**: база ўша усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/pr-media-kpi`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/pr-media-kpi`
 */
export const PR_MEDIA_KPI_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/pr-media-kpi";

/**
 * Камералар модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул (`@Controller('cameras')`),
 * `production-report` нинг ичида эмас. Ўнинчи муҳит ўзгарувчиси
 * **киритилмайди**: база ўша усул билан `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/cameras`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/cameras`
 */
export const CAMERA_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/cameras";

/**
 * Харита модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул (`@Controller('map')`),
 * `production-report` нинг ичида эмас. Ўн биринчи муҳит ўзгарувчиси
 * **киритилмайди**: база ўша усул билан `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/map`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/map`
 *
 * ⚠️ Бу endpoint ТОКЕН талаб қилади (`UniversalAuthGuard`, роллар
 * admin/editor/viewer) — очиқ эмас. Харита саҳифаси илгари токенсиз
 * ишларди, чунки манба бандл ичидаги реестр эди; энди у шу API'дан келади.
 */
export const MAP_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/map";

/**
 * «ТМК лойиҳалари реестри 2026-2030» модулининг базаси.
 *
 * Худди юқоридагилар каби — бэкендда алоҳида модул
 * (`@Controller('project-registry')`), `production-report` нинг ичида эмас.
 * Ўн иккинчи муҳит ўзгарувчиси **киритилмайди**: база ўша усул билан
 * `VITE_API_BASE` дан ҳосил қилинади.
 *
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/project-registry`
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/api/project-registry`
 *
 * Гвардлар `invest-deck` билан айнан бир хил (`UniversalAuthGuard` +
 * `UniversalRoleGuard`, роллар admin/editor/viewer) — янги аутентификация
 * ҳолати йўқ.
 */
export const PROJECT_REGISTRY_BASE = API_BASE.replace(/\/[^/]*$/, "") + "/project-registry";

/**
 * Камера скриншотлари турадиган СТАТИК манзил: стрим узилганда катакда
 * охирги сақланган кадр кўрсатилади (қаранг: `panels/camera/CameraTile.tsx`).
 *
 * Бу API эмас — nginx берадиган файл, шунинг учун база юқоридагилар каби
 * «охирги сегментни алмаштириш» билан эмас, АСЛ origin дан ясалади:
 *
 *   `https://tmk.bgs.uz/api/production-report` → `https://tmk.bgs.uz/upload`
 *   `http://localhost:8085/production-report`  → `http://localhost:8085/upload`
 *
 * `VITE_API_BASE` нисбий бўлса (`/api/production-report` — ngrok режими)
 * origin сифатида саҳифанинг ўзиники олинади ва расм топилмаслиги мумкин.
 * Бу ҳалокат эмас: скриншот ЗАХИРА қатлам, у ҳам бўлмаса катак «сигнал йўқ»
 * ҳолатини кўрсатади, стрим эса ўзи қайта уланишга уринаверади.
 */
export const UPLOAD_BASE = uploadOrigin() + "/upload";

function uploadOrigin(): string {
  try {
    return new URL(API_BASE, window.location.href).origin;
  } catch {
    return "";
  }
}

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
