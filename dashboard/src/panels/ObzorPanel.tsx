import { useMemo, useState } from "react";
import type { PanelProps } from "../types";
import { getKpi } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { monthMinus, monthOf, monthStart } from "../lib/period";
import { kpiMonth, kpiView } from "../lib/adapters/kpi";
import { monthLabel } from "../lib/format";
import { Pill } from "../components/Pill";
import { SegmentSwitch, type SegmentOption } from "../components/SegmentSwitch";
import { ManagementView } from "./ManagementView";
import { ProductionView } from "./ProductionView";

/**
 * «Умумий кўрсаткичлар» бўлими — иккита кўриниш, битта таб ичида.
 *
 *  · **Раҳбарият** — 10–20 сонияда қарор учун: катта карточкалар, жараённинг
 *    йиғма ҳолати, категориялар, ойлик динамика ва TOP рўйхатлар.
 *  · **Ишлаб чиқариш** — жараённинг ичи: технологик занжир, майдончалар,
 *    ўлчов бирлиги кесими, хомашё/ресурслар, чиқиндилар ва тўхташлар,
 *    кунлик динамика.
 *
 * Иккиси **бир вақтда** чизилмайди, шунинг учун битта кўрсаткич экранда икки
 * марта турмайди; тақсимот қоидаси `lib/adapters/kpi.ts` бошидаги изоҳда.
 *
 * Паспорт сўрови (`/kpi`) шу ерда — иккала кўриниш ҳам ундан фойдаланади ва
 * кўриниш алмашганда қайта юкланмайди.
 */

type ViewId = "mgmt" | "prod";

const VIEWS: readonly SegmentOption<ViewId>[] = [
  {
    id: "mgmt",
    label: "Раҳбарият",
    hint: "Умумий манзара: режа бажарилдими, қаерда муаммо, қайси кўрсаткичга эътибор.",
  },
  {
    id: "prod",
    label: "Ишлаб чиқариш",
    hint: "Жараённинг ичи: технологик занжир, сехлар, хомашё, ресурслар, чиқиндилар ва тўхташлар.",
  },
] as const;

/**
 * Динамика учун сўраладиган ойлар сони.
 *
 * Давр битта ой бўлса ҳам «ойлик динамика» блоки бўш қолмаслиги керак,
 * шунинг учун `/kpi` кенгроқ оралиқда сўралади. Экрандаги **қиймат** эса
 * барибир танланган даврнинг охирги ойига тегишли: паспорт қийматлари
 * ойлар бўйича қўшилмайди (турли бирлик, айримлари қолдиқ).
 */
const TREND_MONTHS = 12;

export function ObzorPanel({ period, months }: PanelProps) {
  const [view, setView] = useState<ViewId>("mgmt");

  // Кўрсатиладиган ой — даврнинг охиргиси; тренд эса ундан олдинги ойларни ҳам
  // қамрайди. Икковини битта сўров беради.
  const shownMonth = monthOf(period.to);
  const kpiFrom = useMemo(() => {
    const wide = monthMinus(shownMonth, TREND_MONTHS - 1);
    const from = monthOf(period.from);
    return monthStart(wide < from ? wide : from);
  }, [shownMonth, period.from]);

  const kpiQ = useQuery(`kpi_${kpiFrom}_${period.to}`, (s) =>
    getKpi({ from: kpiFrom, to: period.to }, s),
  );

  const vm = useMemo(
    () => (kpiQ.data ? kpiView(kpiQ.data, kpiMonth(kpiQ.data, shownMonth)) : null),
    [kpiQ.data, shownMonth],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-5 gap-y-2.5">
        <SegmentSwitch
          label="Умумий кўрсаткичлар кўриниши"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
        {/* Паспорт блоклари қайси ойни кўрсатаётгани доим ёзилиб туради:
            қиймат ойлар бўйича қўшилмайди, шунинг учун давр бир нечта ойни
            қамраса ҳам экранда битта ой туради. */}
        {vm && (
          <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
            Кўрсаткич қийматлари:
            <Pill>{monthLabel(vm.month)}</Pill>
            {vm.month === vm.reference && <Pill>эталон ой</Pill>}
            {vm.month !== shownMonth && (
              <Pill status="warn">{monthLabel(shownMonth)} учун маълумот йўқ</Pill>
            )}
          </span>
        )}
      </div>

      {view === "mgmt" ? (
        <ManagementView period={period} months={months} kpiQ={kpiQ} vm={vm} />
      ) : (
        <ProductionView period={period} months={months} kpiQ={kpiQ} vm={vm} />
      )}
    </>
  );
}
