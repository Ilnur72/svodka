import { useEffect, useMemo, useState } from "react";
import type { ExportTargetsDashboard } from "../api/types";
import { getExportTargets } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { usePalette } from "../lib/theme";
import { exact, nf, pctTxt } from "../lib/format";
import {
  exportMatrix,
  exportSlice,
  exportTargetsView,
  KIND_LABEL,
  KIND_TOKEN,
  NO_DATA,
  VALUE_UNIT,
  type ExportDualYear,
  type ExportMetric,
  type ExportSlice,
} from "../lib/adapters/exportTargets";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { BarsH, type BarRow } from "../components/BarsH";
import { ChartLegend } from "../components/ChartLegend";
import { SegmentSwitch, type SegmentOption } from "../components/SegmentSwitch";
import { DataTable, type Col, type Row } from "../components/DataTable";
import { EmptyState, Loader } from "../components/states";

/**
 * «Экспортнинг мақсадли кўрсаткичлари 2024-2030» — `1.1 Рынок - экспорт
 * 2024-2030.xlsx` дан 8 маҳсулот × 8 давр.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Плиткалар: 2030 мақсади, охирги амалдаги ҳолат, маҳсулотлар ва
 *     тўрнинг тўлиқлиги.
 *  2. Қиймат динамикаси: даврлар бўйича жами + 2026 йилнинг иккита ёзуви
 *     алоҳида карточкада.
 *  3. Маҳсулотлар кесими: битта давр танланади, ичида рейтинг ва аниқ сонлар.
 *  4. Тўлиқ жадвал: маҳсулот × давр, қиймат/ҳажм алмаштиргичи билан.
 *  5. Манба билан солиштириш: ҳисобланган жами ва манбадаги «ЖАМИ».
 *
 * Танланган давр манзилда сақланади (`#exporttargets/2030-forecast`) —
 * шунинг учун аниқ бир йилга ҳавола бериш мумкин. Ёзув `replace` билан
 * қўйилади: алмаштиргични босиш тарихни тўлдирмаслиги керак.
 *
 * ═══ 2026 икки марта — сохта ўсиш ясалмайди ═════════════════════════════
 *
 * Манбада 2026 учун иккита ёзув бор: «амалда» (январь–август, ҚИСМАН йил)
 * ва «прогноз» (тўлиқ йил). Шунинг учун динамика **чизиқ билан эмас,
 * устунлар билан** чизилади — ёнма-ён турган иккита 2026 орасида чизиқ
 * ўтказилса, экранда бўлмаган «ўсиш» пайдо бўларди. Ҳар бир устун ўз тури
 * билан рангланади, иккита 2026 эса устига алоҳида карточкада, нима учун
 * улар бир хил нарса эмаслиги ёзилган ҳолда кўрсатилади.
 *
 * ═══ Бўш катак нол эмас ═════════════════════════════════════════════════
 *
 * 64 катакдан 22 таси бўш. Улар диаграммага тушмайди ва ҳеч қаерда 0 деб
 * чизилмайди: 2024 йилда фақат молибден бор, қолган 7 маҳсулот нол устун
 * бўлиб кўринса «экспорт бор эди, кейин тушди» деган ёлғон манзара
 * чиқарди. Жадвалда улар «—», диаграммадан чиққанлари эса ҳар сафар
 * саналиб, алоҳида рўйхат билан кўрсатилади.
 *
 * ═══ Ҳажмлар битта шкалага қўйилмайди ═══════════════════════════════════
 *
 * Ўлчов бирлиги маҳсулотга боғлиқ (`тонна` / `млн дона` / `минг тонна`),
 * шунинг учун ҳажм бўйича диаграмма ҳам, устунлар бўйича ЖАМИ ҳам йўқ —
 * ҳажм фақат жадвалда, ҳар бир қатор ўз бирлиги ёнида. Диаграммаларда
 * ягона қўшса бўладиган ўлчов ишлатилади: минг АҚШ доллари.
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

const METRICS: readonly SegmentOption<ExportMetric>[] = [
  {
    id: "value",
    label: "Қиймати",
    hint: "Минг АҚШ доллари — маҳсулотлар бўйлаб қўшса бўладиган ягона ўлчов, шунинг учун пастда ЖАМИ қатори бор.",
  },
  {
    id: "volume",
    label: "Ҳажми",
    hint: "Ҳар бир маҳсулот ўз ўлчов бирлигида. Бирликлар ҳар хил бўлгани учун устунлар бўйича ЖАМИ ҳисобланмайди.",
  },
];

/** Манбада катак тўлдирилмаган жой — бўлим бўйлаб бир хил матн ва тус. */
function Dash() {
  return <span className="text-ink-3">{NO_DATA}</span>;
}

/* -------------------------------------------------------------------------- */
/* 2026 — иккита ёзув                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Бир хил йилнинг «амалда» ва «прогноз» ёзувлари.
 *
 * Улар атайин алоҳида карточкада: вақт диаграммасида ёнма-ён турганда
 * иккови «икки йил» бўлиб ўқиларди. Бу ерда эса иккаласи бир хил йилнинг
 * иккита ўлчови экани, бири қисман давр экани ва нисбат нимани англатмаслиги
 * очиқ ёзилади.
 */
function DualYearCard({ d }: { d: ExportDualYear }) {
  return (
    <Card
      title={`${d.year} йил — манбада иккита ёзув`}
      sub={VALUE_UNIT}
      note="Бу иккита ёрлиқ бир хил йилнинг иккита ўлчови: бири рўй берган экспорт, иккинчиси тўлиқ йил учун мақсад. Улар қўшилмайди ва бир-бирининг ўрнига ишлатилмайди."
    >
      {[d.actual, d.forecast].map((p) => (
        <div key={p.key} className="border-t border-grid py-2 first:border-t-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <i
                aria-hidden="true"
                className="h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: `var(--${KIND_TOKEN[p.kind]})` }}
              />
              <span className="text-[12.5px] [font-weight:650]">{KIND_LABEL[p.kind]}</span>
            </span>
            <span className="min-w-0 flex-1 text-[11.5px] text-ink-3">
              {p.note ?? "тўлиқ йил"}
            </span>
            <span className="flex-none font-mono text-[13px] tabular-nums">
              {p.total === null ? <Dash /> : exact(p.total)}
            </span>
          </div>
        </div>
      ))}

      {d.donePct !== null && (
        <p className="mt-2.5 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
          Амалдаги қиймат тўлиқ йил прогнозининг{" "}
          <b className="font-mono font-semibold text-ink-2">{pctTxt(d.donePct)}</b> ини ташкил
          қилади. Бу <b className="font-semibold text-ink-2">режа бажарилиши эмас</b>: амалдаги
          ёзув қисман даврни ({d.actual.note ?? "тўлиқ бўлмаган давр"}) қамрайди, прогноз эса
          тўлиқ йилни.
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* маҳсулотлар кесими                                                         */
/* -------------------------------------------------------------------------- */

function SliceTable({ s }: { s: ExportSlice }) {
  const rows: Row[] = s.rows.map((r) => ({
    key: String(r.rowNo),
    cells: [
      r.name,
      exact(r.value),
      r.share === null ? <Dash /> : pctTxt(r.share),
      // Ҳажм ўз бирлиги билан ёнма-ён турибди: устун бўйлаб қўшилмайди ва
      // шунинг учун бу жадвалда ЖАМИ қатори ҳам йўқ.
      <span key="vol">
        {r.volume === null ? <Dash /> : exact(r.volume)}
        {r.volume !== null && r.unit && (
          <span className="ml-1 font-sans text-[11px] text-ink-3">{r.unit}</span>
        )}
      </span>,
    ],
  }));

  return (
    <DataTable
      cols={[
        { t: "Маҳсулот" },
        { t: `Қиймати, ${VALUE_UNIT}`, num: true },
        { t: "Улуши", num: true },
        { t: "Ҳажми", num: true },
      ]}
      rows={rows}
      caption={`${s.period.label} даври бўйича маҳсулотлар кесими`}
      emptyText="Бу даврда биронта маҳсулот бўйича қиймат кўрсатилмаган."
    />
  );
}

/* -------------------------------------------------------------------------- */
/* панел                                                                      */
/* -------------------------------------------------------------------------- */

export function ExportTargetsPanel() {
  const q = useQuery("export-targets", (s) => getExportTargets(s));
  return (
    <Loader
      q={q}
      height={360}
      notAvailableWhat="/export-targets/dashboard"
      isEmpty={(d) => d.periods.length === 0 || d.products.length === 0}
      emptyTitle="Экспорт кўрсаткичлари юкланмаган"
      emptyText="Манба файли ҳали импорт қилинмаган — жадвал бўш."
    >
      {(data) => <ExportTargetsBody data={data} />}
    </Loader>
  );
}

function ExportTargetsBody({ data }: { data: ExportTargetsDashboard }) {
  const pal = usePalette();
  const v = useMemo(() => exportTargetsView(data), [data]);
  const [metric, setMetric] = useState<ExportMetric>("value");

  // Танланган давр манзилнинг иккинчи сегментида — аниқ йилга ҳавола бериш
  // учун. Мавжуд бўлмаган калит (эскирган ҳавола) панелни йиқитмайди:
  // қуйидаги эффект уни жимгина тозалайди, экранда эса мақсад йили қолади.
  const [sub, goSub] = useHashSub("exporttargets");
  const fallbackKey = v.goal?.key ?? v.periods[0]?.key ?? "";
  const picked = sub === null ? null : exportSlice(v, sub);
  const slice = picked ?? exportSlice(v, fallbackKey);

  useEffect(() => {
    if (sub !== null && picked === null) goSub(null, true);
  }, [sub, picked, goSub]);

  const matrix = useMemo(() => exportMatrix(v, metric), [v, metric]);

  // Жамиси кўрсатилмаган давр диаграммага тушмайди: `null` ни нолга
  // айлантириш «шу йили экспорт бўлмаган» деган ёлғон хулоса берарди.
  const periodRows: BarRow[] = v.periods
    .filter((p) => p.total !== null)
    .map((p) => ({
      label: p.note ? `${p.label} · ${p.note}` : p.label,
      v: p.total as number,
      color: pal[p.token],
      extra: ["Маҳсулотлар", `${p.filled} / ${v.products.length} та`] as [string, string],
    }));
  const periodsHidden = v.periods.length - periodRows.length;

  if (slice === null) {
    return <EmptyState title="Даврлар рўйхати бўш" />;
  }

  const sliceRows: BarRow[] = slice.rows.map((r) => ({
    label: r.name,
    v: r.value as number,
    color: pal[slice.period.token],
    extra: ["Улуш", pctTxt(r.share)] as [string, string],
  }));

  const periodOptions: SegmentOption<string>[] = v.periods.map((p) => ({
    id: p.key,
    label: p.short,
    hint: p.note
      ? `${p.label} — ${p.note}. Қисман давр: тўлиқ йиллар билан тўғридан-тўғри солиштирилмайди.`
      : p.label,
  }));

  /* --- тўлиқ жадвал устунлари ----------------------------------------- */
  const matrixCols: Col[] = [
    { t: "Маҳсулот" },
    ...(metric === "volume" ? [{ t: "Ўлчов бирлиги" }] : []),
    ...v.periods.map((p) => ({ t: p.head, num: true })),
  ];

  const matrixRows: Row[] = matrix.rows.map((r) => ({
    key: String(r.rowNo),
    cells: [
      r.name,
      ...(metric === "volume" ? [r.unit ?? <Dash />] : []),
      ...r.values.map((x) => (x === null ? <Dash /> : exact(x))),
    ],
  }));

  // ЖАМИ қатори — фақат қиймат кўринишида ва фақат бэкенд ҳисоблаган
  // сонлардан. У маҳсулот эмас: рўйхатга, улушларга ва рейтингга кирмайди,
  // шунинг учун бу ерда ҳам «ҳисобланган» деб очиқ белгиланади.
  if (matrix.totals) {
    matrixRows.push({
      key: "__total",
      cells: [
        <b key="t" className="[font-weight:650]">
          ЖАМИ (ҳисобланган)
        </b>,
        ...matrix.totals.map((x) =>
          x === null ? (
            <Dash />
          ) : (
            <b className="[font-weight:650]">{exact(x)}</b>
          ),
        ),
      ],
    });
  }

  return (
    <>
      {/* --- 1. плиткалар --------------------------------------------------- */}
      <Section title="Экспортнинг мақсадли кўрсаткичлари" note={`манба: ${v.source}`}>
        <p className="mb-3 max-w-[110ch] text-[12.5px] leading-[1.5] text-ink-2">{v.title}</p>

        {v.gaps.length > 0 && (
          <Banner tone="warn">
            {v.gaps.length} та даврда ҳисобланган жами манбадаги «ЖАМИ» қаторидан фарқ қилади.
            Фарқ тузатилмаган — иккала сон ҳам пастда, «Манба билан солиштириш» бўлимида
            кўрсатилган (<b>манбада шундай</b>).
          </Banner>
        )}

        <div className={GRID.g3}>
          <StatTile
            label={v.goal ? `${v.goal.year} йил мақсади` : "Мақсадли кўрсаткич"}
            value={exact(v.goal?.total ?? null)}
            unit={VALUE_UNIT}
            stripe={`var(--${KIND_TOKEN.forecast})`}
            foot={
              v.goal && (
                <>
                  <Pill>{KIND_LABEL.forecast}</Pill>
                  <Pill>
                    {v.goal.filled} / {v.products.length} маҳсулот
                  </Pill>
                </>
              )
            }
          />
          <StatTile
            label={v.latestActual ? `${v.latestActual.year} йил, амалда` : "Амалдаги ҳолат"}
            value={exact(v.latestActual?.total ?? null)}
            unit={VALUE_UNIT}
            stripe={`var(--${KIND_TOKEN.actual})`}
            foot={
              v.latestActual && (
                <>
                  {/* Изоҳ («Январь-Август») плиткадан тушиб қолмайди: усиз бу
                      сон тўлиқ йил деб ўқиларди. */}
                  <Pill status={v.latestActual.note ? "warn" : "mute"}>
                    {v.latestActual.note ?? "тўлиқ йил"}
                  </Pill>
                  <Pill>
                    {v.latestActual.filled} / {v.products.length} маҳсулот
                  </Pill>
                </>
              )
            }
          />
          <StatTile
            label="Маҳсулотлар"
            value={nf(v.products.length)}
            unit="та"
            stripe="var(--s2)"
            foot={
              <>
                <Pill>{v.units.length} хил ўлчов бирлиги</Pill>
                <Pill status={v.cells.filled < v.cells.total ? "warn" : "mute"}>
                  {v.cells.filled} / {v.cells.total} катак тўлган
                </Pill>
              </>
            }
          />
        </div>
      </Section>

      {/* --- 2. қиймат динамикаси ------------------------------------------- */}
      <Section title="Қиймат динамикаси" note={`${v.periods.length} давр`}>
        <div className={v.dualYears.length > 0 ? GRID.g32 : undefined}>
          <Card
            title="Даврлар бўйича жами экспорт қиймати"
            sub={VALUE_UNIT}
            note={
              <>
                Даврлар устун билан чизилган, чизиқ билан эмас: рўйхатда бир хил йилнинг ҳам
                амалдаги, ҳам прогноз ёзуви бор ва улар орасида «ўсиш» деган нарса йўқ.
                {periodsHidden > 0 &&
                  ` ${periodsHidden} та даврда жами кўрсатилмагани учун диаграммада йўқ.`}
              </>
            }
          >
            <ChartLegend
              items={[
                { name: "Амалда", color: `var(--${KIND_TOKEN.actual})` },
                { name: "Прогноз", color: `var(--${KIND_TOKEN.forecast})` },
              ]}
            />
            <BarsH
              rows={periodRows}
              vName={`Қиймати, ${VALUE_UNIT}`}
              padR={112}
              ariaLabel="Экспорт қийматининг даврлар бўйича тақсимоти"
            />
          </Card>

          {v.dualYears.map((d) => (
            <DualYearCard key={d.year} d={d} />
          ))}
        </div>
      </Section>

      {/* --- 3. маҳсулотлар кесими ------------------------------------------ */}
      <Section title="Маҳсулотлар кесими">
        <div className="mb-3 flex flex-wrap items-start gap-2.5">
          <span className={LBL + " pt-2"}>Давр</span>
          <SegmentSwitch
            label="Давр бўйича кесим"
            options={periodOptions}
            value={slice.period.key}
            onChange={(key) => goSub(key, true)}
          />
        </div>

        <div className={GRID.g23}>
          <Card
            title="Маҳсулотлар бўйича қиймат"
            sub={VALUE_UNIT}
            note={
              slice.missing.length > 0
                ? `${slice.missing.length} та маҳсулот диаграммада йўқ: манбада бу давр учун қиймат кўрсатилмаган (нол эмас).`
                : undefined
            }
          >
            {sliceRows.length === 0 ? (
              <EmptyState
                title="Бу давр учун қиймат кўрсатилмаган"
                text="Манбада ушбу давр устуни тўлдирилмаган."
              />
            ) : (
              <BarsH
                rows={sliceRows}
                vName={`Қиймати, ${VALUE_UNIT}`}
                padR={96}
                ariaLabel={`${slice.period.label} даврида экспорт қийматининг маҳсулотлар бўйича тақсимоти`}
              />
            )}

            {slice.missing.length > 0 && (
              <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
                Қиймати кўрсатилмаганлар:{" "}
                <b className="font-semibold text-ink-2">
                  {slice.missing.map((m) => m.name).join(", ")}
                </b>
                .
              </p>
            )}
          </Card>

          <Card
            title={slice.period.label}
            sub={slice.period.note ?? undefined}
            note="Улуш шу даврнинг ҳисобланган жамисига нисбатан. Ҳажм ҳар бир маҳсулотнинг ўз бирлигида — устун бўйлаб қўшилмайди."
          >
            <SliceTable s={slice} />
          </Card>
        </div>
      </Section>

      {/* --- 4. тўлиқ жадвал ------------------------------------------------- */}
      <Section
        title="Тўлиқ жадвал"
        note={`${v.products.length} маҳсулот × ${v.periods.length} давр`}
      >
        <div className="mb-3 flex flex-wrap items-start gap-2.5">
          <span className={LBL + " pt-2"}>Кўрсаткич</span>
          <SegmentSwitch
            label="Кўрсаткич тури"
            options={METRICS}
            value={metric}
            onChange={setMetric}
          />
        </div>

        <Card
          title={metric === "value" ? `Қиймати, ${VALUE_UNIT}` : "Ҳажми, ўз бирлигида"}
          sub={`${v.cells.filled} / ${v.cells.total} катак тўлган`}
          note="Бўш катак «—» билан кўрсатилган: манбада қиймат йўқ дегани, экспорт нол дегани эмас."
        >
          <DataTable
            cols={matrixCols}
            rows={matrixRows}
            caption={
              metric === "value"
                ? "Маҳсулотлар ва даврлар бўйича экспорт қиймати"
                : "Маҳсулотлар ва даврлар бўйича экспорт ҳажми"
            }
          />
          {matrix.totalsNote && (
            <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">{matrix.totalsNote}</p>
          )}
        </Card>
      </Section>

    </>
  );
}
