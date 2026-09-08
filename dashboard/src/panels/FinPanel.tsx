import { usePalette } from "../lib/theme";
import type { Palette } from "../lib/theme";
import { exact, nf } from "../lib/format";
import { getFinanceReport } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import {
  finAxis,
  finCalc,
  finPctExact,
  finSum,
  financeVM,
  type FinVM,
} from "../lib/adapters/finance";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Sparkline } from "../components/Sparkline";
import { Columns } from "../components/Columns";
import { TimeLine } from "../components/TimeLine";
import { ChartLegend } from "../components/ChartLegend";
import { TableToggle } from "../components/TableToggle";
import { Loader } from "../components/states";

/**
 * «Молиявий кўрсаткичлар» бўлими.
 *
 * ═══ Нега бу бўлим давр танлагичига боғланмаган ═════════════════════════
 *
 * Манбада **йил кўрсатилмаган** — фақат ой номлари бор. Йилни тахмин қилиб
 * қўйиш ёлғон бўларди, шунинг учун бўлим ўз етти ойини доим кўрсатади ва
 * бу ҳолат экраннинг ўзида ёзилади. Юқоридаги `PeriodPicker` бу ерга
 * таъсир қилмайди.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 * Юқорида — тўртта плитка (охирги ой, олдинги ойга нисбатан ўзгариш ва 7
 * ойлик тренд). Кейин олтита блок: натижалар, ҳолат, актив таркиби, капитал
 * таркиби, коэффициентлар ва пул оқими. Ҳар бир диаграмма ёнида «Жадвал
 * кўриниши» бор — у ерда манбадаги **аниқ** қиймат туради.
 *
 * ═══ Бирлик ═════════════════════════════════════════════════════════════
 *
 * Диаграмма ўқи млрд сўмда (минг сўм ўқда ўқилмайди), тултип ва жадвал
 * манбадаги минг сўмда. Ҳар бир карточкада бу очиқ ёзилган. Коэффициент ва
 * маржа нисбат бўлгани учун келтирилмайди.
 *
 * Иккита ўқли диаграмма йўқ: тушум билан маржа ҳам, сумма билан коэффициент
 * ҳам ҳар доим алоҳида диаграммада.
 */
export function FinPanel() {
  const p = usePalette();
  // Параметрсиз, давр танлагичига боғлиқ эмас (изоҳга қаранг) — калит доимий.
  const q = useQuery("finance-report", (s) => getFinanceReport(s));

  return (
    <Loader q={q} height={320} notAvailableWhat="молиявий кўрсаткичлар бўлими">
      {(data) => <FinContent vm={financeVM(data)} p={p} />}
    </Loader>
  );
}

function FinContent({ vm, p }: { vm: FinVM; p: Palette }) {
  const r = vm.rows;

  /** Стек диаграммада тултип сарлавҳасига жамини ҳам қўшамиз. */
  const withTotal = (total: number[]): string[] =>
    vm.months.map((m, i) => `${m} · жами ${exact(total[i])} минг сўм`);

  /** Жадвал қатори: ой + берилган қаторларнинг аниқ қиймати. */
  const monthRows = (values: number[][], fmt: (v: number) => string = exact) =>
    vm.months.map((m, i) => ({ key: m, cells: [m, ...values.map((v) => fmt(v[i]))] }));

  return (
    <>
      {/* --- плиткалар ---------------------------------------------------- */}
      <div className={GRID.g4}>
        {vm.kpis.map((k) => (
          <StatTile
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            stripe={k.token}
            foot={
              <>
                <Pill status={k.status}>{k.delta}</Pill>
                <span className="text-ink-3">{vm.prevMonth} га нисбатан</span>
                <span className="ml-auto">
                  <Sparkline
                    values={k.spark}
                    color={k.token}
                    label={`${k.label} — ойлар бўйича: ${vm.months
                      .map((m, i) => `${m} ${nf(k.spark[i], 2)}`)
                      .join(", ")}`}
                  />
                </span>
              </>
            }
          />
        ))}
      </div>

      {/* --- 1. молиявий натижалар ---------------------------------------- */}
      <Section
        className="mt-5"
        title="Молиявий натижалар"
        note="ойлар бўйича · сумма ва маржа алоҳида диаграммада"
      >
        <div className={GRID.g2}>
          <Card
            title="Тушум ва ҳисобот даври фойдаси"
            sub="ўқда млрд сўм"
            note="Тултип ва жадвалда манбадаги аниқ қиймат — минг сўмда."
          >
            <ChartLegend
              items={[
                { name: r.revenue.label, color: p.s1 },
                { name: r.profit.label, color: p.s3 },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={vm.months}
              height={240}
              yWidth={46}
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича тушум ва ҳисобот даври фойдаси"
              series={[
                { name: r.revenue.label, color: p.s1, values: r.revenue.values },
                { name: r.profit.label, color: p.s3, values: r.profit.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича тушум, фойда ва маржа"
              cols={[
                { t: "Ой" },
                { t: "Тушум, минг сўм", num: true },
                { t: "Фойда, минг сўм", num: true },
                { t: "Маржа, %", num: true },
              ]}
              rows={vm.months.map((m, i) => ({
                key: m,
                cells: [
                  m,
                  exact(r.revenue.values[i]),
                  exact(r.profit.values[i]),
                  finPctExact(r.margin.values[i]),
                ],
              }))}
            />
          </Card>

          <Card
            title={r.margin.label}
            sub="фоизда"
            note="Маржа — фойданинг тушумга нисбати. У нисбат бўлгани учун сумма билан битта шкалага қўйилмайди."
          >
            <TimeLine
              labels={vm.ticks}
              fullLabels={vm.months}
              height={240}
              yWidth={44}
              yTickFmt={(v) => nf(v, 0) + "%"}
              vFmt={(v) => nf(v, 2) + "%"}
              ariaLabel="Ойлар бўйича соф фойда маржаси, фоизда"
              series={[{ name: r.margin.label, color: p.s2, values: vm.marginPct }]}
            />
            <TableToggle
              caption="Ойлар бўйича соф фойда маржаси"
              cols={[{ t: "Ой" }, { t: "Маржа, %", num: true }]}
              rows={vm.months.map((m, i) => ({
                key: m,
                cells: [m, finPctExact(r.margin.values[i])],
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* --- 2. молиявий ҳолат -------------------------------------------- */}
      <Section
        title="Молиявий ҳолат"
        note="ой охиридаги қолдиқ · ўқда млрд сўм · баланс ҳар ойда ёпилади"
      >
        <div className={GRID.g2}>
          <Card title="Активлар" sub="жорий + узоқ муддатли">
            <ChartLegend
              items={[
                { name: r.assetsCurrent.label, color: p.s1 },
                { name: r.assetsNonCurrent.label, color: p.s2 },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={withTotal(r.assetsTotal.values)}
              height={240}
              yWidth={52}
              stacked
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича активлар: жорий ва узоқ муддатли"
              series={[
                { name: r.assetsCurrent.label, color: p.s1, values: r.assetsCurrent.values },
                { name: r.assetsNonCurrent.label, color: p.s2, values: r.assetsNonCurrent.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича активлар"
              cols={[
                { t: "Ой" },
                { t: "Жами активлар", num: true },
                { t: "Жорий", num: true },
                { t: "Узоқ муддатли", num: true },
              ]}
              rows={monthRows([
                r.assetsTotal.values,
                r.assetsCurrent.values,
                r.assetsNonCurrent.values,
              ])}
            />
          </Card>

          <Card title="Капитал ва мажбуриятлар" sub="активларнинг қопланиш манбаи">
            <ChartLegend
              items={[
                { name: r.equityTotal.label, color: p.s3 },
                { name: r.liabTotal.label, color: p.s2 },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={withTotal(r.equityAndLiab.values)}
              height={240}
              yWidth={52}
              stacked
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича капитал ва мажбуриятлар"
              series={[
                { name: r.equityTotal.label, color: p.s3, values: r.equityTotal.values },
                { name: r.liabTotal.label, color: p.s2, values: r.liabTotal.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича капитал ва мажбуриятлар"
              cols={[
                { t: "Ой" },
                { t: "Капитал ва мажбуриятлар", num: true },
                { t: "Жами капитал", num: true },
                { t: "Жами мажбуриятлар", num: true },
                { t: "Жорий мажб.", num: true },
                { t: "Узоқ муддатли мажб.", num: true },
              ]}
              rows={monthRows([
                r.equityAndLiab.values,
                r.equityTotal.values,
                r.liabTotal.values,
                r.liabCurrent.values,
                r.liabNonCurrent.values,
              ])}
            />
          </Card>
        </div>
      </Section>

      {/* --- 3. актив таркиби --------------------------------------------- */}
      <Section title="Актив таркиби" note="ой охиридаги қолдиқ · ўқда млрд сўм">
        <div className={GRID.g2}>
          <Card title={r.assetsNonCurrent.label} sub="таркиби">
            <ChartLegend
              items={[
                { name: r.buildInProgress.label, color: p.s1 },
                { name: r.subsidiaryInvest.label, color: p.s2 },
                { name: r.fixedAssets.label, color: p.s3 },
                { name: r.otherNonCurrent.label, color: p["ink-3"] },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={withTotal(r.assetsNonCurrent.values)}
              height={240}
              yWidth={46}
              stacked
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича узоқ муддатли активлар таркиби"
              series={[
                { name: r.buildInProgress.label, color: p.s1, values: r.buildInProgress.values },
                { name: r.subsidiaryInvest.label, color: p.s2, values: r.subsidiaryInvest.values },
                { name: r.fixedAssets.label, color: p.s3, values: r.fixedAssets.values },
                { name: r.otherNonCurrent.label, color: p["ink-3"], values: r.otherNonCurrent.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича узоқ муддатли активлар таркиби"
              cols={[
                { t: "Ой" },
                { t: "Жами", num: true },
                { t: "Тугалланмаган қурилиш", num: true },
                { t: "Шўъба корх. инвест.", num: true },
                { t: "Асосий воситалар", num: true },
                { t: "Бошқа", num: true },
              ]}
              rows={monthRows([
                r.assetsNonCurrent.values,
                r.buildInProgress.values,
                r.subsidiaryInvest.values,
                r.fixedAssets.values,
                r.otherNonCurrent.values,
              ])}
            />
          </Card>

          <Card title={r.assetsCurrent.label} sub="таркиби">
            <ChartLegend
              items={[
                { name: r.receivables.label, color: p.s1 },
                { name: r.inventories.label, color: p.s2 },
                { name: r.cash.label, color: p.s3 },
                { name: r.otherCurrent.label, color: p["ink-3"] },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={withTotal(r.assetsCurrent.values)}
              height={240}
              yWidth={46}
              stacked
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича жорий активлар таркиби"
              series={[
                { name: r.receivables.label, color: p.s1, values: r.receivables.values },
                { name: r.inventories.label, color: p.s2, values: r.inventories.values },
                { name: r.cash.label, color: p.s3, values: r.cash.values },
                { name: r.otherCurrent.label, color: p["ink-3"], values: r.otherCurrent.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича жорий активлар таркиби"
              cols={[
                { t: "Ой" },
                { t: "Жами", num: true },
                { t: "Дебиторлик", num: true },
                { t: "Товар-моддий захиралар", num: true },
                { t: "Пул маблағлари", num: true },
                { t: "Бошқа", num: true },
              ]}
              rows={monthRows([
                r.assetsCurrent.values,
                r.receivables.values,
                r.inventories.values,
                r.cash.values,
                r.otherCurrent.values,
              ])}
            />
          </Card>
        </div>
      </Section>

      {/* --- 4. капитал таркиби ------------------------------------------- */}
      <Section title="Капитал таркиби" note="ой охиридаги қолдиқ · ўқда млрд сўм">
        <Card
          title={r.equityTotal.label}
          sub="таркиби"
          note="Февралда устав капитали ва бошқа захиралар ўртасида қайта тақсимот кўринади: биттасининг ошиши иккинчисининг камайиши билан тенг."
        >
          <ChartLegend
            items={[
              { name: r.charterCapital.label, color: p.s1 },
              { name: r.retainedEarnings.label, color: p.s3 },
              { name: r.otherReserves.label, color: p["ink-3"] },
            ]}
          />
          <Columns
            labels={vm.ticks}
            fullLabels={withTotal(r.equityTotal.values)}
            height={240}
            yWidth={46}
            stacked
            yTickFmt={finAxis}
            vFmt={finSum}
            ariaLabel="Ойлар бўйича капитал таркиби"
            series={[
              { name: r.charterCapital.label, color: p.s1, values: r.charterCapital.values },
              { name: r.retainedEarnings.label, color: p.s3, values: r.retainedEarnings.values },
              { name: r.otherReserves.label, color: p["ink-3"], values: r.otherReserves.values },
            ]}
          />
          <TableToggle
            caption="Ойлар бўйича капитал таркиби"
            cols={[
              { t: "Ой" },
              { t: "Жами капитал", num: true },
              { t: "Устав капитали", num: true },
              { t: "Тақсимланмаган фойда", num: true },
              { t: "Бошқа захиралар", num: true },
            ]}
            rows={monthRows([
              r.equityTotal.values,
              r.charterCapital.values,
              r.retainedEarnings.values,
              r.otherReserves.values,
            ])}
          />
        </Card>
      </Section>

      {/* --- 5. коэффициентлар -------------------------------------------- */}
      <Section title="Коэффициентлар" note="нисбат — бирлиги йўқ, келтирилмайди">
        <Card
          title="Жорий ликвидлик ва қарз / капитал"
          sub="иккаласи ҳам нисбат"
          note="Иккала кўрсаткич ҳам бирликсиз нисбат бўлгани учун битта шкалада турибди. Жорий ликвидлик — жорий активларнинг жорий мажбуриятларга нисбати; қарз / капитал — жами мажбуриятларнинг жами капиталга нисбати."
        >
          <ChartLegend
            items={[
              { name: r.currentRatio.label, color: p.s1 },
              { name: r.debtToEquity.label, color: p.s2 },
            ]}
          />
          <TimeLine
            labels={vm.ticks}
            fullLabels={vm.months}
            height={240}
            yWidth={44}
            yTickFmt={(v) => nf(v, 1)}
            vFmt={exact}
            ariaLabel="Ойлар бўйича жорий ликвидлик ва қарз / капитал коэффициентлари"
            series={[
              { name: r.currentRatio.label, color: p.s1, values: r.currentRatio.values },
              { name: r.debtToEquity.label, color: p.s2, values: r.debtToEquity.values },
            ]}
          />
          <TableToggle
            caption="Ойлар бўйича коэффициентлар"
            cols={[
              { t: "Ой" },
              { t: "Жорий ликвидлик", num: true },
              { t: "Қарз / капитал", num: true },
            ]}
            rows={monthRows([r.currentRatio.values, r.debtToEquity.values])}
          />
        </Card>
      </Section>

      {/* --- 6. пул оқими -------------------------------------------------- */}
      <Section title="Пул оқими" note="ойлик оқим · ўқда млрд сўм · нол чизиғи кўрсатилган">
        <div className={GRID.g2}>
          <Card
            title="Фаолият турлари бўйича"
            sub="ўқда млрд сўм"
            note="Учала оқимнинг йиғиндиси — соф пул оқими; у тултип сарлавҳасида ва жадвалда алоҳида турибди. Нол чизиғидан пастга тушган устун — шу ойда пул чиққанини билдиради."
          >
            <ChartLegend
              items={[
                { name: r.cfOperating.label, color: p.s3 },
                { name: r.cfInvesting.label, color: p.s2 },
                { name: r.cfFinancing.label, color: p.s1 },
              ]}
            />
            <Columns
              labels={vm.ticks}
              fullLabels={vm.months.map(
                (m, i) => `${m} · соф оқим ${exact(r.netCash.values[i])} минг сўм`,
              )}
              height={250}
              yWidth={50}
              thick={16}
              zeroLine
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича пул оқими: операцион, инвестицион ва молиявий фаолият"
              series={[
                { name: r.cfOperating.label, color: p.s3, values: r.cfOperating.values },
                { name: r.cfInvesting.label, color: p.s2, values: r.cfInvesting.values },
                { name: r.cfFinancing.label, color: p.s1, values: r.cfFinancing.values },
              ]}
            />
            <TableToggle
              caption="Ойлар бўйича пул оқими"
              cols={[
                { t: "Ой" },
                { t: "Операцион", num: true },
                { t: "Инвестицион", num: true },
                { t: "Молиявий", num: true },
                { t: "Соф пул оқими", num: true },
              ]}
              rows={monthRows([
                r.cfOperating.values,
                r.cfInvesting.values,
                r.cfFinancing.values,
                r.netCash.values,
              ])}
            />
          </Card>

          <Card
            title="Пул қолдиғи"
            sub="иккита манба — иккаласи ҳам кўрсатилган"
            note={
              <>
                Балансдаги «{r.cash.label}» ва пул оқимидаги «{r.cashEquivalents.label}» ойма-ой
                фарқ қилади: фарқ {finCalc(vm.gapMin)} дан {finCalc(vm.gapMax)} минг сўмгача,
                яъни тасодифий эмас. Иккиси икки хил ҳисоб — бирортаси иккинчисига
                тенглаштирилмаган.
              </>
            }
          >
            <ChartLegend
              items={[
                { name: `${r.cash.label} (баланс)`, color: p.s1 },
                { name: `${r.cashEquivalents.label} (пул оқими)`, color: p.s3 },
              ]}
            />
            <TimeLine
              labels={vm.ticks}
              fullLabels={vm.months}
              height={250}
              yWidth={46}
              yTickFmt={finAxis}
              vFmt={finSum}
              ariaLabel="Ойлар бўйича пул қолдиғи: балансдаги ва пул оқимидаги кўрсаткич"
              series={[
                { name: `${r.cash.label} (баланс)`, color: p.s1, values: r.cash.values },
                {
                  name: `${r.cashEquivalents.label} (пул оқими)`,
                  color: p.s3,
                  values: r.cashEquivalents.values,
                },
              ]}
            />

            <TableToggle
              caption="Ойлар бўйича пул қолдиғи ва иккита кўрсаткич фарқи"
              cols={[
                { t: "Ой" },
                { t: "Баланс, минг сўм", num: true },
                { t: "Пул оқими, минг сўм", num: true },
                { t: "Фарқ, минг сўм", num: true },
              ]}
              rows={vm.cash.map((c) => ({
                key: c.label,
                cells: [c.label, exact(c.balance), exact(c.equivalents), finCalc(c.gap)],
              }))}
            />
          </Card>
        </div>
      </Section>
    </>
  );
}
