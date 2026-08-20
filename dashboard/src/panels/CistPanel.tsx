import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getCisterns, getCisternsList } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel, exact } from "../lib/format";
import { isUnverified } from "../lib/dataQuality";
import type { CisternKind } from "../lib/adapters/resources";
import {
  CISTERN_KIND_LABEL,
  CISTERN_KIND_UNIT,
  cisternLabel,
  cisternVM,
} from "../lib/adapters/resources";
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

/**
 * Ўлчов бирлиги гуруҳлари. Ҳар бири ўз картасида — цистерна сони (дона),
 * автотранспортдаги тонна ва бирлиги номаълум «бошқа» юклар бир шкалага
 * қўйилмайди. Гуруҳ сервернинг `transport_type` майдонидан аниқланади.
 */
const KINDS = ["cistern", "tonne", "other"] as const satisfies readonly CisternKind[];

/** Ойлар кесимидаги диаграммада нечта модда кўрсатилади. */
const MAIN_COUNT = 3;
const MAIN_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)"];

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

  const top = vm?.positions.slice(0, 6) ?? [];

  /* Ойлар кесимидаги диаграмма фақат **цистерна сони** ни кўрсатади, шунинг
     учун унга бошқа бирликдаги позициялар кирмайди. Модда номлари қўлда
     ёзилмайди — рўйхат маълумотнинг ўзидан, ҳажм бўйича олинади. */
  const main = (vm?.positions ?? []).filter((x) => x.kind === "cistern").slice(0, MAIN_COUNT);
  const mainColors = [p.s1, p.s2, p.s3];

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
        isEmpty={() => !vm || vm.positions.length === 0}
        emptyTitle="Ушбу давр учун цистерна маълумоти йўқ"
      >
        {() =>
          vm && (
            <>
              <div className={GRID.g6}>
                {top.map((pos, i) => (
                  <StatTile
                    key={pos.key}
                    label={cisternLabel(pos)}
                    value={<MaskedValue area={AREA}>{exact(pos.value)}</MaskedValue>}
                    unit={masked ? undefined : (CISTERN_KIND_UNIT[pos.kind].tile ?? undefined)}
                    stripe={i === 0 ? "var(--s1)" : i === 1 ? "var(--s2)" : undefined}
                    foot={
                      <Pill>
                        <Masked area={AREA}>{nf(pos.deliveries)} етказиш</Masked>
                      </Pill>
                    }
                  />
                ))}
              </div>

              {main.length > 0 && (
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
                        items={main.map((pos, i) => ({
                          name: pos.name,
                          color: MAIN_COLORS[i],
                        }))}
                      />
                      <Columns
                        labels={vm.months.map((m) => m.label)}
                        fullLabels={vm.months.map((m) => m.full)}
                        height={230}
                        thick={20}
                        ariaLabel="Ойлар кесимида темир йўл цистерналари сони"
                        vFmt={(v) => nf(v) + " цистерна"}
                        series={main.map((pos, i) => ({
                          name: pos.name,
                          color: mainColors[i],
                          values: vm.months.map((m) => m.byKey[pos.key] ?? 0),
                        }))}
                      />
                      <TableToggle
                        caption="Ойлар кесимида темир йўл цистерналари"
                        cols={[
                          { t: "Ой" },
                          ...main.map((pos) => ({ t: pos.name, num: true as const })),
                        ]}
                        rows={vm.months.map((m) => ({
                          key: m.month,
                          cells: [m.full, ...main.map((pos) => nf(m.byKey[pos.key] ?? 0))],
                        }))}
                      />
                    </Card>
                  )}
                </Section>
              )}

              <Section title="Моддалар кесимида" note="давр бўйича жами">
                {masked ? (
                  <Card>
                    <DataTable
                      caption="Моддалар кесимида цистерна ва етказишлар"
                      cols={[
                        { t: "Модда" },
                        { t: "Қиймат", num: true },
                        { t: "Етказишлар", num: true },
                      ]}
                      rows={vm.positions.map((pos) => ({
                        key: pos.key,
                        cells: [
                          cisternLabel(pos),
                          <Masked area={AREA}>{exact(pos.value)}</Masked>,
                          <Masked area={AREA}>{nf(pos.deliveries)}</Masked>,
                        ],
                      }))}
                    />
                  </Card>
                ) : (
                  /* Цистерна сони (дона), автотранспортдаги тонна ва бирлиги
                     номаълум «бошқа» юклар — учта турли ўлчов бирлиги. Бир
                     диаграммада юзлаб тонна ёнида бир нечта цистерна устуни
                     кўринмай кетарди, шунинг учун ҳар бири ўз картасида, ўз
                     шкаласида. */
                  <div className={GRID.g2}>
                    {KINDS.map((kind) => {
                      const list = vm.positions.filter((pos) => pos.kind === kind);
                      if (list.length === 0) return null;
                      const unit = CISTERN_KIND_UNIT[kind];
                      return (
                        <Card key={kind} title={CISTERN_KIND_LABEL[kind]}>
                          <div className="mt-2">
                            <BarsH
                              ariaLabel={`${CISTERN_KIND_LABEL[kind]} — моддалар кесимида`}
                              rows={list.map((pos) => ({
                                label: pos.name,
                                v: pos.value,
                                extra: ["Етказишлар", `${nf(pos.deliveries)} та`],
                              }))}
                              rowH={26}
                              padR={74}
                              vName={unit.series}
                              vFmt={(v) => exact(v) + unit.short}
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
