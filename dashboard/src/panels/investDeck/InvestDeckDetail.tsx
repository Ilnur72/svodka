import { useMemo, type ReactNode } from "react";
import { getInvestDeckProject } from "../../api/endpoints";
import { useQuery } from "../../lib/useQuery";
import { exact } from "../../lib/format";
import { deckDetailView, type DeckDetail, type DeckProject } from "../../lib/adapters/investDeck";
import { Modal } from "../../components/Modal";
import { Loader } from "../../components/states";
import { DataTable, type Col, type Row } from "../../components/DataTable";
import { ProjectTimeline } from "../../components/ProjectTimeline";
import { Pill } from "../../components/Pill";
import { Fact, Muted, SourceDot } from "./parts";

/**
 * Битта слайднинг тафсилоти — модал ойнада.
 *
 * ═══ Нега алоҳида сўров ═════════════════════════════════════════════════
 *
 * Дашборд жавобида 92 слайднинг фақат **қисқа** шакли бор: ишлар, молия,
 * KPI ва йиллар жадваллари у ерда йўқ (улар биргаликда жавобни бир неча
 * баробар оғирлаштирарди). Очиладигани эса ҳар сафар биттаси, шунинг учун
 * тафсилот ойна очилганда сўралади. Рўйхатдаги маълумот (ном, кластер)
 * `known` орқали дарҳол берилади — шунда ойна юкланиш пайтида ҳам бўш
 * сарлавҳа билан очилмайди.
 *
 * ═══ Йўқ блок — яширилмайди, ёзилади ════════════════════════════════════
 *
 * Манба тўлиқ эмас: 88 лойиҳадан йиллар жадвали 37 тасида, IRR/NPV/ROI эса
 * 33–34 тасида бор. Бўш блок нол билан ҳам, «—» билан ҳам тўлдирилмайди:
 * блок умуман чизилмайди, унинг йўқлиги эса пастда битта қаторда очиқ
 * ёзилади (`missing`).
 */

/** Ойна ичидаги битта блок — сарлавҳаси ва ёнидаги қисқа изоҳи билан. */
function Block({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h3 className="text-[11.5px] [font-weight:650] tracking-[0.08em] text-ink-3 uppercase">
          {title}
        </h3>
        {sub && <span className="text-[11.5px] text-ink-3">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** Юқоридаги тўртта кўрсаткич: жами қиймат ва самарадорлик ўлчовлари. */
function Facts({ p }: { p: DeckProject }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-[6px] border border-hair bg-surface-2 px-3.5 py-3 mid:grid-cols-4">
      <Fact
        label="Жами қиймати"
        value={p.finance === null ? null : exact(p.finance)}
        unit="млн $"
      />
      {/* IRR/NPV/ROI — манбадаги матн кўринишида: у ерда «%» ва «йил» ёзуви
          ўз жойида турибди, сон эса қайта форматланмайди. */}
      <Fact label="IRR — ички фойда нормаси" value={p.irrText} />
      <Fact label="NPV — соф жорий қиймат" value={p.npvText} />
      <Fact label="ROI — қопланиш муддати" value={p.roiText} />
    </div>
  );
}

/** Молия жадвали: манба қаторлари ва иккита жами. */
function Finance({ d }: { d: DeckDetail }) {
  return (
    <>
      <ul className="flex flex-col">
        {d.finance.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-grid py-[7px] text-[12.5px] first:border-t-0"
          >
            <SourceDot color={f.color} />
            <span className="min-w-0 flex-1 break-words text-ink-2">{f.label}</span>
            <span className="flex-none font-mono tabular-nums">
              {f.text ?? <Muted>кўрсатилмаган</Muted>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[6px] border border-hair bg-surface-2 px-3 py-2 text-[12.5px]">
        <span className="min-w-0 flex-1 [font-weight:650]">Манбалар йиғиндиси</span>
        <span className="flex-none font-mono tabular-nums [font-weight:650]">
          {d.financeSum === null ? <Muted /> : exact(d.financeSum)}
          <span className="ml-1 font-sans text-[11px] font-normal text-ink-3">млн $</span>
        </span>
      </div>

      {/* Слайддаги «Жами:» қатори манба қаторларининг йиғиндиси билан ҳар
          доим ҳам тенг эмас. Бу манбадаги ҳақиқий фарқ — тузатилмайди ва
          яширилмайди, иккала сон ҳам ёнма-ён кўрсатилади. */}
      {d.financeGap !== null && (
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
          Слайддаги «Жами:» —{" "}
          <b className="font-mono font-semibold text-ink-2">{exact(d.project.finance)}</b> млн $,
          фарқ <b className="font-mono font-semibold text-ink-2">{exact(d.financeGap)}</b> млн $
          (манбада шундай).
        </p>
      )}
    </>
  );
}

/** «Йиллар» жадвали — узун шаклдан бурилган ҳолда. */
function Years({ d }: { d: DeckDetail }) {
  const t = d.years;
  if (!t) return null;

  const cols: Col[] = [
    { t: "Кўрсаткич", wrap: true },
    ...t.years.map((y) => ({ t: y, num: true })),
  ];
  const rows: Row[] = t.rows.map((r) => ({
    key: r.metric,
    cells: [
      r.metric,
      // Бўш катак манбада йўқ эди — нолга айлантирилмайди.
      ...r.cells.map((c, i) =>
        c === null ? (
          <span key={t.years[i]} className="text-ink-3">
            —
          </span>
        ) : (
          c.text
        ),
      ),
    ],
  }));

  return <DataTable cols={cols} rows={rows} caption="Йиллар бўйича кўрсаткичлар" />;
}

export interface InvestDeckDetailProps {
  slideNo: number;
  /** Рўйхатдан маълум бўлган қисқа маълумот — юкланиш пайтидаги сарлавҳа учун. */
  known: DeckProject | null;
  onOpen: (slideNo: number) => void;
  onClose: () => void;
}

export function InvestDeckDetail({ slideNo, known, onOpen, onClose }: InvestDeckDetailProps) {
  const q = useQuery(`invest-deck-${slideNo}`, (s) => getInvestDeckProject(slideNo, s));
  const d = useMemo(() => (q.data ? deckDetailView(q.data) : null), [q.data]);

  const p = d?.project ?? known;
  const title = p?.title ?? `${slideNo}-слайд`;

  const navBtn =
    "cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-45";

  // «Олдинги/кейинги» — бэкенд берган энг яқин МАВЖУД слайд рақами
  // (тақдимотда бўшлиқлар бор, шунинг учун `slideNo ± 1` тўғри бўлмасди).
  const goPrev = () => {
    if (d && d.prev !== null) onOpen(d.prev);
  };
  const goNext = () => {
    if (d && d.next !== null) onOpen(d.next);
  };

  return (
    <Modal
      width="lg"
      title={title}
      sub={
        <>
          {p?.clusterLabel ?? "—"} · {slideNo}-слайд
          {p?.isBranchTotal && " · филиал бўйича йиғма"}
        </>
      }
      onClose={onClose}
      foot={
        <>
          <button type="button" className={navBtn} disabled={!d || d.prev === null} onClick={goPrev}>
            ← Олдинги
          </button>
          <button type="button" className={navBtn} disabled={!d || d.next === null} onClick={goNext}>
            Кейинги →
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[13px] py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink"
          >
            Ёпиш
          </button>
        </>
      }
    >
      {/* Филиал йиғмаси лойиҳа эмас — бу ҳар қандай сондан олдин айтилади,
          акс ҳолда ўқувчи уни 89-лойиҳа деб қабул қиларди. */}
      {p?.isBranchTotal && (
        <div className="mb-3 rounded-[6px] border border-hair bg-surface-2 px-3 py-2 text-[12px] leading-[1.5] text-ink-2">
          Бу — алоҳида лойиҳа эмас, <b className="font-semibold text-ink">{p.branch}</b> филиали
          бўйича <b className="font-semibold text-ink">йиғма</b> слайд: ундаги сонлар шу
          филиалдаги лойиҳаларнинг суммаси. Шунинг учун у жами лойиҳалар сонига ва умумий
          инвестиция ҳажмига қўшилмайди.
        </div>
      )}

      <Loader q={q} height={280} notAvailableWhat={`/invest-deck/${slideNo}`}>
        {() =>
          d && (
            <>
              <Facts p={d.project} />

              {d.project.financeText && (
                <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
                  Манбада: {d.project.financeText}
                </p>
              )}

              {d.kpis.length > 0 && (
                <Block title="Кутилаётган натижа" sub={`${d.kpis.length} кўрсаткич`}>
                  <div className="grid grid-cols-1 gap-2 mid:grid-cols-2">
                    {d.kpis.map((k) => (
                      <div
                        key={k.id}
                        className="flex gap-2.5 rounded-[6px] border border-hair bg-surface-2 px-3 py-2"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-s1 font-mono text-[10.5px] font-bold text-white"
                        >
                          {k.no}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[12px] leading-[1.4] text-ink-2">{k.label}</div>
                          <div className="mt-0.5 font-mono text-[13px] [font-weight:640] tabular-nums break-words">
                            {k.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              {d.works.length > 0 && (
                <Block title="Бажариладиган ишлар" sub={`${d.works.length} та`}>
                  {/* Муддат — вақт белгиси, иш матни — қатор мазмуни: мавжуд
                      вақт чизиғи компоненти айнан шу жуфтликни кутади. Муддати
                      кўрсатилмаган иш ҳам чизиқда қолади, шунчаки белгисиз. */}
                  <ProjectTimeline
                    items={d.works.map((w) => ({ marker: w.term, text: w.task }))}
                    tone="plan"
                  />
                </Block>
              )}

              {d.finance.length > 0 && (
                <Block title="Молиялаштириш манбаи" sub={`${d.finance.length} қатор`}>
                  <Finance d={d} />
                </Block>
              )}

              {d.years && (
                <Block
                  title="Йиллар бўйича"
                  sub={`${d.years.rows.length} кўрсаткич · ${d.years.years.length} устун`}
                >
                  <Years d={d} />
                </Block>
              )}

              {d.missing.length > 0 && (
                <p className="mt-4 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
                  Манба слайдида йўқ: {d.missing.join(", ")}.
                </p>
              )}

              {/* Кўрсаткичлар бўш бўлса ҳам, слайднинг ўзи бор — буни айтиб
                  қўйиш керак, акс ҳолда ойна «юкланмади» деб ўқиларди. */}
              {d.missing.length === 4 && (
                <div className="mt-2">
                  <Pill status="warn">бу слайдда жадваллар умуман йўқ</Pill>
                </div>
              )}
            </>
          )
        }
      </Loader>
    </Modal>
  );
}
