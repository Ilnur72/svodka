import { Fragment, type ReactNode } from "react";
import {
  TEX_CHIP_COLOR,
  TEX_CHIP_LABEL,
  type TexBandVM,
  type TexChip,
  type TexChipKind,
  type TexStageVM,
  type TexValueVM,
} from "../../lib/adapters/texShema";
import { deltaTxt, exact, pctTxt } from "../../lib/format";
import { Pill } from "../../components/Pill";
import { TexIcon } from "./icons";

/**
 * Технологик схеманинг чизилиши: рангли тасма, ундаги босқич карточкалари ва
 * улар орасидаги стрелка.
 *
 * ═══ Ёзувлар қаерда чизилади ══════════════════════════════════════════════
 *
 * `lib/adapters/texShema.ts` ёзувни слайддаги `y` координатасига қараб
 * `before` (стрелка ёнида), `chips` (босқич билан бир қаторда) ва `after`
 * гуруҳларига ажратади. **Кўринишда** учови ҳам босқич карточкасининг
 * ичида туради: `before` — шу босқичга кирувчи стрелка ёнидаги ёзув, яъни
 * барибир шу босқичнинг ўқилиши. Стрелка эса тоза қолади — макетдагидек.
 * Провенанс йўқолмаган: VM'да учта майдон ўз ҳолида турибди.
 *
 * Карточка ичида ёзувлар икки қаторга бўлинади:
 *  · **шароит** (`cond`) — `Температура (80-85) °С | pH 9,0-9,5` кўринишида;
 *  · қолгани — реагент, оралиқ оқим, чиқинди, назорат нуқтаси — чип бўлиб.
 * Иккови ҳам бўш бўлса ўша жойда `—` туради: «шароит ёзилмаган» ҳам
 * маълумот, у яширилмайди.
 *
 * ═══ Ўлчов ═══════════════════════════════════════════════════════════════
 *
 * Ўлчови бор босқичда қиймат блоки ва бошқа ранг бўлади; ўлчови йўқ
 * босқичда фақат ном ва шароит қолади — «0» ёзилмайди. «Маълумот йўқ»
 * фақат битта ҳолатда чиқади: босқич ўлчанади, лекин танланган **ойда**
 * катак бўш.
 *
 * ═══ Кенглик ═════════════════════════════════════════════════════════════
 *
 * Карточкалар ёнма-ён фақат `wide` (≥1181px) да туради. Ундан торида —
 * устма-уст, стрелка пастга қарайди. Шунинг учун 760px да ҳам горизонтал
 * скролл пайдо бўлмайди: ҳеч қаерда `min-width` ёки `overflow-x` йўқ.
 */

/* -------------------------------------------------------------------------- */
/* кимёвий формула                                                            */
/* -------------------------------------------------------------------------- */

const CHEM_RE = /([_^])(\d+)/g;

/**
 * `Na_2WO_4` → Na₂WO₄, `kg/m^3` → kg/m³.
 *
 * Матннинг ўзи ўзгармайди — фақат индекс белгиси `<sub>`/`<sup>` га
 * айлантирилади. Белги қўлда қўйилган (`lib/adapters/texShema.ts`), шунинг
 * учун `СТН-1,6`, `ЦЭП-214`, `pH 9,0-9,5` каби матнлар тегилмай қолади:
 * автоматик «ҳарфдан кейинги рақам — индекс» қоидаси уларни бузарди.
 */
export function Chem({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  CHEM_RE.lastIndex = 0;
  let m = CHEM_RE.exec(text);
  while (m !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      m[1] === "_" ? (
        <sub className="text-[0.75em]">{m[2]}</sub>
      ) : (
        <sup className="text-[0.75em]">{m[2]}</sup>
      ),
    );
    last = m.index + m[0].length;
    m = CHEM_RE.exec(text);
  }
  if (last < text.length) out.push(text.slice(last));
  return (
    <>
      {out.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* ёзувлар                                                                    */
/* -------------------------------------------------------------------------- */

function ChipView({ chip }: { chip: TexChip }) {
  return (
    <span className="inline-flex max-w-full items-start gap-1.5 rounded-[5px] border border-hair bg-surface-2 px-1.5 py-[2px] text-[10.5px] leading-[1.4] text-ink-2">
      <span
        aria-hidden="true"
        className="mt-[5px] h-[5px] w-[5px] flex-none rounded-full"
        style={{ background: TEX_CHIP_COLOR[chip.kind] }}
      />
      {/* Ранг ёлғиз маъно ташимайди — тури экран ўқувчи учун матн билан. */}
      <span className="sr-only">{TEX_CHIP_LABEL[chip.kind]}: </span>
      <span className="min-w-0">
        <Chem text={chip.text} />
      </span>
    </span>
  );
}

export function ChipRow({ chips, center }: { chips: TexChip[]; center?: boolean }) {
  if (chips.length === 0) return null;
  return (
    <div className={"flex flex-wrap gap-1" + (center ? " justify-center" : "")}>
      {chips.map((c, i) => (
        <ChipView key={`${c.kind}-${i}-${c.text}`} chip={c} />
      ))}
    </div>
  );
}

export function ChipLegend({ kinds }: { kinds: TexChipKind[] }) {
  if (kinds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-[6px] w-[6px] flex-none rounded-full"
            style={{ background: TEX_CHIP_COLOR[k] }}
          />
          {TEX_CHIP_LABEL[k]}
        </span>
      ))}
    </div>
  );
}

/** Тасма ранглари легендаси — макетдаги юқори ўнг бурчакдаги рўйхат. */
export function BandLegend({ bands }: { bands: TexBandVM[] }) {
  if (bands.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
      {bands.map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-[6px] w-[6px] flex-none rounded-full"
            style={{ background: b.token }}
          />
          {b.title}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* қиймат блоки                                                               */
/* -------------------------------------------------------------------------- */

export function ValueBlock({ v }: { v: TexValueVM }) {
  const delta =
    v.prevFakt !== null && v.fakt !== null && v.prevFakt !== 0
      ? deltaTxt(v.prevFakt, v.fakt)
      : null;

  return (
    <div className="mt-2 rounded-[6px] border border-hair bg-surface-2 px-2 py-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-[11px] font-medium text-ink-2">
          <Chem text={v.label} />
        </span>
        {v.reported && <Pill status={v.status}>{pctTxt(v.pct)}</Pill>}
      </div>

      {v.reported ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[12px] tabular-nums">
          <span>
            <span className="text-ink-3">Факт </span>
            <b className="[font-weight:650]">{exact(v.fakt)}</b>
            <span className="ml-1 font-sans text-[10.5px] text-ink-3">{v.unit}</span>
          </span>
          {v.plan !== null && (
            <span className="text-ink-2">
              <span className="text-ink-3">Режа </span>
              {exact(v.plan)}
            </span>
          )}
          {delta && (
            <span className="text-ink-2">
              <span className="text-ink-3">Ўтган ойга </span>
              {delta}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-ink-3">{noValueText(v)}</p>
      )}

      {/* Сон қаердан келгани — занжирдаги манба сатри, рус тилида. */}
      <p className="mt-1 text-[10.5px] leading-[1.35] text-ink-3">
        {v.site} · {v.output}
      </p>
    </div>
  );
}

/**
 * Сон йўқлигининг **иккита** сабаби бор ва улар бир хил эмас — шунинг учун
 * бир хил матн ёзилмайди. Иккаласида ҳам 0 кўрсатилмайди.
 */
export const noValueText = (v: TexValueVM): string =>
  v.missing ? "Бу ой учун маълумот йўқ" : "Ҳисобот берилмаган";

/* -------------------------------------------------------------------------- */
/* босқич карточкаси                                                          */
/* -------------------------------------------------------------------------- */

/** Тайёр маҳсулот — схеманинг охирги қутиси, ажратиб кўрсатилади. */
const isResult = (s: TexStageVM): boolean => s.kind === "result";

export function StageCard({ stage }: { stage: TexStageVM }) {
  const measured = stage.values.length > 0;
  const result = isResult(stage);
  return (
    <article
      className={
        "flex h-full min-w-0 flex-col rounded-card border px-2.5 py-2.5 " +
        (result
          ? "border-s3 bg-[color-mix(in_srgb,var(--s3)_10%,var(--surface))] shadow-card"
          : measured
            ? "border-s1/45 bg-surface shadow-card"
            : "border-hair bg-surface")
      }
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="font-mono text-[10.5px] leading-none font-semibold tabular-nums text-ink-3"
        >
          {String(stage.no).padStart(2, "0")}
        </span>
        <TexIcon
          id={stage.icon}
          size={15}
          className={result ? "text-s3" : measured ? "text-s1" : "text-ink-3"}
        />
        {result && (
          <span className="ml-auto rounded-full border border-s3/50 px-1.5 py-[1px] text-[9.5px] font-semibold tracking-[0.06em] text-ink-2 uppercase">
            Тайёр маҳсулот
          </span>
        )}
      </div>

      <h4 className="mt-1.5 min-w-0 text-[12.5px] leading-[1.35] [font-weight:650]">
        <Chem text={stage.title} />
      </h4>

      {stage.image && (
        <img
          src={stage.image.src}
          alt={stage.image.alt}
          loading="lazy"
          width={220}
          height={72}
          className="mt-2 h-[72px] w-full rounded-[5px] border border-hair bg-surface-2 object-contain"
        />
      )}

      {/* Шароит ва ёзувлар. Иккови ҳам бўш бўлса битта `—` қолади: иккита
          чизиқча «иккита нарса етишмаяпти» деб ўқилар эди. */}
      {stage.conds.length === 0 && stage.marks.length === 0 ? (
        <p className="mt-1.5 text-[10.5px] leading-[1.45] text-ink-3">
          <span aria-hidden="true">—</span>
          <span className="sr-only">Шароит ва реагент ёзуви кўрсатилмаган</span>
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-[10.5px] leading-[1.45] text-ink-3">
            {stage.conds.length > 0 ? (
              stage.conds.map((c, i) => (
                <Fragment key={`${i}-${c.text}`}>
                  {i > 0 && <span aria-hidden="true"> | </span>}
                  <Chem text={c.text} />
                </Fragment>
              ))
            ) : (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">Шароит кўрсатилмаган</span>
              </>
            )}
          </p>
          <div className="mt-1.5">
            {stage.marks.length > 0 ? (
              <ChipRow chips={stage.marks} />
            ) : (
              <>
                <span aria-hidden="true" className="text-[10.5px] text-ink-3">
                  —
                </span>
                <span className="sr-only">Реагент ёки оқим ёзуви йўқ</span>
              </>
            )}
          </div>
        </>
      )}

      {stage.note && (
        <p className="mt-1.5 text-[10.5px] leading-[1.45] text-ink-3">{stage.note}</p>
      )}

      {stage.details.map((d) => (
        <details key={d.title} className="mt-1.5">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[5px] border border-hair bg-surface-2 px-1.5 py-[2px] text-[10.5px] font-medium text-ink-2 hover:text-ink">
            <span aria-hidden="true">▸</span>
            Технологик режим
          </summary>
          <div className="mt-1.5 rounded-[6px] border border-hair bg-surface-2 px-2 py-1.5">
            <p className="text-[11px] [font-weight:650] text-ink-2">
              <Chem text={d.title} />
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {d.lines.map((l) => (
                <li key={l} className="text-[10.5px] leading-[1.45] text-ink-2">
                  <Chem text={l} />
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}

      {stage.values.map((v) => (
        <ValueBlock key={v.key} v={v} />
      ))}
    </article>
  );
}

/**
 * Иккита босқич орасидаги стрелка. `wide` да ўнгга, ундан торида пастга —
 * карточкалар устма-уст тушганда «ўнгга» ёлғон бўларди.
 */
function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center self-center py-1 text-[11px] leading-none text-rule wide:px-1 wide:py-0"
    >
      <span className="wide:hidden">▼</span>
      <span className="hidden wide:inline">▶</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* тасма                                                                      */
/* -------------------------------------------------------------------------- */

export function TexBandView({ band }: { band: TexBandVM }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-hair bg-surface-2 shadow-card">
      <header
        className="flex items-center gap-2.5 border-b border-hair px-3 py-2.5"
        style={{
          background: `color-mix(in srgb, ${band.token} 10%, transparent)`,
        }}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[6px] font-mono text-[13px] leading-none font-semibold tabular-nums text-surface"
          style={{ background: band.token }}
        >
          {band.no}
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] leading-[1.3] [font-weight:650]">{band.title}</h3>
          <p className="text-[11px] leading-[1.35] text-ink-3">{band.subtitle}</p>
        </div>
      </header>

      <ol className="flex list-none flex-col p-2.5 wide:flex-row wide:flex-wrap wide:items-stretch">
        {band.stages.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && <Arrow />}
            <li
              className={
                "min-w-0 wide:min-w-[210px] wide:flex-1 wide:basis-[220px] " +
                // Битта-иккита босқичли тасмада (одатда «Тайёр маҳсулот»)
                // карточка кенгроқ бўлади — акс ҳолда қатор бўм-бўш қоларди.
                (band.stages.length <= 2 ? "wide:max-w-[440px]" : "wide:max-w-[340px]")
              }
            >
              <StageCard stage={s} />
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

/** Юқоридан пастга оқим — ён тармоқ учун (у қисқа ва тасмага бўлинмайди). */
export function TexFlow({ stages }: { stages: TexStageVM[] }) {
  return (
    <ol className="flex list-none flex-col">
      {stages.map((s, i) => (
        <li key={s.key} className="min-w-0">
          {i > 0 && (
            <div className="flex justify-center py-1.5">
              <span aria-hidden="true" className="text-[11px] leading-none text-rule">
                ▼
              </span>
            </div>
          )}
          <StageCard stage={s} />
        </li>
      ))}
    </ol>
  );
}
