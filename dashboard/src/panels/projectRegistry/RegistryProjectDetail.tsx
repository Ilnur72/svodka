import { useMemo, type ReactNode } from "react";
import { exact, nf } from "../../lib/format";
import { regDetail, type RegProject } from "../../lib/adapters/projectRegistry";
import { Modal } from "../../components/Modal";
import { Pill } from "../../components/Pill";
import { ClusterChip, Fact, Muted, Num, SourceDot } from "./parts";

/**
 * Битта лойиҳанинг тафсилоти — модал ойнада.
 *
 * ═══ Нега иккинчи сўров йўқ ═════════════════════════════════════════════
 *
 * `invest-deck` дан фарқли ўлароқ, дашборд жавобида лойиҳа **тўлиқ** келади
 * (138 майдон, болалар жадваллари умуман йўқ — реестр битта варақ). Шунинг
 * учун `GET /project-registry/:id` чақирилмайди: у айнан шу маълумотни
 * иккинчи марта тортиб олган бўларди. «Олдинги/кейинги» ҳам рўйхатнинг ўз
 * тартибидан ҳисобланади (бэкенддаги `neighbors` айнан шу тартибда).
 *
 * ═══ Бўш блок — яширилмайди, ёзилади ════════════════════════════════════
 *
 * Реестр жуда нотекис тўлдирилган: инфратузилма устунлари 0–4/144, ускуналар
 * 1/144, EPC қиймати 0/144. Биронта катаги тўлмаган блок **умуман
 * чизилмайди** (бўш жадвал маълумот бордек кўринарди), унинг йўқлиги эса
 * пастда битта қаторда очиқ ёзилади.
 */

/** Ойна ичидаги битта блок — сарлавҳаси ва тўлиқлик кўрсаткичи билан. */
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

export interface RegistryProjectDetailProps {
  p: RegProject;
  /** Бутун рўйхат — «олдинги/кейинги» шу тартибда юради. */
  all: RegProject[];
  /** Реестрда бутунлай бўш устунлар — молия қаторини белгилаш учун. */
  emptyColumns: string[];
  /**
   * Ойна ХАРИТАДАГИ нуқта рўйхатидан очилган бўлса — ўша рўйхатга қайтиш.
   *
   * ⚠️ Нега модал устига модал очилмайди: `Modal` нинг `Esc` эшитувчиси
   * `window` да, яъни икки ойна бирга турса битта `Esc` ИККОВИНИ ҳам
   * ёпарди, орқадаги эса саҳифанинг скроллини ўз ҳолига қайтариб юборарди.
   * Шунинг учун улар АЛМАШАДИ, йўл эса йўқолмайди: сарлавҳа устидаги
   * «← ортга» тугмаси (`Modal` нинг `lead` сложи) нуқта рўйхатини қайта
   * очади. Рўйхатдан ёки хаританинг «кўрсатиб бўлмайди» карточкасидан
   * очилганда бундай тугма умуман чизилмайди.
   */
  back?: { label: string; onBack: () => void };
  onOpen: (id: number) => void;
  onClose: () => void;
}

export function RegistryProjectDetail({
  p,
  all,
  emptyColumns,
  back,
  onOpen,
  onClose,
}: RegistryProjectDetailProps) {
  const d = useMemo(() => regDetail(p, all, emptyColumns), [p, all, emptyColumns]);

  const navBtn =
    "cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-45";

  return (
    <Modal
      width="lg"
      title={p.name}
      lead={
        back && (
          <button
            type="button"
            onClick={back.onBack}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border border-hair bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            {back.label}
          </button>
        )
      }
      sub={
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          {p.clusterNo && <span className="font-mono">{p.clusterNo}</span>}
          <ClusterChip p={p} />
          {p.ordinal !== null && <span>Т/р {nf(p.ordinal)}</span>}
        </span>
      }
      onClose={onClose}
      foot={
        <>
          <button
            type="button"
            className={navBtn}
            disabled={d.prev === null}
            onClick={() => d.prev !== null && onOpen(d.prev)}
          >
            ← Олдинги
          </button>
          <button
            type="button"
            className={navBtn}
            disabled={d.next === null}
            onClick={() => d.next !== null && onOpen(d.next)}
          >
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
      {/* --- юқоридаги тўртта кўрсаткич ------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 rounded-[6px] border border-hair bg-surface-2 px-3.5 py-3 mid:grid-cols-4">
        <Fact
          label="Умумий қиймати"
          value={p.totalCost === null ? null : exact(p.totalCost)}
          unit="млн $"
        />
        <Fact label="Иш ўринлари" value={p.jobs === null ? null : exact(p.jobs)} unit="та" />
        <Fact
          label="Бажарилиш даражаси"
          value={p.progressPercent === null ? null : exact(p.progressPercent)}
          unit="%"
          foot={
            p.progressRaw === null
              ? undefined
              : `манбада: ${exact(p.progressRaw)} (${p.progressScale === "share" ? "улуш" : "фоиз"})`
          }
        />
        <Fact label="Лойиҳа тури" value={p.kind} />
      </div>

      {/* Бажарилиш % манбада иккита шкалада ёзилган — кўрсатилаётган фоиз
          бэкенднинг ТАХМИНИ. Буни сон ёнида айтиб қўйиш шарт. */}
      {p.progressRaw !== null && (
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
          Манбада «Бажарилиш %» устунида шкала аралаш: баъзи қаторда улуш (0,8),
          баъзисида фоиз (82). Фоиз қиймати шу тахминдан ҳисобланган, хом қиймат{" "}
          <b className="font-mono font-semibold text-ink-2">{exact(p.progressRaw)}</b> ўзгаришсиз
          қолдирилган.
        </p>
      )}

      {/* --- молиялаштириш -------------------------------------------------- */}
      <Block
        title="Молиялаштириш манбалари"
        sub={
          d.financeSum === null ? "манбалар кўрсатилмаган" : `${exact(d.financeSum)} млн $ йиғинди`
        }
      >
        <ul className="flex flex-col">
          {d.finance.map((f) => (
            <li
              key={f.key}
              className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-grid py-[7px] text-[12.5px] first:border-t-0"
            >
              <SourceDot color={f.color} />
              <span className="min-w-0 flex-1 break-words text-ink-2">{f.label}</span>
              <span className="flex-none">
                {f.value !== null ? (
                  <Num v={f.value} unit="млн $" />
                ) : f.empty ? (
                  <Muted>реестрда бу устун бўш</Muted>
                ) : (
                  <Muted />
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[6px] border border-hair bg-surface-2 px-3 py-2 text-[12.5px]">
          <span className="min-w-0 flex-1 [font-weight:650]">Манбалар йиғиндиси</span>
          <span className="flex-none [font-weight:650]">
            <Num v={d.financeSum} unit="млн $" />
          </span>
        </div>

        {/* Эълон қилинган умумий қиймат манбалар йиғиндисига ҳар доим ҳам тенг
            эмас. Бу МАНБАДАГИ номувофиқлик — тузатилмайди ва яширилмайди. */}
        {d.financeGap !== null && (
          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
            Эълон қилинган умумий қиймат{" "}
            <b className="font-mono font-semibold text-ink-2">{exact(p.totalCost)}</b> млн $ —
            манбалар йиғиндисидан{" "}
            <b className="font-mono font-semibold text-ink-2">{exact(d.financeGap)}</b> млн $ фарқ
            қилади (манбада шундай).
          </p>
        )}
      </Block>

      {/* --- қолган блоклар -------------------------------------------------- */}
      {d.blocks.map((b) => (
        <Block key={b.key} title={b.title} sub={`${b.filled} / ${b.facts.length} тўлдирилган`}>
          <dl className="flex flex-col">
            {b.facts.map((f) => (
              <div
                key={f.k}
                className="flex flex-wrap gap-x-3.5 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px] first:border-t-0"
              >
                <dt className="w-[180px] flex-none text-ink-3">{f.k}</dt>
                <dd className="min-w-0 flex-1 break-words">
                  {f.v === null ? (
                    <Muted />
                  ) : (
                    <>
                      {f.v}
                      {f.unit && <span className="ml-1 text-[11px] text-ink-3">{f.unit}</span>}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Block>
      ))}

      {d.missing.length > 0 && (
        <p className="mt-4 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
          Реестрда бу лойиҳа учун умуман тўлдирилмаган бўлимлар: {d.missing.join(", ")}.
        </p>
      )}

      {d.blocks.length === 0 && (
        <div className="mt-2">
          <Pill status="warn">реестрда фақат ном, тур ва қиймат тўлдирилган</Pill>
        </div>
      )}

      {/* --- манба кузатуви -------------------------------------------------- */}
      <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
        Манба: {p.raw.sourceFile ?? "—"}
        {p.excelRow !== null && ` · варақдаги ${nf(p.excelRow)}-қатор`}
        {p.ordinal !== null && ` · Т/р ${nf(p.ordinal)}`}
        {". "}
        «Т/р» барқарор калит эмас: реестрга янги қатор қўшилса ундан кейинги ҳамма рақам
        сурилади, шунинг учун ҳавола база идентификатори бўйича ясалади.
      </p>
    </Modal>
  );
}
