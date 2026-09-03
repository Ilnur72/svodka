import { useMemo } from "react";
import type { PanelProps } from "../types";
import type { GasStats } from "../api/types";
import { getGasDayLogs, getGasStats } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { compactNum, dateLabel, exact, nf, periodLabel } from "../lib/format";
import { gasVM } from "../lib/adapters/gas";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { TimeLine } from "../components/TimeLine";
import { BarsH } from "../components/BarsH";
import { ShareDonut } from "../components/ShareDonut";
import { TableToggle } from "../components/TableToggle";
import { EmptyState, Loader } from "../components/states";

/**
 * «Газ» — табиий газ ҳисоблагичларидан келган **кунлик** ўлчовлар.
 *
 * ═══ Манба «Водород» кўринишидан бошқа ══════════════════════════════════
 *
 * Ёндош «Водород» кўриниши ойлик цех сводкаларига (`/hydrogen`) таянади, бу
 * ерда эса ҳисоблагичларнинг ўз ўлчовлари. Иккови бир экранда аралаштирилмайди
 * ва бир-бирининг рақамини тасдиқламайди — шунинг учун улар алоҳида
 * кўринишларда.
 *
 * ═══ Бўш ҳолат — биринчи даражали ҳолат ═════════════════════════════════
 *
 * Ўлчовлар базага импорт орқали тушади ва ҳали умуман бўлмаслиги мумкин.
 * Шунда панел **нол кўрсатмайди**: нол «сарф нол эди» деган маънони берарди,
 * «маълумот келмади» эса бутунлай бошқа нарса. Иккови ажратилади, устига
 * импорт ҳолати (`stats`) орқали «даврда йўқ» ва «умуман йўқ» ҳам
 * фарқланади — раҳбар қайси бирини кутишни билиши учун.
 */
export function GasPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;

  const dayQ = useQuery(`gas-day_${key}`, (s) => getGasDayLogs(period, {}, s));
  // Импорт ҳолати даврга боғлиқ эмас, шунинг учун калит доимий — давр
  // алмашганда қайта сўралмайди. Ёрдамчи сўров: у йиқилса ҳам панел ишлайди.
  const statsQ = useQuery("gas-stats", (s) => getGasStats(s));

  const vm = useMemo(() => (dayQ.data ? gasVM(dayQ.data, multiMonth) : null), [dayQ.data, multiMonth]);

  return (
    <Loader q={dayQ} height={260} notAvailableWhat="газ ўлчовлари бўлими">
      {() => {
        if (!vm) return null;

        if (vm.points.length === 0) {
          return <GasEmpty months={months} stats={statsQ.data} skipped={vm.skipped} />;
        }

        const share = (v: number): number => (v / (vm.total || 1)) * 100;

        return (
          <>
            {vm.skipped > 0 && (
              <Banner tone="warn">
                <b>{nf(vm.skipped)} та ўлчовда ҳажм кўрсаткичи тўлдирилмаган.</b> Улар йиғиндига
                қўшилмади ва бошқа кўрсаткич билан ҳам алмаштирилмади — қуйидаги сонлар фақат
                ҳажми ўлчанган ёзувларга тегишли.
              </Banner>
            )}

            <div className={GRID.g4}>
              <StatTile
                label="Табиий газ сарфи, жами"
                value={nf(vm.total, 0)}
                unit="м³"
                stripe="var(--s2)"
                foot={<Pill>{periodLabel(months)}</Pill>}
              />
              <StatTile
                label="Кунлик ўртача"
                value={nf(vm.total / vm.points.length, 0)}
                unit="м³"
                foot={<Pill>{nf(vm.points.length)} кун ўлчанган</Pill>}
              />
              <StatTile
                label="Энг юқори кун"
                value={nf(vm.max, 0)}
                unit="м³"
                foot={vm.maxKey ? <Pill>{vm.maxKey}</Pill> : undefined}
              />
              <StatTile
                label="Ўлчов нуқталари"
                value={nf(vm.objects.length)}
                unit="та"
                foot={<Pill>ўлчов келган нуқталар</Pill>}
              />
            </div>

            <Section className="mt-5" title="Кунлик табиий газ сарфи" note="м³">
              <Card>
                <TimeLine
                  labels={vm.points.map((x) => x.label)}
                  fullLabels={vm.points.map((x) => x.full)}
                  height={250}
                  ariaLabel="Кунлик табиий газ сарфи, м³"
                  yTickFmt={compactNum}
                  vFmt={(v) => nf(v, 0) + " м³"}
                  series={[
                    { name: "Табиий газ сарфи", color: p.s2, values: vm.points.map((x) => x.value) },
                  ]}
                />
                {/* Жадвалда қиймат яхлитланмайди: диаграмма ва плиткалар ихчам
                    кўринишни беради, аниқ сон эса шу ерда қолади. */}
                <TableToggle
                  caption="Кунлик табиий газ сарфи"
                  cols={[{ t: "Кун" }, { t: "Кунлик сарф, м³", num: true }]}
                  rows={vm.points.map((x) => ({ key: x.key, cells: [x.full, exact(x.value)] }))}
                />
              </Card>
            </Section>

            <Section title="Ўлчов нуқталари кесимида">
              <div className={GRID.g32}>
                <Card
                  title="Давр бўйича сарф, м³"
                  sub={`${nf(vm.objects.length)} та нуқта`}
                  note={
                    vm.objects.some((o) => o.unnamed)
                      ? "Манбада номи тўлдирилмаган нуқталар нейтрал рангда ва рўйхат охирида — уларнинг ҳажми жамидан чиқарилмади."
                      : undefined
                  }
                >
                  <div className="mt-2">
                    <BarsH
                      ariaLabel="Ўлчов нуқталари кесимида табиий газ сарфи"
                      rows={vm.objects.map((o) => ({
                        label: o.name,
                        v: o.total,
                        color: o.unnamed ? "var(--rule)" : undefined,
                        extra: ["Улуш", nf(share(o.total), 2) + "%"],
                      }))}
                      rowH={28}
                      padR={78}
                      vName="Сарф, м³"
                      vFmt={(v) => nf(v, 0)}
                    />
                  </div>
                </Card>

                <Card
                  title="Сарф тузилиши"
                  note={`Ҳалқа марказидаги сон — давр бўйича жами ${nf(vm.total, 0)} м³, яъни сегментлар йиғиндиси марказдаги сонга тенг.`}
                >
                  <ShareDonut
                    segments={vm.objects.map((o) => ({
                      key: o.key,
                      name: o.name,
                      value: o.total,
                      muted: o.unnamed,
                    }))}
                    total={vm.total}
                    centerNote="м³, жами"
                    ariaLabel={`Ўлчов нуқталари бўйича табиий газ сарфининг тақсимоти, жами ${nf(vm.total, 0)} м³.`}
                  />
                  <TableToggle
                    caption="Ўлчов нуқталари бўйича табиий газ сарфи"
                    cols={[
                      { t: "Ўлчов нуқтаси", wrap: true },
                      { t: "Сарф, м³", num: true },
                      { t: "Ўлчанган кун", num: true },
                      { t: "Улуш", num: true },
                    ]}
                    rows={vm.objects.map((o) => ({
                      key: o.key,
                      cells: [o.name, exact(o.total), nf(o.days), nf(share(o.total), 2) + "%"],
                    }))}
                  />
                </Card>
              </div>
            </Section>
          </>
        );
      }}
    </Loader>
  );
}

/**
 * Ўлчов топилмаган ҳолат.
 *
 * Бу ерда битта ҳам сон чизилмайди — плиткалар нол билан кўрсатилса, у
 * «сарф нол эди» деб ўқиларди. Матн эса импорт ҳолатига қараб аниқлашади:
 * маълумот умуман йўқми, ёки бор-у, бошқа кунларгами.
 */
function GasEmpty({
  months,
  stats,
  skipped,
}: {
  months: string[];
  stats: GasStats | null;
  skipped: number;
}) {
  const nothingAtAll = stats !== null && stats.day_logs === 0;
  const lastDay = stats?.last_day_log ?? null;

  return (
    <>
      {skipped > 0 && (
        <Banner tone="warn">
          <b>Ушбу даврда {nf(skipped)} та ёзув бор, лекин уларда ҳажм кўрсаткичи тўлдирилмаган.</b>{" "}
          Шунинг учун сарф ҳисобланмади — бўш катак нол деб олинмайди.
        </Banner>
      )}

      <EmptyState
        title="Табиий газ ўлчовлари топилмади"
        text={
          <>
            {periodLabel(months)} даври учун ҳисоблагичлардан ўлчов келмаган.{" "}
            {nothingAtAll
              ? "Ўлчовлар тизимга ҳали умуман юкланмаган — маълумот юклангач бўлим ўзи тўлади."
              : lastDay
                ? `Тизимдаги энг сўнгги ўлчов куни — ${dateLabel(lastDay)}; бошқа даврни танлаб кўринг.`
                : "Бу серверда бўлимнинг йўқлиги эмас: сўров муваффақиятли, жавоб бўш."}{" "}
            Сарф нол деб кўрсатилмади: нол «сарф бўлмаган» дегани, бу эса «ўлчов келмаган».
          </>
        }
      />
    </>
  );
}
