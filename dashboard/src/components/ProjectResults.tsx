import { numberParts } from "../lib/adapters/projects";

/**
 * «Эришиладиган натижа» — паспортнинг энг катта блоки.
 *
 * Матндаги сонлар ажратиб кўрсатилади (моно шрифт, каттароқ ўлчам), лекин
 * матннинг ўзи ўзгармайди: бўлакларни улаганда айнан ҳужжат сатри чиқади.
 * Ҳеч қандай сон қўшилмайди ва фоизга айлантирилмайди.
 */
export function ProjectResults({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[8px] h-[6px] w-[6px] flex-none rounded-full bg-s3"
          />
          <p className="min-w-0 max-w-[100ch] text-[13.5px] leading-[1.62] text-ink-2">
            {numberParts(line).map((part, j) =>
              part.num ? (
                <b
                  key={j}
                  className="font-mono text-[16px] [font-weight:680] tracking-[-0.02em] text-ink tabular-nums"
                >
                  {part.t}
                </b>
              ) : (
                <span key={j}>{part.t}</span>
              ),
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
