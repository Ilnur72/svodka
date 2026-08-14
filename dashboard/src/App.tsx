import { useAuthToken } from "./api/auth";
import { Dashboard } from "./Dashboard";

/**
 * Кириш нуқтаси. Логин экрани йўқ: дашборд хост иловасининг `iframe` ичида
 * очилади ва токенни ўша хостдан олади (қаранг: `api/auth.ts`). Токен
 * топилмаса — фойдаланувчидан ҳеч нарса сўралмайди, чунки бу унинг эмас,
 * жойлаштиришнинг муаммоси; шунчаки сабаби кўрсатилади.
 */
export default function App() {
  const token = useAuthToken();
  return token ? <Dashboard /> : <NoToken />;
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
