import { useMemo, useState, type ReactNode } from "react";
import type { PanelProps } from "../types";
import type { MobplanResponse } from "../api/types";
import { getMobplan } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { usePalette } from "../lib/theme";
import {
  MOB_MISSING,
  MOB_NO_DATA,
  MOB_NO_VALUE,
  MOB_UNKNOWN,
  MOB_VAKANT,
  mobExact,
  mobPct,
  mobplanVM,
  type MobCell,
  type MobCutId,
  type MobGroup,
} from "../lib/adapters/mobplan";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { Columns } from "../components/Columns";
import { ColumnsLine } from "../components/ColumnsLine";
import { ShareDonut } from "../components/ShareDonut";
import { DataTable } from "../components/DataTable";
import { TableToggle } from "../components/TableToggle";
import { ChartLegend } from "../components/ChartLegend";
import { SegmentSwitch } from "../components/SegmentSwitch";
import { Loader } from "../components/states";

/**
 * «Кадрлар режаси» бўлими — корхонанинг штат жадвали ва 24 ойлик кадрлар
 * ёллаш режаси.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * Маълумот `GET /mobplan` дан келади. Аввал бўлим статик модулга таянар эди;
 * маълумот базага кўчирилгач у модул ўчирилди. Панел API тузилмасини
 * билмайди — фақат `adapters/mobplan.ts` тайёрлаган view-model'ни олади.
 *
 * Сўров параметрсиз: манба — битта ҳужжатнинг жорий ҳолати, вақт қатори эмас.
 * Шунинг учун бўлим `PanelProps` ни бошқа панеллар билан бир хилда олади,
 * лекин давр танлагичи бу ердаги рақамларни ўзгартирмайди.
 *
 * ═══ Тузилиши ══════════════════════════════════════════════════════════
 *
 * Сарлавҳа (учта чип) → олтита плитка → 1-қатор: штат тақсимоти, хизматчи/ишчи
 * нисбати, малака даражаси → 2-қатор: тоифа бўйича тўлдирилганлик, ишга қабул
 * режаси → 3-қатор: энг катта вакансиялар, банд лавозимдаги ходимлар →
 * тафсилот (ташкилий тузилма, кесимлар, лавозимлар рўйхати, манба текшируви) →
 * футер.
 *
 * Бўш жой тўқилмайди: одатдаги кадрлар дашбордида кутиладиган, бу манбада эса
 * умуман йўқ кўрсаткичлар (МҲТФ, кадрлар оқими, ГПХ, экспатлар, ўқитиш, иш
 * графиклари, таълим/жинс/ёш) ўйлаб топилмайди — улар битта блокда, «маълумот
 * йўқ» деб очиқ турибди (`MOB_MISSING`).
 *
 * ═══ 89,6% вакансия — ҳолат, баҳо эмас ══════════════════════════════════
 *
 * Корхона ҳали ишга туширилмаган: 241 штат бирлигидан 224 таси 2026 йилнинг
 * иккинчи ярмига режалаштирилган. Шунинг учун бу ерда ҳолат ранглари
 * (`--good/--warn/--crit`) ва «бажарилмаган / орқада / критик» сўзлари умуман
 * ишлатилмайди — улар дашбордда «режа бажарилиши» маъносини ташийди, бу ерда
 * эса баҳоланадиган бажарилиш йўқ. Вакансия нейтрал ранг билан (`--rule`),
 * банд эса `--s3` билан кўрсатилади.
 *
 * ═══ Диаграмма қоидалари ════════════════════════════════════════════════
 *
 * Ишга қабул диаграммасида устун (ойлик қабул) ва чизиқ (ўсиб борувчи жами)
 * **битта Y ўқида**: иккаласи ҳам «одам», шунинг учун иккинчи ўқ керак эмас
 * ва тақиқланади — шу сабабли `ColumnsLine` ишлатилган. Кесимларда
 * банд + вакансия = штат бўлгани учун йўлак ичидаги тўлдириш тўғри.
 *
 * ═══ Исм ════════════════════════════════════════════════════════════════
 *
 * Ф.И.Ш. фақат «Банд лавозимдаги ходимлар» рўйхатида ва лавозимлар
 * жадвалида кўринади — плитка, ҳалқа, диаграмма ва сарлавҳага чиқмайди.
 */

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Бўш катак ва «вакант» ёзувини сўниқ кўрсатадиган ячейка. */
function Cell({ c }: { c: MobCell }) {
  return c.empty ? <span className="text-ink-3">{c.v}</span> : <>{c.v}</>;
}

const clamp = (v: number): number => Math.max(0, Math.min(100, v));

/**
 * Плитка + прогресс йўлак. `StatTile` нинг `foot` майдонига қўйилади, шунда
 * компонентнинг ўзига тегилмайди ва бошқа бўлимлардаги плиткалар ўзгармайди.
 */
function KpiTile({
  label,
  value,
  unit,
  stripe,
  barPct,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Токен, масалан `var(--s1)` — hex қиймат ёзилмайди. */
  stripe: string;
  barPct: number;
  note: ReactNode;
}) {
  return (
    <StatTile
      label={label}
      value={value}
      unit={unit}
      stripe={stripe}
      foot={
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-sunken">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${clamp(barPct).toFixed(2)}%`, background: stripe }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink-3">{note}</p>
        </div>
      }
    />
  );
}

/** Гуруҳлар жадвали — ҳар бир диаграмманинг сон эквиваленти. */
function GroupTable({ groups, caption }: { groups: MobGroup[]; caption: string }) {
  return (
    <TableToggle
      caption={caption}
      cols={[
        { t: "Гуруҳ", wrap: true },
        { t: "Лавозим", num: true },
        { t: "Штат", num: true },
        { t: "Банд", num: true },
        { t: "Вакансия", num: true },
        { t: "Банд улуши", num: true },
        { t: "Штатдаги улуши", num: true },
      ]}
      rows={groups.map((g) => ({
        key: g.key,
        cells: [
          g.unknown ? <span className="text-ink-3">{g.name}</span> : g.name,
          mobExact(g.rows),
          mobExact(g.shtat),
          mobExact(g.band),
          mobExact(g.vakansiya),
          mobPct(g.bandPct),
          mobPct(g.shtatPct),
        ],
      }))}
    />
  );
}

/**
 * Битта гуруҳ: йўлак узунлиги — гуруҳнинг штат бирлиги, ичидаги тўлдирилган
 * қисм — банд бирлик. Қолган қисм — вакансия. Иккови қўшилса штат чиқади.
 */
function GroupRow({ g, max }: { g: MobGroup; max: number }) {
  const outer = max === 0 ? 0 : clamp((g.shtat / max) * 100);
  const inner = clamp(g.bandPct);
  return (
    <div className="border-t border-grid py-2.5 first:border-t-0 first:pt-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={"min-w-0 text-[12.5px]" + (g.unknown ? " text-ink-3" : "")}>
          {g.name}
          <span className="ml-1.5 text-[11.5px] text-ink-3">{mobExact(g.rows)} та лавозим</span>
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink-2">
          {mobExact(g.band)} / {mobExact(g.shtat)}
          <span className="text-ink-3">{" · вакансия "}{mobExact(g.vakansiya)}</span>
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-[3px] bg-sunken"
        title={`${g.name}: штат ${mobExact(g.shtat)} · банд ${mobExact(g.band)} (${mobPct(g.bandPct)}) · вакансия ${mobExact(g.vakansiya)}`}
      >
        <div
          className="h-full overflow-hidden rounded-[3px] bg-rule"
          style={{ width: `${outer.toFixed(2)}%` }}
        >
          <div className="h-full rounded-[3px] bg-s3" style={{ width: `${inner.toFixed(2)}%` }} />
        </div>
      </div>
    </div>
  );
}

/** Кесим блокининг ичи: легенда, қаторлар ва аниқ сон жадвали. */
function CutBody({ groups, caption }: { groups: MobGroup[]; caption: string }) {
  const max = Math.max(1, ...groups.map((g) => g.shtat));
  return (
    <>
      <ChartLegend
        items={[
          { name: "Банд", color: "var(--s3)" },
          { name: "Вакансия", color: "var(--rule)" },
        ]}
      />
      <div className="flex flex-col">
        {groups.map((g) => (
          <GroupRow key={g.key} g={g} max={max} />
        ))}
      </div>
      <GroupTable groups={groups} caption={caption} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* бўлим                                                                      */
/* -------------------------------------------------------------------------- */

type ListView = "shtat" | "tasnif";

const LIST_VIEWS: readonly { id: ListView; label: string; hint: string }[] = [
  {
    id: "shtat",
    label: "Штат ва ёллаш",
    hint: "Ҳар бир лавозимнинг штат бирлиги, банд/вакант ҳолати, ходими ва ёллаш режаси.",
  },
  {
    id: "tasnif",
    label: "Тасниф",
    hint: "Бўлинма, гуруҳ, МХСК коди, разряд ва малака даражаси. Бўш катак манбада тўлдирилмаган — юқоридаги сатрдан кўчирилмади.",
  },
];

/**
 * Бўлим давр танлагичига боғлиқ эмас — `/mobplan` сўрови параметрсиз. Лекин
 * панел бошқалар билан бир хил киришни олади (`PanelProps`), шунда
 * `Dashboard` да бу бўлим учун алоҳида ҳолат сақланмайди.
 */
export function MobPlanPanel(_props: PanelProps) {
  const q = useQuery("mobplan", (s) => getMobplan(s));

  return (
    <Loader
      q={q}
      height={320}
      notAvailableWhat="/mobplan"
      isEmpty={(d) => d.rows.length === 0}
      emptyTitle="Кадрлар режаси ҳали киритилмаган"
      emptyText="Сўров муваффақиятли бажарилди, лекин базада штат жадвали йўқ — режа файли ҳали импорт қилинмаган. Маълумот киритилгач бўлим ўзи тўлади; ҳеч қандай сон тахмин билан тўлдирилмайди."
    >
      {(data) => <MobPlanBody data={data} />}
    </Loader>
  );
}

function MobPlanBody({ data }: { data: MobplanResponse }) {
  const vm = useMemo(() => mobplanVM(data), [data]);
  const p = usePalette();
  const t = vm.totals;

  const [shareId, setShareId] = useState<MobCutId>("kategoriya");
  const [cutId, setCutId] = useState<MobCutId>("strukturnoe");
  const [listView, setListView] = useState<ListView>("shtat");

  const shareCut = vm.shareCuts.find((c) => c.id === shareId) ?? vm.shareCuts[0];
  const shareOptions = vm.shareCuts.map((c) => ({ id: c.id, label: c.title, hint: c.hint }));

  const cut = vm.cuts.find((c) => c.id === cutId) ?? vm.cuts[0];
  const cutOptions = vm.cuts.map((c) => ({ id: c.id, label: c.title, hint: c.hint }));

  /** Горизонтал диаграмма қатори: «Кўрсатилмаган» гуруҳи нейтрал рангда. */
  const barRows = (groups: MobGroup[]) =>
    groups.map((g) => ({
      label: g.name,
      v: g.shtat,
      // Recharts `var(--x)` ни тушунмайди — ранг палитрадан аниқ қиймат билан.
      color: g.unknown ? p.rule : p.s1,
      extra: ["Штатдаги улуши", mobPct(g.shtatPct)] as [string, string],
    }));

  return (
    <>
      {/* --- сарлавҳа ва учта чип ------------------------------------------ */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-2 border-b border-rule pb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] leading-tight [font-weight:650]">Кадрлар режаси</h2>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            штат жадвали ва ишга қабул режаси · корхона ҳали ишга туширилмаган
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>Ҳисобот · {vm.reportDate}</Pill>
          <Pill>{mobExact(t.rows)} та лавозим</Pill>
          <Pill>{vm.horizon}</Pill>
        </div>
      </div>

      <p className="mb-4 max-w-[112ch] text-[12px] leading-[1.55] text-ink-3">
        Жами <b className="font-semibold text-ink-2">{mobExact(t.shtat)} та</b> штат бирлиги,
        шундан <b className="font-semibold text-ink-2">{mobExact(t.band)} таси</b> банд (
        {mobPct(t.bandPct)}), <b className="font-semibold text-ink-2">{mobExact(t.vakansiya)}{" "}
        таси</b> очиқ ({mobPct(t.vakansiyaPct)}). Бу — орқада қолиш эмас, режанинг ўз тузилиши:{" "}
        <b className="font-semibold text-ink-2">{mobExact(vm.lateHires)} та</b> ишга қабул (жами
        режанинг {mobPct(vm.lateHiresPct)}) 2026 йилнинг иккинчи ярмига қўйилган. Шу сабабли бу
        бўлимда режа бажарилиши баҳоланмайди ва ҳолат ранглари ишлатилмайди. Юқоридаги давр
        танлагичи бу ердаги рақамларни ўзгартирмайди — манба ойлик сводка эмас.
      </p>

      {/* --- 1. олтита плитка ---------------------------------------------- */}
      <div className={GRID.g6}>
        <KpiTile
          label="Мақсадли штат"
          value={mobExact(t.shtat)}
          unit="та"
          stripe="var(--s1)"
          barPct={100}
          note={
            <>
              {mobExact(t.rows)} та лавозим номи · манбада {mobExact(t.nomBirligi)} таси алоҳида
              лавозим номи бирлиги
            </>
          }
        />
        <KpiTile
          label="Банд лавозимлар"
          value={mobExact(t.band)}
          unit="та"
          stripe="var(--s3)"
          barPct={t.bandPct}
          note={<>штатнинг {mobPct(t.bandPct)} и · жорий ҳолат</>}
        />
        <KpiTile
          label="Очиқ вакансиялар"
          value={mobExact(t.vakansiya)}
          unit="та"
          stripe="var(--rule)"
          barPct={t.vakansiyaPct}
          note={<>штатнинг {mobPct(t.vakansiyaPct)} и · режа бўйича тўлдирилади</>}
        />
        {vm.divisionTop.map((g) => (
          <KpiTile
            key={g.key}
            // Бўлинма номи манбадаги ёзувда — таржима ҳам, имло тузатиши ҳам йўқ.
            label={g.name}
            value={mobExact(g.shtat)}
            unit="та"
            stripe="var(--s2)"
            barPct={g.shtatPct}
            note={
              <>
                штатнинг {mobPct(g.shtatPct)} и · банд {mobExact(g.band)} · вакансия{" "}
                {mobExact(g.vakansiya)}
              </>
            }
          />
        ))}
      </div>

      {/* --- 2. биринчи қатор: учта панель ---------------------------------- */}
      <Section className="mt-5" title="Штат тузилиши" note="штат бирлиги">
        <div className={GRID.g3}>
          <Card
            title="Штат тақсимоти"
            sub={`${mobExact(shareCut.groups.length)} та гуруҳ`}
            note={
              <>
                Ҳалқа марказидаги сон — {mobExact(t.shtat)} штат бирлиги, яъни сегментлар
                йиғиндиси марказдаги сонга тенг. Манбада катак тўлдирилмаган сатрлар «
                {MOB_UNKNOWN}» деб алоҳида сегментда, нейтрал рангда: улар юқоридаги сатрдан
                тўлдирилмади ва тушириб ҳам қолдирилмади.
              </>
            }
          >
            <div className="mb-3">
              <SegmentSwitch
                label="Ўлчамни танлаш"
                options={shareOptions}
                value={shareCut.id}
                onChange={setShareId}
              />
            </div>
            <ShareDonut
              segments={shareCut.groups.map((g) => ({
                key: g.key,
                name: g.name,
                value: g.shtat,
                muted: g.unknown,
              }))}
              total={t.shtat}
              centerNote="штат бирлиги"
              ariaLabel={`${shareCut.title} бўйича штат бирлигининг тақсимоти, жами ${mobExact(t.shtat)} бирлик.`}
            />
            <GroupTable
              groups={shareCut.groups}
              caption={`${shareCut.title} бўйича штат бирлиги`}
            />
          </Card>

          <Card
            title="Хизматчи ва ишчи нисбати"
            sub={`манбада ${mobExact(vm.ratio.filled)}/${mobExact(t.rows)} сатр тўлдирилган`}
            note={
              <>
                Катак қиймати манбадаги ёзувда қолдирилган («ishchi», «xizmatchi») — қайта
                ёзилмади ва кириллга ўгирилмади. Устун тўлдирилмаган сатрлар «{MOB_UNKNOWN}»
                гуруҳида, ўз штат бирлиги билан турибди.
              </>
            }
          >
            <ShareDonut
              segments={vm.ratio.groups.map((g) => ({
                key: g.key,
                name: g.name,
                value: g.shtat,
                muted: g.unknown,
              }))}
              total={t.shtat}
              centerNote="штат бирлиги"
              ariaLabel={`Хизматчи ва ишчи нисбати, жами ${mobExact(t.shtat)} штат бирлиги.`}
            />
            <GroupTable groups={vm.ratio.groups} caption="Хизматчи ва ишчи бўйича штат бирлиги" />
          </Card>

          <Card
            title="Малака даражаси"
            sub={`манбада ${mobExact(vm.qualification.filled)}/${mobExact(t.rows)} сатр тўлдирилган`}
            note={
              <>
                Шкала табиий тартибда (1 дан 7 гача), катталик бўйича қайта тизилмаган.
                Охирги устун — «{MOB_UNKNOWN}»: манбада даража ёзилмаган сатрлар. Бу нол эмас
                ва бошқа даражага қўшилмайди, шунинг учун устунлар йиғиндиси{" "}
                <b className="font-semibold text-ink-2">{mobExact(t.shtat)}</b> бўлиб қолади.
              </>
            }
          >
            <Columns
              labels={vm.qualification.groups.map((g) => g.name)}
              fullLabels={vm.qualification.groups.map((g) =>
                g.unknown ? MOB_UNKNOWN : `${g.name}-даража`,
              )}
              series={[
                {
                  name: "Штат бирлиги",
                  color: p.s1,
                  values: vm.qualification.groups.map((g) => g.shtat),
                },
              ]}
              valueLabel={(_s, i) => mobExact(vm.qualification.groups[i]?.shtat ?? 0)}
              vFmt={mobExact}
              yTickFmt={mobExact}
              yWidth={40}
              height={268}
              ariaLabel={`Малака даражаси бўйича штат бирлиги, жами ${mobExact(t.shtat)} бирлик.`}
            />
            <GroupTable
              groups={vm.qualification.groups}
              caption="Малака даражаси бўйича штат бирлиги"
            />
          </Card>
        </div>
      </Section>

      {/* --- 3. иккинчи қатор: иккита панель --------------------------------- */}
      <Section title="Тўлдирилганлик ва ишга қабул" note="киши">
        <div className={GRID.g2}>
          <Card
            title="Тоифа бўйича тўлдирилганлик"
            sub={`манбада ${mobExact(vm.fillByCat.filled)}/${mobExact(t.rows)} сатр тўлдирилган`}
            note="Йўлак узунлиги — тоифанинг штат бирлиги, тўлдирилган қисми — банд бирликлар. Жами устунлар манбадаги ҳақиқий тоифа устунидан ҳисобланган: «Кўрсатилмаган» алоҳида қатор бўлиб қолади ва бошқа тоифаларга тарқатилмайди."
          >
            <CutBody
              groups={vm.fillByCat.groups}
              caption="Ходимлар тоифаси бўйича банд ва вакансия"
            />
          </Card>

          <Card
            title="Ишга қабул режаси"
            sub={`${mobExact(vm.months.length)} ой · киши`}
            note={
              <>
                Устун — шу ойда ишга қабул қилиниши режалаштирилган киши, чизиқ — ой охиридаги
                жами. Иккаласи ҳам бир хил ўлчовда (одам), шунинг учун улар{" "}
                <b className="font-semibold text-ink-2">битта шкалада</b> турибди ва иккинчи Y
                ўқи ишлатилмаган. Устун устидаги сон фақат энг йирик ойларда ёзилган; қолган
                қиймат тултипда ва жадвалда.
              </>
            }
          >
            <ChartLegend
              items={[
                { name: "Ойлик қабул", color: "var(--s1)" },
                { name: "Ўсиб борувчи жами", color: "var(--s3)" },
              ]}
            />
            <ColumnsLine
              labels={vm.months.map((m) => m.tick)}
              fullLabels={vm.months.map((m) => m.label)}
              bar={{ name: "Ойлик қабул", color: p.s1, values: vm.months.map((m) => m.hires) }}
              line={{
                name: "Ўсиб борувчи жами",
                color: p.s3,
                values: vm.months.map((m) => m.cum),
              }}
              barLabelAt={vm.months.flatMap((m, i) => (m.labelled ? [i] : []))}
              vFmt={mobExact}
              yTickFmt={mobExact}
              yWidth={44}
              height={268}
              ariaLabel={`Ойлар бўйича ишга қабул режаси ва ўсиб борувчи жами, киши. ${vm.firstHireMonth} дан ${vm.lastHireMonth} гача, жами ${mobExact(t.shtat)} киши.`}
            />
            <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
              Биринчи қабул — {vm.firstHireMonth}, охиргиси — {vm.lastHireMonth}. Ўсиб борувчи
              қатор {mobExact(t.shtat)} да тугайди, яъни режа штат жадвалини тўлиқ ёпади.
            </p>
            <TableToggle
              caption="Ойлар бўйича ишга қабул режаси ва ўсиб борувчи жами"
              cols={[
                { t: "Ой" },
                { t: "Қабул", num: true },
                { t: "Ўсиб борувчи", num: true },
                { t: "Жами режадан", num: true },
              ]}
              rows={vm.months.map((m) => ({
                key: m.key,
                cells: [m.label, mobExact(m.hires), mobExact(m.cum), mobPct(m.cumPct)],
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* --- 4. учинчи қатор: иккита панель ---------------------------------- */}
      <Section title="Вакансиялар ва ходимлар" note="лавозим кесимида">
        <div className={GRID.g2}>
          <Card
            title="Энг катта вакансия гуруҳлари"
            sub={`${mobExact(vm.vacancies.length)} та лавозимда очиқ ўрин бор`}
            note="Очиқ ўрин лавозим даражасида кўрсатилган — тўлдириш айнан шу даражада режалаштирилади. Вакансияси нол бўлган лавозимлар рўйхатга тушмайди: улар «маълумот йўқ» эмас, шунчаки очиқ ўрни йўқ."
          >
            <div
              tabIndex={0}
              className="max-h-[360px] overflow-y-auto pr-1"
              aria-label="Энг катта вакансия гуруҳлари рўйхати"
            >
              {vm.vacancies.map((v) => (
                <div key={v.id} className="border-t border-grid py-2.5 first:border-t-0 first:pt-0">
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 text-[12.5px]">
                      {v.lavozim}
                      <span className="ml-1.5 text-[11.5px] text-ink-3">
                        <Cell c={v.bolinma} />
                      </span>
                    </span>
                    <span className="font-mono text-[12px] tabular-nums text-ink-2">
                      {mobExact(v.vakansiya)}
                      <span className="text-ink-3">
                        {" / "}
                        {mobExact(v.shtat)} · {mobPct(v.pct)}
                      </span>
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-[3px] bg-sunken"
                    title={`${v.lavozim}: вакансия ${mobExact(v.vakansiya)} · штат ${mobExact(v.shtat)} · банд ${mobExact(v.band)}`}
                  >
                    <div
                      className="h-full rounded-[3px] bg-rule"
                      style={{ width: `${clamp(v.barPct).toFixed(2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <TableToggle
              caption="Лавозимлар бўйича очиқ вакансиялар"
              cols={[
                { t: "Лавозим", wrap: true },
                { t: "Бўлинма", wrap: true },
                { t: "Штат", num: true },
                { t: "Банд", num: true },
                { t: "Вакансия", num: true },
                { t: "Вакансия улуши", num: true },
              ]}
              rows={vm.vacancies.map((v) => ({
                key: v.id,
                cells: [
                  v.lavozim,
                  <Cell c={v.bolinma} />,
                  mobExact(v.shtat),
                  mobExact(v.band),
                  mobExact(v.vakansiya),
                  mobPct(v.pct),
                ],
              }))}
            />
          </Card>

          <Card
            title="Банд лавозимдаги ходимлар"
            sub={`${mobExact(vm.staff.length)} та ёзув · ${mobExact(t.band)} банд бирлик`}
            note={
              <>
                Ф.И.Ш. манбадаги ёзувда, қайта ёзилмаган. Исм фақат шу рўйхатда ва лавозимлар
                жадвалида кўринади — плитка, ҳалқа ва диаграммаларда ишлатилмайди.{" "}
                {vm.multiNameRows > 0 && (
                  <>
                    <b className="font-semibold text-ink-2">{mobExact(vm.multiNameRows)} та</b>{" "}
                    ёзувда битта катакда иккита исм турибди — шунинг учун ёзувлар сони банд
                    бирликлар сонидан кам.
                  </>
                )}
              </>
            }
          >
            <div
              tabIndex={0}
              className="max-h-[360px] overflow-y-auto pr-1"
              aria-label="Банд лавозимдаги ходимлар рўйхати"
            >
              <ul className="flex flex-col">
                {vm.staff.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 border-t border-grid py-2 first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 flex-none place-items-center rounded-full bg-sunken font-mono text-[11px] font-bold text-ink-2"
                    >
                      {s.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px]">{s.name}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{s.lavozim}</span>
                    </span>
                    {s.multi && <Pill>иккита исм</Pill>}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </Section>

      {/* --- 5. тафсилот ----------------------------------------------------- */}
      <Section title="Ташкилий тузилма ва чораклар" note="штат бирлиги · киши">
        <div className={GRID.g3}>
          <Card
            title={vm.structure.title}
            sub={`${mobExact(vm.structure.groups.length)} та гуруҳ`}
            note={
              <>
                Манбадаги ёзув ўзгартирилмади ва гуруҳлар бирлаштирилмади: бу устун тартибсиз
                тўлдирилган,{" "}
                <b className="font-semibold text-ink-2">
                  {mobExact(vm.structure.groups.find((g) => g.unknown)?.shtat ?? 0)}
                </b>{" "}
                штат бирлигида эса бўлим умуман кўрсатилмаган.
              </>
            }
          >
            <BarsH
              rows={barRows(vm.structure.groups)}
              vFmt={mobExact}
              vName="Штат бирлиги"
              rowH={28}
              ariaLabel="Таркибий бўлимлар бўйича штат бирлиги."
            />
            <GroupTable
              groups={vm.structure.groups}
              caption="Таркибий бўлимлар бўйича штат бирлиги"
            />
          </Card>

          <Card
            title={vm.division.title}
            sub={`${mobExact(vm.division.groups.length)} та гуруҳ`}
            note={
              <>
                Йирик бўлинма кесими. Ёзув манбадагидек қолдирилди — имло хатоси билан ҳам қайта
                ёзилмади.{" "}
                <b className="font-semibold text-ink-2">
                  {mobExact(vm.division.groups.find((g) => g.unknown)?.rows ?? 0)} та
                </b>{" "}
                лавозимда бўлинма кўрсатилмаган.
              </>
            }
          >
            <BarsH
              rows={barRows(vm.division.groups)}
              vFmt={mobExact}
              vName="Штат бирлиги"
              rowH={34}
              ariaLabel="Бўлинмалар бўйича штат бирлиги."
            />
            <GroupTable groups={vm.division.groups} caption="Бўлинмалар бўйича штат бирлиги" />
          </Card>

          <Card
            title="Чоракларда"
            sub="киши"
            note="Ўша режанинг чораклар бўйича кўриниши — ишга қабул қаерга тўпланганини бир қарашда кўрсатади. Қабул бўлмаган чорак нол бўлиб туради: у «маълумот йўқ» эмас."
          >
            <Columns
              labels={vm.quarters.map((q) => q.tick)}
              fullLabels={vm.quarters.map((q) => q.label)}
              series={[
                { name: "Ишга қабул режаси", color: p.s1, values: vm.quarters.map((q) => q.hires) },
              ]}
              valueLabel={(_s, i) => mobExact(vm.quarters[i]?.hires ?? 0)}
              vFmt={mobExact}
              yTickFmt={mobExact}
              yWidth={44}
              height={268}
              ariaLabel={`Чораклар бўйича ишга қабул режаси, киши. Жами ${mobExact(t.shtat)} киши.`}
            />
            <TableToggle
              caption="Чораклар бўйича ишга қабул режаси"
              cols={[
                { t: "Чорак" },
                { t: "Қабул", num: true },
                { t: "Ўсиб борувчи", num: true },
                { t: "Жами режадан", num: true },
              ]}
              rows={vm.quarters.map((qr) => ({
                key: qr.id,
                cells: [qr.label, mobExact(qr.hires), mobExact(qr.cum), mobPct(qr.pct)],
              }))}
            />
          </Card>
        </div>
      </Section>

      <Section title="Банд ва вакансия кесимлари" note="битта блок · кесимни танлаш мумкин">
        <Card
          title={cut.title}
          sub={`${mobExact(cut.groups.length)} та гуруҳ · манбада ${mobExact(cut.filled)}/${mobExact(t.rows)} сатр тўлдирилган`}
          note="Юқоридаги ҳалқалар штатнинг тақсимотини кўрсатади, бу блок эса ўша гуруҳларнинг қанчаси банд эканини: йўлак узунлиги — гуруҳнинг штат бирлиги, тўлдирилган қисми — банд бирликлар."
        >
          <div className="mb-3">
            <SegmentSwitch
              label="Кесимни танлаш"
              options={cutOptions}
              value={cut.id}
              onChange={setCutId}
            />
          </div>
          <CutBody groups={cut.groups} caption={`${cut.title} кесими`} />
        </Card>
      </Section>

      <Section title="Лавозимлар рўйхати" note={`${mobExact(t.rows)} та сатр · манбадаги ёзувда`}>
        <Card
          title="Штат жадвали"
          sub={`${mobExact(t.rows)} та лавозим`}
          note={
            <>
              Лавозим номлари манбадаги ёзувда қолдирилган — рус ва ўзбек тили аралаш, қайта
              ёзилмаган ва таржима қилинмаган. «{MOB_VAKANT}» — бу бўш катак эмас, балки
              «лавозим ҳозирча эгалланмаган» деган аниқ маълумот; бўш катак эса «{MOB_NO_VALUE}»
              билан кўрсатилган.
            </>
          }
        >
          <div className="mb-3">
            <SegmentSwitch
              label="Устунлар тўпламини танлаш"
              options={LIST_VIEWS}
              value={listView}
              onChange={setListView}
            />
          </div>
          {listView === "shtat" ? (
            <DataTable
              caption="Лавозимлар бўйича штат бирлиги, банд/вакант ҳолати ва ишга қабул режаси"
              maxHeight={560}
              cols={[
                { t: "Лавозим", wrap: true },
                { t: "Ўзбекча номи", wrap: true },
                { t: "Тоифа" },
                { t: "Штат", num: true },
                { t: "Банд", num: true },
                { t: "Вакансия", num: true },
                { t: "Ходим" },
                { t: "Ишга қабул режаси", wrap: true },
              ]}
              rows={vm.positions.map((r) => ({
                key: r.id,
                cells: [
                  r.lavozim,
                  <Cell c={r.lavozimUz} />,
                  <Cell c={r.kategoriya} />,
                  r.shtat,
                  r.band,
                  r.vakansiya,
                  r.vakant ? <span className="text-ink-3">{r.xodim}</span> : r.xodim,
                  r.planText,
                ],
              }))}
            />
          ) : (
            <DataTable
              caption="Лавозимларнинг таснифи"
              maxHeight={560}
              cols={[
                { t: "Лавозим", wrap: true },
                { t: "Бўлинма" },
                { t: "Таркибий бўлим" },
                { t: "Гуруҳ" },
                { t: "МХСК коди" },
                { t: "Хизматчи / ишчи" },
                { t: "Ходим тоифаси" },
                { t: "Разряд" },
                { t: "Малака даражаси" },
              ]}
              rows={vm.positions.map((r) => ({
                key: r.id,
                cells: [
                  r.lavozim,
                  <Cell c={r.podrazdelenie} />,
                  <Cell c={r.strukturnoe} />,
                  <Cell c={r.guruh} />,
                  <Cell c={r.mxskKod} />,
                  <Cell c={r.xizmatchiIshchi} />,
                  <Cell c={r.xodimToifasi} />,
                  <Cell c={r.razryad} />,
                  <Cell c={r.malakaDarajasi} />,
                ],
              }))}
            />
          )}
        </Card>
      </Section>

      <Section
        title="Бошқа манбадан келадиган кўрсаткичлар"
        note={`${mobExact(MOB_MISSING.length)} та · штат реестрида йўқ`}
      >
        <Card
          title="Бу бўлимда кўрсатилмайди"
          sub={MOB_NO_DATA}
          note="Қуйидаги кўрсаткичлар кадрлар дашбордида одатда кутилади, лекин бу бўлимнинг манбаси — фақат штат жадвали ва ишга қабул режаси. Уларнинг ҳеч бири тахмин билан тўлдирилмади ва нол деб кўрсатилмади: маълумот бошқа ҳужжатлардан келиши керак."
        >
          <ul className="grid grid-cols-1 gap-x-8 mid:grid-cols-2">
            {MOB_MISSING.map((m) => (
              <li
                key={m.k}
                className="flex items-baseline justify-between gap-3 border-t border-grid py-2"
              >
                <span className="min-w-0 text-[12.5px]">
                  {m.k}
                  <span className="ml-1.5 text-[11.5px] text-ink-3">{m.note}</span>
                </span>
                <span className="flex-none text-[11.5px] text-ink-3">{MOB_NO_DATA}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Манба ҳақида" note="текширув ва тўлдирилмаган катаклар">
        <div className={GRID.g2}>
          <Card
            title="Манба билан таққослаш"
            sub={vm.checksAllOk ? "ҳаммаси мос" : "номослик бор"}
            note="Экрандаги ҳар бир йиғинди манбанинг ўз «жами» сатри билан солиштирилади. «Жами» сатрлари қаторлар рўйхатига кирмайди — улар API'дан алоҳида келади, шунинг учун йиғиндида икки марта саналмайди."
          >
            <DataTable
              caption="Ҳисобланган йиғиндиларнинг манба билан таққослови"
              cols={[{ t: "Текширув" }, { t: "Натижа", num: true }, { t: "Ҳолат" }]}
              rows={vm.checks.map((c) => ({
                key: c.k,
                cells: [
                  c.k,
                  c.detail,
                  c.ok === null ? (
                    <span className="text-ink-3">таққосланмади</span>
                  ) : c.ok ? (
                    "мос"
                  ) : (
                    <span className="font-semibold">мос эмас</span>
                  ),
                ],
              }))}
            />
          </Card>

          <Card
            title="Тўлдирилмаган катаклар"
            sub={`${mobExact(t.rows)} сатрдан`}
            note="Бўш катак «юқоридагидек» дегани эмас, шунинг учун у юқоридаги сатрдан кўчирилмади ва тахмин қилинмади. Тўлдирилмаган сатрлар кесимларда «Кўрсатилмаган» гуруҳида, ўз штат бирлиги билан кўринади."
          >
            <DataTable
              caption="Тасниф устунларининг тўлдирилганлиги"
              cols={[{ t: "Устун" }, { t: "Тўлдирилган", num: true }, { t: "Бўш", num: true }]}
              rows={vm.filled.map((f) => ({
                key: f.k,
                cells: [
                  f.k,
                  `${mobExact(f.filled)}/${mobExact(f.total)}`,
                  mobExact(f.total - f.filled),
                ],
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* --- 6. футер: манба ва штат баланси --------------------------------- */}
      <p className="max-w-[112ch] text-[11.5px] leading-[1.6] text-ink-3">
        <b className="font-semibold text-ink-2">Манба:</b> корхонанинг кадрлар ҳужжати — штат
        жадвали ва ишга қабул режаси. У ишлаб чиқариш сводкаларидан келмайди, шунинг учун бўлим
        бошқа бўлимлардаги ойлик рақамларга боғлиқ эмас; ҳисобот ҳолати —{" "}
        <b className="font-semibold text-ink-2">{vm.reportDate}</b>.{" "}
        <b className="font-semibold text-ink-2">Штат баланси:</b> {mobExact(t.band)} банд +{" "}
        {mobExact(t.vakansiya)} вакансия = {mobExact(t.shtat)} штат бирлиги, ишга қабул режасининг
        жами йиғиндиси ҳам {mobExact(t.shtat)}. Банд бирликлар {mobExact(t.band)} та, лекин
        Ф.И.Ш. ёзилган сатр {mobExact(vm.namedRows)} та — улардан{" "}
        {mobExact(vm.multiNameRows)} тасида битта катакда иккита исм турибди, шундан{" "}
        {mobExact(vm.namedBand)} та чиқади, яъни яна {mobExact(vm.bandWithoutName)} та банд бирлик
        исмсиз қолган. Бу манбадаги ҳолат: исм ўйлаб топилмади ва йиғинди тўғриланмади.
      </p>
    </>
  );
}
