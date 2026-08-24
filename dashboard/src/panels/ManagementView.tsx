import { useMemo, type ReactNode } from "react";
import type { Period } from "../lib/period";
import type { KpiResponse } from "../api/types";
import type { KpiRowVM, KpiVM } from "../lib/adapters/kpi";
import type { QueryResult } from "../lib/useQuery";
import { getElectricityByObject, getSummary } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { EXTERNAL_TYPE, energyTrendFromObjects } from "../lib/adapters/energy";
import { kpiSortByRisk, kpiTrend } from "../lib/adapters/kpi";
import { exact, monthLabel, nf, pctTxt, statusOf, stripeOf, inkTokenOf } from "../lib/format";
import { usePalette } from "../lib/theme";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Columns } from "../components/Columns";
import { ChartLegend } from "../components/ChartLegend";
import { TableToggle } from "../components/TableToggle";
import { StatusMix, StatusMixLegend } from "../components/StatusMix";
import { KpiGroupCard } from "../components/KpiGroupCard";
import { KpiTable } from "../components/KpiList";
import { Loader } from "../components/states";

/**
 * «Раҳбарият» кўриниши — 10–20 сонияда етти саволга жавоб берадиган экран:
 * режа бажарилдими · факт қанча · қанча кам/кўп · қайси йўналиш яхши ·
 * қаерда муаммо · қайси босқичда муаммо · қайси кўрсаткичга эътибор.
 *
 * ─── Такрорланиш қандай кесилган ──────────────────────────────────────────
 * Бу кўринишда «Металлар баланси» занжири **чизилмайди** (у «Ишлаб чиқариш»
 * кўринишида тўлиқ бор). Унинг ўрнида «Ишлаб чиқариш жараёни» блоки турибди,
 * лекин у фақат **йиғма** — сех кесимидаги санолар ва ҳолат чизиғи, якка
 * кўрсаткич номи ёки қиймати йўқ. Шунинг учун TOP рўйхатлар барча 45
 * кўрсаткичдан танласа ҳам, битта кўрсаткич экранда икки марта турмайди.
 * Категория карточкалари ҳам ёпиқ ҳолда фақат саноларни кўрсатади.
 *
 * ─── Нима учун катта карточкалар KPI'дан эмас ─────────────────────────────
 * Юқоридаги олти карточка — **корхона миқёсидаги** йиғиндилар: улар
 * `/summary` ва `/electricity` дан олинади, чунки 45 кўрсаткични бир-бирига
 * қўшиб бўлмайди (т, кг, м³, шт, соат). Паспорт кўрсаткичлари эса ундан
 * пастдаги блокларда, ҳар бири ўз бирлигида туради.
 */

/** Endpoint мавжуд бўлмаса ёки хато бўлса — плитка ичидаги қисқа изоҳ. */
function tileNote<T>(q: QueryResult<T>): ReactNode {
  if (q.notAvailable) return <Pill>бўлим серверда йўқ</Pill>;
  if (q.error) return <Pill status="crit">юклаб бўлмади</Pill>;
  if (q.loading) return <Pill>юкланмоқда…</Pill>;
  return null;
}

/** TOP рўйхатдаги битта қатор: ном, сех, режа/факт ва бажарилиш фоизи. */
function TopRow({ row, rank }: { row: KpiRowVM; rank: number }) {
  const pct = row.cell?.pct ?? null;
  return (
    <div className="flex items-start gap-2.5 border-t border-grid py-2 first:border-t-0">
      <span
        aria-hidden="true"
        className="mt-px inline-flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-sunken px-1 font-mono text-[11px] text-ink-3"
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-[1.35] text-ink-2">{row.name}</span>
        <span className="mt-px block font-mono text-[11px] tabular-nums text-ink-3">
          {row.site} · режа {exact(row.cell?.plan ?? null)} · факт {exact(row.cell?.fakt ?? null)}{" "}
          {row.unit}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end">
        <span
          className="font-mono text-[14px] [font-weight:650] tabular-nums"
          style={{ color: inkTokenOf(pct) }}
        >
          {row.cell?.anomaly && <span aria-hidden="true">⚠ </span>}
          {pctTxt(pct)}
        </span>
        <span
          aria-hidden="true"
          className="mt-1 block h-[3px] w-[54px] rounded-sm"
          style={{ background: stripeOf(pct) }}
        />
      </span>
    </div>
  );
}

function TopCard({
  title,
  note,
  rows,
  emptyText,
  caption,
}: {
  title: string;
  note: string;
  rows: KpiRowVM[];
  emptyText: string;
  caption: string;
}) {
  return (
    <Card title={title} note={note}>
      {rows.length === 0 ? (
        <p className="px-2.5 py-6 text-center text-[13px] text-ink-3">{emptyText}</p>
      ) : (
        <>
          {rows.map((r, i) => (
            <TopRow key={r.no} row={r} rank={i + 1} />
          ))}
          <KpiTable rows={rows} caption={caption} />
        </>
      )}
    </Card>
  );
}

export function ManagementView({
  period,
  months,
  kpiQ,
  vm,
}: {
  period: Period;
  months: string[];
  kpiQ: QueryResult<KpiResponse>;
  vm: KpiVM | null;
}) {
  const p = usePalette();
  const key = `${period.from}_${period.to}`;
  const granularity: "daily" | "monthly" = months.length <= 3 ? "daily" : "monthly";

  const sumQ = useQuery(`mgmt-summary_${key}`, (s) => getSummary(period, s));
  // `groupBy=object` — «ЭНЦ общ.» такрорий сатрини ажратиш учун ягона ишончли
  // кесим (adapters/energy.ts даги изоҳга қаранг).
  const elecQ = useQuery(`mgmt-elec_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { period: granularity }, s),
  );
  const elecExtQ = useQuery(`mgmt-elec-ext_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { type: EXTERNAL_TYPE, period: granularity }, s),
  );

  const elec = useMemo(
    () =>
      elecQ.data && elecExtQ.data
        ? energyTrendFromObjects(elecQ.data, elecExtQ.data, granularity, months.length > 1)
        : null,
    [elecQ.data, elecExtQ.data, granularity, months.length],
  );

  const trend = useMemo(() => (kpiQ.data ? kpiTrend(kpiQ.data) : []), [kpiQ.data]);

  const weight = sumQ.data?.production.weight ?? null;
  const gap =
    weight && weight.plan !== null && weight.fakt !== null ? weight.fakt - weight.plan : null;

  return (
    <>
      <Section
        title="Асосий кўрсаткичлар"
        note="корхона миқёсидаги йиғиндилар · ҳар бири ўз ўлчов бирлигида"
      >
        <div className={GRID.g6}>
          <StatTile
            label="Ишлаб чиқариш — факт"
            value={weight ? exact(weight.fakt) : "—"}
            unit={weight ? "тн" : undefined}
            stripe={stripeOf(weight?.percent)}
            foot={
              tileNote(sumQ) ??
              (weight ? (
                <Pill status={statusOf(weight.percent)}>{pctTxt(weight.percent)}</Pill>
              ) : undefined)
            }
          />
          <StatTile
            label="Ишлаб чиқариш — режа"
            value={weight ? exact(weight.plan) : "—"}
            unit={weight ? "тн" : undefined}
            stripe="var(--s1)"
            foot={tileNote(sumQ) ?? (weight ? <Pill>оғирлик оиласи (тн)</Pill> : undefined)}
          />
          <StatTile
            label="Режа бажарилиши"
            value={weight ? pctTxt(weight.percent) : "—"}
            stripe={stripeOf(weight?.percent)}
            foot={
              tileNote(sumQ) ??
              (weight ? (
                <span className="text-ink-3">
                  {weight.percent === null
                    ? "режа қўйилмаган"
                    : weight.percent >= 100
                      ? "режа бажарилган"
                      : weight.percent >= 85
                        ? "диққат талаб қилади"
                        : "режадан ортда"}
                </span>
              ) : undefined)
            }
          />
          <StatTile
            label="Режадан оғиш"
            value={gap === null ? "—" : (gap >= 0 ? "+" : "−") + exact(Math.abs(gap))}
            unit={gap === null ? undefined : "тн"}
            stripe={stripeOf(weight?.percent)}
            foot={
              tileNote(sumQ) ??
              (gap === null ? undefined : (
                <Pill status={gap >= 0 ? "good" : "crit"}>
                  {gap >= 0 ? "режадан ортиқ" : "режага етмаган"}
                </Pill>
              ))
            }
          />
          <StatTile
            label="Ресурслар — электр энергия"
            value={elec ? nf(elec.total, 0) : "—"}
            unit={elec ? "кВт·с" : undefined}
            stripe="var(--s2)"
            foot={
              tileNote(elecQ) ??
              (elec && elec.total ? (
                <Pill>{nf((elec.internalTotal / elec.total) * 100, 1)}% ички цехлар</Pill>
              ) : undefined)
            }
          />
          <StatTile
            label="Ускуна тўхташи — Ингичка"
            value={exact(sumQ.data?.ingichka.downtimeHours)}
            unit={sumQ.data ? "соат" : undefined}
            stripe="var(--rule)"
            foot={
              tileNote(sumQ) ?? <Pill>{nf(sumQ.data?.ingichka.stops ?? 0)} ҳодиса</Pill>
            }
          />
        </div>
      </Section>

      <Section
        title="Кўрсаткичлар ҳолати"
        note={vm ? `${monthLabel(vm.month)} · паспортдаги 45 кўрсаткич` : "паспорт кўрсаткичлари"}
      >
        <Loader
          q={kpiQ}
          height={140}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm || !vm.hasValues}
          emptyTitle="Ушбу ой учун кўрсаткич маълумоти йўқ"
        >
          {() =>
            vm && (
              <div className={GRID.g23}>
                <Card
                  title="Умумий ҳолат"
                  sub={`${vm.counts.total} та кўрсаткич`}
                  note={
                    months.length > 1
                      ? `Давр ${months.length} ойни қамрайди; кўрсаткич қийматлари ойлар бўйича қўшилмайди, шунинг учун охирги ой (${monthLabel(vm.month)}) кўрсатилган.`
                      : undefined
                  }
                >
                  <StatusMix counts={vm.counts} height={14} />
                  <div className="mt-3">
                    <StatusMixLegend />
                  </div>
                </Card>
                <Card
                  title="Нима қаерда кўрсатилган"
                  note="битта кўрсаткич экранда икки марта турмаслиги учун"
                >
                  <ul className="flex flex-col gap-1.5 text-[12.5px] leading-[1.5] text-ink-2">
                    <li>
                      <b className="font-semibold text-ink">{vm.inBalance.length} та</b> кўрсаткич —
                      «Металлар баланси» занжирининг босқичи. Улар тўлиқ ҳолда «Ишлаб чиқариш»
                      кўринишида, бу ерда эса фақат йиғма ҳолатда қатнашади.
                    </li>
                    <li>
                      <b className="font-semibold text-ink">{vm.operational.length} та</b>{" "}
                      кўрсаткич — занжирдан ташқарида: ресурслар, персонал, чиқиндилар, тўхташлар,
                      таъминот ва бошқа ишлаб чиқариш позициялари.
                    </li>
                    {vm.unavailable.length > 0 && (
                      <li>
                        <b className="font-semibold text-ink">{vm.unavailable.length} та</b>{" "}
                        кўрсаткичнинг манбаси ҳали импорт қилинмаган — қиймат йўқ, нол деб
                        кўрсатилмайди.
                      </li>
                    )}
                  </ul>
                </Card>
              </div>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Ишлаб чиқариш жараёни"
        note={
          vm
            ? `${monthLabel(vm.month)} · сех ва участка кесимида — қайси босқичда муаммо борлигини кўрсатади`
            : "сех ва участка кесимида"
        }
      >
        <Loader
          q={kpiQ}
          height={200}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm || vm.sites.length === 0}
          emptyTitle="Ушбу ой учун жараён маълумоти йўқ"
        >
          {() =>
            vm && (
              <Card note="Ҳар бир сатр — сех/участка бўйича кўрсаткичлар ҳолати. Якка кўрсаткич қийматлари пастдаги «TOP» рўйхатларида ва категория карточкаларида.">
                {vm.sites.map((g) => (
                  <div
                    key={g.key}
                    className="grid grid-cols-1 items-center gap-x-3.5 gap-y-1.5 border-t border-grid py-2.5 first:border-t-0 mid:grid-cols-[minmax(120px,190px)_minmax(0,1fr)_auto]"
                  >
                    <span className="text-[12.5px] [font-weight:600] text-ink-2">{g.title}</span>
                    <StatusMix counts={g.counts} height={12} withLegend={false} />
                    <span className="flex flex-wrap items-center gap-1.5">
                      {g.counts.crit > 0 && <Pill status="crit">{g.counts.crit} муаммо</Pill>}
                      {g.counts.warn > 0 && <Pill status="warn">{g.counts.warn} диққат</Pill>}
                      {g.counts.good > 0 && <Pill status="good">{g.counts.good} бажарилган</Pill>}
                      {g.counts.mute > 0 && <Pill>{g.counts.mute} баҳоланмайди</Pill>}
                    </span>
                  </div>
                ))}
                <div className="mt-3 border-t border-grid pt-2.5">
                  <StatusMixLegend />
                </div>
              </Card>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Категория бўйича кўрсаткичлар"
        note={
          vm
            ? `${monthLabel(vm.month)} · эътибор талаб қилгани биринчи; якка кўрсаткичлар карточка ичида очилади`
            : "йўналишлар кесимида"
        }
      >
        <Loader
          q={kpiQ}
          height={200}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm || vm.categories.length === 0}
          emptyTitle="Ушбу ой учун категория маълумоти йўқ"
        >
          {() =>
            vm && (
              <div className={GRID.g3}>
                {/* Тартиб — муаммоси кўпидан бошлаб: «қайси йўналиш яхши, қайсиси
                    ортда» саволига жавоб экраннинг тепасида турсин. */}
                {kpiSortByRisk(vm.categories).map((g) => (
                  <KpiGroupCard key={g.key} group={g} />
                ))}
              </div>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Режа бажарилиши — ойлар кесимида"
        note="кўрсаткичлар сони (дона) · турли ўлчов бирлигидаги қийматлар қўшилмайди"
      >
        <Loader
          q={kpiQ}
          height={230}
          notAvailableWhat="/kpi"
          isEmpty={() => trend.length === 0}
          emptyTitle="Ойлик динамика учун маълумот йўқ"
        >
          {() => (
            <Card
              title="Режани бажарган ва ортда қолган кўрсаткичлар"
              sub={`${trend.length} ой`}
              note="Устунлар — кўрсаткичлар сони, миқдор эмас: паспортдаги қийматлар турли бирликда (т, кг, м³, шт, соат) ва битта ўққа қўйилмайди. «Баҳоланмайди» гуруҳи бу диаграммага кирмайди."
            >
              <ChartLegend
                items={[
                  { name: "Бажарилган (≥100%)", color: "var(--good)" },
                  { name: "Диққат (85–99%)", color: "var(--warn)" },
                  { name: "Муаммо (<85%)", color: "var(--crit)" },
                ]}
              />
              <Columns
                labels={trend.map((t) => t.label)}
                fullLabels={trend.map((t) => t.full)}
                height={240}
                ariaLabel="Ойлар кесимида режани бажарган кўрсаткичлар сони"
                yTickFmt={(v) => nf(v, 0)}
                vFmt={(v) => `${nf(v, 0)} та`}
                yWidth={40}
                series={[
                  { name: "Бажарилган", color: p.good, values: trend.map((t) => t.good) },
                  { name: "Диққат", color: p.warn, values: trend.map((t) => t.warn) },
                  { name: "Муаммо", color: p.crit, values: trend.map((t) => t.crit) },
                ]}
              />
              <TableToggle
                caption="Ойлар кесимида кўрсаткичлар ҳолати"
                cols={[
                  { t: "Ой" },
                  { t: "Бажарилган", num: true },
                  { t: "Диққат", num: true },
                  { t: "Муаммо", num: true },
                ]}
                rows={trend.map((t) => ({
                  key: t.month,
                  cells: [t.full, t.good, t.warn, t.crit],
                }))}
              />
            </Card>
          )}
        </Loader>
      </Section>

      <Section
        title="Эътибор талаб қиладиган кўрсаткичлар"
        note={
          vm
            ? `${monthLabel(vm.month)} · фақат режаси бор ва фоизи ишончли кўрсаткичлар`
            : "энг паст ва энг юқори бажарилиш"
        }
      >
        <Loader
          q={kpiQ}
          height={230}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm || (vm.problems.length === 0 && vm.wins.length === 0)}
          emptyTitle="Ушбу ой учун таққосланадиган кўрсаткич йўқ"
          emptyText="Режаси қўйилган ва фоизи ишончли бўлган кўрсаткич топилмади."
        >
          {() =>
            vm && (
              <div className={GRID.g2}>
                <TopCard
                  title="TOP муаммолар"
                  note="Энг паст бажарилиш фоизи. Режаси қўйилмаган ва ҳисоблагичдан ўқиладиган кўрсаткичлар бу рейтингга кирмайди — уларда таққослайдиган база йўқ."
                  rows={vm.problems}
                  emptyText="Муаммоли кўрсаткич топилмади."
                  caption="TOP муаммолар"
                />
                <TopCard
                  title="TOP яхши натижалар"
                  note="Энг юқори бажарилиш фоизи. 150% дан ошган устунлар шкалада кесилади, ҳақиқий сон ўнгда тўлиқ ёзилади."
                  rows={vm.wins}
                  emptyText="Режани бажарган кўрсаткич топилмади."
                  caption="TOP яхши натижалар"
                />
              </div>
            )
          }
        </Loader>
      </Section>

      <Section title="Батафсил" note="паспортдаги барча 45 кўрсаткич — тўлиқ жадвал">
        <Loader
          q={kpiQ}
          height={120}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm}
          emptyTitle="Кўрсаткич маълумоти йўқ"
        >
          {() =>
            vm && (
              <Card
                title="Паспорт кўрсаткичлари"
                sub={vm ? monthLabel(vm.month) : undefined}
                note="Жадвалда ҳеч нарса яширилмайди: аномал фоиз қисқартирилмайди, маълумоти йўқ катаклар «—» билан белгиланади ва нолга айлантирилмайди."
              >
                <KpiTable rows={vm.all} caption="Паспорт кўрсаткичлари — тўлиқ рўйхат" />
              </Card>
            )
          }
        </Loader>
      </Section>
    </>
  );
}
