import { useAuthToken } from "./api/auth";
import { Dashboard } from "./Dashboard";
import { InvestMapPage } from "./pages/InvestMapPage";
import { CameraWallPage } from "./pages/CameraWallPage";

/**
 * Иловада бир нечта мустақил экран бор ва улар йўл бўйича ажратилади:
 *
 *   · `/investmap` — хаританинг алоҳида саҳифаси. Дашборд қобиғи керак эмас,
 *     лекин **токен керак**: объектлар `GET /map/objects` дан келади, у эса
 *     ҳимояланган (`UniversalAuthGuard`). Шунинг учун саҳифа токен
 *     дарвозасининг ИЧИДА туради;
 *   · `/camera1` ва `/camera2` — камералар девори. Улар ҳам дашборд
 *     қобиғисиз очилади, лекин камералар рўйхати ҳимояланган endpoint'дан
 *     келади. Шунга қарамай экран токен дарвозасидан ОЛДИН турибди: токен
 *     бўлмаса ҳам девор ўз кўринишида чизилиб, сабабини ўзи ёзади
 *     (қаранг: `CameraWallPage`) — мониторда бегона экран пайдо бўлмайди;
 *   · қолган ҳамма йўл — дашбордниг ўзи, у токен талаб қилади.
 *
 * ⚠️ 2026-09-16 гача харита саҳифаси токенсиз ишларди ва шу сабабли
 * `useAuthToken()` дан ОЛДИН қайтарилар эди. Ўшанда манба бандл ичидаги
 * реестр эди (7 та қўлда ёзилган нуқта). Энди манба бэкенд, шунинг учун
 * эски жойлаштириш саҳифани бўш экран билан очиб қўярди.
 *
 * Router кутубхонаси қўшилмади: бир нечта экран учун `pathname` ни бир марта
 * ўқиш кифоя. Саҳифалар орасида навигация оддий ҳавола билан бўлади, яъни
 * саҳифа қайта юкланади — бу ерда бу нормал, чунки иккови мустақил экран ва
 * бир-бирининг ҳолатини сақлаб туриши керак эмас.
 *
 * ⚠️ Икки нарса жойлаштиришга боғлиқ:
 *
 *   1. **SPA fallback.** `/investmap`, `/camera1` ва `/camera2` сўровлари
 *      `index.html` га қайтарилиши керак (nginx: `try_files $uri $uri/
 *      /index.html`). Vite'нинг dev ва preview серверлари буни ўзи қилади,
 *      текширилган.
 *   2. **Охирида `/` бўлмаслиги керак** — `/camera1`, `/camera1/` эмас.
 *      `vite.config.ts` да `base: "./"` (нисбий йўл), шунинг учун `/investmap`
 *      да браузер ресурсларни `/assets/…` деб тўғри ҳал қилади, `/investmap/`
 *      да эса `/investmap/assets/…` деб излаб топмайди. Керак бўлса сервер
 *      охирги `/` ни олиб ташлайдиган redirect қўйсин.
 */
const MAP_PATH = "/investmap";

/**
 * Камералар деворларининг йўллари.
 *
 * Иккови ҳам БИТТА компонент: фарқ `part` да — у ТМК устуни экраннинг қайси
 * четида туришини ва қайси олтита камера кўрсатилишини белгилайди.
 */
const WALL_PATHS: ReadonlyArray<readonly [string, 1 | 2]> = [
  ["/camera1", 1],
  ["/camera2", 2],
];

/**
 * Йўлнинг охири берилган сегментга тўғри келадими.
 *
 * `endsWith` — илова сайтнинг ичида (масалан `/svodka/camera1`) турганда ҳам
 * ишлаши учун; охиридаги `/` фарқ қилмайди.
 */
function pathIs(segment: string): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname.replace(/\/+$/, "");
  return p === segment || p.endsWith(segment);
}

/**
 * Кириш нуқтаси. Логин экрани йўқ: дашборд хост иловасининг `iframe` ичида
 * очилади ва токенни ўша хостдан олади (қаранг: `api/auth.ts`). Токен
 * топилмаса — фойдаланувчидан ҳеч нарса сўралмайди, чунки бу унинг эмас,
 * жойлаштиришнинг муаммоси; шунчаки сабаби кўрсатилади.
 */
export default function App() {
  // Девор токенсиз ҳам ўз кўринишида чизилади — шунинг учун у `useAuthToken()`
  // дан олдин, hook эса қуйидаги компонент ичида қолади. Харита эса энди
  // дарвозанинг ичида: унинг маълумоти ҳимояланган endpoint'дан келади.
  for (const [segment, part] of WALL_PATHS) {
    if (pathIs(segment)) return <CameraWallPage part={part} />;
  }

  return <Gated />;
}

function Gated() {
  const token = useAuthToken();
  if (!token) return <NoToken />;
  return pathIs(MAP_PATH) ? <InvestMapPage /> : <Dashboard />;
}

function NoToken() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-5 py-10">
      <div
        role="alert"
        className="rounded-card border border-hair bg-surface px-5 py-6 shadow-card"
        style={{ borderLeft: "3px solid var(--crit)" }}
      >
        <p className="text-[13.5px] [font-weight:650] text-ink">Кириш токени топилмади</p>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-2">
          Дашборд токенни хост иловадан олади. Уни очиш учун хост тизимига киринг ва
          бўлимни ўша ердан очинг.
        </p>
      </div>
    </main>
  );
}
