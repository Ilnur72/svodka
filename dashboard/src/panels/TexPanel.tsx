import { useEffect, useMemo } from "react";
import type { PanelProps } from "../types";
import { getChain } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { useHashSub } from "../lib/useHashTab";
import { monthMinus, monthOf, monthStart } from "../lib/period";
import { deltaTxt, exact, monthLabel, monthShort, pctTxt, stripeOf } from "../lib/format";
import {
  SPARK_MONTHS,
  TEX_SCHEMES,
  buildTexScheme,
  isTexSchemeId,
  type TexChipKind,
  type TexKpiVM,
  type TexParamVM,
  type TexSchemeId,
  type TexSchemeVM,
  type TexValueVM,
} from "../lib/adapters/texShema";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Pill } from "../components/Pill";
import { Sparkline } from "../components/Sparkline";
import { StatTile } from "../components/StatTile";
import { SegmentSwitch, type SegmentOption } from "../components/SegmentSwitch";
import { Loader } from "../components/states";
import {
  BandLegend,
  Chem,
  ChipLegend,
  ChipRow,
  TexBandView,
  TexFlow,
  noValueText,
} from "./tex/TexFlow";
import { TexIcon } from "./tex/icons";

/**
 * «Технологик жараён» — заводнинг тўртта технологик схемаси, ускуна
 * расмлари ва ҳар бир босқичга бириктирилган **ҳақиқий** ўлчов билан.
 *
 * ⚠️ «Умумий кўрсаткичлар» ичидаги «Цехлар занжири» билан адашмасин:
 * у бутун комбинатнинг йиғма занжир **харитаси** (тугун ва боғланиш
 * аниқлиги), бу эса цех-ма-цех **жараён схемаси** — презентациядаги
 * босқичлар, реагентлар ва шароитлар. Иккови бир хил `/chain` сўровига
 * таянади, лекин бошқа саволга жавоб беради.
 *
 * Схема тузилмаси қотирилган (манба — `svodka/Баланс (2).pptx`), қиймат эса
 * доим API'дан. Босқичларнинг учдан икки қисмида ўлчов **йўқ** — уларга сон
 * ўйлаб топилмайди: улар жараён босқичи сифатида, номи ва шароити билан
 * чизилади.
 *
 * ═══ Экран тузилиши ══════════════════════════════════════════════════════
 *
 *   1. Юқорида — схема номи, тавсифи ва KPI плиткалари қатори;
 *   2. ўртада — «Технологик жараён»: босқичлар рангли тасмаларга гуруҳланган;
 *   3. пастда — «Асосий параметрлар», «Энергоресурслар», «Йўқотиш ва
 *      чиқинди», «Маҳсулот».
 *
 * Ҳар бир схемада шу блокларнинг фақат **маълумоти бор**лари чизилади:
 * 1-схемада энергоресурс, 3-схемада энергоресурс ва йўқотиш ўлчови йўқ —
 * улар бўш карточка бўлиб турмайди, умуман чизилмайди. Худди шундай
 * макетдаги «Содержание WO₃ 44,7%» ва «Соответствует стандарту» плиткалари
 * ҳам йўқ: базада таркиб (grade) ва сифат белгиси умуман сақланмайди,
 * уларни ўйлаб топиб бўлмайди.
 *
 * Схема танлови хэшнинг иккинчи сегментида (`#tex/c4`) — ҳаволани бериш ва
 * браузернинг «орқага» тугмаси ишлаши учун.
 */

const OPTIONS: readonly SegmentOption<TexSchemeId>[] = TEX_SCHEMES.map((s) => ({
  id: s.id,
  label: s.label,
  hint: s.hint,
}));

/** Схемада ҳақиқатан учрайдиган ёзув турлари — фақат шулар легендага чиқади. */
function usedChipKinds(vm: TexSchemeVM): TexChipKind[] {
  const seen = new Set<TexChipKind>();
  for (const band of vm.bands) {
    for (const s of band.stages) for (const c of [...s.conds, ...s.marks]) seen.add(c.kind);
  }
  for (const lane of vm.branches) {
    for (const s of lane.stages) for (const c of [...s.conds, ...s.marks]) seen.add(c.kind);
  }
  for (const c of vm.resources) seen.add(c.kind);
  return (["reagent", "flow", "cond", "waste", "control"] as const).filter((k) =>
    seen.has(k),
  );
}

export function TexPanel({ period, months }: PanelProps) {
  const [sub, goSub] = useHashSub("tex");
  const scheme: TexSchemeId = isTexSchemeId(sub) ? sub : "ing";

  // Номаълум схема идентификатори манзил қаторида ёлғон гапириб турмасин.
  useEffect(() => {
    if (sub !== null && !isTexSchemeId(sub)) goSub(null, true);
  }, [sub, goSub]);

  // Кўрсатиладиган ой — даврнинг охиргиси, бошқа панеллардаги каби.
  const month = months.length > 0 ? months[months.length - 1] : monthOf(period.to);

  // Сўров даври спарклайн учун орқага кенгайтирилади (`ObzorPanel` даги
  // тренд билан бир хил усул). Экрандаги **қиймат** барибир фақат `month` га
  // тегишли — кенгайтирилган ойлар ҳеч қаерда қўшилмайди, улар фақат
  // «сўнгги 6 ой» чизиғида кўринади.
  const from = useMemo(() => {
    const wide = monthStart(monthMinus(month, SPARK_MONTHS - 1));
    return wide < period.from ? wide : period.from;
  }, [month, period.from]);

  const q = useQuery(`chain_tex_${from}_${period.to}`, (s) =>
    getChain({ from, to: period.to }, s),
  );

  return (
    <>
      <div className="mb-4">
        <SegmentSwitch<TexSchemeId>
          label="Технологик жараён схемаси"
          options={OPTIONS}
          value={scheme}
          onChange={(id) => goSub(id)}
        />
      </div>

      <Loader q={q} height={420} notAvailableWhat="/chain">
        {(res) => <TexSchemeView vm={buildTexScheme(res, scheme, month)} month={month} />}
      </Loader>
    </>
  );
}

function TexSchemeView({ vm, month }: { vm: TexSchemeVM; month: string }) {
  const kinds = useMemo(() => usedChipKinds(vm), [vm]);
  const hasBottom =
    vm.params.length > 0 ||
    vm.energy.length > 0 ||
    vm.losses.length > 0 ||
    vm.products.length > 0;

  return (
    <>
      <Hero vm={vm} month={month} />

      <Section title="Технологик жараён">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <ChipLegend kinds={kinds} />
          <BandLegend bands={vm.bands} />
        </div>

        <div className="flex flex-col gap-3">
          {vm.bands.map((b) => (
            <TexBandView key={b.key} band={b} />
          ))}
        </div>

        {vm.resources.length > 0 && (
          <div className="mt-3">
            <Card
              title="Схема реагентлари ва ресурслари"
              note="Слайдда уларнинг қайси босқичга тегишли экани кўрсатилмаган — шунинг учун схема даражасидаги рўйхат бўлиб қолди."
            >
              <ChipRow chips={vm.resources} />
            </Card>
          </div>
        )}
      </Section>

      {vm.branches.map((lane) => (
        <Section key={lane.key} title={lane.title ?? "Ён тармоқ"}>
          <div className="wide:max-w-[720px]">
            <TexFlow stages={lane.stages} />
          </div>
        </Section>
      ))}

      {hasBottom && (
        <Section title="Кўрсаткичлар">
          <div className={GRID.g2}>
            {vm.params.length > 0 && <ParamsCard params={vm.params} />}
            {vm.energy.length > 0 && (
              <MetricCard
                title="Энергоресурслар"
                note="Ҳар бир ресурс алоҳида — бирликлари ҳар хил, битта шкалага қўйилмайди."
                values={vm.energy}
                months={vm.sparkMonths}
                token="var(--s1)"
              />
            )}
            {vm.losses.length > 0 && (
              <MetricCard
                title="Йўқотиш ва чиқинди"
                note="Режа берилмаган кўрсаткичлар — фоиз ҳисобланмайди."
                values={vm.losses}
                months={vm.sparkMonths}
                token="var(--s2)"
              />
            )}
            {vm.products.length > 0 && (
              <ProductCard values={vm.products} months={vm.sparkMonths} />
            )}
          </div>
        </Section>
      )}

      {vm.equipment.length > 0 && (
        <Section title="Схемадаги бошқа ускуна">
          <div className={GRID.g2}>
            {vm.equipment.map((e) => (
              <Card key={e.title} title={e.title} note={e.note}>
                <img
                  src={e.src}
                  alt={e.alt}
                  loading="lazy"
                  width={128}
                  height={88}
                  className="h-[88px] w-32 rounded-[5px] border border-hair bg-surface-2 object-contain"
                />
              </Card>
            ))}
          </div>
        </Section>
      )}

      {vm.extras.length > 0 && (
        <Section
          title={vm.extrasTitle}
          note="Схемада алоҳида қути йўқ, лекин шу жараёнга тегишли ўлчовлар"
        >
          {/* Бирликлар ҳар хил (т, ч, кВт·ч) — шунинг учун алоҳида
              карточкаларда, битта диаграмма шкаласида эмас. */}
          <div className={GRID.g3}>
            {vm.extras.map((v) => (
              <ExtraTile key={v.key} v={v} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* юқоридаги карточка                                                         */
/* -------------------------------------------------------------------------- */

function Hero({ vm, month }: { vm: TexSchemeVM; month: string }) {
  return (
    <Card className="mb-4" stripe="var(--s1)">
      <div className="flex flex-col gap-4 wide:flex-row wide:items-start">
        <div className="min-w-0 wide:w-[300px] wide:flex-none">
          <div className="flex items-start gap-2.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[8px] border border-s1/40 bg-[color-mix(in_srgb,var(--s1)_12%,transparent)] text-s1">
              <TexIcon id={vm.icon} size={22} className="text-s1" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[19px] leading-[1.2] [font-weight:650]">{vm.label}</h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                {vm.plant} · {monthLabel(month)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-[1.5] text-ink-2">{vm.desc}</p>
          <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-3">
            Схема манбаи — «Баланс (2).pptx». Босқич номлари, реагентлар ва шароитлар
            слайддагидек рус тилида қолдирилган.
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className={GRID.g4}>
            {vm.kpis.map((k) => (
              <KpiTile key={k.key} k={k} months={vm.sparkMonths} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function KpiTile({ k, months }: { k: TexKpiVM; months: string[] }) {
  const v = k.value;
  return (
    <div className="min-w-0 rounded-card border border-hair bg-surface-2 px-3 pt-2.5 pb-3">
      <div className="flex items-center gap-1.5">
        <TexIcon id={k.icon} size={14} />
        <span className="min-w-0 truncate text-[11px] font-medium text-ink-3">
          <Chem text={k.label} />
        </span>
      </div>

      {v === null ? (
        <>
          <div className="mt-1.5 text-[21px] leading-[1.1] [font-weight:640] tracking-[-0.02em]">
            {k.text}
          </div>
          {k.note && <p className="mt-1 text-[11px] text-ink-3">{k.note}</p>}
        </>
      ) : (
        <>
          <div className="mt-1.5 text-[21px] leading-[1.1] [font-weight:640] tracking-[-0.02em]">
            {v.reported ? exact(v.fakt) : "—"}
            {v.reported && (
              <span className="ml-1 text-[11.5px] font-medium tracking-normal text-ink-3">
                {v.unit}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-2">
            {v.reported ? (
              <>
                {v.pct !== null && <Pill status={v.status}>{pctTxt(v.pct)}</Pill>}
                {v.prevFakt !== null && v.fakt !== null && v.prevFakt !== 0 && (
                  <span className="text-ink-3">
                    {deltaTxt(v.prevFakt, v.fakt)} · {monthShort(prevOf(months))}
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-3">{noValueText(v)}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Спарклайн ойларининг охиргисидан бир олдингиси — «ўтган ой» ёрлиғи учун. */
const prevOf = (months: string[]): string =>
  months.length > 1 ? months[months.length - 2] : (months[0] ?? "");

/* -------------------------------------------------------------------------- */
/* пастдаги карточкалар                                                       */
/* -------------------------------------------------------------------------- */

function ParamsCard({ params }: { params: TexParamVM[] }) {
  return (
    <Card
      title="Асосий параметрлар"
      note="Қиймат слайддан сўзма-сўз олинган — рус тилидаги режим ва шароитлар таржима қилинмайди."
      stripe="var(--s3)"
    >
      <ul className="flex flex-col gap-1.5">
        {params.map((p) => (
          <li
            key={p.key}
            className="flex items-start gap-2 rounded-[6px] border border-hair bg-surface-2 px-2.5 py-1.5"
          >
            <span className="mt-[2px]">
              <TexIcon id={p.icon} size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] text-ink-3">
                <Chem text={p.label} />
              </span>
              <span className="block text-[12px] leading-[1.4] [font-weight:600]">
                <Chem text={p.value} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MetricCard({
  title,
  note,
  values,
  months,
  token,
}: {
  title: string;
  note: string;
  values: TexValueVM[];
  months: string[];
  token: string;
}) {
  return (
    <Card title={title} note={note} stripe={token}>
      <ul className="flex flex-col gap-2">
        {values.map((v) => (
          <li
            key={v.key}
            className="rounded-[6px] border border-hair bg-surface-2 px-2.5 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 text-[11.5px] text-ink-3">
                <Chem text={v.label} />
              </span>
              {/* Ўзгариш ранги нейтрал: сарф камайиши «яхши», чиқинди
                  камайиши ҳам «яхши» эмас — бу ерда ҳолат баҳоси йўқ. */}
              {v.reported && v.prevFakt !== null && v.prevFakt !== 0 && v.fakt !== null && (
                <Pill>{deltaTxt(v.prevFakt, v.fakt)}</Pill>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
              <span className="text-[19px] leading-[1.1] [font-weight:640] tracking-[-0.02em]">
                {v.reported ? exact(v.fakt) : "—"}
                {v.reported && (
                  <span className="ml-1 text-[11px] font-medium tracking-normal text-ink-3">
                    {v.unit}
                  </span>
                )}
              </span>
              <Sparkline
                values={v.spark}
                color={token}
                label={`${v.label} — сўнгги ${months.length} ой`}
              />
            </div>
            {!v.reported && (
              <p className="mt-1 text-[11px] text-ink-3">{noValueText(v)}</p>
            )}
            <p className="mt-1 text-[10.5px] leading-[1.35] text-ink-3">
              {v.site} · {v.output}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProductCard({ values, months }: { values: TexValueVM[]; months: string[] }) {
  return (
    <Card
      title="Маҳсулот"
      note="Чиқарилган ҳажм ва унинг режага нисбати. Режаси йўқ позиция прогресс чизиғига тушмайди — нолга бўлиш чиқарди."
      stripe="var(--s1)"
    >
      <ul className="flex flex-col gap-2">
        {values.map((v) => {
          const bar = v.reported && v.plan !== null && v.plan > 0 && v.pct !== null;
          return (
            <li
              key={v.key}
              className="rounded-[6px] border border-hair bg-surface-2 px-2.5 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-[11.5px] text-ink-3">
                  <Chem text={v.label} />
                </span>
                {v.reported && v.pct !== null && (
                  <Pill status={v.status}>{pctTxt(v.pct)}</Pill>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
                <span className="text-[19px] leading-[1.1] [font-weight:640] tracking-[-0.02em]">
                  {v.reported ? exact(v.fakt) : "—"}
                  {v.reported && (
                    <span className="ml-1 text-[11px] font-medium tracking-normal text-ink-3">
                      {v.unit}
                    </span>
                  )}
                </span>
                <Sparkline
                  values={v.spark}
                  color="var(--s1)"
                  label={`${v.label} — сўнгги ${months.length} ой`}
                />
              </div>

              {bar ? (
                <>
                  <div
                    className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full bg-sunken"
                    role="img"
                    aria-label={`Режа бажарилиши ${pctTxt(v.pct)}`}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(v.pct ?? 0, 100)}%`,
                        background: stripeOf(v.pct),
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-ink-3">
                    Режа {exact(v.plan)} {v.unit}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[11px] text-ink-3">
                  {v.reported ? "Режа берилмаган" : noValueText(v)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ExtraTile({ v }: { v: TexValueVM }) {
  return (
    <StatTile
      label={v.label}
      value={v.reported ? exact(v.fakt) : "—"}
      unit={v.reported ? v.unit : undefined}
      stripe={v.reported ? stripeOf(v.pct) : "var(--rule)"}
      foot={
        v.reported ? (
          <>
            {v.pct !== null && <Pill status={v.status}>{pctTxt(v.pct)}</Pill>}
            {v.plan !== null && <span>Режа {exact(v.plan)}</span>}
            <span className="text-ink-3">
              {v.site} · {v.output}
            </span>
          </>
        ) : (
          <span className="text-ink-3">{noValueText(v)}</span>
        )
      }
    />
  );
}
