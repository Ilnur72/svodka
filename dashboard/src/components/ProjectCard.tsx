import type { ProjectListItem } from "../lib/adapters/projects";

export interface ProjectCardProps {
  item: ProjectListItem;
  onOpen: (id: string) => void;
}

/**
 * Рўйхатдаги битта лойиҳа — қисқа карточка.
 *
 * Карточкада атайин кам нарса бор: манба ҳужжати, сарлавҳа, мақсаднинг
 * биринчи сатри ва паспортга ўтиш. Ҳужжатда бўлмаган ҳеч қандай кўрсаткич
 * (тайёрлик фоизи, муддат, статус) бу ерда йўқ — уларни кўрсатиш учун
 * маълумот умуман мавжуд эмас.
 *
 * Матн `line-clamp` билан қисқаради, яъни экранда кесилади, лекин
 * ўзгартирилмайди — тўлиқ ҳоли паспортда.
 */
export function ProjectCard({ item, onOpen }: ProjectCardProps) {
  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-3.5 shadow-card">
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-[3px] bg-s1" />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="truncate text-[10.5px] font-medium tracking-[0.08em] text-ink-3 uppercase">
          {item.sourceLabel}
        </span>
        <span className="flex-1" />
      </div>

      <h3 className="line-clamp-3 text-[14px] leading-[1.32] [font-weight:650]">{item.title}</h3>

      {item.lead && (
        <p className="mt-2 line-clamp-2 text-[12px] leading-[1.5] text-ink-2">{item.lead}</p>
      )}

      <div className="mt-auto pt-3.5">
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-2.5 py-[5px] text-[11px] font-semibold tracking-[0.06em] text-s1 uppercase hover:border-s1"
        >
          Лойиҳа паспорти →
        </button>
      </div>
    </article>
  );
}
