import type { ReactNode } from "react";
import { NO_DATA, type RegProject } from "../../lib/adapters/projectRegistry";
import { exact, nf, pctTxt } from "../../lib/format";

/**
 * «Лойиҳалар реестри» бўлимининг иккита кўринишида (рўйхат қатори ва
 * тафсилот ойнаси) бир хил ишлатиладиган бўлаклар.
 *
 * Улар шу ерда туради, чунки иккала кўриниш ҳам бир хил маънони бир хил
 * кўринишда бериши шарт: «кўрсатилмаган» ҳамма жойда бир хил ёзилади, кластер
 * ва йўналиш белгиси битта жойдан келади (`panels/investDeck/parts.tsx` ва
 * `panels/geology/parts.tsx` билан бир хил сабаб).
 */

/** Реестрда тўлдирилмаган жой — ҳамма жойда бир хил матн ва тус. */
export function Muted({ children = NO_DATA }: { children?: ReactNode }) {
  return <span className="text-[12.5px] font-medium tracking-normal text-ink-3">{children}</span>;
}

/**
 * Сон + бирлик. `null` нолга айлантирилмайди — «кўрсатилмаган» деб ёзилади.
 * Сон **яхлитланмайди**: `exact()`.
 */
export function Num({ v, unit }: { v: number | null; unit?: string }) {
  if (v === null) return <Muted />;
  return (
    <>
      <span className="font-mono tabular-nums">{exact(v)}</span>
      {unit && <span className="ml-1 font-sans text-[11px] text-ink-3">{unit}</span>}
    </>
  );
}

/**
 * Кўрсаткич катаги. Қиймат йўқ бўлса блок ўз ўрнида қолади — шунда барча
 * қатор бир хил тузилишда ўқилади, лекин ўрни «0» билан тўлдирилмайди.
 */
export function Fact({
  label,
  value,
  unit,
  foot,
}: {
  label: string;
  value: string | null;
  unit?: string;
  foot?: ReactNode;
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
      {foot && <div className="mt-0.5 text-[10.5px] leading-[1.3] text-ink-3">{foot}</div>}
    </div>
  );
}

/**
 * Кластер ва йўналиш чипи.
 *
 * ⚠️ Йўналиш иккита маънода: кўп кластерда у технологик босқич («Mine
 * йўналиши»), «Келажак металлари технопарки» да эса ЖОЙЛАШУВ («Чирчиқ
 * шаҳрида»). Манбада шундай — бу ерда бирлаштирилмайди, фақат кўрсатилади.
 * Йўналиш умуман кўрсатилмаган бўлса — шуниси ҳам маълумот, ёзиб қўйилади.
 */
export function ClusterChip({ p }: { p: RegProject }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-hair bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
      <i aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-s1" />
      <span className="truncate">{p.cluster}</span>
      {p.direction === null ? (
        <span className="flex-none font-normal text-ink-3">йўналиш {NO_DATA}</span>
      ) : (
        <span className="flex-none truncate font-normal text-ink-3">{p.direction}</span>
      )}
    </span>
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

/**
 * «N / 144» тўлиқлик қатори.
 *
 * Фоиз фақат чизиқнинг ёнида — у ўртача ёки йиғинди эмас, шунчаки нечта
 * лойиҳада устун тўлдирилгани. Сон доим ёнида туради, шунда «82%» ўқувчини
 * «82 та лойиҳа» деб адаштирмайди.
 */
export function Coverage({ label, filled, total }: { label: string; filled: number; total: number }) {
  const pct = total === 0 ? 0 : (filled / total) * 100;
  const tone = pct >= 66 ? "bg-s1" : pct >= 20 ? "bg-s3" : "bg-rule";
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
        <span className="min-w-0 flex-1 truncate text-[12.5px] [font-weight:600]">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {nf(filled)}
          <span className="mx-1 text-ink-3">/</span>
          {nf(total)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className={"absolute inset-y-0 left-0 rounded-[3px] " + tone}
            style={{ width: `${pct.toFixed(2)}%` }}
          />
        </span>
        <span className="w-[52px] flex-none text-right font-mono text-[11.5px] tabular-nums">
          {pctTxt(pct)}
        </span>
      </div>
    </div>
  );
}
