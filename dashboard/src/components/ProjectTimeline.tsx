import type { ProjectEvent } from "../lib/adapters/projects";

export interface ProjectTimelineProps {
  items: ProjectEvent[];
  /**
   * Ўтган ишлар ва режа бир хил чизилади, фақат нуқта ранги фарқ қилади —
   * бошқа ҳеч қандай «ҳолат» маъноси йўқ, чунки ҳужжатда ҳолат йўқ.
   */
  tone?: "done" | "plan";
}

/**
 * Вақт чизиғи.
 *
 * Сана — сатрнинг ўз матнидан ажратилган (адаптер қоидалари). Санаси
 * топилмаган сатр ҳам чизиқда қолади, шунчаки белгисиз: ҳужжатдаги ишни
 * яшириш ҳам, унга ўйлаб топилган сана қўйиш ҳам мумкин эмас.
 *
 * Тартиб — ҳужжатдагидек. Саналар бўйича қайта сараланмайди: сана ҳамма
 * сатрда ҳам йўқ, сараланса ҳужжатнинг мантиқий кетма-кетлиги бузиларди.
 */
export function ProjectTimeline({ items, tone = "done" }: ProjectTimelineProps) {
  if (items.length === 0) return null;

  return (
    <ol className="mt-1 flex flex-col gap-3.5 border-l border-rule pl-4">
      {items.map((e, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden="true"
            className={
              "absolute top-[5px] -left-[20.5px] h-[9px] w-[9px] rounded-full ring-2 ring-surface " +
              (tone === "plan" ? "bg-s2" : "bg-s1")
            }
          />
          {e.marker && (
            <span className="mb-1 block font-mono text-[11.5px] font-semibold tracking-[-0.01em] text-ink-2">
              {e.marker}
            </span>
          )}
          <p className="text-[12.5px] leading-[1.55] text-ink-2">{e.text}</p>
        </li>
      ))}
    </ol>
  );
}
