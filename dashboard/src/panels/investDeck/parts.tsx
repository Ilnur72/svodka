import type { ReactNode } from "react";
import { NO_DATA, type DeckProject } from "../../lib/adapters/investDeck";
import { Pill } from "../../components/Pill";

/**
 * «Инвестиция дастури» бўлимининг иккита кўринишида (рўйхат карточкаси ва
 * тафсилот ойнаси) бир хил ишлатиладиган бўлаклар.
 *
 * Улар шу ерда туради, чунки иккала кўриниш ҳам бир хил маънони бир хил
 * кўринишда бериши шарт: «маълумот йўқ» ҳамма жойда бир хил ёзилади, кластер
 * ва манба ранги битта жойдан келади. Акс ҳолда иккита жойда иккита ҳақиқат
 * пайдо бўларди (`panels/geology/parts.tsx` билан бир хил сабаб).
 */

/** Манбада катак тўлдирилмаган жой — ҳамма жойда бир хил матн ва тус. */
export function Muted({ children = NO_DATA }: { children?: ReactNode }) {
  return <span className="text-[12.5px] font-medium tracking-normal text-ink-3">{children}</span>;
}

/**
 * Кўрсаткич катаги. Қиймат йўқ бўлса блок ўз ўрнида қолади — шунда барча
 * карточка бир хил тузилишда ўқилади, лекин ўрни «0» билан тўлдирилмайди.
 */
export function Fact({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | null;
  unit?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[16px] leading-[1.15] [font-weight:640] tabular-nums tracking-[-0.02em]">
        {value === null ? (
          <Muted />
        ) : (
          <>
            {value}
            {unit && (
              <span className="ml-[4px] font-sans text-[11px] font-medium tracking-normal text-ink-3">
                {unit}
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-0.5 text-[10.5px] leading-[1.3] text-ink-3">{label}</div>
    </div>
  );
}

/**
 * Кластер чипи. Филиали бор бўлса ёнида алоҳида кўрсатилади — филиал
 * кластернинг бир қисми, алоҳида кластер эмас.
 */
export function ClusterChip({ p }: { p: DeckProject }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-hair bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
      <i
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: p.isBranchTotal ? "var(--ink-3)" : "var(--s1)" }}
      />
      <span className="truncate">{p.cluster}</span>
      {p.branch && <span className="flex-none font-normal text-ink-3">{p.branch}</span>}
    </span>
  );
}

/**
 * Слайдда қайси блок борлиги.
 *
 * Борларини ҳам, йўқларини ҳам ёзиш рўйхатни шовқинга тўлдирарди, шунинг
 * учун бу ерда фақат **борлари** чипга чиқади; йўқлиги эса тафсилот ойнасида
 * очиқ ёзилади (`missing`). Ҳеч нарса бўлмаса — шу ҳам маълумот, алоҳида
 * чип билан айтилади.
 */
export function BlockPills({ p }: { p: DeckProject }) {
  const on: string[] = [];
  if (p.has.finance) on.push(`молия ${p.counts.finance}`);
  if (p.has.works) on.push(`ишлар ${p.counts.works}`);
  if (p.has.kpis) on.push(`натижа ${p.counts.kpis}`);
  if (p.has.years) on.push("йиллар жадвали");

  if (on.length === 0) return <Pill status="warn">слайдда жадвал йўқ</Pill>;
  return (
    <>
      {on.map((t) => (
        <Pill key={t}>{t}</Pill>
      ))}
    </>
  );
}

/** Молия манбаининг ранг белгиси — ранг ёлғиз маъно ташимайди, ёнида номи. */
export function SourceDot({ color }: { color: string }) {
  return (
    <i
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 flex-none translate-y-[1px] rounded-sm"
      style={{ background: color }}
    />
  );
}
