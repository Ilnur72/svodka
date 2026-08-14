import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getElectricityByObject } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel } from "../lib/format";
import { ENERGY_SUBTOTAL_NOTE } from "../lib/dataQuality";
import {
  EXTERNAL_TYPE,
  energyObjects,
  energyTrendFromObjects,
  indexOfMax,
  indexOfMin,
} from "../lib/adapters/energy";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { ElectricityTrendCard } from "../components/ElectricityTrendCard";
import { BarsH } from "../components/BarsH";
import { ShareBar } from "../components/ShareBar";
import { TableToggle } from "../components/TableToggle";
import { Loader, Skeleton } from "../components/states";

const kwh = (v: number) => nf(v, 0) + " кВт·с";

export function EnergyPanel({ period, months }: PanelProps) {
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;
  // 3 ойгача — кунлик эгри чизиқ; ундан узун даврда кунлар ўқда сиқилиб
  // кетади, шунинг учун ойлик устунлар.
  const granularity: "daily" | "monthly" = months.length <= 3 ? "daily" : "monthly";

  // Динамика ҳам, бўлинмалар кесими ҳам `groupBy=object` дан ҳисобланади:
  // серверда `ЭНЦ общ.` йиғинди сатри `groupBy=type` да «Чирчик завод» ичига
  // қўшиб юборилган ва у ерда ажратиб бўлмайди (қаранг: adapters/energy.ts).
  const allQ = useQuery(`elec-obj-all_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { period: granularity }, s),
  );
  const extQ = useQuery(`elec-obj-ext_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { type: EXTERNAL_TYPE, period: granularity }, s),
  );
  const trendQ = allQ;

  const trend = useMemo(
    () =>
      allQ.data && extQ.data
        ? energyTrendFromObjects(allQ.data, extQ.data, granularity, multiMonth)
        : null,
    [allQ.data, extQ.data, granularity, multiMonth],
  );

  // Ички бўлинмалар = барча объектлар минус ташқи абонентлар. Шу йўл
  // «Ингичка» ва «Навои ГТР» турларини ҳам ички деб тўғри ушлайди.
  const { internal, external } = useMemo(() => {
    const all = allQ.data ? energyObjects(allQ.data) : [];
    const ext = extQ.data ? energyObjects(extQ.data) : [];
    const extNames = new Set(ext.map((x) => x.name));
    return { internal: all.filter((x) => !extNames.has(x.name)), external: ext };
  }, [allQ.data, extQ.data]);

  const values = trend?.points.map((x) => x.total) ?? [];
  const maxI = indexOfMax(values);
  const minI = indexOfMin(values);
  const unitName = granularity === "daily" ? "кун" : "ой";

  return (
    <>
      {trend && trend.excluded > 0 && (
        <Banner tone="info">
          <b>Такрорий ҳисоб тузатилди.</b> {ENERGY_SUBTOTAL_NOTE} Ушбу давр учун йиғиндидан{" "}
          {kwh(trend.excluded)} чиқарилди — хом жавобдаги {kwh(trend.total + trend.excluded)} ўрнига{" "}
          <b>{kwh(trend.total)}</b>.
        </Banner>
      )}

      <Loader q={trendQ} height={120} notAvailableWhat="/electricity">
        {() =>
          trend && (
            <>
              <div className={GRID.g6}>
                <StatTile
                  label="Комбинат бўйича жами"
                  value={nf(trend.total, 0)}
                  unit="кВт·с"
                  stripe="var(--s1)"
                  foot={<Pill>{periodLabel(months)}</Pill>}
                />
                <StatTile
                  label="Ички цехлар"
                  value={nf(trend.internalTotal, 0)}
                  unit="кВт·с"
                  foot={
                    <Pill>
                      {trend.total ? nf((trend.internalTotal / trend.total) * 100, 1) : "—"}%
                    </Pill>
                  }
                />
                <StatTile
                  label="Ташқи истеъмолчилар"
                  value={nf(trend.externalTotal, 0)}
                  unit="кВт·с"
                  stripe="var(--s2)"
                  foot={
                    <Pill>
                      {trend.total ? nf((trend.externalTotal / trend.total) * 100, 1) : "—"}%
                    </Pill>
                  }
                />
                <StatTile
                  label={`Ўртача (1 ${unitName})`}
                  value={nf(trend.points.length ? trend.total / trend.points.length : 0, 0)}
                  unit="кВт·с"
                />
                <StatTile
                  label={`Энг юқори ${unitName}`}
                  value={maxI >= 0 ? nf(values[maxI], 0) : "—"}
                  unit="кВт·с"
                  stripe="var(--warn)"
                  foot={maxI >= 0 ? <Pill>{trend.points[maxI].full}</Pill> : undefined}
                />
                <StatTile
                  label={`Энг паст ${unitName}`}
                  value={minI >= 0 ? nf(values[minI], 0) : "—"}
                  unit="кВт·с"
                  foot={minI >= 0 ? <Pill>{trend.points[minI].full}</Pill> : undefined}
                />
              </div>

              <Section
                className="mt-5"
                title={granularity === "daily" ? "Кунлик истеъмол динамикаси" : "Ойлик истеъмол динамикаси"}
                note="кВт·соат"
              >
                <ElectricityTrendCard trend={trend} height={280} />
              </Section>

              <Section title="Истеъмол тузилиши">
                <Card>
                  <ShareBar
                    parts={[
                      { name: "Ички цехлар", value: trend.internalTotal, color: "var(--s1)" },
                      { name: "Ташқи истеъмолчилар", value: trend.externalTotal, color: "var(--s2)" },
                    ]}
                  />
                  <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-3">
                    {ENERGY_SUBTOTAL_NOTE}
                  </p>
                </Card>
              </Section>
            </>
          )
        }
      </Loader>

      <Section title="Бўлинмалар кесимида" note="давр бўйича жами, кВт·соат">
        {allQ.loading || extQ.loading ? (
          <Skeleton height={220} />
        ) : (
          <div className={GRID.g2}>
            <Loader
              q={allQ}
              height={220}
              notAvailableWhat="/electricity?groupBy=object"
              isEmpty={() => internal.length === 0}
              emptyTitle="Ички бўлинмалар бўйича маълумот йўқ"
            >
              {() => (
                <Card
                  title="Комбинат цех ва хизматлари"
                  sub={`${internal.filter((x) => x.total > 0).length} та бўлинма`}
                >
                  <div className="mt-2">
                    <BarsH
                      ariaLabel="Комбинат цех ва хизматлари бўйича электр истеъмоли"
                      rows={internal
                        .filter((x) => x.total > 0)
                        .map((x) => ({
                          label: x.name,
                          v: x.total,
                          extra: [
                            "Улуш",
                            nf((x.total / (trend?.internalTotal || 1)) * 100, 2) + "%",
                          ],
                        }))}
                      rowH={24}
                      padR={82}
                      vName="Истеъмол"
                      vFmt={(v) => nf(v / 1000, 0) + " минг"}
                    />
                  </div>
                  <TableToggle
                    caption="Комбинат цех ва хизматлари бўйича электр истеъмоли"
                    cols={[{ t: "Бўлинма" }, { t: "кВт·с", num: true }, { t: "Улуш, %", num: true }]}
                    rows={internal.map((x) => ({
                      key: x.name,
                      cells: [
                        x.name,
                        nf(x.total),
                        nf((x.total / (trend?.internalTotal || 1)) * 100, 2),
                      ],
                    }))}
                  />
                </Card>
              )}
            </Loader>

            <Loader
              q={extQ}
              height={220}
              notAvailableWhat="/electricity?groupBy=object"
              isEmpty={() => external.length === 0}
              emptyTitle="Ташқи абонентлар бўйича маълумот йўқ"
            >
              {() => (
                <Card
                  title="Ташқи истеъмолчилар"
                  sub={`${external.filter((x) => x.total > 0).length} та фаол абонент`}
                >
                  <div className="mt-2">
                    <BarsH
                      ariaLabel="Ташқи истеъмолчилар бўйича электр истеъмоли"
                      rows={external
                        .filter((x) => x.total > 0)
                        .map((x) => ({
                          label: x.name,
                          v: x.total,
                          extra: [
                            "Улуш",
                            nf((x.total / (trend?.externalTotal || 1)) * 100, 2) + "%",
                          ],
                        }))}
                      rowH={24}
                      padR={82}
                      vName="Истеъмол"
                      vFmt={(v) => nf(v / 1000, 1) + " минг"}
                    />
                  </div>
                  <TableToggle
                    caption="Ташқи истеъмолчилар бўйича электр истеъмоли"
                    cols={[{ t: "Абонент" }, { t: "кВт·с", num: true }, { t: "Улуш, %", num: true }]}
                    rows={external.map((x) => ({
                      key: x.name,
                      cells: [
                        x.name,
                        nf(x.total),
                        nf((x.total / (trend?.externalTotal || 1)) * 100, 2),
                      ],
                    }))}
                  />
                </Card>
              )}
            </Loader>
          </div>
        )}
      </Section>
    </>
  );
}
