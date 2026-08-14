import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getCisterns, getCisternsList } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel, exact } from "../lib/format";
import { isUnverified } from "../lib/dataQuality";
import { CISTERN_KIND_LABEL, cisternVM } from "../lib/adapters/resources";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { ChartLegend } from "../components/ChartLegend";
import { Columns } from "../components/Columns";
import { BarsH } from "../components/BarsH";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { Masked, MaskedChart, MaskedValue, UnverifiedBanner } from "../components/Masked";
import { Loader } from "../components/states";

const AREA = "cisterns";

/** Устун диаграммада кўрсатиладиган асосий уч материал. */
const MAIN = ["Азотная к-та цистерны", "Аммиак цистерны", "Сода"];

export function CistPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const masked = isUnverified(AREA);

  const sumQ = useQuery(`cist-sum_${key}`, (s) => getCisterns(period, { period: "monthly" }, s));
  const listQ = useQuery(`cist-list_${key}`, (s) => getCisternsList(period, { limit: 300 }, s));

  const vm = useMemo(
    () =>
      sumQ.data ? cisternVM(sumQ.data, listQ.data?.rows ?? [], listQ.data?.total ?? 0) : null,
    [sumQ.data, listQ.data],
  );

  const top = vm?.materials.slice(0, 6) ?? [];

  return (
    <>
      <UnverifiedBanner
        area={AREA}
        extra="Реестрдаги «манба файл» устуни такрорланишни кўриш имконини беради."
      />

      <Loader
        q={sumQ}
        height={260}
        notAvailableWhat="/cisterns"
        isEmpty={() => !vm || vm.materials.length === 0}
        emptyTitle="Ушбу давр учун цистерна маълумоти йўқ"
      >
        {() =>
          vm && (
            <>
              <div className={GRID.g6}>
                {top.map((m, i) => (
                  <StatTile
                    key={m.material}
                    label={m.material}
                    value={<MaskedValue area={AREA}>{exact(m.value)}</MaskedValue>}
                    unit={masked ? undefined : m.kind === "tonne" ? "т" : "цистерна"}
                    stripe={i === 0 ? "var(--s1)" : i === 1 ? "var(--s2)" : undefined}
                    foot={
                      <Pill>
                        <Masked area={AREA}>{nf(m.deliveries)} етказиш</Masked>
                      </Pill>
                    }
                  />
                ))}
              </div>

              <Section
                className="mt-5"
                title="Ойлар кесимида"
                note={`${periodLabel(months)} · цистерна сони`}
              >
                {masked ? (
                  <MaskedChart area={AREA} what="Ойлар кесимидаги цистерна диаграммаси" />
                ) : (
                  <Card>
                    <ChartLegend
                      items={MAIN.map((name, i) => ({
                        name,
                        color: ["var(--s1)", "var(--s2)", "var(--s3)"][i],
                      }))}
                    />
                    <Columns
                      labels={vm.months.map((m) => m.label)}
                      fullLabels={vm.months.map((m) => m.full)}
                      height={230}
                      thick={20}
                      ariaLabel="Ойлар кесимида темир йўл цистерналари сони"
                      vFmt={(v) => nf(v) + " цистерна"}
                      series={MAIN.map((name, i) => ({
                        name,
                        color: [p.s1, p.s2, p.s3][i],
                        values: vm.months.map((m) => m.byMaterial[name] ?? 0),
                      }))}
                    />
                    <TableToggle
                      caption="Ойлар кесимида темир йўл цистерналари"
                      cols={[{ t: "Ой" }, ...MAIN.map((n) => ({ t: n, num: true as const }))]}
                      rows={vm.months.map((m) => ({
                        key: m.month,
                        cells: [m.full, ...MAIN.map((n) => nf(m.byMaterial[n] ?? 0))],
                      }))}
                    />
                  </Card>
                )}
              </Section>

              <Section title="Материаллар кесимида" note="давр бўйича жами">
                {masked ? (
                  <Card>
                    <DataTable
                      caption="Материаллар кесимида цистерна ва етказишлар"
                      cols={[
                        { t: "Материал" },
                        { t: "Қиймат", num: true },
                        { t: "Етказишлар", num: true },
                      ]}
                      rows={vm.materials.map((m) => ({
                        key: m.material,
                        cells: [
                          m.material,
                          <Masked area={AREA}>{exact(m.value)}</Masked>,
                          <Masked area={AREA}>{nf(m.deliveries)}</Masked>,
                        ],
                      }))}
                    />
                  </Card>
                ) : (
                  /* Цистерна сони (дона) ва автотранспортдаги тонна — иккита
                     турли ўлчов бирлиги. Бир диаграммада юзлаб тонна ёнида
                     бир нечта цистерна устуни кўринмай кетарди, шунинг учун ҳар
                     бири ўз картасида, ўз шкаласида. */
                  <div className={GRID.g2}>
                    {(["cistern", "tonne"] as const).map((kind) => {
                      const list = vm.materials.filter((m) => m.kind === kind);
                      if (list.length === 0) return null;
                      return (
                        <Card key={kind} title={CISTERN_KIND_LABEL[kind]}>
                          <div className="mt-2">
                            <BarsH
                              ariaLabel={`${CISTERN_KIND_LABEL[kind]} — материаллар кесимида`}
                              rows={list.map((m) => ({
                                label: m.material,
                                v: m.value,
                                extra: ["Етказишлар", `${nf(m.deliveries)} та`],
                              }))}
                              rowH={26}
                              padR={74}
                              vName={kind === "cistern" ? "Цистерна" : "Тонна"}
                              vFmt={(v) => exact(v) + (kind === "cistern" ? " цис." : " т")}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section
                title="Ҳаракатлар реестри"
                note={
                  <Loader q={listQ} height={40} notAvailableWhat="/cisterns/list">
                    {(d) => <>{d.total} та ёзувдан {d.rows.length} таси кўрсатилган</>}
                  </Loader>
                }
              >
                <Loader q={listQ} height={220} notAvailableWhat="/cisterns/list">
                  {() => (
                    <Card>
                      <DataTable
                        caption="Юк ҳаракатлари реестри"
                        cols={[
                          { t: "Сана" },
                          { t: "Вақт" },
                          { t: "Юк тури" },
                          { t: "Миқдор", num: true },
                          { t: "Манба файл", wrap: true },
                        ]}
                        rows={vm.tx.map((t) => ({
                          key: t.key,
                          cells: [
                            <span className="font-mono">{t.day}</span>,
                            <span className="font-mono">{t.time ?? "—"}</span>,
                            t.material,
                            <Masked area={AREA}>{exact(t.value)}</Masked>,
                            <span className="text-ink-3">{t.source}</span>,
                          ],
                        }))}
                      />
                    </Card>
                  )}
                </Loader>
              </Section>
            </>
          )
        }
      </Loader>
    </>
  );
}
