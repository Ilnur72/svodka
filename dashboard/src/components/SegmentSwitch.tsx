import { useId, useRef, type KeyboardEvent } from "react";

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  /** Танлов остидаги қисқа изоҳ — нима учун бу кўриниш кераклиги. */
  hint?: string;
}

export interface SegmentSwitchProps<T extends string> {
  /** Кўринмас, лекин экран ўқувчи учун мажбурий ном. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

/**
 * Битта бўлим ичидаги кўриниш алмаштиргичи.
 *
 * Таблар (`role="tablist"`) билан аралашмаслиги учун ARIA роли —
 * `radiogroup`: бу бўлимни алмаштирмайди, **бир хил бўлимнинг** иккита
 * кўринишидан бирини танлайди. Шу сабабли клавиатурада ҳам радио гуруҳ
 * қоидаси ишлайди (Tab билан гуруҳга кириш, стрелкалар билан танлаш —
 * браузернинг ўз хатти-ҳаракати).
 */
export function SegmentSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentSwitchProps<T>) {
  const uid = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.id === value);

  // Радио гуруҳ қоидаси: Tab гуруҳга киради (фақат танланган тугма
  // фокусланади), стрелкалар танловни силжитади, Home/End четларга.
  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(ev.key)) return;
    ev.preventDefault();
    const i = options.findIndex((o) => o.id === value);
    const n = options.length;
    const next =
      ev.key === "ArrowRight" || ev.key === "ArrowDown"
        ? (i + 1) % n
        : ev.key === "ArrowLeft" || ev.key === "ArrowUp"
          ? (i - 1 + n) % n
          : ev.key === "Home"
            ? 0
            : n - 1;
    const id = options[next].id;
    onChange(id);
    boxRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${uid}-${id}`)}`)?.focus();
  };

  return (
    <div>
      <div
        ref={boxRef}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="inline-flex flex-wrap gap-0.5 rounded-[7px] border border-hair bg-surface-2 p-[3px]"
      >
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              id={`${uid}-${o.id}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(o.id)}
              className={
                "cursor-pointer rounded-[5px] px-3.5 py-[7px] text-[13px] whitespace-nowrap " +
                (on
                  ? "bg-s1 text-white [font-weight:650]"
                  : "font-medium text-ink-2 hover:text-ink")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {active?.hint && (
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">{active.hint}</p>
      )}
    </div>
  );
}
