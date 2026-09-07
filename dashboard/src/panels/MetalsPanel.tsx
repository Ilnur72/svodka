import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { dashboardVM } from "../lib/adapters/metals";
import type { MetalSeries } from "../lib/adapters/metals";
import { usePalette } from "../lib/theme";
import type { Palette } from "../lib/theme";
import { exact, nf, pctTxt, periodLabel } from "../lib/format";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { TimeLine } from "../components/TimeLine";
import { Columns } from "../components/Columns";
import { BarsH } from "../components/BarsH";
import { ShareDonut } from "../components/ShareDonut";
import { ChartLegend } from "../components/ChartLegend";
import { TableToggle } from "../components/TableToggle";
import { Loader } from "../components/states";

/**
 * «Технологик металлар ишлаб чиқариш» — `/production-report/dashboard`
 * жавобидан металл кесимида ишлаб чиқариш кўрсаткичлари.
 *
 * ═══ Режа ва фоиз кўрсатилмайди ══════════════════════════════════════════
 *
 * Жавобда `plan`/`totalPlan`/`percent`/`planDyn` бор (докс:
 * `production-report/docs/METAL_PRODUCTION_DASHBOARD_API.md`), лекин на
 * топшириқдаги кўриниш, на ҳужжатнинг ўз «дашборд элементлари» жадвали
 * (5-бўлим) уларни бирор экран элементига боғламайди — бу дашборд соф факт
 * кўрсаткичи. Шунинг учун улар `lib/adapters/metals.ts` view-model'ига ҳам
 * чиқарилмаган.
 *
 * ═══ `delta`/`totalDelta` — кўп ҳолатда `null` ═══════════════════════════
 *
 * Ҳозирги базада (докс 3.3, 7-бўлим) олдинги давр учун маълумот кўпинча
 * йўқ, шунда бу майдонлар `null` қайтади. Панел бунда стрелка ҳам, фоиз ҳам
 * чизмайди — соxта «0%» ёки йўналишсиз белги кўрсатилмайди.
 *
 * ═══ «Аниқланмаган» гуруҳ ═════════════════════════════════════════════════
 *
 * `material: null` учун бэкенд тайёр ном бермайди (докс 4-бўлим). Ном
 * сифатида «Сотиш ва қолдиқлар» панелида ҳам ишлатиладиган
 * `sales.ts` → `materialLabel()` ишлатилади (`null` → «Аниқланмаган»),
 * ранги эса нейтрал (`--rule`) — бошқа металлардан ажралиб туради, лекин
 * донут ва диаграммадан **чиқарилмайди**: ҳажми ҳақиқий, яширилмайди.
 *
 * ═══ Олти рангли қатор ════════════════════════════════════════════════════
 *
 * Палитрада бешта қатор токени бор (`--s1..--s5`), лекин маълум металл
 * турлари олтита (`Mo`, `W`, `Re`, `Co`, `Fe`, `Other`). Шунинг учун
 * `index.css` га навбатдаги `--s6` қўшилди — худди `--s4`/`--s5` каби
 * `--s1` дан `color-mix()` билан ҳосил қилинган (қаранг: `index.css`).
 * «Аниқланмаган» гуруҳ бу ромкага кирмайди — у доим нейтрал.
 */

/** Ном берилган металлар — s1..s6 навбат билан; «аниқланмаган» доим нейтрал. */
function buildColors(metals: MetalSeries[], p: Palette): Map<string, string> {
  const ramp = [p.s1, p.s2, p.s3, p.s4, p.s5, p.s6];
  const map = new Map<string, string>();
  let i = 0;
  for (const m of metals) {
    map.set(m.key, m.unnamed ? p.rule : ramp[i++ % ramp.length]);
  }
  return map;
}

/** Ишора йўналишидан ясалган ёрлиқ: «↑ 12,4%» / «↓ 3,1%». Стрелкани фронтенд ҳосил қилади. */
function deltaLabel(delta: number | null): string | null {
  if (delta === null) return null;
  return (delta >= 0 ? "↑ " : "↓ ") + pctTxt(Math.abs(delta));
}

export function MetalsPanel({ period, months }: PanelProps) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;

  // `period.from`/`period.to` ҳар доим `YYYY-MM-DD` — сервер нотўғри
  // форматланган санада `500` қайтариши мумкин (докс 2.1-бўлим), шунинг
  // учун бу ерга фақат давр танлагичидан келган ҳақиқий сана боради.
  const q = useQuery(`metals-dashboard_${key}`, (s) => getDashboard(period, {}, s));
  const vm = useMemo(() => (q.data ? dashboardVM(q.data) : null), [q.data]);
  const colors = useMemo(
    () => (vm ? buildColors(vm.metals, p) : new Map<string, string>()),
    [vm, p],
  );

  return (
    <Loader
      q={q}
      height={280}
      notAvailableWhat="технологик металлар дашборди"
      isEmpty={() => !vm || vm.months.length === 0}
      emptyTitle="Ушбу давр учун ишлаб чиқариш маълумоти йўқ"
      emptyText={`${periodLabel(months)} даври учун технологик металлар бўйича ёзув топилмади.`}
    >
      {() => {
        if (!vm) return null;
        const pctTotal = vm.metals.reduce((a, m) => a + m.pct, 0);
        const share = (v: number): number => (v / (vm.total || 1)) * 100;

        return (
          <>
            {vm.unknownShare > 0 && (
              <Banner tone="info">
                Жами ҳажмнинг <b>{pctTxt(vm.unknownShare)}</b>ига металл тури ҳали
                бириктирилмаган («Аниқланмаган» гуруҳи). Бу ҳажм яширилмади — донутда ва
                диаграммада бошқа металлар қатори алоҳида сегмент сифатида кўрсатилади.
              </Banner>
            )}

            <div className={GRID.g5}>
              <StatTile
                label="Умумий ҳажми"
                value={nf(vm.total, 0)}
                unit="тонна"
                stripe="var(--s1)"
                foot={
                  <>
                    <Pill>{periodLabel(months)}</Pill>
                    {deltaLabel(vm.totalDelta) && <Pill>{deltaLabel(vm.totalDelta)}</Pill>}
                  </>
                }
              />
              {vm.topMetals.map((m) => (
                <StatTile
                  key={m.key}
                  label={m.name}
                  value={nf(m.value, 0)}
                  unit="тонна"
                  stripe={colors.get(m.key)}
                  foot={
                    <Pill status="mute">
                      {deltaLabel(m.delta) ?? `${pctTxt(m.pct)} улуш`}
                    </Pill>
                  }
                />
              ))}
            </div>

            <Section className="mt-5" title="Ишлаб чиқариш динамикаси" note="тонна">
              <Card>
                <ChartLegend
                  items={vm.metals.map((m) => ({
                    name: m.name,
                    color: colors.get(m.key) ?? p.s1,
                  }))}
                />
                <TimeLine
                  labels={vm.months.map((m) => m.label)}
                  height={260}
                  ariaLabel="Металлар кесимида ишлаб чиқариш динамикаси, тонна"
                  vFmt={(v) => nf(v, 0) + " тонна"}
                  series={vm.metals.map((m) => ({
                    name: m.name,
                    color: colors.get(m.key) ?? p.s1,
                    values: m.dyn,
                  }))}
                />
                {/* Жадвалда қиймат яхлитланмайди — диаграмма ихчам кўринишни
                    беради, аниқ сон эса шу ерда қолади. */}
                <TableToggle
                  caption="Металлар кесимида ойлик ишлаб чиқариш"
                  cols={[
                    { t: "Ой" },
                    ...vm.metals.map((m) => ({ t: `${m.name}, тонна`, num: true as const })),
                  ]}
                  rows={vm.months.map((mo, i) => ({
                    key: mo.key,
                    cells: [mo.label, ...vm.metals.map((m) => exact(m.dyn[i]))],
                  }))}
                />
              </Card>
            </Section>

            <Section title="Металлар таркиби">
              <div className={GRID.g2}>
                <Card
                  title="Металлар бўйича ишлаб чиқариш"
                  sub="тонна"
                  note={`Ҳалқа марказидаги сон — давр бўйича жами ${nf(vm.total, 0)} тонна, яъни сегментлар йиғиндиси марказдаги сонга тенг.`}
                >
                  <ShareDonut
                    segments={vm.metals.map((m) => ({
                      key: m.key,
                      name: m.name,
                      value: m.value,
                      muted: m.unnamed,
                    }))}
                    total={vm.total}
                    centerNote="тонна, жами"
                    ariaLabel={`Металлар бўйича ишлаб чиқаришнинг тақсимоти, жами ${nf(vm.total, 0)} тонна.`}
                  />
                </Card>

                <Card
                  title="Ишлаб чиқариш тузилиши"
                  sub="%"
                  note="Ҳар бир металлнинг умумий ҳажмдаги улуши — юқоридаги ҳалқа билан бир хил маълумот, фақат фоизда."
                >
                  <ShareDonut
                    segments={vm.metals.map((m) => ({
                      key: m.key,
                      name: m.name,
                      value: m.pct,
                      muted: m.unnamed,
                    }))}
                    total={pctTotal}
                    centerNote="%, жами"
                    ariaLabel="Металлар бўйича ишлаб чиқариш тузилиши, фоизда."
                  />
                </Card>
              </div>
            </Section>

            <Section title="Заводлар кесимида">
              <Card title="Заводлар бўйича ишлаб чиқариш" sub="тонна">
                <div className="mt-2">
                  <BarsH
                    ariaLabel="Заводлар кесимида ишлаб чиқариш, тонна"
                    rows={vm.plants.map((pl) => ({
                      label: pl.name,
                      v: pl.value,
                      extra: ["Улуш", pctTxt(share(pl.value))],
                    }))}
                    rowH={30}
                    padR={78}
                    vName="Ишлаб чиқариш, тонна"
                    vFmt={(v) => nf(v, 0)}
                  />
                </div>
                <TableToggle
                  caption="Заводлар бўйича ойлик ишлаб чиқариш"
                  cols={[
                    { t: "Завод", wrap: true },
                    ...vm.months.map((mo) => ({ t: mo.label, num: true as const })),
                    { t: "Жами, тонна", num: true },
                  ]}
                  rows={vm.plants.map((pl) => ({
                    key: pl.key,
                    cells: [pl.name, ...pl.monthly.map((v) => exact(v)), exact(pl.value)],
                  }))}
                />
              </Card>
            </Section>

            <Section title="Ойлар кесимида">
              <div className={GRID.g2}>
                <Card title="Ойлар бўйича ишлаб чиқариш" sub="тонна">
                  <Columns
                    labels={vm.months.map((m) => m.label)}
                    height={230}
                    ariaLabel="Ойлар бўйича ишлаб чиқариш, тонна"
                    vFmt={(v) => nf(v, 0) + " тонна"}
                    series={[{ name: "Ишлаб чиқариш", color: p.s1, values: vm.monthly }]}
                  />
                </Card>

                <Card
                  title="Ўртача кунлик ишлаб чиқариш"
                  sub="тонна"
                  note="Ойлик ҳажм шу ойда маълумот бор кунлар сонига бўлинган."
                >
                  <Columns
                    labels={vm.months.map((m) => m.label)}
                    height={230}
                    ariaLabel="Ўртача кунлик ишлаб чиқариш, тонна"
                    vFmt={(v) => nf(v, 1) + " тонна"}
                    series={[{ name: "Кунлик ўртача", color: p.s3, values: vm.avgDaily }]}
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
