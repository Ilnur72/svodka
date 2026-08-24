import { useMemo, type ReactNode } from "react";
import type { PanelProps } from "../types";
import type { KpiResponse, UnitTotal } from "../api/types";
import type { KpiRowVM, KpiVM } from "../lib/adapters/kpi";
import {
  getElectricityByObject,
  getProductionMonthly,
  getProductionTree,
  getSummary,
} from "../api/endpoints";
import { useQuery, type QueryResult } from "../lib/useQuery";
import { nf, pctTxt, periodLabel, exact, monthLabel, statusOf, stripeOf } from "../lib/format";
import { UNASSIGNED_PLANT_NOTE, isUnknownUnit, isUnverified } from "../lib/dataQuality";
import { EXTERNAL_TYPE, energyTrendFromObjects } from "../lib/adapters/energy";
import { fromTree, monthlyTrend } from "../lib/adapters/production";
import { kpiGroupByCategory } from "../lib/adapters/kpi";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { KeyValueList } from "../components/KeyValueList";
import { ElectricityTrendCard } from "../components/ElectricityTrendCard";
import { BulletChart, BulletLegend } from "../components/BulletRow";
import { KpiList, KpiTable } from "../components/KpiList";
import { StatusMixLegend } from "../components/StatusMix";
import { BalanceSection } from "./BalanceSection";
import { MonthlyTrendSection } from "./MonthlyTrendSection";
import { MaskedValue } from "../components/Masked";
import { Loader } from "../components/states";

/**
 * «Ишлаб чиқариш» кўриниши — жараённинг ичи: технологик занжир, босқичлар,
 * сехлар, хомашё, ресурслар, маҳсулотлар, чиқиндилар, тўхташлар ва кунлик
 * динамика.
 *
 * ─── Такрорланиш қандай кесилган ──────────────────────────────────────────
 * Бу кўринишда «Металлар баланси» занжири тўлиқ чизилади, шунинг учун
 * паспортнинг **занжир босқичи бўлган 22 кўрсаткичи** (`inBalance`) қуйидаги
 * KPI рўйхатларида такрорланмайди — рўйхатлар фақат `vm.operational` дан
 * қурилади. Хомашё кўрсаткичларининг аксарияти айнан занжир босқичи бўлгани
 * учун «Хомашё ва ресурслар» блокида улар кўринмайди: улар юқорида, занжир
 * ичида ўз ўрнида туради.
 *
 * Мавжуд бўлимлар (якуний кўрсаткичлар, ўлчов бирлиги кесими, майдончалар,
 * электр энергия динамикаси, ойлик тренд) шу кўринишда сақланган.
 */

/** Endpoint мавжуд бўлмаса ёки хато бўлса — плитка ичидаги қисқа изоҳ. */
function tileNote<T>(q: QueryResult<T>): ReactNode {
  if (q.notAvailable) return <Pill>бўлим серверда йўқ</Pill>;
  if (q.error) return <Pill status="crit">юклаб бўлмади</Pill>;
  if (q.loading) return <Pill>юкланмоқда…</Pill>;
  return null;
}

const unitName = (u: string | null): string =>
  isUnknownUnit(u) ? "бирлиги аниқланмаган" : (u as string);

/**
 * Категория номи API'дан келади ва вақт ўтиб кенгайиши мумкин, шунинг учун
 * тақсимот **префикс** бўйича қилинади, аниқ рўйхат бўйича эмас. Ҳеч бир
 * категорияга тушмаган қатор охирги («бошқа») блокда қолади — шу сабабли
 * янги категория пайдо бўлса ҳам кўрсаткич экрандан йўқолмайди.
 */
const RESOURCE_PREFIXES = ["Ресурс", "Снабжение", "Склад", "Сырьё", "Сырье"];
const SUPPORT_PREFIXES = ["Отходы", "Простои", "Персонал"];

const startsWithAny = (s: string, list: string[]): boolean =>
  list.some((p) => s.startsWith(p));

function KpiBlock({
  rows,
  caption,
  emptyText,
}: {
  rows: KpiRowVM[];
  caption: string;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="px-2.5 py-6 text-center text-[13px] text-ink-3">{emptyText}</p>;
  }
  return (
    <div className={GRID.g2}>
      {kpiGroupByCategory(rows).map((g) => (
        <Card key={g.key} title={g.title} sub={`${g.counts.total} та кўрсаткич`}>
          <KpiList rows={g.rows} />
        </Card>
      ))}
      <div className="wide:col-span-2 mid:col-span-2">
        <KpiTable rows={rows} caption={caption} />
      </div>
    </div>
  );
}

export function ProductionView({
  period,
  months,
  kpiQ,
  vm,
}: PanelProps & { kpiQ: QueryResult<KpiResponse>; vm: KpiVM | null }) {
  const key = `${period.from}_${period.to}`;
  const multiMonth = months.length > 1;
  const granularity: "daily" | "monthly" = months.length <= 3 ? "daily" : "monthly";

  // `groupBy=object` — `ЭНЦ общ.` йиғинди сатрини ажратиш учун ягона ишончли
  // кесим (adapters/energy.ts даги изоҳга қаранг).
  const elecQ = useQuery(`obzor-elec_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { period: granularity }, s),
  );
  const elecExtQ = useQuery(`obzor-elec-ext_${key}_${granularity}`, (s) =>
    getElectricityByObject(period, { type: EXTERNAL_TYPE, period: granularity }, s),
  );
  const sumQ = useQuery(`obzor-summary_${key}`, (s) => getSummary(period, s));
  const treeQ = useQuery(`obzor-tree_${key}`, (s) =>
    getProductionTree(period, { depth: "plant" }, s),
  );
  const trendQ = useQuery(
    `obzor-monthly_${key}`,
    (s) => getProductionMonthly(period, { level: "plant" }, s),
    { enabled: multiMonth },
  );

  const elec = useMemo(
    () =>
      elecQ.data && elecExtQ.data
        ? energyTrendFromObjects(elecQ.data, elecExtQ.data, granularity, multiMonth)
        : null,
    [elecQ.data, elecExtQ.data, granularity, multiMonth],
  );
  const plants = useMemo(() => (treeQ.data ? fromTree(treeQ.data).plants : []), [treeQ.data]);
  const trend = useMemo(
    () => (trendQ.data ? monthlyTrend(trendQ.data, months) : null),
    [trendQ.data, months],
  );

  /** Ойлар кесимида электр — тренд блоки ва таққослаш учун. */
  const elecByMonth = useMemo(() => {
    if (!elec) return new Map<string, { internal: number; external: number }>();
    const m = new Map<string, { internal: number; external: number }>();
    for (const pt of elec.points) {
      const mk = pt.key.slice(0, 7);
      const slot = m.get(mk) ?? { internal: 0, external: 0 };
      slot.internal += pt.internal;
      slot.external += pt.external;
      m.set(mk, slot);
    }
    return m;
  }, [elec]);

  /** Занжирда кўрсатилмайдиган кўрсаткичларни уч мазмуний блокка тақсимлаш. */
  const buckets = useMemo(() => {
    const rows = vm?.operational ?? [];
    return {
      resources: rows.filter((r) => startsWithAny(r.category, RESOURCE_PREFIXES)),
      support: rows.filter((r) => startsWithAny(r.category, SUPPORT_PREFIXES)),
      other: rows.filter(
        (r) =>
          !startsWithAny(r.category, RESOURCE_PREFIXES) &&
          !startsWithAny(r.category, SUPPORT_PREFIXES),
      ),
    };
  }, [vm]);

  const weight = sumQ.data?.production.weight ?? null;
  const byUnit: UnitTotal[] = sumQ.data?.production.byUnit ?? [];

  return (
    <>
      <Section title="Корхона миқёсидаги якуний кўрсаткичлар" note={periodLabel(months)}>
        <div className={GRID.g6}>
          <StatTile
            label="Электр энергия, жами"
            value={elec ? nf(elec.total, 0) : "—"}
            unit={elec ? "кВт·с" : undefined}
            stripe="var(--s1)"
            foot={
              tileNote(elecQ) ??
              (elec ? (
                <Pill>
                  ўртача {nf(elec.total / (elec.points.length || 1), 0)} / {granularity === "daily" ? "кун" : "ой"}
                </Pill>
              ) : undefined)
            }
          />
          <StatTile
            label="Комбинат ички истеъмоли"
            value={elec ? nf(elec.internalTotal, 0) : "—"}
            unit={elec ? "кВт·с" : undefined}
            foot={
              tileNote(elecQ) ??
              (elec && elec.total ? (
                <Pill>{nf((elec.internalTotal / elec.total) * 100, 1)}% умумийдан</Pill>
              ) : undefined)
            }
          />
          <StatTile
            label="Ташқи истеъмолчилар"
            value={elec ? nf(elec.externalTotal, 0) : "—"}
            unit={elec ? "кВт·с" : undefined}
            stripe="var(--s2)"
            foot={
              tileNote(elecQ) ??
              (elec && elec.total ? (
                <Pill>{nf((elec.externalTotal / elec.total) * 100, 1)}% умумийдан</Pill>
              ) : undefined)
            }
          />
          <StatTile
            label="Ишлаб чиқариш (оғирлик)"
            value={weight ? exact(weight.fakt) : "—"}
            unit={weight ? "тн" : undefined}
            stripe={stripeOf(weight?.percent)}
            foot={
              tileNote(sumQ) ??
              (weight ? (
                <>
                  <Pill status={statusOf(weight.percent)}>{pctTxt(weight.percent)}</Pill>
                  <span className="text-ink-3">режа {exact(weight.plan)} тн</span>
                </>
              ) : undefined)
            }
          />
          <StatTile
            label="Огарок қабули"
            value={<MaskedValue area="ogarok">{exact(sumQ.data?.ogarok.physical)}</MaskedValue>}
            unit={isUnverified("ogarok") ? undefined : "т"}
            stripe="var(--s2)"
            foot={
              tileNote(sumQ) ??
              (isUnverified("ogarok") ? (
                <Pill>қиймат текширилмоқда</Pill>
              ) : (
                <Pill>{nf(sumQ.data?.ogarok.metal ?? 0, 2)} т металл</Pill>
              ))
            }
          />
          <StatTile
            label="Ингичка ускуна тўхташи"
            value={
              <MaskedValue area="ingichka">{exact(sumQ.data?.ingichka.downtimeHours)}</MaskedValue>
            }
            unit={isUnverified("ingichka") ? undefined : "соат"}
            foot={
              tileNote(sumQ) ??
              (isUnverified("ingichka") ? (
                <Pill>қиймат текширилмоқда</Pill>
              ) : (
                <Pill>{nf(sumQ.data?.ingichka.stops ?? 0)} ҳодиса</Pill>
              ))
            }
          />
        </div>
      </Section>

      <BalanceSection period={period} />

      <Section title="Ишлаб чиқариш майдончалари кесимида">
        <Loader
          q={treeQ}
          height={200}
          notAvailableWhat="/production/tree"
          isEmpty={() => plants.length === 0}
          emptyTitle="Ушбу давр учун ишлаб чиқариш маълумоти йўқ"
        >
          {() => (
            <div className={GRID.g3}>
              {plants.map((pl) => (
                <Card
                  key={pl.name}
                  title={pl.label}
                  sub={`${pl.workshopCount} цех · ${pl.productCount} позиция`}
                  note={pl.unassigned ? UNASSIGNED_PLANT_NOTE : undefined}
                >
                  <KeyValueList
                    rows={
                      pl.byUnit.length
                        ? pl.byUnit.map((u) => ({
                            k: unitName(u.baseUnit),
                            v: (
                              <>
                                {exact(u.fakt)}{" "}
                                <span className="text-ink-3">/ режа {exact(u.plan)}</span>{" "}
                                <span style={{ color: stripeOf(u.percent) }}>{pctTxt(u.percent)}</span>
                              </>
                            ),
                          }))
                        : [{ k: "Маълумот", v: "йўқ" }]
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </Loader>
      </Section>

      <Section
        title="Ишлаб чиқариш — ўлчов бирлиги кесимида"
        note="турли бирликдаги қийматлар қўшилмайди, ҳар бири ўз қаторида"
      >
        <Loader q={sumQ} height={160} notAvailableWhat="/summary">
          {() => (
            <Card>
              <BulletLegend />
              <BulletChart
                rows={byUnit
                  .filter((u) => (u.plan ?? 0) > 0 || (u.fakt ?? 0) > 0)
                  // Бирлиги аниқланмаган қатор охирида турсин: у аралаш
                  // бирликлар йиғиндиси ва бошқа қаторлар билан тенг эмас.
                  .slice()
                  .sort((a, b) => Number(isUnknownUnit(a.baseUnit)) - Number(isUnknownUnit(b.baseUnit)))
                  .map((u) => ({
                    key: unitName(u.baseUnit),
                    label: unitName(u.baseUnit),
                    plan: u.plan ?? 0,
                    fact: u.fakt ?? 0,
                    unit: isUnknownUnit(u.baseUnit) ? "" : (u.baseUnit as string),
                  }))}
              />
              <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
                «Бирлиги аниқланмаган» қатори — {UNASSIGNED_PLANT_NOTE}
              </p>
            </Card>
          )}
        </Loader>
      </Section>

      <Section
        title="Хомашё, ресурслар ва таъминот"
        note={
          vm
            ? `${monthLabel(vm.month)} · занжир босқичи бўлган кўрсаткичлар бу ерда такрорланмайди — улар юқорида, «Металлар баланси» ичида`
            : "паспорт кўрсаткичлари"
        }
      >
        <Loader
          q={kpiQ}
          height={200}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm}
          emptyTitle="Ушбу ой учун кўрсаткич маълумоти йўқ"
        >
          {() => (
            <KpiBlock
              rows={buckets.resources}
              caption="Хомашё, ресурслар ва таъминот кўрсаткичлари"
              emptyText="Бу гуруҳда занжирдан ташқари кўрсаткич йўқ."
            />
          )}
        </Loader>
      </Section>

      <Section
        title="Чиқиндилар, тўхташлар ва персонал"
        note={vm ? monthLabel(vm.month) : "паспорт кўрсаткичлари"}
      >
        <Loader
          q={kpiQ}
          height={200}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm}
          emptyTitle="Ушбу ой учун кўрсаткич маълумоти йўқ"
        >
          {() => (
            <KpiBlock
              rows={buckets.support}
              caption="Чиқиндилар, тўхташлар ва персонал кўрсаткичлари"
              emptyText="Бу гуруҳда кўрсаткич йўқ."
            />
          )}
        </Loader>
      </Section>

      <Section
        title="Бошқа ишлаб чиқариш кўрсаткичлари"
        note={
          vm
            ? `${monthLabel(vm.month)} · занжирга кирмаган маҳсулот ва цехлараро узатиш позициялари`
            : "паспорт кўрсаткичлари"
        }
      >
        <Loader
          q={kpiQ}
          height={200}
          notAvailableWhat="/kpi"
          isEmpty={() => !vm}
          emptyTitle="Ушбу ой учун кўрсаткич маълумоти йўқ"
        >
          {() =>
            vm && (
              <>
                <KpiBlock
                  rows={buckets.other}
                  caption="Бошқа ишлаб чиқариш кўрсаткичлари"
                  emptyText="Бу гуруҳда кўрсаткич йўқ."
                />
                {vm.unavailable.length > 0 && (
                  <div className="mt-3">
                    <Card
                      title="Манбаси ҳали импорт қилинмаган кўрсаткичлар"
                      sub={`${vm.unavailable.length} та`}
                      note="Бу қаторлар яширилмайди ва нол деб кўрсатилмайди — манба варағи импорт қилингач қиймат ўзи пайдо бўлади."
                    >
                      <ul className="flex flex-col gap-1 text-[12.5px] leading-[1.5] text-ink-2">
                        {vm.unavailable.map((r) => (
                          <li key={r.no} className="flex flex-wrap items-baseline gap-x-2">
                            <span>{r.name}</span>
                            <span className="text-[11.5px] text-ink-3">
                              {r.site} · {r.unit}
                            </span>
                            <Pill>маълумот йўқ</Pill>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                )}
                <div className="mt-3">
                  <StatusMixLegend />
                </div>
              </>
            )
          }
        </Loader>
      </Section>

      <Section
        title={granularity === "daily" ? "Кунлик электр энергия истеъмоли" : "Ойлик электр энергия истеъмоли"}
        note="кВт·соат"
      >
        <Loader
          q={elecQ}
          height={250}
          notAvailableWhat="/electricity"
          isEmpty={() => !elec || elec.points.length === 0}
          emptyTitle="Ушбу давр учун электр энергия маълумоти йўқ"
        >
          {() => elec && <ElectricityTrendCard trend={elec} />}
        </Loader>
      </Section>

      {multiMonth && (
        <MonthlyTrendSection
          months={months}
          trendQ={trendQ}
          trend={trend}
          elecByMonth={elecByMonth}
        />
      )}
    </>
  );
}
