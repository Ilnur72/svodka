import { useMemo, useState, type ReactNode } from "react";
import type { PanelProps } from "../types";
import type { MobplanResponse } from "../api/types";
import { getMobplan } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { usePalette } from "../lib/theme";
import {
  MOB_NO_DATA,
  MOB_NO_DATA_CARDS,
  MOB_NO_DATA_DONUTS,
  MOB_NO_DATA_SCHEDULE,
  MOB_NO_DATA_TILES,
  MOB_NO_VALUE,
  MOB_UNKNOWN,
  MOB_VAKANT,
  mobExact,
  mobPct,
  mobplanVM,
  type MobCell,
  type MobNoDataItem,
  type MobVM,
} from "../lib/adapters/mobplan";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { Columns } from "../components/Columns";
import { ShareDonut } from "../components/ShareDonut";
import { DataTable } from "../components/DataTable";
import { TableToggle } from "../components/TableToggle";
import { SegmentSwitch } from "../components/SegmentSwitch";
import { Loader } from "../components/states";

/**
 * «Кадрлар режаси» бўлими — корхонанинг штат жадвали ва 24 ойлик ёллаш режаси.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * Маълумот `GET /mobplan` дан келади. Панел API тузилмасини билмайди — фақат
 * `adapters/mobplan.ts` тайёрлаган view-model'ни олади. Сўров параметрсиз:
 * манба — битта ҳужжатнинг жорий ҳолати, вақт қатори эмас. Шунинг учун бўлим
 * `PanelProps` ни бошқалар билан бир хилда олади, лекин юқоридаги давр
 * танлагичи бу ердаги рақамларни ўзгартирмайди.
 *
 * ═══ Тузилиши ══════════════════════════════════════════════════════════
 *
 * Сарлавҳа → 6 та плитка → 4 та ҳалқа → ўрта қатор (3 та) → пастки қатор
 * (6 та карточка) → лавозимлар рўйхати → манба текшируви → футер.
 *
 * ═══ Бўш жой тўқилмайди ═════════════════════════════════════════════════
 *
 * Тузилишдаги ўнга яқин кўрсаткич (МҲТФ, кадрлар оқими, таълим/жинс/ёш,
 * ҳужжат муддатлари, ГПХ, экспатлар, ўқитиш, иш графиклари) манбада **устун
 * сифатида ҳам йўқ**. Улар яширилмайди ва нол билан тўлдирилмайди — ўз
 * карточкасида очиқ «маълумот йўқ» бўлиб туради. Бўш ҳалқа ичи бўш доира
 * бўлиб чизилади: сохта сегмент чизилмайди.
 *
 * ═══ 89,6% вакансия — ҳолат, баҳо эмас ══════════════════════════════════
 *
 * Корхона ҳали ишга туширилмаган, режанинг оғирлиги олдинда. Шунинг учун бу
 * ерда ҳолат ранглари (`--good/--warn/--crit`) ва «бажарилмаган / орқада /
 * критик» сўзлари умуман ишлатилмайди. Вакансия нейтрал ранг билан
 * (`--rule`), банд эса `--s3` билан кўрсатилади.
 *
 * ═══ Диаграмма қоидалари ════════════════════════════════════════════════
 *
 * Иккинчи Y ўқи йўқ. Битта диаграммада фақат битта ўлчов: бўлинмалар
 * диаграммасида **штат бирлиги**, босқичлар диаграммасида **киши**.
 *
 * ═══ Исм ════════════════════════════════════════════════════════════════
 *
 * Ф.И.Ш. фақат лавозимлар жадвалида кўринади — плитка, ҳалқа, диаграмма ва
 * сарлавҳага чиқмайди.
 */

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Бўш катакни сўниқ кўрсатадиган ячейка. */
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

/**
 * Манбада устуни умуман йўқ кўрсаткич. Прогресс йўлаги йўқ — йўлак «нол
 * фоиз» деган ёлғон маънони берарди; ўрнида бўш йўлак изи туради.
 */
function NoDataTile({ label, note }: { label: string; note: string }) {
  return (
    <StatTile
      label={label}
      stripe="var(--rule)"
      value={<span className="text-[17px] leading-[1.6] text-ink-3">{MOB_NO_DATA}</span>}
      foot={
        <div className="w-full">
          <div className="h-1.5 w-full rounded-[3px] bg-sunken" />
          <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink-3">{note}</p>
        </div>
      }
    />
  );
}

/**
 * Бўш ҳалқа: манбада бундай устун йўқ, шунинг учун ичи **бўш** доира
 * чизилади ва марказда «маълумот йўқ» ёзилади. Сохта сегмент чизилмайди —
 * `ShareDonut` бу ерда ишлатилмайди, чунки унга сегмент керак.
 */
function EmptyDonut({ label, size = 148 }: { label: string; size?: number }) {
  return (
    <div className="flex justify-center">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          role="img"
          aria-label={`${label}: ${MOB_NO_DATA}`}
        >
          <circle
            cx={50}
            cy={50}
            r={40}
            fill="none"
            strokeWidth={15}
            strokeDasharray="3 7"
            style={{ stroke: "var(--grid)" }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-[11.5px] text-ink-3">{MOB_NO_DATA}</span>
        </div>
      </div>
    </div>
  );
}

/** Манбада йўқ кўрсаткичлар рўйхати — ҳар бири ўз сатрида, очиқ белги билан. */
function NoDataList({ items }: { items: MobNoDataItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li
          key={it.key}
          className="flex items-baseline justify-between gap-3 border-t border-grid py-2 first:border-t-0 first:pt-0"
        >
          <span className="min-w-0 text-[12.5px]">{it.label}</span>
          <span className="flex-none font-mono text-[11.5px] text-ink-3">{MOB_NO_DATA}</span>
        </li>
      ))}
    </ul>
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
    hint: "Бўлинма, гуруҳ, МХСК коди, разряд, малака даражаси, хизматчи/ишчи ва ходим тоифаси. Бўш катак манбада тўлдирилмаган — юқоридаги сатрдан кўчирилмади.",
  },
];

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
  return <MobPlanView vm={vm} />;
}

function MobPlanView({ vm }: { vm: MobVM }) {
  const p = usePalette();
  const t = vm.totals;
  const [listView, setListView] = useState<ListView>("shtat");

  const mainYear = vm.mainYear;
  const nomBirligiPct = t.rows === 0 ? 0 : (t.nomBirligi / t.rows) * 100;

  return (
    <>
      {/* --- сарлавҳа ------------------------------------------------------- */}
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
        {mobPct(t.bandPct)}), <b className="font-semibold text-ink-2">{mobExact(t.vakansiya)} таси</b>{" "}
        очиқ ({mobPct(t.vakansiyaPct)}). Бу — орқада қолиш эмас, режанинг ўз тузилиши:
        {mainYear && (
          <>
            {" "}
            <b className="font-semibold text-ink-2">{mobExact(vm.lateHires)} та</b> ишга қабул (жами
            режанинг {mobPct(vm.lateHiresPct)}) {mainYear.year} йилнинг иккинчи ярмига қўйилган.
          </>
        )}{" "}
        Шу сабабли бу бўлимда режа бажарилиши баҳоланмайди ва ҳолат ранглари ишлатилмайди.
        Юқоридаги давр танлагичи бу ердаги рақамларни ўзгартирмайди — манба ойлик сводка эмас.
      </p>

      {/* --- 1. олтита плитка ---------------------------------------------- */}
      <div className={GRID.g6}>
        <KpiTile
          label="Умумий штат сони"
          value={mobExact(t.shtat)}
          unit="та"
          stripe="var(--s1)"
          barPct={100}
          note={<>{mobExact(t.rows)} та лавозим сатри · манбанинг жами сатри билан таққосланган</>}
        />
        {/* Ёрлиқ манбадаги устун номи билан: бу «штат жадвали» эмас, балки
            алоҳида лавозим номи бирлиги ҳисоби. */}
        <KpiTile
          label="Единица должности"
          value={mobExact(t.nomBirligi)}
          unit="та"
          stripe="var(--s2)"
          barPct={nomBirligiPct}
          note={
            <>
              манбадаги устун номи · {mobExact(t.rows)} сатрдан {mobExact(t.nomBirligi)} таси
              алоҳида лавозим номи бирлиги
            </>
          }
        />
        <KpiTile
          label={mainYear ? `${mainYear.year} йил ёллаш режаси` : "Ёллаш режаси"}
          value={mobExact(mainYear ? mainYear.hires : vm.planTotal)}
          unit="киши"
          stripe="var(--s1)"
          barPct={mainYear ? mainYear.pct : 100}
          note={
            <>
              жами режанинг {mobPct(mainYear ? mainYear.pct : 100)} и
              {vm.otherYears.map((y) => (
                <span key={y.year}>
                  {" · "}
                  {y.year} йилда {mobExact(y.hires)} та
                </span>
              ))}
            </>
          }
        />
        <KpiTile
          label="Тўлдирилганлик"
          value={mobPct(t.bandPct)}
          stripe="var(--s3)"
          barPct={t.bandPct}
          note={
            <>
              {mobExact(t.shtat)} бирликдан {mobExact(t.band)} таси банд · очиқ{" "}
              {mobExact(t.vakansiya)}
            </>
          }
        />
        {MOB_NO_DATA_TILES.map((m) => (
          <NoDataTile key={m.key} label={m.label} note={m.note} />
        ))}
      </div>

      {/* --- 2. тўртта ҳалқа ------------------------------------------------ */}
      <Section
        className="mt-5"
        title="Ходимлар тақсимоти"
        note="штат бирлиги · тўрттадан биттасида маълумот бор"
      >
        <div className={GRID.g4}>
          <Card
            title="Ходимлар тоифаси бўйича"
            sub={`${mobExact(vm.kategoriya.groups.length)} та гуруҳ`}
            note={
              <>
                Ҳалқа марказидаги сон — {mobExact(t.shtat)} штат бирлиги, яъни сегментлар
                йиғиндиси марказдаги сонга тенг. Манбада катак тўлдирилмаган сатрлар «
                {MOB_UNKNOWN}» деб алоҳида сегментда, нейтрал рангда: улар юқоридаги сатрдан
                тўлдирилмади ва тушириб ҳам қолдирилмади.
              </>
            }
          >
            <ShareDonut
              segments={vm.kategoriya.groups.map((g) => ({
                key: g.key,
                name: g.name,
                value: g.shtat,
                muted: g.unknown,
              }))}
              total={t.shtat}
              centerNote="штат бирлиги"
              ariaLabel={`Ходимлар тоифаси бўйича штат бирлигининг тақсимоти, жами ${mobExact(t.shtat)} бирлик.`}
            />
            <TableToggle
              caption="Ходимлар тоифаси бўйича штат бирлиги"
              cols={[
                { t: "Тоифа", wrap: true },
                { t: "Лавозим", num: true },
                { t: "Штат", num: true },
                { t: "Банд", num: true },
                { t: "Вакансия", num: true },
                { t: "Штатдаги улуши", num: true },
              ]}
              rows={vm.kategoriya.groups.map((g) => ({
                key: g.key,
                cells: [
                  g.unknown ? <span className="text-ink-3">{g.name}</span> : g.name,
                  mobExact(g.rows),
                  mobExact(g.shtat),
                  mobExact(g.band),
                  mobExact(g.vakansiya),
                  mobPct(g.shtatPct),
                ],
              }))}
            />
          </Card>

          {MOB_NO_DATA_DONUTS.map((d) => (
            <Card
              key={d.key}
              title={d.title}
              sub={MOB_NO_DATA}
              note={`${d.note}. Сегмент чизилмайди — тахминий тақсимот ясалмайди; маълумот бошқа кадрлар ҳужжатидан келиши керак.`}
            >
              <EmptyDonut label={d.title} />
            </Card>
          ))}
        </div>
      </Section>

      {/* --- 3. ўрта қатор -------------------------------------------------- */}
      <Section title="Режа босқичлари ва тузилма" note="киши · штат бирлиги">
        <div className={GRID.g3}>
          <Card
            title="Ишга қабул режаси босқичлари"
            sub={`${mobExact(vm.quarters.length)} чорак · киши`}
            note={
              <>
                Манба икки йилни қамрайди, шунинг учун босқичлар{" "}
                <b className="font-semibold text-ink-2">{mobExact(vm.quarters.length)} чорак</b>{" "}
                бўлиб, йил бўйича гуруҳланган — тўрттагача қисқартирилса биринчи йил тушиб
                қоларди. Қабул бўлмаган чорак нол бўлиб туради: у «{MOB_NO_DATA}» эмас.
              </>
            }
          >
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              {vm.years.map((y) => (
                <Pill key={y.year}>
                  {y.year} · {mobExact(y.hires)} киши ({mobPct(y.pct)})
                </Pill>
              ))}
            </div>
            <Columns
              labels={vm.quarters.map((qr) => qr.tick)}
              fullLabels={vm.quarters.map((qr) => qr.label)}
              series={[
                {
                  name: "Ишга қабул режаси",
                  color: p.s1,
                  values: vm.quarters.map((qr) => qr.hires),
                },
              ]}
              valueLabel={(_s, i) => mobExact(vm.quarters[i]?.hires ?? 0)}
              vFmt={mobExact}
              yTickFmt={mobExact}
              yWidth={44}
              height={262}
              ariaLabel={`Чораклар бўйича ишга қабул режаси, киши. Жами ${mobExact(vm.planTotal)} киши.`}
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

          <Card
            title="Бўлинмалар бўйича тузилма"
            sub="кўрсаткич — штат бирлиги"
            note={
              <>
                Манбадаги «Структурное подразделение» устуни. Устун{" "}
                <b className="font-semibold text-ink-2">аралаш тўлдирилган</b>: кўп қатори
                ҳақиқий бўлинма (Управление, служба КИПиА, секциялар), лекин «ИТР» ва «Рабочий
                персонал» — бўлинма эмас, тоифа ёзуви; бир қисм сатрда эса умуман
                кўрсатилмаган. Ёзув тузатилмади ва гуруҳлар бирлаштирилмади. Диаграммада фақат
                битта ўлчов — штат бирлиги.
              </>
            }
          >
            <BarsH
              rows={vm.strukturnoe.groups.map((g) => ({
                label: g.name,
                v: g.shtat,
                // Recharts `var(--x)` ни тушунмайди — ранг палитрадан аниқ қиймат билан.
                color: g.unknown ? p.rule : p.s1,
                extra: ["Штатдаги улуши", mobPct(g.shtatPct)] as [string, string],
              }))}
              vFmt={mobExact}
              vName="Штат бирлиги"
              rowH={26}
              ariaLabel="Таркибий бўлимлар бўйича штат бирлиги."
            />
            <TableToggle
              caption="Таркибий бўлимлар бўйича штат бирлиги"
              cols={[
                { t: "Бўлим", wrap: true },
                { t: "Лавозим", num: true },
                { t: "Штат", num: true },
                { t: "Банд", num: true },
                { t: "Вакансия", num: true },
                { t: "Штатдаги улуши", num: true },
              ]}
              rows={vm.strukturnoe.groups.map((g) => ({
                key: g.key,
                cells: [
                  g.unknown ? <span className="text-ink-3">{g.name}</span> : g.name,
                  mobExact(g.rows),
                  mobExact(g.shtat),
                  mobExact(g.band),
                  mobExact(g.vakansiya),
                  mobPct(g.shtatPct),
                ],
              }))}
            />
          </Card>

          <Card
            title={MOB_NO_DATA_SCHEDULE.title}
            sub={MOB_NO_DATA}
            note={MOB_NO_DATA_SCHEDULE.note}
          >
            <NoDataList items={MOB_NO_DATA_SCHEDULE.items} />
          </Card>
        </div>
      </Section>

      {/* --- 4. пастки қатор: олтита карточка -------------------------------- */}
      <Section
        title="Кадрлар жараёнлари ва ташкилий тузилма"
        note="олтитадан биттасида маълумот бор"
      >
        <div className={GRID.g3}>
          {MOB_NO_DATA_CARDS.map((b) => (
            <Card key={b.key} title={b.title} sub={MOB_NO_DATA} note={b.note}>
              <NoDataList items={b.items} />
            </Card>
          ))}

          <Card
            title="Ташкилий тузилма"
            sub={`${mobExact(vm.org.length)} та ёзув`}
            note={
              <>
                Манбадаги иккита устуннинг ҳақиқий номлари ва уларнинг штат бирлиги.
                «Бўлинма» аслида тоифа даражаси (Руководство · Специалситы · Производственный
                персонал), «Таркибий бўлим» эса асосан ҳақиқий бўлинма. Раҳбар лавозимлари
                бўйича иерархия манбада йўқ — у ўйлаб топилмади, фақат мавжуд номлар турибди.
              </>
            }
          >
            <DataTable
              caption="Ташкилий тузилма: бўлинма ва таркибий бўлим номлари, штат бирлиги"
              maxHeight={300}
              cols={[
                { t: "Устун" },
                { t: "Ном", wrap: true },
                { t: "Лавозим", num: true },
                { t: "Штат", num: true },
              ]}
              rows={vm.org.map((o) => ({
                key: o.key,
                cells: [
                  <span className="text-ink-3">
                    {o.level === "A" ? "Бўлинма" : "Таркибий бўлим"}
                  </span>,
                  o.unknown ? <span className="text-ink-3">{o.name}</span> : o.name,
                  mobExact(o.rows),
                  mobExact(o.shtat),
                ],
              }))}
            />
          </Card>
        </div>
      </Section>

      {/* --- 5. лавозимлар рўйхати ------------------------------------------ */}
      <Section title="Лавозимлар рўйхати" note={`${mobExact(t.rows)} та сатр · манбадаги ёзувда`}>
        <Card
          title="Штат жадвали"
          sub={`${mobExact(t.rows)} та лавозим · ${mobExact(vm.names.named)} тасида Ф.И.Ш.`}
          note={
            <>
              Лавозим номлари ва Ф.И.Ш. манбадаги ёзувда — рус ва ўзбек тили аралаш, қайта
              ёзилмаган ва таржима қилинмаган. «{MOB_VAKANT}» — бўш катак эмас, «лавозим
              ҳозирча эгалланмаган» деган аниқ маълумот; тасниф устунидаги бўш катак эса «
              {MOB_NO_VALUE}» билан кўрсатилган. Исм фақат шу жадвалда кўринади.
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
                { t: "Ходим", wrap: true },
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
                  r.vakant ? (
                    <span className="text-ink-3">{r.xodim}</span>
                  ) : (
                    <>
                      {r.xodim}
                      {r.multiName && (
                        <span className="ml-1.5 text-[11px] text-ink-3">иккита исм</span>
                      )}
                    </>
                  ),
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

      {/* --- 6. манба текшируви --------------------------------------------- */}
      <Section title="Манба билан таққослаш" note="ҳисоб варақнинг ўз жамиси билан">
        <Card
          title="Текширув"
          sub={vm.checksAllOk ? "ҳаммаси мос" : "номослик бор"}
          note="Экрандаги ҳар бир йиғинди варақнинг ўз «жами» сатрлари билан солиштирилади. Ўша сатрлар лавозим қаторларига кирмайди — улар API'дан алоҳида келади, шунинг учун йиғиндида икки марта саналмайди. Номослик чиқса яширилмайди."
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
      </Section>

      {/* --- 7. футер ------------------------------------------------------- */}
      <p className="max-w-[112ch] text-[11.5px] leading-[1.6] text-ink-3">
        <b className="font-semibold text-ink-2">Манба:</b> корхонанинг кадрлар ҳужжати — штат
        жадвали ва ишга қабул режаси. У ишлаб чиқариш сводкаларидан келмайди, шунинг учун бўлим
        бошқа бўлимлардаги ойлик рақамларга боғлиқ эмас; ҳисобот ҳолати —{" "}
        <b className="font-semibold text-ink-2">{vm.reportDate}</b>.{" "}
        <b className="font-semibold text-ink-2">Штат баланси:</b> {mobExact(t.band)} банд +{" "}
        {mobExact(t.vakansiya)} вакансия = {mobExact(t.shtat)} штат бирлиги, ёллаш режасининг жами
        йиғиндиси ҳам {mobExact(vm.planTotal)}. Банд бирликлар {mobExact(t.band)} та, лекин
        Ф.И.Ш. ёзилган сатр {mobExact(vm.names.named)} та — улардан {mobExact(vm.names.multi)}{" "}
        тасида битта катакда иккита исм турибди, шундан {mobExact(vm.names.namedBand)} та чиқади,
        яъни яна {mobExact(vm.names.bandWithoutName)} та банд бирлик исмсиз қолган. Бу манбадаги
        ҳолат: исм ўйлаб топилмади ва йиғинди тўғриланмади.
      </p>
    </>
  );
}
