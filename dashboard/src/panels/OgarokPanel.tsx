import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getOgarokDaily, getOgarokMonthly } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel, exact } from "../lib/format";
import { isUnverified } from "../lib/dataQuality";
import { ogarokVM } from "../lib/adapters/resources";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Columns } from "../components/Columns";
import { TimeLine } from "../components/TimeLine";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { Masked, MaskedChart, MaskedValue, UnverifiedBanner } from "../components/Masked";
import { Loader } from "../components/states";
import { cumulative } from "../lib/adapters/production";

const AREA = "ogarok";

export function OgarokPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;
  const masked = isUnverified(AREA);

  const dailyQ = useQuery(`ogarok-daily_${key}`, (s) => getOgarokDaily(period, s));
  const monthlyQ = useQuery(`ogarok-monthly_${key}`, (s) => getOgarokMonthly(period, s));

  const vm = useMemo(
    () => (dailyQ.data ? ogarokVM(dailyQ.data, monthlyQ.data ?? [], multiMonth) : null),
    [dailyQ.data, monthlyQ.data, multiMonth],
  );

  const cum = useMemo(() => (vm ? cumulative(vm.days.map((d) => d.physical), 2) : []), [vm]);

  return (
    <>
      <UnverifiedBanner area={AREA} />

      <Loader
        q={dailyQ}
        height={260}
        notAvailableWhat="/ogarok"
        isEmpty={() => !vm || vm.days.length === 0}
        emptyTitle="Ушбу давр учун огарок ёзувлари йўқ"
      >
        {() =>
          vm && (
            <>
              <div className={GRID.g6}>
                <StatTile
                  label="Жами қабул қилинган"
                  value={<MaskedValue area={AREA}>{nf(vm.total, 2)}</MaskedValue>}
                  unit={masked ? undefined : "т"}
                  stripe="var(--s2)"
                  foot={<Pill>{periodLabel(months)}</Pill>}
                />
                <StatTile
                  label="Етказиб бериш кунлари"
                  value={<MaskedValue area={AREA}>{nf(vm.deliveryDays)}</MaskedValue>}
                  unit={masked ? undefined : "кун"}
                />
                <StatTile
                  label="Машиналар сони"
                  value={<MaskedValue area={AREA}>{nf(vm.machines)}</MaskedValue>}
                  unit={masked ? undefined : "та"}
                />
                <StatTile
                  label="Стаканлар сони"
                  value={<MaskedValue area={AREA}>{nf(vm.cups)}</MaskedValue>}
                  unit={masked ? undefined : "та"}
                />
                <StatTile
                  label="Кунлик ўртача"
                  value={
                    <MaskedValue area={AREA}>
                      {nf(vm.total / (vm.deliveryDays || 1), 2)}
                    </MaskedValue>
                  }
                  unit={masked ? undefined : "т"}
                />
                <StatTile
                  label="Ёзувлар сони"
                  value={nf(vm.days.length)}
                  unit="ёзув"
                  stripe="var(--warn)"
                  foot={<Pill>саналар манбадаги кўринишида</Pill>}
                />
              </div>

              <Section className="mt-5" title="Кунлик қабул" note="физик вазн, тонна">
                {masked ? (
                  <MaskedChart area={AREA} what="Кунлик қабул диаграммаси" />
                ) : (
                  <Card>
                    <Columns
                      labels={vm.days.map((d) => d.label)}
                      fullLabels={vm.days.map((d) => d.full)}
                      height={230}
                      thick={18}
                      ariaLabel="Кунлик огарок қабули, тонна"
                      yTickFmt={(t) => nf(t, 0)}
                      vFmt={(v) => nf(v, 2) + " т"}
                      series={[
                        { name: "Қабул", color: p.s2, values: vm.days.map((d) => d.physical) },
                      ]}
                    />
                    <TableToggle
                      caption="Кунлик огарок қабули"
                      cols={[{ t: "Кун" }, { t: "Кунлик, т", num: true }]}
                      rows={vm.days.map((d) => ({ key: d.day, cells: [d.full, nf(d.physical, 2)] }))}
                    />
                  </Card>
                )}
              </Section>

              <Section title="Давр бошидан ўсиб борувчи якун" note="тонна">
                {masked ? (
                  <MaskedChart
                    area={AREA}
                    what="Ўсиб борувчи якун диаграммаси (API'даги кумулятив устун ҳам бузуқ)"
                  />
                ) : (
                  <Card>
                    <TimeLine
                      labels={vm.days.map((d) => d.label)}
                      fullLabels={vm.days.map((d) => d.full)}
                      height={230}
                      ariaLabel="Огарок қабули — давр бошидан ўсиб борувчи якун"
                      yTickFmt={(t) => nf(t, 0)}
                      vFmt={(v) => nf(v, 2) + " т"}
                      series={[{ name: "Давр бошидан", color: p.s2, values: cum }]}
                    />
                  </Card>
                )}
              </Section>

              <Section
                title="Етказиб бериш реестри"
                note={`${vm.days.length} та ёзув · саналар ва вақтлар манбадаги кўринишида`}
              >
                <Card>
                  <DataTable
                    caption="Огарок етказиб бериш реестри"
                    cols={[
                      { t: "Сана" },
                      { t: "Вақт" },
                      { t: "Машина", num: true },
                      { t: "Стакан", num: true },
                      { t: "Физик вазн, т", num: true },
                    ]}
                    rows={vm.days.map((d) => ({
                      key: `${d.day}-${d.time ?? ""}`,
                      cells: [
                        <span className="font-mono">{d.day}</span>,
                        <span className="font-mono">{d.time ?? "—"}</span>,
                        <Masked area={AREA}>{nf(d.machines)}</Masked>,
                        <Masked area={AREA}>{nf(d.cups)}</Masked>,
                        <Masked area={AREA}>{exact(d.physical)}</Masked>,
                      ],
                    }))}
                  />
                </Card>
              </Section>
            </>
          )
        }
      </Loader>
    </>
  );
}
