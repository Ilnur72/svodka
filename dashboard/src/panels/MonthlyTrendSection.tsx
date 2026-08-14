import type { QueryResult } from "../lib/useQuery";
import type { MonthlyTrendVM } from "../lib/adapters/production";
import type { ProductionMonthlyRow } from "../api/types";
import { monthLabel, pctTxt, exact, smart } from "../lib/format";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { ChartLegend } from "../components/ChartLegend";
import { TimeLine } from "../components/TimeLine";
import { MonthCompare } from "../components/MonthCompare";
import { TableToggle } from "../components/TableToggle";
import { Loader } from "../components/states";

export interface MonthlyElectricity {
  internal: number;
  external: number;
}

export interface MonthlyTrendSectionProps {
  months: string[];
  trendQ: QueryResult<ProductionMonthlyRow[]>;
  trend: MonthlyTrendVM | null;
  /** Ой → электр истеъмоли; таққослаш қаторлари учун. */
  elecByMonth: Map<string, MonthlyElectricity>;
}

/**
 * «Ойлик тренд» — фақат бир нечта ой танланганда кўринади (битта ойда
 * тренд деган нарса йўқ).
 *
 * Ишлаб чиқариш устунлари **битта базавий бирликда** (одатда `тн`) — турли
 * бирликлар қўшилмайди, қолганлари изоҳда эслатилади. Ўнгдаги таққослаш
 * ҳар бир қаторни ўз шкаласида кўрсатади.
 */
export function MonthlyTrendSection({
  months,
  trendQ,
  trend,
  elecByMonth,
}: MonthlyTrendSectionProps) {
  const p = usePalette();
  const first = months[0];
  const last = months[months.length - 1];
  const elecOf = (m: string) => elecByMonth.get(m) ?? { internal: 0, external: 0 };

  return (
    <Section
      title="Ойлик тренд"
      note={`${months.length} ой танланган · ҳар бир кўрсаткич ўз ўлчов бирлигида`}
    >
      <div className={GRID.g32}>
        <Loader
          q={trendQ}
          height={230}
          notAvailableWhat="/production/monthly"
          isEmpty={() => !trend || trend.points.length === 0}
          emptyTitle="Ойлик тренд учун маълумот йўқ"
        >
          {() =>
            trend && (
              <Card
                title={`Ишлаб чиқариш — ойлар кесимида (${trend.unit})`}
                sub="режа ва факт"
                note={
                  trend.otherUnits.length
                    ? `Фақат «${trend.unit}» базавий бирлиги кўрсатилган. Бошқа бирликлар (${trend.otherUnits.join(", ")}) шкаласи бошқа — қўшилмайди.`
                    : undefined
                }
              >
                <ChartLegend
                  items={[
                    { name: "Режа", color: "var(--s1)" },
                    { name: "Факт", color: "var(--s2)" },
                  ]}
                />
                {/* Режа ва факт — иккита алоҳида чизиқ: ойдан-ойга ўзгариш ва
                    улар орасидаги фарқ устунларга қараганда яққолроқ кўринади. */}
                <TimeLine
                  labels={trend.points.map((x) => x.label)}
                  fullLabels={trend.points.map((x) => x.full)}
                  height={250}
                  area={false}
                  ariaLabel={`Ойлар кесимида ишлаб чиқариш, ${trend.unit}`}
                  yTickFmt={smart}
                  vFmt={(v) => exact(v) + " " + trend.unit}
                  series={[
                    { name: "Режа", color: p.s1, values: trend.points.map((x) => x.plan) },
                    { name: "Факт", color: p.s2, values: trend.points.map((x) => x.fakt) },
                  ]}
                />
                <TableToggle
                  caption="Ойлар кесимида ишлаб чиқариш"
                  cols={[
                    { t: "Ой" },
                    { t: `Режа, ${trend.unit}`, num: true },
                    { t: `Факт, ${trend.unit}`, num: true },
                    { t: "Бажарилиш", num: true },
                  ]}
                  rows={trend.points.map((x) => ({
                    key: x.month,
                    cells: [
                      x.full,
                      exact(x.plan),
                      exact(x.fakt),
                      x.plan > 0 ? pctTxt((x.fakt / x.plan) * 100) : "—",
                    ],
                  }))}
                />
              </Card>
            )
          }
        </Loader>

        <Card
          title="Биринчи ↔ охирги ой"
          sub={`${monthLabel(first)} ↔ ${monthLabel(last)}`}
          note="Ҳар бир кўрсаткич ўз ўлчов бирлигида ва ўз шкаласида; ўнгдаги фоиз — охирги ойнинг биринчи ойга нисбатан ўзгариши."
        >
          <MonthCompare
            aName={monthLabel(first)}
            bName={monthLabel(last)}
            rows={[
              {
                label: "Электр энергия, жами",
                unit: "минг кВт·с",
                a: (elecOf(first).internal + elecOf(first).external) / 1000,
                b: (elecOf(last).internal + elecOf(last).external) / 1000,
              },
              {
                label: "Ички цехлар истеъмоли",
                unit: "минг кВт·с",
                a: elecOf(first).internal / 1000,
                b: elecOf(last).internal / 1000,
              },
              {
                label: "Ташқи истеъмолчилар",
                unit: "минг кВт·с",
                a: elecOf(first).external / 1000,
                b: elecOf(last).external / 1000,
              },
              {
                label: "Ишлаб чиқариш, факт",
                unit: trend?.unit ?? "тн",
                a: trend?.points[0]?.fakt ?? 0,
                b: trend?.points[trend.points.length - 1]?.fakt ?? 0,
              },
            ]}
          />
        </Card>
      </div>
    </Section>
  );
}
