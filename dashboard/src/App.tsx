import { useAuthToken } from "./api/auth";
import { Dashboard } from "./Dashboard";

/**
 * Кириш нуқтаси. Логин экрани йўқ: токен `.env` (`VITE_API_TOKEN`) орқали
 * build вақтида ўрнатилади (қаранг: `api/auth.ts`). Токен топилмаса —
 * фойдаланувчидан ҳеч нарса сўралмайди, чунки бу деплой созламасининг
 * муаммоси; шунчаки сабаби кўрсатилади.
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
          <code className="text-[11.5px]">VITE_API_TOKEN</code> `.env` файлида
          созланмаган. Қийматни қўшиб, лойиҳани қайта build қилинг.
        </p>
      </div>
    </main>
  );
}
