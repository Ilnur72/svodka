import { useEffect, useId, useMemo, useState } from "react";
import type { InvestDeckDashboard } from "../api/types";
import { getInvestDeckDashboard } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { usePalette } from "../lib/theme";
import { dateLabel, exact, nf, pctTxt } from "../lib/format";
import {
  DECK_FILTER_EMPTY,
  deckBySlide,
  deckFilter,
  deckFilterDirty,
  investDeckView,
  type DeckCluster,
  type DeckFilter,
  type DeckProject,
} from "../lib/adapters/investDeck";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { BarsH } from "../components/BarsH";
import { ShareBar } from "../components/ShareBar";
import { CheckSelect } from "../components/CheckSelect";
import { DataTable, type Row } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";
import { BlockPills, ClusterChip, Fact, Muted, SourceDot } from "./investDeck/parts";
import { InvestDeckDetail } from "./investDeck/InvestDeckDetail";

/**
 * «Инвестиция дастури 2026–2030» — «Инв. лойиҳалар 2026-2030» тақдимотидан
 * 88 та лойиҳа, 03.08.2026 ҳолатига.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: лойиҳалар, кластерлар, жами инвестиция.
 *  2. Кластерлар кесими: иккита диаграмма (сон ва ҳажм — **алоҳида**
 *     карточкаларда) ва филиаллари билан рўйхат.
 *  3. Молиялаштириш манбалари: улуш чизиғи ва аниқ сонлар жадвали.
 *  4. Лойиҳалар рўйхати — кластер фильтри ва қидирув билан; пастида
 *     филиал йиғмалари алоҳида блокда.
 *  5. Маълумот тўлиқлиги — манбада нима бор, нима йўқ.
 *
 * Карточка босилганда ўша слайднинг тафсилот ойнаси очилади
 * (`investDeck/InvestDeckDetail.tsx`), манзилда `#investdeck/<слайд>` пайдо
 * бўлади — ҳавола бериш ва «орқага» тугмаси шу орқали ишлайди. Рўйхатнинг
 * ўз ҳолати (фильтр, қидирув) шу компонентда қолади, шунинг учун ойна
 * ёпилганда ўзгармайди.
 *
 * ═══ Бирликлар аралашмайди ══════════════════════════════════════════════
 *
 * Кластер кесимида иккита ўлчов бор: лойиҳалар сони (та) ва инвестиция
 * ҳажми (млн $). Улар ҳеч қаерда битта шкалага қўйилмайди ва иккинчи Y ўқи
 * ясалмайди — ҳар бири ўз карточкасида, ўз бирлиги билан.
 *
 * ═══ Йиғма қатор рўйхатга аралашмайди ═══════════════════════════════════
 *
 * Тақдимотда 4 та слайд — технопарк филиаллари бўйича **йиғма**: улардаги
 * сонлар ўша филиалдаги лойиҳаларнинг суммаси. Бу `production-report` даги
 * `isTotal` билан бир хил ҳолат, шунинг учун улар лойиҳалар рўйхатига
 * қўшилмайди ва фильтрга тушмайди — пастда алоҳида блокда, «йиғма» деб
 * ёзилган ҳолда туради.
 *
 * ═══ Манба тўлиқ эмас ва бу яширилмайди ═════════════════════════════════
 *
 * Йиллар жадвали атиги 37 лойиҳада, IRR 34, NPV 33, ROI 34 тасида бор.
 * Бўш жой нол билан ҳам, «—» билан жимгина ҳам тўлдирилмайди: карточкада
 * «маълумот йўқ» деб ёзилади, бўлим охирида эса тўлиқлик рўйхати туради.
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

/* -------------------------------------------------------------------------- */
/* рўйхатдаги карточка                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Битта слайд — қисқа карточка.
 *
 * Атайин кам нарса: ном, кластер, жами қиймат, IRR/NPV/ROI ва слайдда қайси
 * жадваллар борлиги. Ишлар, молия жадвали ва йиллар тафсилот ойнасида — бир
 * хил сонни икки жойда кўрсатиш рўйхатни ўқилмас қиларди.
 *
 * Бутун карточка `<button>`: ичида бошқа босиладиган элемент йўқ, шунинг
 * учун сичқонча ва клавиатура учун битта аниқ мақсад қолади.
 */
function DeckCard({ p, onOpen }: { p: DeckProject; onOpen: (slideNo: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.slideNo)}
      className="relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-3.5 text-left shadow-card hover:border-s1"
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: p.isBranchTotal ? "var(--ink-3)" : "var(--s1)" }}
      />

      <h3 className="min-w-0 text-[13.5px] leading-[1.3] [font-weight:650] break-words">
        {p.title}
      </h3>

      <div className="mt-1.5">
        <ClusterChip p={p} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-grid pt-2.5 mid:grid-cols-4">
        <Fact
          label="Жами қиймати"
          value={p.finance === null ? null : exact(p.finance)}
          unit="млн $"
        />
        <Fact label="IRR" value={p.irrText} />
        <Fact label="NPV" value={p.npvText} />
        <Fact label="ROI" value={p.roiText} />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
        <BlockPills p={p} />
        <span className="flex-1" />
        <span className="text-[11px] font-semibold tracking-[0.06em] text-s1 uppercase">
          Батафсил →
        </span>
      </div>
    </button>
  );
}

/** Кластер қатори: ўзи, сўнг филиаллари (бўлса) ичкарига сурилган ҳолда. */
function ClusterRow({ c, share }: { c: DeckCluster; share: number }) {
  return (
    <div className="border-t border-grid py-2 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.35] [font-weight:650] break-words">
          {c.name}
        </span>
        <span className="flex-none font-mono text-[12px] tabular-nums text-ink-2">
          {nf(c.projects)}
          <span className="ml-1 font-sans text-[11px] text-ink-3">та</span>
        </span>
        <span className="w-[104px] flex-none text-right font-mono text-[12px] tabular-nums">
          {c.finance === null ? <Muted>—</Muted> : exact(c.finance)}
          <span className="ml-1 font-sans text-[11px] text-ink-3">млн $</span>
        </span>
      </div>

      {/* Улуш чизиғи — фақат лойиҳалар сони бўйича (пул эмас): иккита ўлчов
          битта чизиқда аралашмаслиги учун. */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
          <span
            className="absolute inset-y-0 left-0 rounded-[3px] bg-s1"
            style={{ width: `${share.toFixed(2)}%` }}
          />
        </span>
        <span className="w-[48px] flex-none text-right font-mono text-[11px] tabular-nums text-ink-3">
          {pctTxt(share)}
        </span>
      </div>

      {c.branches.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 border-l border-rule pl-3">
          {c.branches.map((b) => (
            <li key={b.key} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[12px]">
              <span className="min-w-0 flex-1 text-ink-2">{b.branch} филиали</span>
              <span className="flex-none font-mono tabular-nums text-ink-2">
                {nf(b.projects)}
                <span className="ml-1 font-sans text-[11px] text-ink-3">та</span>
              </span>
              <span className="w-[104px] flex-none text-right font-mono tabular-nums text-ink-2">
                {b.finance === null ? <Muted>—</Muted> : exact(b.finance)}
                <span className="ml-1 font-sans text-[11px] text-ink-3">млн $</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function InvestDeckPanel() {
  const q = useQuery("invest-deck-dashboard", (s) => getInvestDeckDashboard(s));
  return (
    <Loader q={q} height={360} notAvailableWhat="/invest-deck/dashboard">
      {(data) => <InvestDeckBody data={data} />}
    </Loader>
  );
}

function InvestDeckBody({ data }: { data: InvestDeckDashboard }) {
  const uid = useId();
  const pal = usePalette();
  const v = useMemo(() => investDeckView(data), [data]);
  const [filter, setFilter] = useState<DeckFilter>(DECK_FILTER_EMPTY);

  // Очиқ слайд — хэшнинг иккинчи сегментида (`#investdeck/42`), рўйхат ҳолати
  // эса шу компонентда. Шунинг учун ойна ёпилганда фильтр ва қидирув ўз
  // ҳолича қолади: рўйхат қайта монтаж қилинмайди.
  const [sub, goSub] = useHashSub("investdeck");
  const open = deckBySlide(v.all, sub);

  const shown = useMemo(() => deckFilter(v.projects, filter), [v.projects, filter]);
  const dirty = deckFilterDirty(filter);
  const t = v.totals;

  // Мавжуд бўлмаган слайдга ҳавола (эскирган ёки нотўғри рақам) хатога олиб
  // келмайди — манзил жимгина рўйхатга тушади. `replace`, чунки бундай ёзув
  // тарихда қолмаслиги керак.
  useEffect(() => {
    if (sub !== null && open === null) goSub(null, true);
  }, [sub, open, goSub]);

  const financeWith = v.projects.filter((p) => p.finance !== null).length;
  const financeWithout = v.projects.length - financeWith;

  // Диаграмма қаторлари: иккита ўлчов — иккита алоҳида карточка.
  const countRows = v.clusters.map((c) => ({
    label: c.name,
    v: c.projects,
    extra: ["Улуш", pctTxt((c.projects / Math.max(1, t.projects)) * 100)] as [string, string],
  }));
  // Ҳажми кўрсатилмаган кластер диаграммага тушмайди: `null` ни нолга
  // айлантириш «маблағ ажратилмаган» деган ёлғон хулоса берарди.
  const moneyRows = v.clusters
    .filter((c) => c.finance !== null)
    .map((c) => ({
      label: c.name,
      v: c.finance as number,
      color: pal.s3,
      extra: ["Лойиҳалар", `${nf(c.projects)} та`] as [string, string],
    }));
  const moneyHidden = v.clusters.length - moneyRows.length;

  const sourceRows: Row[] = v.sources.map((s) => ({
    key: s.key,
    cells: [
      <span key="n" className="inline-flex items-center gap-2">
        <SourceDot color={s.color} />
        {s.label}
      </span>,
      s.total === null ? <Muted key="v">—</Muted> : exact(s.total),
      s.total === null || v.sourcesTotal === null
        ? "—"
        : pctTxt((s.total / v.sourcesTotal) * 100),
      nf(s.count),
    ],
  }));

  return (
    <>
      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section title="Инвестиция дастури 2026–2030" note={`${dateLabel(v.asOf)} ҳолатига`}>
        <div className={GRID.g3}>
          <StatTile
            label="Жами лойиҳалар"
            value={nf(t.projects)}
            unit="та"
            stripe="var(--s1)"
            foot={
              v.branchTotals.length > 0 ? (
                <Pill>устига {v.branchTotals.length} та филиал йиғмаси</Pill>
              ) : undefined
            }
          />
          <StatTile
            label="Кластерлар"
            value={nf(t.clusters)}
            unit="та"
            stripe="var(--s2)"
            foot={<Pill>{v.clusters[0]?.name ?? "—"} — энг каттаси</Pill>}
          />
          <StatTile
            label="Жами инвестиция"
            value={exact(t.finance)}
            unit="млн $"
            stripe="var(--s3)"
            foot={
              <>
                <Pill>{financeWith} та лойиҳада кўрсатилган</Pill>
                {financeWithout > 0 && <Pill status="warn">{financeWithout} тада йўқ</Pill>}
              </>
            }
          />
        </div>
      </Section>

      {/* --- 2. кластерлар -------------------------------------------------- */}
      <Section title="Кластерлар кесими">
        <div className={GRID.g2}>
          <Card title="Лойиҳалар сони" sub={`${v.clusters.length} кластер`}>
            <BarsH
              rows={countRows}
              vName="Лойиҳалар"
              vFmt={(n) => nf(n)}
              ariaLabel="Лойиҳаларнинг кластерлар бўйича тақсимоти"
            />
          </Card>
          <Card
            title="Инвестиция ҳажми"
            sub="млн $"
            note={
              moneyHidden > 0
                ? `${moneyHidden} та кластерда ҳажм кўрсатилмагани учун диаграммада йўқ.`
                : undefined
            }
          >
            <BarsH
              rows={moneyRows}
              vName="Инвестиция, млн $"
              ariaLabel="Инвестиция ҳажмининг кластерлар бўйича тақсимоти"
            />
          </Card>
        </div>

        <Card
          className="mt-3"
          title="Кластерлар ва филиаллар"
          sub={`${v.clusters.length} кластер · ${t.projects} лойиҳа`}
          note="Филиал — кластернинг бир қисми: унинг сонлари юқоридаги кластер қаторига аллақачон кирган."
        >
          {v.clusters.map((c) => (
            <ClusterRow
              key={c.key}
              c={c}
              share={(c.projects / Math.max(1, t.projects)) * 100}
            />
          ))}
        </Card>
      </Section>

      {/* --- 3. молиялаштириш манбалари ------------------------------------- */}
      <Section title="Молиялаштириш манбалари" note={`${v.sources.length} манба`}>
        <div className={GRID.g23}>
          <Card
            title="Манбалар улуши"
            sub={v.sourcesTotal === null ? undefined : `${exact(v.sourcesTotal)} млн $`}
          >
            {v.sources.filter((s) => s.total !== null).length === 0 ? (
              <EmptyState title="Манбалар бўйича сумма кўрсатилмаган" />
            ) : (
              <ShareBar
                parts={v.sources
                  .filter((s) => s.total !== null)
                  .map((s) => ({ name: s.label, value: s.total as number, color: s.color }))}
              />
            )}

            {/* Иккита жами бир хил эмас: слайдлардаги «Жами:» қаторларининг
                йиғиндиси манба қаторларининг йиғиндисидан фарқ қилади. Бу
                манбадаги ҳақиқий номувофиқлик — тузатилмайди, ёзилади. */}
            {v.financeGap !== null && (
              <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
                Лойиҳаларнинг «Жами:» қаторлари бўйича{" "}
                <b className="font-mono font-semibold text-ink-2">{exact(t.finance)}</b> млн $ —
                манбалар йиғиндисидан{" "}
                <b className="font-mono font-semibold text-ink-2">{exact(v.financeGap)}</b> млн $
                фарқ қилади (манбада шундай).
              </p>
            )}
          </Card>

          <Card title="Манбалар кесими" sub="улуш манбалар йиғиндисига нисбатан">
            <DataTable
              cols={[
                { t: "Манба" },
                { t: "Сумма, млн $", num: true },
                { t: "Улуши", num: true },
                { t: "Қаторлар", num: true },
              ]}
              rows={sourceRows}
              caption="Молиялаштириш манбалари бўйича йиғинди"
            />
            <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
              «Қаторлар» — манба нечта лойиҳанинг молия жадвалида учрагани. Манбада умуман
              учрамаган турлар рўйхатга киритилмаган.
            </p>
          </Card>
        </div>
      </Section>

      {/* --- 4. лойиҳалар рўйхати ------------------------------------------- */}
      <Section title="Лойиҳалар">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className={LBL}>Кластер</span>
          <CheckSelect
            label="Кластер бўйича фильтр"
            options={v.facets.clusters.map((c) => ({
              key: c.key,
              label: c.label,
              count: c.count,
            }))}
            picked={filter.clusters}
            onChange={(c) => setFilter((f) => ({ ...f, clusters: c }))}
            emptyText="барчаси"
          />

          <label htmlFor={`${uid}-q`} className={LBL}>
            Қидирув
          </label>
          <input
            id={`${uid}-q`}
            type="search"
            placeholder="лойиҳа номи…"
            value={filter.query}
            onChange={(ev) => setFilter((f) => ({ ...f, query: ev.target.value }))}
          />

          {dirty && (
            <button
              type="button"
              onClick={() => setFilter(DECK_FILTER_EMPTY)}
              className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Фильтрни тозалаш
            </button>
          )}

          <span className="flex-1" />
          <Pill>
            {shown.length} / {t.projects} лойиҳа
          </Pill>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title="Танланган шартга мос лойиҳа топилмади"
            text="Қидирув сўзини ёки кластер фильтрини ўзгартиринг."
          />
        ) : (
          <div className={GRID.g2}>
            {shown.map((p) => (
              <DeckCard key={p.id} p={p} onOpen={(no) => goSub(String(no))} />
            ))}
          </div>
        )}
      </Section>

      {/* --- филиал йиғмалари ----------------------------------------------- */}
      {v.branchTotals.length > 0 && (
        <Section
          title="Филиаллар бўйича йиғма слайдлар"
          note="лойиҳа эмас — юқоридаги сонларга қўшилмайди"
        >
          <div className={GRID.g2}>
            {v.branchTotals.map((p) => (
              <DeckCard key={p.id} p={p} onOpen={(no) => goSub(String(no))} />
            ))}
          </div>
        </Section>
      )}

      {/* --- 5. маълумот тўлиқлиги ------------------------------------------ */}
      <Section title="Маълумот тўлиқлиги" note={`${t.projects} лойиҳадан нечтасида кўрсатилган`}>
        <Card
          title="Манбада нима бор"
          note="Кўрсатилмаган жой нол билан тўлдирилмайди: тафсилот ойнасида ундай блок чизилмайди ва йўқлиги ёзиб қўйилади."
        >
          {v.filled.map((f) => {
            const pct = f.total === 0 ? 0 : (f.filled / f.total) * 100;
            return (
              <div key={f.key} className="border-t border-grid py-2 first:border-t-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] [font-weight:600]">
                    {f.label}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-ink-2">
                    {nf(f.filled)}
                    <span className="mx-1 text-ink-3">/</span>
                    {nf(f.total)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
                    <span
                      className="absolute inset-y-0 left-0 rounded-[3px] bg-s1"
                      style={{ width: `${pct.toFixed(2)}%` }}
                    />
                  </span>
                  <span className="w-[52px] flex-none text-right font-mono text-[11.5px] tabular-nums">
                    {pctTxt(pct)}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="mt-2.5 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
            Манба: {v.source}
          </p>
        </Card>
      </Section>

      {open && (
        <InvestDeckDetail
          slideNo={open.slideNo}
          known={open}
          onOpen={(no) => goSub(String(no))}
          onClose={() => goSub(null)}
        />
      )}
    </>
  );
}
