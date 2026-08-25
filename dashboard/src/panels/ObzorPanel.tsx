import { useMemo, useState } from "react";
import type { PanelProps } from "../types";
import { getKpi } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { monthMinus, monthOf, monthStart } from "../lib/period";
import { SegmentSwitch, type SegmentOption } from "../components/SegmentSwitch";
import { ManagementView } from "./ManagementView";
import { BalanceSection } from "./BalanceSection";
import { ChainView } from "./ChainView";
import { DailyView } from "./DailyView";

/**
 * «Умумий кўрсаткичлар» бўлими — тўртта кўриниш, битта таб ичида.
 *
 *  · **Кўрсаткичлар паспорти** — 10–20 сонияда қарор учун: катта карточкалар, жараённинг
 *    йиғма ҳолати, категориялар, ойлик динамика ва TOP рўйхатлар.
 *  · **Металлар баланси** — Mo, W ва Re оқими босқичма-босқич: технологик
 *    йўл ва ҳар босқичда режа/факт.
 *  · **Цехлар занжири** — бутун комбинат технологик оқими: хомашёдан тайёр
 *    маҳсулотгача, босқичлар орасидаги боғланиш ва унинг аниқлик даражаси.
 *  · **Кунлик сводка** — кунлик кесим: 8 йўналиш, «Кунлик · Ой бошидан ·
 *    Йил бошидан» ва ҳар бир кўрсаткич бўйича ҳолат.
 *
 * Учаласи **бир вақтда** чизилмайди, шунинг учун битта кўрсаткич экранда икки
 * марта турмайди; тақсимот қоидаси `lib/adapters/kpi.ts` бошидаги изоҳда.
 *
 * Паспорт сўрови (`/kpi`) шу ерда — уни фақат «Кўрсаткичлар паспорти»
 * ишлатади. Қолган учаласи мустақил: «Металлар баланси» (`/balance`),
 * «Цехлар занжири» (`/chain`) ва «Кунлик сводка» (`/daily`) ҳар бири ўз
 * сўровини ўзи юритади, шунинг учун паспорт юкланмаса ҳам улар ишлайверади.
 *
 * ⚠️ «Кунлик сводка» бошқа **маълумот қатлами**: қолган учаласи ойлик
 * «цеховые сводки» варағига, у эса кунлик сводка файлига таянади. Улар бир
 * экранда аралаштирилмайди ва бир-бирининг рақамини тасдиқламайди.
 */

type ViewId = "mgmt" | "prod" | "chain" | "daily";

const VIEWS: readonly SegmentOption<ViewId>[] = [
  {
    id: "mgmt",
    label: "Кўрсаткичлар паспорти",
    hint: "Умумий манзара: режа бажарилдими, қаерда муаммо, қайси кўрсаткичга эътибор.",
  },
  {
    id: "prod",
    label: "Металлар баланси",
    hint: "Mo, W ва Re оқими босқичма-босқич: технологик йўл ва ҳар босқичда режа/факт.",
  },
  {
    id: "chain",
    label: "Цехлар занжири",
    hint: "Бутун комбинат оқими: хомашёдан тайёр маҳсулотгача, ҳар бир босқич ва улар орасидаги боғланишнинг аниқлик даражаси.",
  },
  {
    id: "daily",
    label: "Кунлик сводка",
    hint: "Кунлик кесим: бугун қанча ишлаб чиқарилди, режага нисбатан қандай, ой ва йил бошидан қанча, қолдиқлар ва муаммоли масалалар.",
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-5 gap-y-2.5">
        <SegmentSwitch
          label="Умумий кўрсаткичлар кўриниши"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
      </div>

      {/* Паспорт кўриниши фақат `/kpi` дан фойдаланади. Ой ва фильтрларни
          ўзи бошқаради — сўров эса шу ерда, чунки у кенгроқ оралиқни олади
          (тренд учун) ва кўриниш алмашганда қайта юкланмайди. */}
      {view === "mgmt" && <ManagementView kpiQ={kpiQ} />}
      {/* «Металлар баланси» — бошқа блокларсиз, сегмент номига тўлиқ мос.
          У фақат `/balance` дан фойдаланади ва паспорт сўровига боғлиқ эмас. */}
      {view === "prod" && <BalanceSection period={period} />}
      {/* Занжир ва кунлик сводка паспорт сўровига боғлиқ эмас — ҳар бири
          ўз маълумотини ўзи юклайди. */}
      {view === "chain" && <ChainView period={period} months={months} />}
      {view === "daily" && <DailyView period={period} months={months} />}
    </>
  );
}
