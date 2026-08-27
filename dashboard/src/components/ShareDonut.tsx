import { exact, pctTxt } from "../lib/format";

/**
 * Бутуннинг қисмлари — сегментли ҳалқа, марказида жами.
 *
 * ═══ Нега `StatusDonut` ҳам, `PercentRing` ҳам ярамайди ═════════════════
 *
 * `StatusDonut` `KpiCounts` тузилмасига боғланган: сегментлар сони, ранги ва
 * легендаси **ҳолатлар** рўйхатидан келади (яхши / диққат / паст). Бу ердаги
 * гуруҳлар ҳолат эмас — уларни ўша рангларга бўяш «яхши тоифа / ёмон тоифа»
 * деган ёлғон маънони берарди. `PercentRing` эса битта фоиз учун. Шунинг учун
 * иккови ҳам ўзгаришсиз қолди, бу ерга алоҳида компонент ёзилди.
 *
 * ═══ Нега Recharts эмас, ўз SVG'си ══════════════════════════════════════
 *
 * Recharts `var(--x)` ни тушунмайди — унга аниқ ранг керак, палитрада эса
 * қатор ранглари учун атиги учта токен бор (`--s1/--s2/--s3`), бу ердаги
 * кесимларда эса саккизтагача гуруҳ бўлади. Компонент ичига hex ёзиш
 * тақиқланган, шунинг учун ранглар `color-mix()` билан **мавжуд токенлардан**
 * ҳосил қилинади: `--s1` дан `--sunken` томон бир хил оҳангли шкала. `var()`
 * ва `color-mix()` фақат ҳақиқий CSS эълонида ишлайди (SVG презентация
 * атрибутида эмас), шунинг учун ҳалқа `style` орқали бўялган ўз SVG'си билан
 * чизилади. Натижада ранглар мавзу (light/dark) билан ўзи бирга ўзгаради.
 *
 * ═══ Ранг ёлғиз маъно ташимайди ═════════════════════════════════════════
 *
 * Ҳар бир сегмент легендада номи, аниқ сони ва улуши билан такрорланади;
 * ҳалқанинг ўзида эса `<title>` бор. Шкала гуруҳларнинг **берилган тартиби**
 * бўйича — тартиб адаптерда қатъий ҳисобланади, шунинг учун ранг ҳам барқарор.
 *
 * ═══ Йиғинди ════════════════════════════════════════════════════════════
 *
 * Марказдаги сон — чақирувчи берган жами. Сегментлар йиғиндиси унга тенг
 * бўлиши шарт: «кўрсатилмаган» гуруҳи ҳам сегмент сифатида чиқади, тушириб
 * қолдирилмайди.
 */

export interface DonutSegment {
  key: string;
  name: string;
  value: number;
  /** Манбада катак тўлдирилмаган гуруҳ — нейтрал ранг олади. */
  muted?: boolean;
}

export interface ShareDonutProps {
  segments: DonutSegment[];
  /** Марказдаги жами. */
  total: number;
  /** Марказдаги сон остидаги қисқа изоҳ. */
  centerNote: string;
  size?: number;
  ariaLabel: string;
}

/** `--s1` дан `--sunken` томон бир оҳангли шкала: еттита поғона етарли. */
const RAMP = [100, 87, 75, 64, 55, 47, 41];

const shade = (i: number, muted?: boolean): string =>
  muted
    ? "var(--rule)"
    : `color-mix(in srgb, var(--s1) ${RAMP[Math.min(i, RAMP.length - 1)]}%, var(--sunken))`;

/* Геометрия: viewBox 100×100, марказ 50,50. */
const R = 40;
const SW = 15;
const C = 2 * Math.PI * R;
/** Сегментлар орасидаги тирқиш — ёй узунлиги бирлигида. */
const GAP = 1.4;

export function ShareDonut({
  segments,
  total,
  centerNote,
  size = 148,
  ariaLabel,
}: ShareDonutProps) {
  const whole = total > 0 ? total : 1;
  const pct = (v: number): number => (v / whole) * 100;

  let acc = 0;
  const arcs = segments.map((s, i) => {
    const len = (s.value / whole) * C;
    // Тирқиш сегментнинг ўзидан катта бўлиб кетмаслиги учун: жуда кичик улуш
    // ҳам кўринишда қолади, лекин қўшни сегментни босиб кетмайди.
    const dash = Math.max(0.5, len - GAP);
    const el = (
      <circle
        key={s.key}
        cx={50}
        cy={50}
        r={R}
        fill="none"
        strokeWidth={SW}
        strokeDasharray={`${dash.toFixed(3)} ${(C - dash).toFixed(3)}`}
        strokeDashoffset={(-acc).toFixed(3)}
        style={{ stroke: shade(i, s.muted) }}
      >
        <title>{`${s.name}: ${exact(s.value)} (${pctTxt(pct(s.value))})`}</title>
      </circle>
    );
    acc += len;
    return el;
  });

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative flex-none" style={{ width: size, height: size }}>
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            role="img"
            aria-label={ariaLabel}
          >
            {/* Тепадан бошлаб, соат стрелкаси бўйича — шкала ўқилиши учун. */}
            <g transform="rotate(-90 50 50)">{arcs}</g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] leading-none [font-weight:650] tabular-nums">
              {exact(total)}
            </span>
            <span className="mt-1 text-[10.5px] text-ink-3">{centerNote}</span>
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {segments.map((s, i) => (
          <li key={s.key} className="flex items-baseline gap-2 text-[12px]">
            <i
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 flex-none translate-y-[1px] rounded-sm"
              style={{ background: shade(i, s.muted) }}
            />
            <span className={"min-w-0 flex-1 truncate " + (s.muted ? "text-ink-3" : "text-ink-2")}>
              {s.name}
            </span>
            <b className="font-mono tabular-nums">{exact(s.value)}</b>
            <span className="font-mono text-[11.5px] text-ink-3 tabular-nums">
              {pctTxt(pct(s.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
