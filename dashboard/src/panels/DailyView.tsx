import { useId, useMemo, useState } from "react";
import type { PanelProps } from "../types";
import type { DailyVM } from "../lib/adapters/daily";
import { getDaily } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import {
  DAILY_MAX_DAYS,
  DAILY_STATUS_LABEL,
  dailyDay,
  dailyRange,
  dailyView,
} from "../lib/adapters/daily";
import { dateLabel, exact, nf, pctTxt } from "../lib/format";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { TableToggle } from "../components/TableToggle";
import { DailyBlockCard } from "../components/DailyBlockCard";
import { DailyStatusBar, DailyStatusLegend, DailyStatusPill } from "../components/DailyStatus";
import { Loader } from "../components/states";

/**
 * «Кунлик сводка» — раҳбарият учун кунлик кўриниш: 8 йўналиш, ҳар бирида
 * «Кунлик · Ой бошидан · Йил бошидан» ва «Ҳолат».
 *
 * ⚠️ Бу қолган уч кўринишдан (**паспорт**, **баланс**, **занжир**) бошқа
 * маълумот қатлами: улар ойлик «цеховые сводки» варағига таянади, бу эса
 * кунлик сводка файлига. Шунинг учун улар аралаштирилмайди ва бир-бирининг
 * рақамини тасдиқламайди.
 *
 * Экран тартиби фойдаланувчи сўраганидек: аввал сана ва қамров, кейин
 * йўналишлар бўйича кўрсаткичлар, сўнг муаммоли масалалар, **охирида**
 * «Раҳбарлик хулосаси».
 *
 * Сўров оралиғи `dailyRange()` да чегараланади (жавоб ҳажми 31 кунда ≈ 835 KB),
 * чегара ишлаганда экранда очиқ ёзилади.
 */
/** Манбада маълумот бор оралиқни ўқиладиган матн билан беради. */
function availableText(vm: DailyVM | null): string {
  if (!vm || !vm.available.from || !vm.available.to) return "Манбада кунлик сводка топилмади.";
  return (
    `Манбада кунлик сводка ${dateLabel(vm.available.from)} — ${dateLabel(vm.available.to)} ` +
    `оралиғида мавжуд (${vm.available.days} кун). Юқоридаги давр танлагичидан шу оралиққа тушадиган ойни танланг.`
  );
}

export function DailyView({ period, months }: PanelProps) {
  const uid = useId();
  const range = useMemo(() => dailyRange(period), [period]);
  const q = useQuery(`daily_${range.from}_${range.to}`, (s) =>
    getDaily({ from: range.from, to: range.to }, s),
  );
  const [picked, setPicked] = useState<string | null>(null);

  const day = q.data ? dailyDay(q.data, picked) : null;
  const vm = useMemo(() => (q.data && day ? dailyView(q.data, day) : null), [q.data, day]);

  return (
    <>
      <Section
        title="Кунлик сводка"
        note={
          !vm
            ? "8 йўналиш, кунлар кесимида"
            : vm.days.length === 0
              ? "танланган даврда кунлик сводка йўқ"
              : `${dateLabel(vm.day)} · олдинги иш куни ${vm.previous ? dateLabel(vm.previous) : "—"}`
        }
      >
        {vm && vm.days.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <label
              htmlFor={`${uid}-day`}
              className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
            >
              Ҳисобот куни
            </label>
            <select
              id={`${uid}-day`}
              value={vm.day}
              onChange={(e) => setPicked(e.target.value)}
              aria-label="Кўрсатиладиган кун"
            >
              {vm.days
                .slice()
                .reverse()
                .map((d) => (
                  <option key={d} value={d}>
                    {dateLabel(d)}
                  </option>
                ))}
            </select>
            <span className="text-[11.5px] text-ink-3">
              {range.capped
                ? `давр ${months.length} ойни қамрайди — сўров охирги ${DAILY_MAX_DAYS} кун билан чегараланган (жавоб ҳажми учун)`
                : `оралиқда ${vm.days.length} кун`}
            </span>
            {vm.rangeSource === "default" && (
              <Pill>сервер охирги {DAILY_MAX_DAYS} кунни берди</Pill>
            )}
          </div>
        )}

        <Loader
          q={q}
          height={220}
          notAvailableWhat="/daily"
          isEmpty={() => !vm || !vm.hasValues}
          emptyTitle={
            !vm || vm.days.length === 0
              ? "Танланган даврда кунлик сводка йўқ"
              : `${dateLabel(vm.day)} учун кунлик маълумот йўқ`
          }
          emptyText={
            !vm || vm.days.length === 0
              ? availableText(vm)
              : "Юқоридаги «Ҳисобот куни» рўйхатидан бошқа кунни танланг."
          }
        >
          {() =>
            vm && (
              <>
                <div className={GRID.g4}>
                  <StatTile
                    label="Ҳисобот куни"
                    value={dateLabel(vm.day)}
                    stripe="var(--s1)"
                    foot={
                      <Pill>
                        {vm.counts.total} кўрсаткич · {vm.blocks.length} йўналиш
                      </Pill>
                    }
                  />
                  <StatTile
                    label="Режадан ортда"
                    value={nf(vm.counts.problem + vm.counts.belowPlan, 0)}
                    unit="кўрсаткич"
                    stripe="var(--crit)"
                    foot={
                      <>
                        <Pill status="crit">{vm.counts.problem} муаммоли</Pill>
                        <Pill status="warn">{vm.counts.belowPlan} режадан паст</Pill>
                      </>
                    }
                  />
                  <StatTile
                    label="Муаммоли масалалар"
                    value={nf(vm.problems?.items.length ?? 0, 0)}
                    unit="банд"
                    stripe="var(--warn)"
                    foot={
                      <Pill>
                        оралиқда {vm.problemItems} банд · {vm.problemDays} кун
                      </Pill>
                    }
                  />
                  <StatTile
                    label="Кунлик қиймати йўқ"
                    value={nf(vm.noDayValue, 0)}
                    unit="кўрсаткич"
                    foot={<Pill>манбада шу кун учун тўлдирилмаган</Pill>}
                  />
                </div>

                <div className="mt-3">
                  <Card
                    title="Кўрсаткичлар ҳолати"
                    sub={`${vm.counts.total} та`}
                    note={
                      vm.available.from && vm.available.to
                        ? `Манбада мавжуд оралиқ: ${dateLabel(vm.available.from)} — ${dateLabel(vm.available.to)} (${vm.available.days} кун).`
                        : undefined
                    }
                  >
                    <DailyStatusBar counts={vm.counts} height={14} />
                    <div className="mt-3 border-t border-grid pt-2.5">
                      <DailyStatusLegend />
                    </div>
                  </Card>
                </div>
              </>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Йўналишлар бўйича кўрсаткичлар"
        note={vm ? `${dateLabel(vm.day)} · асосий қаторлар дарҳол, қолгани «Батафсил» ичида` : "8 йўналиш"}
      >
        <Loader
          q={q}
          height={260}
          notAvailableWhat="/daily"
          isEmpty={() => !vm || !vm.hasValues}
          emptyTitle="Ушбу кун учун маълумот йўқ"
        >
          {() =>
            vm && (
              <div className={GRID.g2}>
                {vm.blocks.map((b) => (
                  <DailyBlockCard key={b.key} block={b} />
                ))}
              </div>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Муаммоли масалалар"
        note={vm ? `${dateLabel(vm.day)} · манба варағидаги рақамланган бандлар` : "манбадан"}
      >
        <Loader
          q={q}
          height={140}
          notAvailableWhat="/daily"
          isEmpty={() => !vm}
          emptyTitle="Маълумот йўқ"
        >
          {() =>
            vm && (
              <Card
                title="Кун бўйича бандлар"
                sub={`${vm.problems?.items.length ?? 0} та`}
                note="Бандлар манба варағидан ўзгартирилмасдан олинган. Варақ ости изоҳлари муаммо банди эмас — улар пастда алоҳида кўрсатилади."
              >
                {vm.problems && vm.problems.items.length > 0 ? (
                  <ol className="flex flex-col gap-1.5">
                    {vm.problems.items.map((it, i) => (
                      <li
                        key={`${it.no ?? "x"}-${i}`}
                        className="flex items-baseline gap-2 border-t border-grid pt-1.5 text-[12.5px] leading-[1.45] text-ink-2 first:border-t-0 first:pt-0"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-sunken px-1 font-mono text-[11px] text-ink-3"
                        >
                          {it.no ?? "·"}
                        </span>
                        <span className="min-w-0">{it.text}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="px-2.5 py-5 text-center text-[13px] text-ink-3">
                    Ушбу кунда муаммоли масала қайд этилмаган.
                  </p>
                )}

                {vm.problems && vm.problems.notes.length > 0 && (
                  <div className="mt-3 border-t border-grid pt-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                      Варақ изоҳлари
                    </p>
                    {vm.problems.notes.map((n, i) => (
                      <p key={i} className="text-[11.5px] leading-[1.45] text-ink-3">
                        {n}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            )
          }
        </Loader>
      </Section>

      <Section
        title="Раҳбарлик хулосаси"
        note={vm ? `${dateLabel(vm.day)} · ҳар бир йўналиш бўйича биттадан хулоса` : "йўналишлар кесимида"}
      >
        <Loader
          q={q}
          height={220}
          notAvailableWhat="/daily"
          isEmpty={() => !vm || vm.summary.length === 0}
          emptyTitle="Хулоса учун маълумот йўқ"
        >
          {() => vm && <SummaryCard vm={vm} />}
        </Loader>
      </Section>
    </>
  );
}

/**
 * Йўналишлар хулосаси. Ҳолат кўпчилик қоидаси бўйича ҳисобланади
 * (`adapters/daily.ts` изоҳига қаранг), энг оғир қатор эса номи билан
 * ёнида кўрсатилади — шунда «қайси йўналишда муаммо» ва «айнан нимада»
 * иккиси ҳам битта қаторда кўринади.
 */
function SummaryCard({ vm }: { vm: DailyVM }) {
  return (
    <Card
      title="8 йўналиш бўйича хулоса"
      sub={`${vm.summary.length} қатор`}
      note="Хулоса блокнинг бош қаторлари бўйича: манбада «… жами» қаторлари бўлса ўшалар, бўлмаса қисм бўлмаган қаторлар. Ҳолати аниқланмаган қаторлар овоз бермайди."
    >
      {vm.summary.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-1 items-center gap-x-3.5 gap-y-1.5 border-t border-grid py-2.5 first:border-t-0 mid:grid-cols-[minmax(0,1fr)_minmax(140px,220px)_minmax(150px,auto)]"
        >
          <span className="min-w-0">
            <span className="block text-[12.5px] leading-[1.35] text-ink-2">
              <span className="font-mono text-ink-3">№{s.no}</span> {s.title}
              {s.section && <span className="text-ink-3"> — {s.section}</span>}
            </span>
            {s.worst && (
              <span className="mt-px block text-[11px] text-ink-3">
                энг оғири: {s.worst.name} — {DAILY_STATUS_LABEL[s.worst.status].toLowerCase()}
              </span>
            )}
          </span>
          <DailyStatusBar counts={s.counts} height={10} withLegend={false} />
          <span className="flex flex-wrap items-center gap-1.5">
            <DailyStatusPill status={s.verdict} />
            <span className="text-[11px] text-ink-3">{s.metricCount} кўрсаткич</span>
          </span>
        </div>
      ))}

      {/* Фойдаланувчи сўраган устунлар: № · Йўналиш · Кўрсаткич · Ўлчов
          бирлиги · Кунлик · Ой бошидан · Йил бошидан · Ҳолат. */}
      <TableToggle
        caption="Кунлик сводка — барча йўналишлар бўйича кўрсаткичлар"
        cols={[
          { t: "№", num: true },
          { t: "Йўналиш", wrap: true },
          { t: "Кўрсаткич", wrap: true },
          { t: "Ўлчов бирлиги" },
          { t: "Кунлик", num: true },
          { t: "Ой бошидан", num: true },
          { t: "Йил бошидан", num: true },
          { t: "Ҳолат", wrap: true },
        ]}
        rows={vm.blocks.flatMap((b) =>
          b.metrics.map((m) => ({
            key: m.id,
            cells: [
              b.no,
              b.title,
              m.name,
              m.unit ?? "—",
              m.kind === "flow"
                ? m.day?.fakt == null
                  ? "—"
                  : `${exact(m.day.fakt)}${m.day.pct === null ? "" : ` · ${pctTxt(m.day.pct)}`}`
                : m.warehouse == null
                  ? "—"
                  : `${exact(m.warehouse)} омборда`,
              m.kind === "flow"
                ? m.month?.fakt == null
                  ? "—"
                  : `${exact(m.month.fakt)}${m.month.pct === null ? "" : ` · ${pctTxt(m.month.pct)}`}`
                : m.workshop == null
                  ? "—"
                  : `${exact(m.workshop)} цехда`,
              m.kind === "flow"
                ? m.year?.fakt == null
                  ? "—"
                  : `${exact(m.year.fakt)}${m.year.pct === null ? "" : ` · ${pctTxt(m.year.pct)}`}`
                : m.total == null
                  ? "—"
                  : exact(m.total),
              DAILY_STATUS_LABEL[m.status],
            ],
          })),
        )}
      />
    </Card>
  );
}
