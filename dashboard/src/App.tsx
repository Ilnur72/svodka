import { useAuthToken } from "./api/auth";
import { LoginPage } from "./panels/LoginPage";
import { Dashboard } from "./Dashboard";

/**
 * Кириш нуқтаси: токен бор-йўқлигига қараб логин экрани ёки дашбоард.
 *
 * Токен `sessionStorage` да ва `useSyncExternalStore` орқали кузатилади —
 * шунинг учун API қаватида `401` келиб токен ўчирилса, интерфейс шу заҳоти
 * логин экранига қайтади, алоҳида роутер ёки редирект керак эмас.
 */
export default function App() {
  const token = useAuthToken();
  return token ? <Dashboard /> : <LoginPage />;
}
