import { numberParts, type ProjectCostLine } from "../lib/adapters/projects";

export interface ProjectCostProps {
  headline: string;
  lines: ProjectCostLine[];
}

/**
 * Қиймат ва молиялаштириш.
 *
 * Биринчи сатр — ҳужжатда қиймат ёзилган сатр, ўз ҳолида. Қолганлари
 * тақсимот: сатр боши йил бўлса, йил алоҳида устунга чиқади.
 *
 * Бу ерда ҳеч нарса **қўшилмайди**: ҳужжатда суммалар турли шаклда
 * («млн доллар», «минг доллар», «млн. доллар») ва турли манбалар кесимида
 * ёзилган, уларни жамлаш тахмин бўларди. Экранда фақат ҳужжат сатрлари.
 */
export function ProjectCost({ headline, lines }: ProjectCostProps) {
  return (
    <div>
      <p className="text-[15.5px] leading-[1.45] [font-weight:600]">
        {numberParts(headline).map((part, i) =>
          part.num ? (
            <b
              key={i}
              className="font-mono text-[19px] [font-weight:680] tracking-[-0.02em] text-ink tabular-nums"
            >
              {part.t}
            </b>
          ) : (
            <span key={i}>{part.t}</span>
          ),
        )}
      </p>

      {lines.length > 0 && (
        <ul className="mt-3 border-t border-grid">
          {lines.map((l, i) => (
            <li
              key={i}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-grid py-2 last:border-b-0"
            >
              {l.year && (
                <span className="flex-none font-mono text-[11.5px] font-semibold text-ink-2 tabular-nums">
                  {l.year}
                </span>
              )}
              <p className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-ink-2">{l.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
