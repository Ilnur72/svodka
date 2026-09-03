import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getSolarKpi, getSolarKpiSpan, getSolarStations } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { compactNum, exact, nf, periodLabel } from "../lib/format";
import { solarKpiVM, solarSpan, solarStationsVM } from "../lib/adapters/solar";
import type { SolarSpan } from "../lib/adapters/solar";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { TimeLine } from "../components/TimeLine";
import { BarsH } from "../components/BarsH";
import { ChartLegend } from "../components/ChartLegend";
import { ShareDonut } from "../components/ShareDonut";
import { TableToggle } from "../components/TableToggle";
import { DataTable } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";

/**
 * «Қуёш станциялари» — комбинат қуёш электр станцияларининг ишлаб чиқариши.
 *
 * ═══ Иккита мустақил манба, иккита мустақил ҳолат ═══════════════════════
 *
 * Панел иккита сўровга таянади: станциялар справочниги (даврга боғлиқ эмас)
 * ва кунлик ўлчовлар (давр бўйича). Улар **бир-бирини блокламайди**:
 * ўлчовлар келмаса ҳам станциялар рўйхати кўринади, ва аксинча. Шунинг учун
 * ҳар бир бўлимнинг ўз `Loader` и бор — биттасининг `404` и бутун табни
 * бўшатиб қўймайди.
 *
 * ═══ Нега «Электр энергия» таби билан бирлаштирилмади ═══════════════════
 *
 * Ёндош «Электр энергия» бўлими ойлик цех сводкаларига таянади, бу ерда эса
 * станцияларнинг ўз кунлик ўлчовлари. Иккови бир экранда аралаштирилмайди ва
 * бир-бирининг рақамини тасдиқламайди.
 *
 * ═══ Бўш ҳолат — биринчи даражали ҳолат ═════════════════════════════════
 *
 * Ўлчов келмаган жойда **нол кўрсатилмайди**: нол «энергия ишлаб
 * чиқарилмади» дегани, «ўлчов келмаган» эса бутунлай бошқа нарса.
 *
 * Устига бўш экран **ўзини изоҳлайди**. Манбадаги ўлчовлар давр
 * танлагичидаги ойлар билан мос тушмаслиги мумкин — шунда панел тўғри
 * ишлаётган бўлса ҳам бўш кўринади ва «бузилибди» деб ўқилади. Шунинг учун
 * давр бўш чиққанда қўшимча сўров ишга тушиб, тизимдаги ўлчовлар қайси
 * саналар орасида турганини айтади. Бу сўров **фақат ўша ҳолатда**
 * юборилади (`enabled`), одатдаги ҳолатда қўшимча трафик йўқ.
 */
export function SolarPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;

  // Справочник даврга боғлиқ эмас, шунинг учун калит доимий — давр
  // алмашганда қайта сўралмайди.
  const stQ = useQuery("solar-stations", (s) => getSolarStations(s));
  const kpiQ = useQuery(`solar-kpi_${key}`, (s) => getSolarKpi(period, {}, s));

  const st = useMemo(() => (stQ.data ? solarStationsVM(stQ.data) : null), [stQ.data]);

  // Ўлчовларда фақат техник калит бор; ном справочникдан уланади. Справочник
  // ҳали келмаган бўлса харита бўш қолади ва станциялар нейтрал ном билан
  // кўрсатилади — қатор тушириб қолдирилмайди.
  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of stQ.data ?? []) {
      const n = r.stationName?.trim();
      if (n) m.set(r.stationCode, n);
    }
    return m;
  }, [stQ.data]);

  const kpi = useMemo(
    () => (kpiQ.data ? solarKpiVM(kpiQ.data, names, multiMonth) : null),
    [kpiQ.data, names, multiMonth],
  );

  // Чегара сўрови даврга боғлиқ эмас (калит доимий) ва фақат танланган
  // даврда ўлчов топилмаганда юборилади. Ёрдамчи сўров: у йиқилса ҳам панел
  // ишлайверади, бўш ҳолат матни эса умумийроқ бўлиб қолади.
  const noneInPeriod = kpiQ.data !== null && kpiQ.data.length === 0;
  const spanQ = useQuery("solar-kpi-span", (s) => getSolarKpiSpan(s), {
    enabled: noneInPeriod,
  });
  const span = useMemo(() => (spanQ.data ? solarSpan(spanQ.data) : null), [spanQ.data]);

  return (
    <>
      <Section title="Ишлаб чиқарилган электр энергия" note="кВт·соат">
        <Loader q={kpiQ} height={260} notAvailableWhat="қуёш станцияларининг кунлик ўлчовлари">
          {() => {
            if (!kpi) return null;
            if (kpi.points.length === 0) {
              return <SolarKpiEmpty months={months} skipped={kpi.skipped} span={span} />;
            }

            const share = (v: number): number => (v / (kpi.total || 1)) * 100;

            return (
              <>
                {kpi.skipped > 0 && (
                  <Banner tone="warn">
                    <b>{nf(kpi.skipped)} та ўлчовда ишлаб чиқариш кўрсаткичи тўлдирилмаган.</b> Улар
                    йиғиндига қўшилмади ва бошқа кўрсаткич билан ҳам алмаштирилмади — қуйидаги
                    сонлар фақат ўлчови келган ёзувларга тегишли.
                  </Banner>
                )}

                <div className={GRID.g4}>
                  <StatTile
                    label="Ишлаб чиқарилган энергия, жами"
                    value={nf(kpi.total, 0)}
                    unit="кВт·соат"
                    stripe="var(--s1)"
                    foot={<Pill>{periodLabel(months)}</Pill>}
                  />
                  <StatTile
                    label="Кунлик ўртача"
                    value={nf(kpi.total / kpi.points.length, 0)}
                    unit="кВт·соат"
                    foot={<Pill>{nf(kpi.points.length)} кун ўлчанган</Pill>}
                  />
                  <StatTile
                    label="Энг юқори кун"
                    value={nf(kpi.max, 0)}
                    unit="кВт·соат"
                    foot={kpi.maxKey ? <Pill>{kpi.maxKey}</Pill> : undefined}
                  />
                  {/* Фоизни қўшиб бўлмайди — бу йиғинди эмас, кунлик
                      қийматларнинг ўртачаси. Нечта сон устидан олингани
                      остида очиқ айтилади. */}
                  <StatTile
                    label="Ўртача самарадорлик"
                    value={kpi.avgPr === null ? "—" : nf(kpi.avgPr, 1)}
                    unit={kpi.avgPr === null ? undefined : "%"}
                    foot={
                      <Pill>
                        {kpi.avgPr === null
                          ? "самарадорлик ўлчанмаган"
                          : `${nf(kpi.prCount)} та кунлик ўлчов ўртачаси`}
                      </Pill>
                    }
                  />
                </div>

                <Section className="mt-5" title="Кунлик ишлаб чиқариш" note="кВт·соат">
                  <Card
                    note={
                      kpi.theoryComplete
                        ? "Иккала қатор ҳам бир хил ўлчов бирлигида (кВт·соат) ва битта шкалада. Назарий қатор — шароит идеал бўлгандаги кутилган ишлаб чиқариш; иккови орасидаги фарқ йўқотишни кўрсатади."
                        : "Назарий кўрсаткич барча ўлчовларда тўлдирилмагани учун таққослаш қатори чизилмади — тўлиқ бўлмаган назарий йиғинди ҳақиқий сон билан ёнма-ён қўйилса, фарқ ёлғон кўринарди."
                    }
                  >
                    {/* Иккита қатор — легенда мажбурий: ранг ёлғиз маъно
                        ташимайди. */}
                    {kpi.theoryComplete && (
                      <ChartLegend
                        items={[
                          { name: "Ишлаб чиқарилган", color: "var(--s1)" },
                          { name: "Назарий", color: "var(--s3)" },
                        ]}
                      />
                    )}
                    <TimeLine
                      labels={kpi.points.map((x) => x.label)}
                      fullLabels={kpi.points.map((x) => x.full)}
                      height={250}
                      ariaLabel="Кунлик ишлаб чиқарилган электр энергия, кВт·соат"
                      yTickFmt={compactNum}
                      vFmt={(v) => nf(v, 0) + " кВт·соат"}
                      series={[
                        {
                          name: "Ишлаб чиқарилган",
                          color: p.s1,
                          values: kpi.points.map((x) => x.power),
                        },
                        ...(kpi.theoryComplete
                          ? [
                              {
                                name: "Назарий",
                                color: p.s3,
                                values: kpi.points.map((x) => x.theory ?? 0),
                              },
                            ]
                          : []),
                      ]}
                    />
                    {/* Жадвалда қиймат яхлитланмайди: диаграмма ва плиткалар
                        ихчам кўринишни беради, аниқ сон эса шу ерда қолади. */}
                    <TableToggle
                      caption="Кунлик ишлаб чиқарилган электр энергия"
                      cols={[
                        { t: "Кун" },
                        { t: "Ишлаб чиқарилган, кВт·соат", num: true },
                        { t: "Назарий, кВт·соат", num: true },
                      ]}
                      rows={kpi.points.map((x) => ({
                        key: x.key,
                        cells: [x.full, exact(x.power), exact(x.theory)],
                      }))}
                    />
                  </Card>
                </Section>

                <Section title="Станциялар кесимида">
                  <div className={GRID.g32}>
                    <Card
                      title="Давр бўйича ишлаб чиқариш, кВт·соат"
                      sub={`${nf(kpi.stations.length)} та станция`}
                      note={
                        kpi.stations.some((s) => s.unnamed)
                          ? "Номи справочникда топилмаган станциялар нейтрал рангда ва рўйхат охирида — уларнинг ҳажми жамидан чиқарилмади."
                          : undefined
                      }
                    >
                      <div className="mt-2">
                        <BarsH
                          ariaLabel="Станциялар кесимида ишлаб чиқарилган электр энергия"
                          rows={kpi.stations.map((s) => ({
                            label: s.name,
                            v: s.power,
                            color: s.unnamed ? "var(--rule)" : undefined,
                            extra: ["Улуш", nf(share(s.power), 2) + "%"],
                          }))}
                          rowH={30}
                          padR={86}
                          vName="Ишлаб чиқариш, кВт·соат"
                          vFmt={(v) => nf(v, 0)}
                        />
                      </div>
                    </Card>

                    <Card
                      title="Ишлаб чиқариш тузилиши"
                      note={`Ҳалқа марказидаги сон — давр бўйича жами ${nf(kpi.total, 0)} кВт·соат, яъни сегментлар йиғиндиси марказдаги сонга тенг.`}
                    >
                      <ShareDonut
                        segments={kpi.stations.map((s) => ({
                          key: s.key,
                          name: s.name,
                          value: s.power,
                          muted: s.unnamed,
                        }))}
                        total={kpi.total}
                        centerNote="кВт·соат, жами"
                        ariaLabel={`Станциялар бўйича ишлаб чиқарилган электр энергиянинг тақсимоти, жами ${nf(kpi.total, 0)} кВт·соат.`}
                      />
                      <TableToggle
                        caption="Станциялар бўйича ишлаб чиқарилган электр энергия"
                        cols={[
                          { t: "Станция", wrap: true },
                          { t: "Ишлаб чиқариш, кВт·соат", num: true },
                          { t: "Ўлчанган кун", num: true },
                          { t: "Ўртача самарадорлик, %", num: true },
                          { t: "Улуш", num: true },
                        ]}
                        rows={kpi.stations.map((s) => ({
                          key: s.key,
                          cells: [
                            s.name,
                            exact(s.power),
                            nf(s.days),
                            exact(s.pr),
                            nf(share(s.power), 2) + "%",
                          ],
                        }))}
                      />
                    </Card>
                  </div>
                </Section>

                <Section title="Батафсил ўлчовлар">
                  <Card
                    title="Кун ва станция кесимида"
                    sub={`${nf(kpi.rows.length)} та ёзув`}
                    note="Ҳар бир қатор — манбадаги битта ўлчов, ўзгаришсиз. Қуёш радиацияси, тежалган кўмир ва камайтирилган CO₂ кунлар бўйича йиғилмайди: манбада уларнинг кунлик ёки ўсиб борувчи экани кўрсатилмаган, шунинг учун бу ерда фақат ўз қаторида турибди."
                  >
                    <TableToggle
                      caption="Қуёш станцияларининг кунлик ўлчовлари"
                      cols={[
                        { t: "Кун" },
                        { t: "Станция", wrap: true },
                        { t: "Ишлаб чиқарилган, кВт·соат", num: true },
                        { t: "Назарий, кВт·соат", num: true },
                        { t: "Самарадорлик, %", num: true },
                        { t: "Қуёш радиацияси, кВт·соат/м²", num: true },
                        { t: "Тежалган кўмир, тонна", num: true },
                        { t: "Камайтирилган CO₂, тонна", num: true },
                      ]}
                      rows={kpi.rows.map((r) => ({
                        key: r.key,
                        cells: [
                          r.day,
                          r.station,
                          exact(r.power),
                          exact(r.theory),
                          exact(r.pr),
                          exact(r.radiation),
                          exact(r.coal),
                          exact(r.co2),
                        ],
                      }))}
                    />
                  </Card>
                </Section>
              </>
            );
          }}
        </Loader>
      </Section>

      <Section title="Қуёш станциялари" note="справочник">
        <Loader q={stQ} height={200} notAvailableWhat="қуёш станциялари рўйхати">
          {() => {
            if (!st) return null;
            if (st.stations.length === 0) {
              return (
                <EmptyState
                  title="Қуёш станциялари топилмади"
                  text="Сўров муваффақиятли бажарилди, лекин рўйхат бўш — станциялар тизимга ҳали киритилмаган. Бўлим маълумот киритилгач ўзи тўлади."
                />
              );
            }

            const withCap = st.stations.filter((s) => s.capacity !== null);

            return (
              <>
                <div className={GRID.g2}>
                  <StatTile
                    label="Станциялар сони"
                    value={nf(st.stations.length)}
                    unit="та"
                    stripe="var(--s2)"
                    foot={<Pill>справочникдаги ёзувлар</Pill>}
                  />
                  <StatTile
                    label="Ўрнатилган умумий қувват"
                    value={st.totalCapacity === null ? "—" : exact(st.totalCapacity)}
                    unit={st.totalCapacity === null ? undefined : "МВт"}
                    foot={
                      <Pill status={st.noCapacity > 0 ? "warn" : "mute"}>
                        {st.noCapacity > 0
                          ? `${nf(st.noCapacity)} та станцияда қувват кўрсатилмаган`
                          : `${nf(st.withCapacity)} та станция бўйича`}
                      </Pill>
                    }
                  />
                </div>

                <Card className="mt-3" title="Станциялар ва уларнинг қуввати" sub="МВт">
                  {withCap.length > 0 ? (
                    <div className="mt-2">
                      <BarsH
                        ariaLabel="Станцияларнинг ўрнатилган қуввати, МВт"
                        rows={withCap.map((s) => ({
                          label: s.name,
                          v: s.capacity ?? 0,
                          color: s.unnamed ? "var(--rule)" : "var(--s2)",
                        }))}
                        rowH={30}
                        padR={70}
                        vName="Қувват, МВт"
                        vFmt={exact}
                      />
                    </div>
                  ) : (
                    <p className="px-2.5 py-4 text-center text-[13px] text-ink-3">
                      Ҳеч бир станцияда ўрнатилган қувват кўрсатилмаган.
                    </p>
                  )}

                  {/* Диаграмма фақат қуввати кўрсатилганларни чизади, жадвал эса
                      барча станцияни — ҳеч бири яширилмайди. */}
                  <div className="mt-3">
                    <DataTable
                      caption="Қуёш станциялари рўйхати"
                      cols={[
                        { t: "Станция", wrap: true },
                        { t: "Манзил", wrap: true },
                        { t: "Ўрнатилган қувват, МВт", num: true },
                        { t: "Тармоққа уланган сана" },
                      ]}
                      rows={st.stations.map((s) => ({
                        key: s.key,
                        cells: [s.name, s.address ?? "—", exact(s.capacity), s.gridDate ?? "—"],
                      }))}
                    />
                  </div>
                </Card>
              </>
            );
          }}
        </Loader>
      </Section>
    </>
  );
}

/**
 * Ўлчов топилмаган ҳолат.
 *
 * Бу ерда битта ҳам сон чизилмайди — плиткалар нол билан кўрсатилса, у
 * «энергия ишлаб чиқарилмади» деб ўқиларди.
 *
 * Матн `span` га қараб аниқлашади, чунки бўш экраннинг учта сабаби бор ва
 * улар раҳбардан **учта бошқа ҳаракат** талаб қилади:
 *  - ўлчовлар умуман юкланмаган → кутиш;
 *  - ўлчовлар бор, лекин бошқа даврда → бошқа даврни танлаш;
 *  - чегара ҳали аниқланмаган (сўров кетаяпти ёки йиқилди) → нейтрал матн.
 */
function SolarKpiEmpty({
  months,
  skipped,
  span,
}: {
  months: string[];
  skipped: number;
  span: SolarSpan | null;
}) {
  const nothingAtAll = span !== null && span.days === 0;

  return (
    <>
      {skipped > 0 && (
        <Banner tone="warn">
          <b>
            Ушбу даврда {nf(skipped)} та ёзув бор, лекин уларда ишлаб чиқариш кўрсаткичи
            тўлдирилмаган.
          </b>{" "}
          Шунинг учун ҳажм ҳисобланмади — бўш катак нол деб олинмайди.
        </Banner>
      )}

      <EmptyState
        title="Танланган даврда қуёш станцияларининг ўлчови йўқ"
        text={
          <>
            {periodLabel(months)} даври учун станциялардан кунлик ўлчов келмаган. Бу серверда
            бўлимнинг йўқлиги ҳам, бўлимнинг ишламаётгани ҳам эмас: сўров муваффақиятли, жавоб
            бўш.{" "}
            {nothingAtAll ? (
              "Ўлчовлар тизимга ҳали умуман юкланмаган — маълумот юклангач бўлим ўзи тўлади."
            ) : span && span.last ? (
              <>
                Тизимдаги ўлчовлар <b className="font-semibold">{span.first}</b> билан{" "}
                <b className="font-semibold">{span.last}</b> оралиғида, жами {nf(span.days)} кун
                бўйича. Юқоридаги давр танлагичидан ўша ойларни танланг; улар рўйхатда бўлмаса,
                ўлчовлар ҳисобот даврларидан ташқарида қолган.
              </>
            ) : (
              "Бошқа даврни танлаб кўринг."
            )}{" "}
            Ишлаб чиқариш нол деб кўрсатилмади: нол «энергия олинмаган» дегани, бу эса «ўлчов
            келмаган».
          </>
        }
      />
    </>
  );
}
