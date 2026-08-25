import { useId, useMemo, useState } from "react";
import { pctTxt } from "../lib/format";
import {
  NO_DATA,
  USD,
  investCalc,
  investExact,
  investPp,
  investVM,
  type InvestCard,
  type InvestCostRow,
  type InvestField,
  type InvestProgressRow,
  type InvestVal,
} from "../lib/adapters/invest";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { DataTable } from "../components/DataTable";
import { TableToggle } from "../components/TableToggle";
import { ChartLegend } from "../components/ChartLegend";

/**
 * «Инвестиция лойиҳалари» бўлими.
 *
 * ═══ Нега бу бўлим давр танлагичига боғланмаган ═════════════════════════
 *
 * Манба — лойиҳалар реестри, «Production Report» API'дан келмайди. Ундаги
 * ягона давр — ўзлаштирилган маблағнинг январь–июнь оралиғи, лекин **йил
 * кўрсатилмаган**. Йилни тахмин қилиб қўйиш ёлғон бўларди, шунинг учун
 * бўлим ўз ҳолича туради ва юқоридаги `PeriodPicker` унга таъсир қилмайди.
 *
 * ═══ Асосий блок — иккита бажарилиш ═════════════════════════════════════
 *
 * Реестрда бажарилиш иккита мустақил ўлчовда: жисмоний бажарилиш фоизи ва
 * ўзлаштирилган маблағ улуши. Улар ёнма-ён, **иккита алоҳида шкалада**
 * чизилади — қўшилмайди, ўртачаси олинмайди ва бир-бирига тенглаштирилмайди.
 * Фарқнинг ўзи — бўлимдаги энг қимматли маълумот.
 *
 * ═══ Диаграмма қоидалари ════════════════════════════════════════════════
 *
 * Иккита Y ўқи бор диаграмма йўқ. Аралаш ўлчовли устун (йиллик ишлаб
 * чиқариш натурада — бир қисми тонна, бир қисми дона) ҳеч қаерда
 * қўшилмайди ва битта шкалага қўйилмайди: у фақат лойиҳанинг ўз
 * карточкасида кўрсатилади. Еттита лойиҳа диаграмма учун оз бўлгани учун
 * бажарилиш ва қиймат қатор кўринишида берилган, аниқ сон эса ҳар бир
 * блокда «Жадвал кўриниши» орқали очилади.
 */

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Битта фоиз шкаласи: ёрлиқ · тўлдирилган йўлак · сон. */
function Track({
  label,
  pct,
  tone,
  hint,
}: {
  label: string;
  pct: number;
  tone: string;
  hint: string;
}) {
  // Шкала 0–100 билан чекланади, лекин сон доим тўлиқ ёзилади.
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2.5" title={hint}>
      <span className="w-[74px] flex-none text-[11.5px] text-ink-3">{label}</span>
      <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
        <span
          className="absolute inset-y-0 left-0 rounded-[3px]"
          style={{ width: `${w.toFixed(2)}%`, background: tone }}
        />
      </span>
      <span className="w-[54px] flex-none text-right font-mono text-[12px] tabular-nums">
        {pctTxt(pct)}
      </span>
    </div>
  );
}

/** Битта лойиҳанинг иккита бажарилиши — ёнма-ён, бирлаштирилмаган. */
function ProgressPair({ row }: { row: InvestProgressRow }) {
  return (
    <div className="border-t border-grid py-3 first:border-t-0 first:pt-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-[12.5px] [font-weight:600]">{row.name}</span>
        <Pill status={row.status}>{row.gapText}</Pill>
      </div>
      <div className="flex flex-col gap-1.5">
        <Track
          label="Жисмоний"
          pct={row.physPct}
          tone="var(--s1)"
          hint={`Жисмоний бажарилиш: ${pctTxt(row.physPct)}`}
        />
        <Track
          label="Молиявий"
          pct={row.finPct}
          tone="var(--s3)"
          hint={`Ўзлаштирилган ${investExact(row.disbursed)} ${USD} / умумий қиймат ${investExact(row.totalCost)} ${USD} = ${pctTxt(row.finPct)}`}
        />
      </div>
    </div>
  );
}

/** Лойиҳа қиймати: устун узунлиги — умумий қиймат, ичи — ўзлаштирилган қисм. */
function CostRow({ row, max }: { row: InvestCostRow; max: number }) {
  const outer = Math.max(0, Math.min(100, (row.totalCost / max) * 100));
  const inner = Math.max(0, Math.min(100, row.disbursedPct));
  return (
    <div className="border-t border-grid py-2.5 first:border-t-0 first:pt-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-[12.5px]">{row.name}</span>
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {investExact(row.totalCost)} {USD}
          <span className="text-ink-3">
            {" · ўзлаштирилган "}
            {investExact(row.disbursed)} ({pctTxt(row.disbursedPct)})
          </span>
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-[3px] bg-sunken"
        title={`Умумий қиймат ${investExact(row.totalCost)} ${USD} · ўзлаштирилган ${investExact(row.disbursed)} ${USD} · қолдиқ ${investCalc(row.remaining)} ${USD}`}
      >
        <div className="h-full rounded-[3px] bg-rule" style={{ width: `${outer.toFixed(2)}%` }}>
          <div className="h-full rounded-[3px] bg-s3" style={{ width: `${inner.toFixed(2)}%` }} />
        </div>
      </div>
    </div>
  );
}

/** Ёрлиқ / қиймат рўйхати. Бўш катак сўниқ ранг билан ажратилади. */
function FieldList({ fields }: { fields: InvestField[] }) {
  return (
    <dl className="mt-1 flex flex-col">
      {fields.map((f) => (
        <div
          key={f.k}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px]"
        >
          <dt className="w-[164px] flex-none text-ink-2">{f.k}</dt>
          <dd
            className={
              "min-w-0 flex-1 break-words" +
              (f.num ? " font-mono tabular-nums" : "") +
              (f.v === NO_DATA ? " text-ink-3" : "")
            }
          >
            {f.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Лойиҳа карточкаси: асосий кўрсаткичлар, очилганда — реестрдаги барча майдон. */
function ProjectCard({ card }: { card: InvestCard }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `pf-${uid}`;

  return (
    <Card
      title={<span className="block leading-[1.3]">{card.name}</span>}
      sub={<Pill status={card.status}>{card.gapText}</Pill>}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: card.token }}
      />
      <div className="text-[11.5px] text-ink-3">
        {card.region} · {card.kind}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        <Track
          label="Жисмоний"
          pct={card.physPct}
          tone="var(--s1)"
          hint={`Жисмоний бажарилиш: ${pctTxt(card.physPct)}`}
        />
        <Track
          label="Молиявий"
          pct={card.finPct}
          tone="var(--s3)"
          hint={`Молиявий ўзлаштириш: ${pctTxt(card.finPct)}`}
        />
      </div>

      {/* Ёпиқ ҳолатда — асосий кўрсаткичлар, очиқ ҳолатда — реестрдаги барча
          майдон. Иккиси бир вақтда чизилмайди: акс ҳолда битта қиймат
          карточкада икки марта кўринарди. Тугма шу соҳани бошқаради
          (`aria-controls`), гарчи у тугмадан юқорида турса ҳам. */}
      <div id={panelId}>
        <FieldList fields={open ? card.details : card.head} />
      </div>

      <div className="mt-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={
            "cursor-pointer rounded-[5px] border px-[11px] py-[5px] text-[11.5px] font-semibold " +
            (open
              ? "border-s1 bg-s1 text-white"
              : "border-hair bg-surface-2 text-ink-2 hover:text-ink")
          }
        >
          {open ? "Майдонларни яшириш" : `Барча майдонлар (${card.details.length} та)`}
        </button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* бўлим                                                                      */
/* -------------------------------------------------------------------------- */

export function InvestPanel() {
  const vm = useMemo(() => investVM(), []);
  const t = vm.totals;

  /** Сон бўлмаган катак (масалан «ТИАда аниқланади») сўниқ ёзилади. */
  const valCell = (x: InvestVal) =>
    x.num ? (
      <span className="font-mono tabular-nums">{x.v}</span>
    ) : (
      <span className="text-ink-3">{x.v}</span>
    );

  return (
    <>
      <p className="mb-3 max-w-[112ch] text-[12px] leading-[1.55] text-ink-3">
        Реестрда <b className="font-semibold text-ink-2">{t.count} та лойиҳа</b>. Барча сумма —{" "}
        <b className="font-semibold text-ink-2">{USD}</b>. Ўзлаштирилган маблағ январь–июнь
        оралиғи учун берилган, лекин{" "}
        <b className="font-semibold text-ink-2">йил манбада кўрсатилмаган</b>, шунинг учун бу
        ерда ҳам ёзилмайди ва бўлим юқоридаги давр танлагичига боғланмаган — у бу ердаги
        рақамларни ўзгартирмайди. Бўлим маълумоти ишлаб чиқариш сводкаларидан эмас, алоҳида
        лойиҳалар реестридан келади.
      </p>

      <p className="mb-4 max-w-[112ch] text-[12px] leading-[1.55] text-ink-3">
        <b className="font-semibold text-ink-2">Барча лойиҳаларда бир хил:</b>{" "}
        {vm.constants.map((c, i) => (
          <span key={c.k}>
            {i > 0 && " · "}
            {c.k} — {c.v}
          </span>
        ))}
        . Бу майдонлар лойиҳаларни бир-биридан ажратмайди, шунинг учун улар кесим ёки фильтр
        сифатида берилмаган; ҳар бир лойиҳанинг тўлиқ рўйхатида эса ўз ўрнида турибди.
      </p>

      {/* --- плиткалар ---------------------------------------------------- */}
      <div className={GRID.g4}>
        <StatTile
          label="Лойиҳалар сони"
          value={investExact(t.count)}
          unit="та"
          stripe="var(--s1)"
          foot={
            <span className="text-ink-3">
              {vm.sections[0]?.groups.length ?? 0} та ҳудудда
            </span>
          }
        />
        <StatTile
          label="Умумий қиймат"
          value={investCalc(t.totalCost)}
          unit={USD}
          stripe="var(--s2)"
          foot={<span className="text-ink-3">{t.count} та лойиҳа бўйича жами</span>}
        />
        <StatTile
          label="Ўзлаштирилган"
          value={investCalc(t.disbursed)}
          unit={USD}
          stripe="var(--s3)"
          foot={
            <>
              <Pill>{pctTxt(t.disbursedPct)}</Pill>
              <span className="text-ink-3">умумий қийматдан</span>
            </>
          }
        />
        <StatTile
          label="Иш ўринлари"
          value={investExact(t.jobs)}
          unit="та"
          stripe="var(--rule)"
          foot={<span className="text-ink-3">реестрдаги етти лойиҳа бўйича</span>}
        />
      </div>

      {/* --- 1. бажарилиш ҳолати ------------------------------------------ */}
      <Section
        className="mt-5"
        title="Бажарилиш ҳолати"
        note="иккита мустақил ўлчов · ёнма-ён, бирлаштирилмаган"
      >
        <Card
          title="Жисмоний бажарилиш ва молиявий ўзлаштириш"
          sub="фоизда"
          note={
            <>
              Реестрда бажарилиш иккита ҳар хил устунда қайд этилган: биринчиси — ишнинг
              жисмоний бажарилиши, иккинчиси — ўзлаштирилган маблағнинг лойиҳа умумий
              қийматидаги улуши. Иккови қўшилмайди ва ўртачаси олинмайди — уларнинг{" "}
              <b className="font-semibold text-ink-2">фарқи</b> асосий кўрсаткич. Ўнг томондаги
              белги фарқни пунктда кўрсатади; манфий қиймат — иш пулдан олдинда кетган.
            </>
          }
        >
          <ChartLegend
            items={[
              { name: "Жисмоний бажарилиш", color: "var(--s1)" },
              { name: "Молиявий ўзлаштириш", color: "var(--s3)" },
            ]}
          />
          <div className="flex flex-col">
            {vm.progress.map((r) => (
              <ProgressPair key={r.id} row={r} />
            ))}
          </div>

          {vm.behind.length > 0 && (
            <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-3">
              {t.count} тадан{" "}
              <b className="font-semibold text-ink-2">{vm.behind.length} тасида</b> жисмоний
              бажарилиш молиявий ўзлаштиришдан кескин олдинда:{" "}
              {vm.behind.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && "; "}
                  <b className="font-semibold text-ink-2">{b.name}</b> —{" "}
                  {pctTxt(b.physPct)} ва {pctTxt(b.finPct)}, фарқ {investPp(b.gapPp)}
                </span>
              ))}
              . Фарқ ҳисоблаб тўғриланмаган ва ўртача қиймат билан алмаштирилмаган — манбадаги
              ҳолат шундай.
            </p>
          )}

          <TableToggle
            caption="Лойиҳалар бўйича жисмоний бажарилиш ва молиявий ўзлаштириш"
            cols={[
              { t: "Лойиҳа", wrap: true },
              { t: "Жисмоний", num: true },
              { t: "Молиявий", num: true },
              { t: "Фарқ", num: true },
              { t: `Умумий қиймат, ${USD}`, num: true },
              { t: `Ўзлаштирилган, ${USD}`, num: true },
            ]}
            rows={vm.progress.map((r) => ({
              key: r.id,
              cells: [
                r.name,
                pctTxt(r.physPct),
                pctTxt(r.finPct),
                investPp(r.gapPp),
                investExact(r.totalCost),
                investExact(r.disbursed),
              ],
            }))}
          />
        </Card>
      </Section>

      {/* --- 2. лойиҳа қиймати -------------------------------------------- */}
      <Section title="Лойиҳа қиймати" note={`қиймат бўйича тартибда · ${USD}`}>
        <Card
          title="Умумий қиймат ва ўзлаштирилган қисм"
          sub={USD}
          note="Устун узунлиги — лойиҳанинг умумий қиймати, ичидаги тўлдирилган қисм — шу лойиҳада ўзлаштирилган маблағ. Барча лойиҳа битта шкалада, чунки ўлчов бирлиги битта."
        >
          <ChartLegend
            items={[
              { name: "Умумий қиймат", color: "var(--rule)" },
              { name: "Ўзлаштирилган", color: "var(--s3)" },
            ]}
          />
          <div className="flex flex-col">
            {vm.cost.map((r) => (
              <CostRow key={r.id} row={r} max={vm.maxCost} />
            ))}
          </div>
          <TableToggle
            caption="Лойиҳалар бўйича умумий қиймат, ўзлаштирилган маблағ ва қолдиқ"
            cols={[
              { t: "Лойиҳа", wrap: true },
              { t: `Умумий қиймат, ${USD}`, num: true },
              { t: `Ўзлаштирилган, ${USD}`, num: true },
              { t: `Қолдиқ, ${USD}`, num: true },
              { t: "Ўзлаштириш", num: true },
              { t: `Йиллик ишлаб чиқариш, ${USD}`, num: true },
            ]}
            rows={vm.cost.map((r) => ({
              key: r.id,
              cells: [
                r.name,
                investExact(r.totalCost),
                investExact(r.disbursed),
                investCalc(r.remaining),
                pctTxt(r.disbursedPct),
                r.annualOutputUsd === null ? (
                  <span className="text-ink-3">{NO_DATA}</span>
                ) : (
                  investExact(r.annualOutputUsd)
                ),
              ],
            }))}
          />
        </Card>
      </Section>

      {/* --- 3. кесимлар --------------------------------------------------- */}
      <Section
        title="Кесимлар"
        note={`лойиҳалар умумий қиймати бўйича · ${USD}`}
      >
        <div className={GRID.g2}>
          {vm.sections.map((s) => (
            <Card key={s.id} title={s.title} sub={`${s.groups.length} та гуруҳ`}>
              <BarsH
                rows={s.groups.map((g) => ({
                  label: g.name,
                  v: g.totalCost,
                  extra: ["Лойиҳалар", `${g.count} та`],
                }))}
                vFmt={investCalc}
                vName={`Умумий қиймат, ${USD}`}
                ariaLabel={`${s.title} кесимида лойиҳаларнинг умумий қиймати, ${USD}`}
              />
              <TableToggle
                caption={`${s.title} кесими`}
                cols={[
                  { t: s.title, wrap: true },
                  { t: "Лойиҳалар", num: true },
                  { t: `Умумий қиймат, ${USD}`, num: true },
                  { t: `Ўзлаштирилган, ${USD}`, num: true },
                ]}
                rows={s.groups.map((g) => ({
                  key: g.name,
                  cells: [
                    g.name,
                    investExact(g.count),
                    investCalc(g.totalCost),
                    investCalc(g.disbursed),
                  ],
                }))}
              />
            </Card>
          ))}
        </div>

        <Card
          className="mt-3"
          title="Тайёргарлик ҳолати"
          sub="лойиҳалар бўйича"
          note={
            <>
              Ҳужжатлар ҳолати учун реестрда бешта босқич кўзда тутилган. Лойиҳалар ҳозирча
              уларнинг бир қисмида турибди; қолган босқичларда биронта лойиҳа йўқ:{" "}
              {vm.unusedDocStates.join(" · ")}. Катак қийматлари манбадаги ёзувда қолдирилган.
            </>
          }
        >
          <DataTable
            caption="Лойиҳаларнинг ТИА, ҳужжат ва ускуна тайёргарлиги"
            cols={[
              { t: "Лойиҳа", wrap: true },
              { t: "ТИА / ТИҲ ҳолати", wrap: true },
              { t: "Лойиҳа-смета ҳужжатлари" },
              { t: "Ускуналар" },
              { t: "Тугаш санаси (режа)" },
              { t: "Монтаж ва ишга тушириш" },
            ]}
            rows={vm.ready.map((r) => ({
              key: r.id,
              cells: [
                r.name,
                r.fsState,
                r.docState === NO_DATA ? <span className="text-ink-3">{r.docState}</span> : r.docState,
                r.equipment,
                r.endYear,
                r.commissioning === NO_DATA ? (
                  <span className="text-ink-3">{r.commissioning}</span>
                ) : (
                  r.commissioning
                ),
              ],
            }))}
          />
        </Card>
      </Section>

      {/* --- 4. молиявий кўрсаткичлар -------------------------------------- */}
      <Section title="Молиявий кўрсаткичлар" note="IRR · NPV · қоплаш муддати">
        <Card
          title="Лойиҳаларнинг молиявий баҳоси"
          sub={`${t.count} тадан ${vm.finCompleteCount} тасида тўлиқ`}
          note={
            <>
              Учала кўрсаткич ҳам ҳисобланган лойиҳа —{" "}
              <b className="font-semibold text-ink-2">{vm.finCompleteCount} та</b>. Қолганларида
              манбада ё «ТИАда аниқланади» деб ёзилган, ё катак бўш. Иккиси бир хил эмас ва
              шунинг учун бу ерда ҳам фарқли кўрсатилган: биринчиси — ҳисоблаш ҳали олдинда,
              иккинчиси — маълумотнинг ўзи йўқ. Бўш катак нол билан тўлдирилмаган ва
              кўрсаткичлар ўртачаси олинмаган — иккита қиймат бўйича ўртача маъносиз бўларди.
            </>
          }
        >
          <DataTable
            caption="Лойиҳалар бўйича IRR, NPV ва қоплаш муддати"
            cols={[
              { t: "Лойиҳа", wrap: true },
              { t: "IRR" },
              { t: `NPV, ${USD}` },
              { t: "Қоплаш муддати" },
            ]}
            rows={vm.fin.map((r) => ({
              key: r.id,
              cells: [r.name, valCell(r.irr), valCell(r.npv), valCell(r.payback)],
            }))}
          />
        </Card>
      </Section>

      {/* --- 5. лойиҳалар рўйхати ------------------------------------------ */}
      <Section
        title="Лойиҳалар рўйхати"
        note="карточкани очиб реестрдаги барча майдонни кўриш мумкин"
      >
        <div className={GRID.g2}>
          {vm.cards.map((c) => (
            <ProjectCard key={c.id} card={c} />
          ))}
        </div>
      </Section>

      <p className="max-w-[112ch] text-[11.5px] leading-[1.6] text-ink-3">
        <b className="font-semibold text-ink-2">Манба:</b> инвестиция лойиҳалари реестри —
        «Production Report» API'дан келмайди, шунинг учун бўлим бошқа бўлимлардаги ойлик
        сводкаларга боғлиқ эмас. Реестрда мавжуд, лекин биронта лойиҳада тўлдирилмаган
        майдонлар устун сифатида чизилмади: {vm.emptyFields.join(" · ")}
        {vm.unnamedEmptyCount > 0 && (
          <>
            {" "}
            ва яна {vm.unnamedEmptyCount} та сарлавҳасиз устун
          </>
        )}
        . Улар яширилмади — шу ерда очиқ санаб ўтилди. Йиллик ишлаб чиқариш натурадаги
        кўрсаткичи аралаш ўлчовда (бир қисми тонна, бир қисми дона), шунинг учун у ҳеч қаерда
        қўшилмади ва битта шкалага қўйилмади.
      </p>
    </>
  );
}
