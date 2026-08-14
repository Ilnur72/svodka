import { useId, useRef, useState, type FormEvent } from "react";
import { LoginError, login } from "../api/auth";

/**
 * Логин экрани.
 *
 * Валидация қоидаси битта жойда (`validate`) туради, ҳар бир майдонга
 * тарқалмайди. Хато майдон ёнида кўринади ва фақат майдондан чиққанда ёки
 * юборишда чиқади — фойдаланувчи ёзаётганда эмас.
 */
interface Fields {
  email: string;
  password: string;
}

type FieldErrors = Partial<Record<keyof Fields, string>>;

function validate(v: Fields): FieldErrors {
  const e: FieldErrors = {};
  const email = v.email.trim();
  if (!email) e.email = "Email киритилмаган.";
  else if (!email.includes("@")) e.email = "Email @ белгисини ўз ичига олиши керак.";
  else if (/\s/.test(email)) e.email = "Email да бўш жой бўлмаслиги керак.";
  if (!v.password) e.password = "Парол киритилмаган.";
  return e;
}

export function LoginPage() {
  const uid = useId();
  const [fields, setFields] = useState<Fields>({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Тугмани икки марта босишдан ҳимоя: React ҳолати янгилангунича ҳам
  // иккинчи сўров кетмаслиги керак.
  const inFlight = useRef(false);

  const errors = validate(fields);
  const showError = (k: keyof Fields) => (submitted || touched[k] ? errors[k] : undefined);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0 || inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    try {
      await login(fields.email.trim(), fields.password);
      // Муваффақиятда токен sessionStorage'га ёзилади ва App ўзи
      // дашбоардга ўтади — бу ерда навигация керак эмас.
    } catch (e) {
      setServerError(
        e instanceof LoginError ? e.message : "Кутилмаган хато. Қайтадан уриниб кўринг.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-[5px] border border-rule bg-surface px-[11px] py-[9px] text-[14px] text-ink";

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-5 py-10">
      <div className="mb-5 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="grid h-10 w-10 flex-none place-items-center rounded-[5px] bg-s1 font-mono text-[12px] font-bold tracking-[0.04em] text-white"
        >
          КТМ
        </div>
        <div>
          <h1 className="text-[15px] leading-[1.25] [font-weight:650]">
            Ўзбекистон қийин эрувчан ва иссиққа чидамли металлар комбинати
          </h1>
          <p className="mt-px text-[11.5px] font-medium tracking-[0.06em] text-ink-3 uppercase">
            Ситуацион марказ
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="rounded-card border border-hair bg-surface px-5 pt-5 pb-6 shadow-card"
      >
        <h2 className="text-[14px] [font-weight:650]">Тизимга кириш</h2>
        <p className="mt-1 mb-4 text-[12px] leading-[1.45] text-ink-3">
          Маълумотларни кўриш учун корхона ҳисоб маълумотларингизни киритинг.
        </p>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-[6px] border border-[color-mix(in_srgb,var(--crit)_30%,transparent)] bg-[color-mix(in_srgb,var(--crit)_10%,transparent)] px-3 py-2.5 text-[12.5px] leading-[1.45] text-crit-ink"
          >
            {serverError}
          </div>
        )}

        <div className="mb-3.5">
          <label htmlFor={`${uid}-email`} className="mb-1.5 block text-[12.5px] font-medium">
            Email
          </label>
          <input
            id={`${uid}-email`}
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            className={field}
            value={fields.email}
            aria-invalid={showError("email") ? true : undefined}
            aria-describedby={showError("email") ? `${uid}-email-err` : undefined}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
          {showError("email") && (
            <p id={`${uid}-email-err`} className="mt-1 text-[12px] text-crit-ink">
              {showError("email")}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor={`${uid}-pass`} className="mb-1.5 block text-[12.5px] font-medium">
            Парол
          </label>
          <input
            id={`${uid}-pass`}
            type="password"
            name="password"
            autoComplete="current-password"
            className={field}
            value={fields.password}
            aria-invalid={showError("password") ? true : undefined}
            aria-describedby={showError("password") ? `${uid}-pass-err` : undefined}
            onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          />
          {showError("password") && (
            <p id={`${uid}-pass-err`} className="mt-1 text-[12px] text-crit-ink">
              {showError("password")}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className={
            "w-full rounded-[5px] bg-s1 px-4 py-[10px] text-[13.5px] font-semibold text-white " +
            (busy ? "cursor-not-allowed opacity-70" : "cursor-pointer")
          }
        >
          {busy ? "Кирилмоқда…" : "Кириш"}
        </button>

        <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-3">
          Сеанс токени фақат браузернинг жорий ишчи сеансида сақланади ва ойна ёпилганда
          ўчади.
        </p>
      </form>
    </main>
  );
}
