import { useMemo, useRef, type KeyboardEvent } from "react";
import type { PanelProps, TabId } from "./types";
import { clearToken } from "./api/auth";
import { getFilters } from "./api/endpoints";
import { useQuery } from "./lib/useQuery";
import { monthsInRange, monthsOf, usePeriodState } from "./lib/period";
import { periodLabel } from "./lib/format";
import { unverifiedAreasText } from "./lib/dataQuality";
import { TABS, useHashTab } from "./lib/useHashTab";
import { PeriodPicker } from "./components/PeriodPicker";
import { ErrorState, Skeleton } from "./components/states";
import { ObzorPanel } from "./panels/ObzorPanel";
import { ProdPanel } from "./panels/ProdPanel";
import { SgpPanel } from "./panels/SgpPanel";
import { EnergyPanel } from "./panels/EnergyPanel";
import { H2Panel } from "./panels/H2Panel";
import { CistPanel } from "./panels/CistPanel";
import { OgarokPanel } from "./panels/OgarokPanel";
import { IngPanel } from "./panels/IngPanel";

/**
 * Даврлар рўйхати `/filters` дан келади. Агар ушбu endpoint серверда
 * бўлмаса (404), илова тўхтамайди — охирги 12 ой билан ишлайверади.
 */
function fallbackRange(): { min: string; max: string } {
  const now = new Date();
  const max = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const min = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { min: iso(min), max: iso(max) };
}

export function Dashboard() {
  const filtersQ = useQuery("filters", (s) => getFilters(s));

  if (filtersQ.loading) {
    return (
      <main className="mx-auto max-w-[1560px] px-5 py-8">
        <Skeleton height={320} />
      </main>
    );
  }

  if (filtersQ.error && !filtersQ.notAvailable) {
    return (
      <main className="mx-auto max-w-[560px] px-5 py-16">
        <ErrorState error={filtersQ.error} onRetry={filtersQ.refetch} />
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={clearToken}
            className="cursor-pointer text-[12.5px] font-semibold text-ink-2 underline hover:text-ink"
          >
            Чиқиш ва қайта кириш
          </button>
        </div>
      </main>
    );
  }

  const range = filtersQ.data?.dateRange ?? fallbackRange();
  // Ойлар рўйхати ўзгарганда давр ҳолати ҳам қайта ҳисобланиши учун
  // ички компонент remount қилинади (қаттиқ ёзилган ой йўқ).
  return <DashboardBody key={`${range.min}_${range.max}`} range={range} />;
}

function DashboardBody({ range }: { range: { min: string; max: string } }) {
  const [tab, selectTab] = useHashTab();
  const allMonths = useMemo(() => monthsInRange(range.min, range.max), [range.min, range.max]);
  const [period, setPeriod] = usePeriodState(allMonths);
  const months = useMemo(() => monthsOf(period, allMonths), [period, allMonths]);
  const tablistRef = useRef<HTMLDivElement>(null);

  const props: PanelProps = { period, months };

  function renderPanel() {
    switch (tab) {
      case "prod":
        return <ProdPanel {...props} />;
      case "sgp":
        return <SgpPanel {...props} />;
      case "energy":
        return <EnergyPanel {...props} />;
      case "h2":
        return <H2Panel {...props} />;
      case "cist":
        return <CistPanel {...props} />;
      case "ogarok":
        return <OgarokPanel {...props} />;
      case "ing":
        return <IngPanel {...props} />;
      case "obzor":
      default:
        return <ObzorPanel {...props} />;
    }
  }

  // WAI-ARIA tabs: стрелкалар таблар орасида юради, Home/End четларга.
  const onTabKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(ev.key)) return;
    ev.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      ev.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : ev.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : ev.key === "Home"
            ? 0
            : TABS.length - 1;
    const id: TabId = TABS[next].id;
    selectTab(id);
    tablistRef.current?.querySelector<HTMLButtonElement>(`#tab-${id}`)?.focus();
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow-card"
      >
        Асосий мазмунга ўтиш
      </a>

      <header className="sticky top-0 z-40 border-b border-rule bg-surface shadow-card">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-[18px] px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="grid h-9 w-9 flex-none place-items-center rounded-[5px] bg-s1 font-mono text-[12px] font-bold tracking-[0.04em] text-white"
            >
              КТМ
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] leading-[1.2] [font-weight:650]">
                Ўзбекистон қийин эрувчан ва иссиққа чидамли металлар комбинати
              </h1>
              <p className="mt-px text-[11.5px] font-medium tracking-[0.06em] text-ink-3 uppercase">
                Ситуацион марказ · {periodLabel(months)}
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <PeriodPicker months={allMonths} period={period} onChange={setPeriod} />
          <button
            type="button"
            onClick={clearToken}
            className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink"
          >
            Чиқиш
          </button>
        </div>
      </header>

      <nav className="sticky top-[61px] z-[35] border-b border-rule bg-surface" aria-label="Бўлимлар">
        <div
          ref={tablistRef}
          className="tabs-scroll mx-auto flex max-w-[1560px] gap-0.5 px-5"
          role="tablist"
          aria-label="Бўлимлар"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className={
                  "flex cursor-pointer items-center gap-[7px] border-b-2 px-3.5 pt-[11px] pb-[9px] text-[13.5px] whitespace-nowrap " +
                  (on
                    ? "border-s1 text-ink [font-weight:650]"
                    : "border-transparent font-medium text-ink-2 hover:text-ink")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-[7px] w-[7px] flex-none rounded-full " + (on ? "bg-s1" : "bg-rule")
                  }
                />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main id="main" className="mx-auto max-w-[1560px] px-5 pt-5 pb-16">
        {/*
          Давр ўзгарганда панел remount қилинмайди: сўровлар ўзи янгиланади,
          эски натижа эса янгиси келгунича экранда қолади (скелет миллтилламайди).
        */}
        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {renderPanel()}
        </div>
      </main>

      <footer className="mx-auto max-w-[1560px] px-5 pb-10 text-[11.5px] leading-[1.6] text-ink-3">
        <p>
          <b className="font-semibold text-ink-2">Манба:</b> «Production Report» API — ойлик
          «Сводки MM-YYYY.xlsx» файлларидан импорт қилинган маълумотлар (Нарастайка,
          Электроэнергия, Водород, цистерны, Огарок, Ингички, СГП). Классификация
          «Справочники.xlsx» маълумотномалари асосида (цех/объект, жараён, металл).
        </p>
        <p>
          Электр энергия йиғиндисидан «ЭНЦ общ.» такрорий сатри чиқарилган.
          {unverifiedAreasText() && (
            <>
              {" "}
              {unverifiedAreasText()} бўлимларида манба қийматлари текширилмагани учун сон
              қийматлар вақтинча яширилган.
            </>
          )}{" "}
          Заводга боғланмаган позициялар алоҳида гуруҳда кўрсатилади ва бирлик кесимидаги
          йиғиндиларга қўшилмайди.
        </p>
      </footer>
    </>
  );
}
