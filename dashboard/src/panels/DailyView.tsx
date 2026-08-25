import { useId, useMemo, useState } from "react";
import type { PanelProps } from "../types";
import type { DailyVM, DailyWindowKey } from "../lib/adapters/daily";
import { getDaily } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import {
  DAILY_MAX_DAYS,
  DAILY_WINDOWS,
  dailyDay,
  dailyRange,
  dailyView,
} from "../lib/adapters/daily";
import { dateLabel, nf, pctTxt } from "../lib/format";
import { GRID } from "../components/layout";
import { Section } from "../components/Card";
import { Pill } from "../components/Pill";
import { DailyBlockCard } from "../components/DailyBlockCard";
import { DailyLegend, DailyStatusDots } from "../components/DailyStatus";
import { Loader } from "../components/states";

/**
 * «Кунлик сводка» — тезкор кунлик кўриниш: саккиз йўналиш битта экранда.
 *
 * ⚠️ Бу қолган уч кўринишдан (**паспорт**, **баланс**, **занжир**) бошқа
 * маълумот қатлами: улар ойлик «цеховые сводки» варағига, бу эса кунлик
 * сводка файлига таянади. Улар аралаштирилмайди.
 *
 * ─── Экран тартиби ────────────────────────────────────────────────────────
 *  1. Сарлавҳа қатори: сана · ойна танлагич · ҳолатлар саноғи
 *  2. Огоҳлантириш: чегарадан паст тушган кўрсаткичлар (энг пастидан)
 *  3. Саккиз блок — 4 × 2 тўр, ҳар бири зич жадвал
 *  4. Легенда: чегаралар ва устун ўқилиши
 *
 * ─── Ойна танлагич ────────────────────────────────────────────────────────
 * «Кунлик · Ой бошидан · Йил бошидан» — манбадаги учта устун. Танлов **барча
 * блокка** бирдан таъсир қилади: режа, амалда, фарқ ва ҳолат айнан танланган
 * устундан олинади. Шунинг учун экрандаги барча сон бир хил ойнага тегишли
 * ва ўзаро таққосланади.
 */
export function DailyView({ period, months }: PanelProps) {
  const uid = useId();
  const range = useMemo(() => dailyRange(period), [period]);
  const q = useQuery(`daily_${range.from}_${range.to}`, (s) =>
    getDaily({ from: range.from, to: range.to }, s),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [win, setWin] = useState<DailyWindowKey>("day");

  const day = q.data ? dailyDay(q.data, picked) : null;
  const vm = useMemo(
    () => (q.data && day ? dailyView(q.data, day, win) : null),
    [q.data, day, win],
  );

  return (
    <Section
      title="Кунлик тезкор маълумот"
      note="ишлаб чиқариш кўрсаткичлари"
    >
      <Loader
        q={q}
        height={320}
        notAvailableWhat="/daily"
        isEmpty={() => !vm || !vm.hasValues}
        emptyTitle={
          !vm || vm.days.length === 0
            ? "Танланган даврда кунлик сводка йўқ"
            : `${dateLabel(vm.day)} учун кунлик маълумот йўқ`
        }
        emptyText={
          vm && vm.available.from && vm.available.to
            ? `Манбада кунлик сводка ${dateLabel(vm.available.from)} — ${dateLabel(vm.available.to)} оралиғида мавжуд (${vm.available.days} кун).`
            : "Манбада кунлик сводка топилмади."
        }
      >
        {() =>
          vm && (
            <div className="flex flex-col gap-2.5">
              <TopBar vm={vm} uid={uid} win={win} onWin={setWin} onDay={setPicked} capped={range.capped} months={months.length} />
              <AttentionRow vm={vm} />

              {/* Саккизта блок 4 × 2 тўрда — ҳаммаси бир экранда. */}
              <div className={GRID.g4}>
                {vm.blocks.map((b) => (
                  <DailyBlockCard key={b.key} block={b} />
                ))}
              </div>

              <DailyLegend source="кунлик сводка файли" />
            </div>
          )
        }
      </Loader>
    </Section>
  );
}

/** Сарлавҳа қатори: сана, ойна танлагич ва ҳолатлар саноғи битта чизиқда. */
function TopBar({
  vm,
  uid,
  win,
  onWin,
  onDay,
  capped,
  months,
}: {
  vm: DailyVM;
  uid: string;
  win: DailyWindowKey;
  onWin: (w: DailyWindowKey) => void;
  onDay: (d: string) => void;
  capped: boolean;
  months: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-hair bg-surface px-3 py-2 shadow-card">
      <label htmlFor={`${uid}-day`} className="sr-only">
        Ҳисобот куни
      </label>
      <select
        id={`${uid}-day`}
        value={vm.day}
        onChange={(e) => onDay(e.target.value)}
        aria-label="Ҳисобот куни"
      >
        {vm.days
          .slice()
          .reverse()
          .map((d) => (
            <option key={d} value={d}>
              {dateLabel(d)}
            </option>
          ))}
      </select>
      <span className="text-[11.5px] text-ink-3">ҳолати</span>

      {/* Ойна танлагич — учта устуннинг бири. */}
      <div
        role="radiogroup"
        aria-label="Кўрсатиладиган устун"
        className="inline-flex flex-wrap gap-0.5 rounded-[6px] border border-hair bg-surface-2 p-[2px]"
      >
        {DAILY_WINDOWS.map((w) => {
          const on = w.id === win;
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onWin(w.id)}
              className={
                "cursor-pointer rounded-[4px] px-2.5 py-[4px] text-[11.5px] whitespace-nowrap " +
                (on ? "bg-s1 text-white [font-weight:650]" : "font-medium text-ink-2 hover:text-ink")
              }
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <DailyStatusDots counts={vm.counts} withLabels />

      {capped && (
        <Pill>
          давр {months} ой · сўров охирги {DAILY_MAX_DAYS} кун
        </Pill>
      )}
      {vm.rangeSource === "default" && <Pill>сервер охирги {DAILY_MAX_DAYS} кунни берди</Pill>}
    </div>
  );
}

/**
 * Огоҳлантириш қатори — чегарадан паст тушганлар, энг пастидан бошлаб.
 * Формат: `<блок>·<кўрсаткич> <фоиз>`, шунда раҳбар қайси йўналиш эканини
 * ҳам дарҳол кўради.
 */
function AttentionRow({ vm }: { vm: DailyVM }) {
  if (vm.attentionTotal === 0) return null;
  return (
    <div className="rounded-card border border-hair bg-surface px-3 py-2 shadow-card" style={{ borderLeft: "3px solid var(--crit)" }}>
      <span className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-[11.5px]">
        <b className="text-crit-ink [font-weight:650]">
          Эътибор: {nf(vm.attentionTotal, 0)} та &lt;90%
        </b>
        {vm.attention.map((a) => (
          <span key={a.id} className="text-ink-2">
            <span className="font-mono text-ink-3">{a.blockNo}·</span>
            {a.name} <b className="font-mono tabular-nums text-crit-ink">{pctTxt(a.pct)}</b>
          </span>
        ))}
      </span>
    </div>
  );
}
