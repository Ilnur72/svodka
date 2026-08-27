export interface ProjectHeaderProps {
  title: string;
  /** Мақсад сатрининг охиридаги қавсдан олинган жой. Бўлмаса чизилмайди. */
  place: string | null;
  sourceLabel: string;
}

/**
 * Паспорт сарлавҳаси. Фонда токенлардан аралаштирилган жуда енгил тус бор
 * (`color-mix`) — қаттиқ ёзилган ранг эмас, шунинг учун мавзу алмашганда
 * ўзи мослашади.
 */
export function ProjectHeader({ title, place, sourceLabel }: ProjectHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-card border border-hair bg-[color-mix(in_srgb,var(--s1)_6%,var(--surface))] px-5 pt-4 pb-4 shadow-card">
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-[3px] bg-s1" />

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
        <span>Лойиҳа паспорти</span>
        <span aria-hidden="true">·</span>
        <span className="normal-case">{sourceLabel}</span>
      </div>

      <h2 className="mt-2 max-w-[90ch] text-[21px] leading-[1.22] [font-weight:680]">{title}</h2>

      {place && (
        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-ink-2">
          <span className="text-ink-3">Жойлашуви: </span>
          {place}
        </p>
      )}
    </div>
  );
}
