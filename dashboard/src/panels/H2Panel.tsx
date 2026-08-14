import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getHydrogen } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel } from "../lib/format";
import { hydrogenObjects, hydrogenVM } from "../lib/adapters/resources";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { TimeLine } from "../components/TimeLine";
import { BarsH } from "../components/BarsH";
import { ShareBar } from "../components/ShareBar";
import { TableToggle } from "../components/TableToggle";
import { Loader } from "../components/states";

export function H2Panel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;

  const dailyQ = useQuery(`h2-daily_${key}`, (s) =>
    getHydrogen(period, { kind: "hydrogen", period: "daily" }, s),
  );
  const objQ = useQuery(`h2-obj_${key}`, (s) =>
    getHydrogen(period, { kind: "hydrogen", groupBy: "object" }, s),
  );
  const gasQ = useQuery(`h2-gas_${key}`, (s) =>
    getHydrogen(period, { kind: "gas", period: "monthly" }, s),
  );

  const vm = useMemo(
    () => (dailyQ.data ? hydrogenVM(dailyQ.data, multiMonth) : null),
    [dailyQ.data, multiMonth],
  );
  const objects = useMemo(
    () => (objQ.data ? hydrogenObjects(objQ.data).filter((x) => x.total > 0) : []),
    [objQ.data],
  );
  const gasTotal = useMemo(
    () => (gasQ.data ? gasQ.data.reduce((a, r) => a + (r.value ?? 0), 0) : null),
    [gasQ.data],
  );

  const empty = vm !== null && vm.total === 0;

  // Юқори учта истеъмолчи категориал рангларни олади, қолгани нейтрал
  // «Бошқалар» сегментига йиғилади — палитра айлантирилмайди.
  const shareParts = [
    ...objects.slice(0, 3).map((x, i) => ({
      name: x.name,
      value: x.total,
      color: ["var(--s1)", "var(--s2)", "var(--s3)"][i] as string,
    })),
    ...(objects.length > 3
      ? [
          {
            name: "Бошқалар",
            value: objects.slice(3).reduce((a, b) => a + b.total, 0),
            color: "var(--rule)",
          },
        ]
      : []),
  ];

  return (
    <Loader q={dailyQ} height={260} notAvailableWhat="/hydrogen">
      {() => (
        <>
          {empty && (
            <Banner tone="info">
              <b>Маълумот киритилмаган.</b> {periodLabel(months)} даври учун «Водород» варағида
              сарф кўрсаткичлари нол қийматда қолдирилган — цехлар бўйича ҳисоб юритилмаган ёки
              маълумот файлга киритилмаган. Бу серверда бўлимнинг йўқлиги эмас: сўров муваффақиятли,
              жавоб бўш.
            </Banner>
          )}

          <div className={GRID.g4}>
            <StatTile
              label="Водород сарфи, жами"
              value={nf(vm?.total ?? 0, 0)}
              unit="м³"
              stripe="var(--s3)"
              foot={<Pill>{periodLabel(months)}</Pill>}
            />
            <StatTile
              label="Кунлик ўртача"
              value={nf(vm && vm.points.length ? vm.total / vm.points.length : 0, 0)}
              unit="м³"
            />
            <StatTile
              label="Энг юқори кун"
              value={nf(vm?.max ?? 0, 0)}
              unit="м³"
              foot={vm?.maxKey ? <Pill>{vm.maxKey}</Pill> : undefined}
            />
            <StatTile
              label="Табиий газ сарфи"
              value={gasQ.notAvailable ? "—" : nf(gasTotal ?? 0, 0)}
              unit="м³"
              foot={
                gasQ.notAvailable ? (
                  <Pill>бўлим серверда йўқ</Pill>
                ) : (
                  <Pill>1 ва 2-пром. майдонча</Pill>
                )
              }
            />
          </div>

          {vm && vm.total > 0 ? (
            <>
              <Section className="mt-5" title="Кунлик водород сарфи" note="м³">
                <Card>
                  <TimeLine
                    labels={vm.points.map((x) => x.label)}
                    fullLabels={vm.points.map((x) => x.full)}
                    height={250}
                    ariaLabel="Кунлик водород сарфи, м³"
                    yTickFmt={(t) => nf(t / 1000, 0) + "к"}
                    vFmt={(v) => nf(v, 0) + " м³"}
                    series={[
                      { name: "Водород сарфи", color: p.s3, values: vm.points.map((x) => x.value) },
                    ]}
                  />
                  <TableToggle
                    caption="Кунлик водород сарфи"
                    cols={[{ t: "Кун" }, { t: "Кунлик сарф, м³", num: true }]}
                    rows={vm.points.map((x) => ({ key: x.key, cells: [x.full, nf(x.value)] }))}
                  />
                </Card>
              </Section>

              <Section title="Цехлар кесимида">
                <div className={GRID.g32}>
                  <Loader q={objQ} height={200} notAvailableWhat="/hydrogen?groupBy=object">
                    {() => (
                      <Card title="Давр бўйича сарф, м³" sub={`${objects.length} та истеъмолчи`}>
                        <div className="mt-2">
                          <BarsH
                            ariaLabel="Цехлар кесимида водород сарфи"
                            rows={objects.map((x) => ({
                              label: x.name,
                              v: x.total,
                              extra: ["Улуш", nf((x.total / (vm.total || 1)) * 100, 2) + "%"],
                            }))}
                            rowH={28}
                            padR={78}
                            vName="Сарф, м³"
                            vFmt={(v) => nf(v)}
                          />
                        </div>
                      </Card>
                    )}
                  </Loader>
                  <Card title="Истеъмол тузилиши">
                    <div className="mt-3.5">
                      <ShareBar parts={shareParts} />
                    </div>
                  </Card>
                </div>
              </Section>
            </>
          ) : (
            <Card className="mt-5">
              <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">
                Ушбу давр учун водород сарфи бўйича кўрсаткичлар мавжуд эмас.
              </div>
            </Card>
          )}
        </>
      )}
    </Loader>
  );
}
