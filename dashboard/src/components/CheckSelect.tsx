import { useId } from "react";

/**
 * Кўп танловли рўйхат — «select ичида checkbox».
 *
 * Лойиҳада бундай компонент йўқ эди, шунинг учун ясалди. Янги боғланма
 * қўшилмаган: асос — браузернинг ўз `<details>` элементи. Шу сабабли
 * очиш/ёпиш, клавиатура (Enter/Space) ва экран ўқувчи қўллаб-қувватлаши
 * тайёр ҳолда келади, ташқарига босишни кузатадиган эффект керак эмас.
 *
 * Ёзув услуби қўшни `<select>` лар билан бир хил (`index.css` даги `select`
 * қоидаси такрорланган), шунда фильтр қаторидаги бошқарувлар бир хил
 * кўринади.
 */
export interface CheckSelectOption<T extends string> {
  key: T;
  label: string;
  /** Ёрлиқ ёнидаги сон — нечта позиция шу шартга тушади. */
  count?: number;
}

export interface CheckSelectProps<T extends string> {
  /** Кўринмас, лекин экран ўқувчи учун мажбурий ном. */
  label: string;
  options: readonly CheckSelectOption<T>[];
  picked: readonly T[];
  onChange: (next: T[]) => void;
  /** Ҳеч нарса танланмаганда тугмада турадиган матн. */
  emptyText?: string;
}

export function CheckSelect<T extends string>({
  label,
  options,
  picked,
  onChange,
  emptyText = "ҳеч нарса танланмаган",
}: CheckSelectProps<T>) {
  const uid = useId();
  const set = new Set<T>(picked);

  const toggle = (k: T) => {
    const next = new Set(set);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    // Тартиб `options` бўйича сақланади — ёрлиқ ҳар доим бир хил ўқилади.
    onChange(options.map((o) => o.key).filter((x) => next.has(x)));
  };

  const summary =
    set.size === 0
      ? emptyText
      : set.size === options.length
        ? "барчаси"
        : options
            .filter((o) => set.has(o.key))
            .map((o) => o.label)
            .join(", ");

  return (
    <details className="relative inline-block">
      <summary
        aria-label={label}
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-[5px] border border-rule bg-surface px-[9px] py-[6px] text-[13px] whitespace-nowrap select-none"
      >
        <span className="max-w-[220px] truncate">{summary}</span>
        <span aria-hidden="true" className="text-[9px] text-ink-3">
          ▼
        </span>
      </summary>

      <div
        role="group"
        aria-label={label}
        className="absolute top-[calc(100%+4px)] left-0 z-30 min-w-[190px] rounded-[6px] border border-rule bg-surface p-1 shadow-card"
      >
        {options.map((o) => (
          <label
            key={o.key}
            htmlFor={`${uid}-${o.key}`}
            className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-[5px] text-[12.5px] hover:bg-surface-2"
          >
            <input
              id={`${uid}-${o.key}`}
              type="checkbox"
              checked={set.has(o.key)}
              onChange={() => toggle(o.key)}
              className="h-[13px] w-[13px] flex-none accent-s1"
            />
            <span className="flex-1 text-ink-2">{o.label}</span>
            {o.count !== undefined && (
              <span className="font-mono text-[11px] tabular-nums text-ink-3">{o.count}</span>
            )}
          </label>
        ))}
      </div>
    </details>
  );
}
