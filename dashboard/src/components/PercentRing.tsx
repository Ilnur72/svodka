import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { pctTxt } from "../lib/format";
import { usePalette } from "../lib/theme";

/**
 * Битта фоизнинг ҳалқали кўриниши.
 *
 * ═══ Нега `StatusDonut` эмас ════════════════════════════════════════════
 *
 * `StatusDonut` **бутуннинг қисмларини** чизади — ҳолатлар тақсимоти — ва
 * `KpiCounts` тузилмасига боғланган: унда сегментлар сони, ранглари ва
 * легендаси ҳолатлар рўйхатидан келади. Битта фоиз учун у ярамайди, шунинг
 * учун бу ерда алоҳида компонент турибди; `StatusDonut` ўзгаришсиз қолди.
 *
 * ═══ Қоидалар ═══════════════════════════════════════════════════════════
 *
 * Ҳалқа ёлғиз маъно ташимайди: фоиз марказда сон билан ёзилади, ёрлиқ ва
 * изоҳ ёнида туради, экран ўқувчи учун эса `aria-label` да ҳам бор.
 *
 * Ёй 0–100 билан чекланади ва қолган қисми нейтрал ранг билан тўлади,
 * лекин **сон доим тўлиқ** — шкала қийматни кесмайди.
 *
 * Иккита ҳалқа ёнма-ён қўйилса ҳам улар қўшилмайди ва ўртачаси олинмайди:
 * ҳар бири мустақил ўлчов, чақирувчи иккаласини алоҳида беради.
 */
export interface PercentRingProps {
  /** Кўрсаткич номи — ҳалқа ёнида ёзилади. */
  label: string;
  pct: number;
  /**
   * Тўлдирилган ёйнинг ранги — палитрадан олинган аниқ қиймат.
   * Recharts `var(--x)` ни тушунмайди, шунинг учун бу ерга токен эмас,
   * `usePalette()` берган ранг узатилади.
   */
  color: string;
  /** Ҳалқа остидаги қисқа изоҳ: сон қаердан келгани. */
  note?: string;
  size?: number;
}

export function PercentRing({ label, pct, color, note, size = 112 }: PercentRingProps) {
  const p = usePalette();
  const done = Math.max(0, Math.min(100, pct));
  const data = [
    { k: "done", v: done },
    { k: "rest", v: 100 - done },
  ];

  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <div
        className="relative flex-none"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${pctTxt(pct)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Соат стрелкаси бўйича, тепадан бошлаб — шкала ўқилиши учун. */}
            <Pie
              data={data}
              dataKey="v"
              nameKey="k"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={color} />
              <Cell fill={p.sunken} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[19px] leading-none [font-weight:650] tabular-nums">
            {pctTxt(pct)}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] leading-[1.3] [font-weight:600]">{label}</div>
        {note && <div className="mt-1 text-[11.5px] leading-[1.4] text-ink-3">{note}</div>}
      </div>
    </div>
  );
}
