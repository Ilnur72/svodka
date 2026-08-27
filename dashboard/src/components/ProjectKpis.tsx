import type { ProjectDetail } from "../lib/adapters/projects";

/**
 * Мақсад бўлимининг қўшимча сатрлари.
 *
 * «Ёрлиқ + сон + бирлик» шаклига тушган сатр кичик кўрсаткич сифатида,
 * қолгани оддий матн сифатида чизилади — иккови ҳам ҳужжатдаги тартибда.
 * Сон ҳужжатдаги ёзилиши билан кўринади: яхлитланмайди, бошқа бирликка
 * ўтказилмайди.
 */
export function ProjectKpis({ details }: { details: ProjectDetail[] }) {
  if (details.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {details.map((d, i) =>
        d.kind === "kpi" ? (
          <div
            key={i}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[6px] border border-hair bg-sunken px-3 py-2"
          >
            <span className="min-w-0 text-[12px] leading-[1.4] text-ink-2">{d.kpi.label}</span>
            <span className="font-mono text-[16px] [font-weight:650] tracking-[-0.01em] tabular-nums">
              {d.kpi.value}
              {d.kpi.unit && (
                <span className="ml-1.5 font-sans text-[11.5px] font-medium text-ink-3">
                  {d.kpi.unit}
                </span>
              )}
            </span>
          </div>
        ) : (
          <p key={i} className="text-[12.5px] leading-[1.55] text-ink-2">
            {d.text}
          </p>
        ),
      )}
    </div>
  );
}
