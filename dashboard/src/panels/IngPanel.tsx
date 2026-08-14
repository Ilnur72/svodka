import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getIngichkaDaily, getIngichkaMonthly } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { nf, periodLabel } from "../lib/format";
import { isUnverified } from "../lib/dataQuality";
import { ingichkaVM } from "../lib/adapters/resources";
import { ingBreakdown } from "../lib/adapters/ingichkaReasons";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { Columns } from "../components/Columns";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { Masked, MaskedChart, MaskedValue, UnverifiedBanner } from "../components/Masked";
import { Loader } from "../components/states";
import { dateLabel, dateTick } from "../lib/format";

const AREA = "ingichka";

/** Даврдаги кунлар сони — тайёрлик коэффициенти базаси учун. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!isFinite(a) || !isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function IngPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;
  const masked = isUnverified(AREA);

  const dailyQ = useQuery(`ing-daily_${key}`, (s) => getIngichkaDaily(period, s));
  const monthlyQ = useQuery(`ing-monthly_${key}`, (s) => getIngichkaMonthly(period, s));

  const vm = useMemo(
    () =>
      dailyQ.data
        ? ingichkaVM(dailyQ.data, monthlyQ.data ?? [], daysBetween(period.from, period.to))
        : null,
    [dailyQ.data, monthlyQ.data, period.from, period.to],
  );

  /** Сабаб гуруҳлари ва фабрикалар — изоҳ матнидан клиент томонида. */
  const breakdown = useMemo(
    () => ingBreakdown(vm?.stops ?? []),
    [vm],
  );

  /** Кунлар кесимида йўқотилган соатлар (масканланмаган ҳолда чизилади). */
  const byDay = useMemo(() => {
    if (!vm) return [];
    const m = new Map<string, number>();
    for (const s of vm.stops) m.set(s.day, (m.get(s.day) ?? 0) + s.hours);
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, hours]) => ({
        day,
        label: dateTick(day, multiMonth),
        full: dateLabel(day),
        hours,
      }));
  }, [vm, multiMonth]);

  return (
    <>
      <UnverifiedBanner
        area={AREA}
        extra="Тўхташ вақтлари (бошланиши/тугаши) ҳам манбадаги тартибга мос келмагани учун яширилган."
      />

      <Loader
        q={dailyQ}
        height={260}
        notAvailableWhat="/ingichka"
        isEmpty={() => !vm || vm.stops.length === 0}
        emptyTitle="Ушбу давр учун тўхташ ёзувлари йўқ"
      >
        {() =>
          vm && (
            <>
              <div className={GRID.g4}>
                <StatTile
                  label="Ускуна тўхташи, жами"
                  value={<MaskedValue area={AREA}>{nf(vm.totalHours, 1)}</MaskedValue>}
                  unit={masked ? undefined : "соат"}
                  stripe="var(--crit)"
                  foot={<Pill>{vm.events} та ҳодиса</Pill>}
                />
                <StatTile
                  label="Тайёрлик коэффициенти"
                  value={<MaskedValue area={AREA}>{nf(vm.availability, 2)}</MaskedValue>}
                  unit={masked ? undefined : "%"}
                  foot={<Pill>3 фабрика × 24 соат базасида</Pill>}
                />
                <StatTile
                  label="Ўртача тўхташ"
                  value={
                    <MaskedValue area={AREA}>
                      {nf(vm.totalHours / (vm.events || 1), 2)}
                    </MaskedValue>
                  }
                  unit={masked ? undefined : "соат"}
                />
                <StatTile
                  label="Тўхташ бўлган кунлар"
                  value={nf(vm.daysWithStops)}
                  unit="кун"
                  stripe="var(--warn)"
                  foot={<Pill>{periodLabel(months)}</Pill>}
                />
              </div>

              <Section
                className="mt-5"
                title="Тўхташ сабаблари"
                note="йўқотилган соатлар бўйича, кўпдан камга"
              >
                {masked ? (
                  <MaskedChart area={AREA} what="Сабаблар кесимидаги диаграмма" />
                ) : (
                  <div className={GRID.g32}>
                    <Card
                      title="Сабаблар кесимида, соат"
                      sub="изоҳ матни бўйича автоматик таснифланган"
                    >
                      <BarsH
                        ariaLabel="Ингичка ИОФ — тўхташ сабаблари, соат"
                        rows={breakdown.reasons.map((r) => ({
                          label: r.name,
                          v: r.hours,
                          extra: [
                            "Ҳодисалар",
                            `${r.count} та · ${nf((r.hours / (breakdown.totalHours || 1)) * 100, 1)}%`,
                          ],
                        }))}
                        rowH={28}
                        padR={66}
                        vName="Йўқотилган соат"
                        vFmt={(v) => nf(v, 1) + " с"}
                      />
                      <TableToggle
                        caption="Тўхташ сабаблари"
                        cols={[
                          { t: "Сабаб гуруҳи" },
                          { t: "Соат", num: true },
                          { t: "Ҳодиса", num: true },
                          { t: "Улуш, %", num: true },
                        ]}
                        rows={breakdown.reasons.map((r) => ({
                          key: r.name,
                          cells: [
                            r.name,
                            nf(r.hours, 2),
                            nf(r.count),
                            nf((r.hours / (breakdown.totalHours || 1)) * 100, 1),
                          ],
                        }))}
                      />
                    </Card>
                    <Card
                      title="Фабрикалар кесимида"
                      sub="бир нечта фабрикага тегишли тўхташлар тенг тақсимланган"
                    >
                      <BarsH
                        ariaLabel="Ингичка ИОФ — фабрикалар кесимида тўхташ, соат"
                        rows={breakdown.fabs.map((f) => ({ label: f.name, v: f.hours }))}
                        rowH={30}
                        padR={66}
                        padL={120}
                        vName="Йўқотилган соат"
                        vFmt={(v) => nf(v, 1) + " с"}
                      />
                      <p className="mt-2.5 text-[11.5px] leading-normal text-ink-3">
                        Фабрика рақами изоҳ матнидан аниқланади («2ф-ка», «фаб-1»,
                        «на всех 3-х фабриках»). Рақам ёзилмаган ёзувлар
                        «Аниқланмаган» гуруҳига тушади.
                      </p>
                    </Card>
                  </div>
                )}
              </Section>

              <Section title="Кунлар кесимида тўхташ" note="соат">
                {masked ? (
                  <MaskedChart
                    area={AREA}
                    what="Кунлар кесимидаги тўхташ диаграммаси"
                  />
                ) : (
                  <Card>
                    <Columns
                      labels={byDay.map((d) => d.label)}
                      fullLabels={byDay.map((d) => d.full)}
                      height={210}
                      thick={18}
                      ariaLabel="Кунлар кесимида ускуна тўхташи, соат"
                      yTickFmt={(t) => nf(t, 0)}
                      vFmt={(v) => nf(v, 2) + " соат"}
                      series={[{ name: "Тўхташ", color: p.s1, values: byDay.map((d) => d.hours) }]}
                    />
                    <TableToggle
                      caption="Кунлар кесимида ускуна тўхташи"
                      cols={[{ t: "Кун" }, { t: "Тўхташ, соат", num: true }]}
                      rows={byDay.map((d) => ({ key: d.day, cells: [d.full, nf(d.hours, 2)] }))}
                    />
                  </Card>
                )}
              </Section>

              <Section
                title="Тўхташлар журнали"
                note={`${vm.stops.length} та ёзув · манбадаги изоҳлар ўзгартирилмаган`}
              >
                <Card>
                  <DataTable
                    caption="Ингичка ИОФ тўхташлар журнали"
                    cols={[
                      { t: "Сана" },
                      { t: "Бошланиши" },
                      { t: "Тугаши" },
                      { t: "Соат", num: true },
                      { t: "Изоҳ (манба)", wrap: true },
                    ]}
                    rows={vm.stops.map((s) => ({
                      key: s.key,
                      cells: [
                        <span className="font-mono">{s.day}</span>,
                        <Masked area={AREA}>
                          <span className="font-mono">{s.start ?? "—"}</span>
                        </Masked>,
                        <Masked area={AREA}>
                          <span className="font-mono">{s.end ?? "—"}</span>
                        </Masked>,
                        <Masked area={AREA}>{nf(s.hours, 2)}</Masked>,
                        <span className="text-ink-3">{s.note}</span>,
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
