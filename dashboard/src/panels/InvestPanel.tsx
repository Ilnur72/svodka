import { useId, useMemo, useRef, useState } from "react";
import { nf, pctTxt } from "../lib/format";
import { usePalette } from "../lib/theme";
import { useElementWidth } from "../lib/useElementWidth";
import {
  NO_DATA,
  USD,
  investCalc,
  investExact,
  investPp,
  investVM,
  type InvestArea,
  type InvestBlock,
  type InvestCard,
  type InvestCutId,
  type InvestField,
  type InvestPassport,
  type InvestVal,
} from "../lib/adapters/invest";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { Pill } from "../components/Pill";
import { Columns } from "../components/Columns";
import { BarsH } from "../components/BarsH";
import { DataTable } from "../components/DataTable";
import { TableToggle } from "../components/TableToggle";
import { ChartLegend } from "../components/ChartLegend";
import { PercentRing } from "../components/PercentRing";
import { SegmentSwitch, type SegmentOption } from "../components/SegmentSwitch";

/**
 * «Инвестиция лойиҳалари» бўлими — иккита кўриниш, битта таб ичида.
 *
 * ═══ Паспорт ва таққослаш ══════════════════════════════════════════════
 *
 *  · **Паспорт** (бошланғич) — битта лойиҳа тўлиқ: реестрдаги ўттизта
 *    майдоннинг ҳаммаси маъносига қараб блокларга терилган. Юқорида лойиҳа
 *    танлагичи, остида танланганининг паспорти.
 *  · **Таққослаш** — етти лойиҳа биргаликда: бажарилиш ҳолати, қиймат,
 *    кесимлар, тайёргарлик, молиявий кўрсаткичлар ва карточкалар рўйхати.
 *
 * Иккови бир вақтда чизилмайди: паспорт битта лойиҳа ҳақидаги саволга,
 * таққослаш эса «қайси лойиҳа орқада» саволига жавоб беради — бир экранда
 * улар бир-бирини босиб қўярди.
 *
 * Паспортдаги ҳар бир қиймат реестрдан келади. Хатарлар блоки ҳам шундай:
 * реестрда бу устунда ҳамма лойиҳада битта ёзув турибди ва экранда айнан
 * шу ёзув кўринади — хатар даражаси (юқори/ўртача/паст) манбада умуман
 * йўқ, шунинг учун у ўйлаб ҳам, ҳисоблаб ҳам қўйилмайди.
 *
 * ═══ Нега бу бўлим давр танлагичига боғланмаган ═════════════════════════
 *
 * Манба — лойиҳалар реестри, «Production Report» API'дан келмайди. Ундаги
 * ягона давр — ўзлаштирилган маблағнинг январь–июнь оралиғи, лекин **йил
 * кўрсатилмаган**. Йилни тахмин қилиб қўйиш ёлғон бўларди, шунинг учун
 * бўлим ўз ҳолича туради ва юқоридаги `PeriodPicker` унга таъсир қилмайди.
 *
 * ═══ Асосий блок — иккита бажарилиш ═════════════════════════════════════
 *
 * Реестрда бажарилиш иккита мустақил ўлчовда: жисмоний бажарилиш фоизи ва
 * ўзлаштирилган маблағ улуши. Улар **ёнма-ён иккита устунда** чизилади —
 * қўшилмайди, ўртачаси олинмайди ва бир-бирига тенглаштирилмайди. Иккови ҳам
 * фоиз бўлгани учун шкала битта: иккинчи Y ўқи йўқ. Фарқнинг ўзи — бўлимдаги
 * энг қимматли маълумот.
 *
 * ═══ Диаграмма шакли қаердан келади ═════════════════════════════════════
 *
 * Шакл элементлар сони ва ёрлиқ узунлигидан келиб чиқади, бир хил қилиб
 * қўйилмайди:
 *
 *   - **Бажарилиш** ва **қиймат** — еттита лойиҳа, ёрлиқ қисқа: вертикал
 *     `Columns`. Еттита устун ёнма-ён яхши солиштирилади.
 *   - **Кесимлар** — 2 тадан 5 тагача гуруҳ, ёрлиқ узун («Ўз маблағлари,
 *     ЎзТТЖ маблағлари, Кредит»): горизонтал `BarsH`. Икки устунли вертикал
 *     диаграмма бутун бир ромкани беҳуда эгаллайди, узун ном эса ўқ остига
 *     сиғмай қисқартиришга мажбур қиларди. Горизонтал шаклда ном тўлиқ
 *     ёзилади ва қисқартма умуман керак эмас.
 *   - **Тайёргарлик** (3 та ҳолат) ва **молиявий баҳо** (3 та ҳолат) —
 *     диаграмма эмас: учта сон учун диаграмма ёлғон тўлиқлик беради. Улар
 *     ихчам қатор билан ёзилади, тафсилот эса жадвалда.
 *
 * Тўртта кесим тўртта карточкага эмас, **битта** карточкага йиғилган —
 * алмаштиргич билан («Кадрлар режаси» бўлимидаги каби). Алмашганда ранг
 * ўзгармайди: ранг кўрсаткичга бириктирилган, гуруҳнинг тартибига эмас.
 *
 * Иккита Y ўқи бор диаграмма йўқ. Жисмоний бажарилиш ва молиявий ўзлаштириш
 * иккови ҳам фоиз — битта шкалада, ёнма-ён устунда; қиймат эса (млн $) ўз
 * диаграммасида. Аралаш ўлчовли устун (йиллик ишлаб чиқариш натурада — бир
 * қисми тонна, бир қисми дона) ҳеч қаерда қўшилмайди ва битта шкалага
 * қўйилмайди: у фақат лойиҳанинг ўз карточкасида кўрсатилади.
 *
 * Қиймат ёрлиғи **танлаб** қўйилади — ҳар бир устунга эмас: бажарилишда
 * фарқи кескин бўлганларига, қийматда эса устун учидаги умумий қийматга.
 * Қолган сонлар ўқдан ўқилади ёки жадвалда очилади.
 *
 * Вертикал диаграммаларнинг баландлиги битта (`CHART_H`) — блоклар бир хил
 * кўринсин. Ўқдаги ёрлиқ қисқа (адаптер уни лойиҳа номидан кесиб олади),
 * тўлиқ ном эса тултипда ва «Жадвал кўриниши»да туради.
 */

/** Вертикал устун диаграммаларининг ягона баландлиги. */
const CHART_H = 250;

/* -------------------------------------------------------------------------- */
/* кичик бўлаклар                                                             */
/* -------------------------------------------------------------------------- */

/** Битта фоиз шкаласи: ёрлиқ · тўлдирилган йўлак · сон. */
function Track({
  label,
  pct,
  tone,
  hint,
}: {
  label: string;
  pct: number;
  tone: string;
  hint: string;
}) {
  // Шкала 0–100 билан чекланади, лекин сон доим тўлиқ ёзилади.
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2.5" title={hint}>
      <span className="w-[74px] flex-none text-[11.5px] text-ink-3">{label}</span>
      <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-[3px] bg-sunken">
        <span
          className="absolute inset-y-0 left-0 rounded-[3px]"
          style={{ width: `${w.toFixed(2)}%`, background: tone }}
        />
      </span>
      <span className="w-[54px] flex-none text-right font-mono text-[12px] tabular-nums">
        {pctTxt(pct)}
      </span>
    </div>
  );
}

/** Ёрлиқ / қиймат рўйхати. Бўш катак сўниқ ранг билан ажратилади. */
function FieldList({ fields }: { fields: InvestField[] }) {
  return (
    <dl className="mt-1 flex flex-col">
      {fields.map((f) => (
        <div
          key={f.k}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px]"
        >
          <dt className="w-[164px] flex-none text-ink-2">{f.k}</dt>
          <dd
            className={
              "min-w-0 flex-1 break-words" +
              (f.num ? " font-mono tabular-nums" : "") +
              (f.v === NO_DATA ? " text-ink-3" : "")
            }
          >
            {f.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Ихчам қатор: ҳолат · сон · шу ҳолатдаги лойиҳалар. Учта ҳолат учун бу
 * жадвалдан ҳам, диаграммадан ҳам тўғрироқ — жадвал сарлавҳа ва чегара
 * қўшади, диаграмма эса учта устун билан ёлғон тўлиқлик беради.
 */
function CountRow({
  label,
  count,
  note,
  muted = false,
}: {
  label: string;
  count: number;
  note: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-grid py-2 text-[12.5px] first:border-t-0 first:pt-0">
      <span className={"w-[210px] flex-none" + (muted ? " text-ink-3" : "")}>{label}</span>
      <span className="w-[58px] flex-none text-right font-mono text-[12px] tabular-nums text-ink-2">
        {investExact(count)} та
      </span>
      <span className="min-w-0 flex-1 text-[11.5px] text-ink-3">{note}</span>
    </div>
  );
}

/** Лойиҳа карточкаси: асосий кўрсаткичлар, очилганда — реестрдаги барча майдон. */
function ProjectCard({ card }: { card: InvestCard }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `pf-${uid}`;

  return (
    <Card
      title={<span className="block leading-[1.3]">{card.name}</span>}
      sub={<Pill status={card.status}>{card.gapText}</Pill>}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: card.token }}
      />
      <div className="text-[11.5px] text-ink-3">
        {card.region} · {card.kind}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        <Track
          label="Жисмоний"
          pct={card.physPct}
          tone="var(--s1)"
          hint={`Жисмоний бажарилиш: ${pctTxt(card.physPct)}`}
        />
        <Track
          label="Молиявий"
          pct={card.finPct}
          tone="var(--s3)"
          hint={`Молиявий ўзлаштириш: ${pctTxt(card.finPct)}`}
        />
      </div>

      {/* Ёпиқ ҳолатда — асосий кўрсаткичлар, очиқ ҳолатда — реестрдаги барча
          майдон. Иккиси бир вақтда чизилмайди: акс ҳолда битта қиймат
          карточкада икки марта кўринарди. Тугма шу соҳани бошқаради
          (`aria-controls`), гарчи у тугмадан юқорида турса ҳам. */}
      <div id={panelId}>
        <FieldList fields={open ? card.details : card.head} />
      </div>

      <div className="mt-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={
            "cursor-pointer rounded-[5px] border px-[11px] py-[5px] text-[11.5px] font-semibold " +
            (open
              ? "border-s1 bg-s1 text-white"
              : "border-hair bg-surface-2 text-ink-2 hover:text-ink")
          }
        >
          {open ? "Майдонларни яшириш" : `Барча майдонлар (${card.details.length} та)`}
        </button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* паспорт кўриниши                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Блок сарлавҳаси: кичик белги ва ном. Белги — ранг токени, у блокни
 * ажратиб туради, лекин ёлғиз маъно ташимайди: ном доим ёнида ёзилади.
 */
function BlockHead({ tone, children }: { tone: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 flex-none rounded-sm"
        style={{ background: tone }}
      />
      {children}
    </span>
  );
}

/** Паспортдаги оддий блок: сарлавҳа ва ёрлиқ/қиймат рўйхати. */
function PassportBlock({
  tone,
  block,
  className,
}: {
  tone: string;
  block: InvestBlock;
  /** Устун охиридаги блокка `grow` бериш учун — қуйида изоҳланган. */
  className?: string;
}) {
  return (
    <Card className={className} title={<BlockHead tone={tone}>{block.title}</BlockHead>}>
      <FieldList fields={block.fields} />
    </Card>
  );
}

/**
 * Паспорт марказидаги «Лойиҳа майдони» блоки: сурат ва тўртта кўрсаткич.
 *
 * ═══ Расм бор-йўқлиги фақат браузерда маълум ════════════════════════════
 *
 * Файл `public/invest/` да туради — у бандлга кирмайди, шунинг учун build
 * пайтида ҳам, рендер пайтида ҳам «бор ёки йўқ» деб текшириб бўлмайди.
 * Ягона ишончли сигнал — браузернинг ўзи: `onLoad` ёки `onError`.
 *
 * Учта ҳолат бор ва учаласи бошқача кўринади:
 *   - `load` — жавоб ҳали келмаган: жойни нейтрал майдон эгаллаб туради,
 *     расм эса шаффоф. Айнан шу сабабли синиқ расм иконкаси ҳам, `alt`
 *     матни ҳам экранга чиқмайди;
 *   - `ok`   — расм кўринади;
 *   - `fail` — расм умуман чизилмайди, ўрнида хотиржам плашка туради.
 *
 * Ҳар қандай ҳолатда ҳам остидаги кўрсаткичлар ўзгармайди: улар реестрдан
 * келади ва суратга боғлиқ эмас.
 *
 * `aspect-[16/10]` — расмнинг энг кичик баландлиги, қатъий ўлчов эмас.
 * Устун грид қатори баландлигига чўзилади, ортиқча жойни эса айнан расм
 * ютади (`grow`): у шу блокнинг асосий мазмуни, шунинг учун бўш оралиқ
 * ҳосил қилгандан кўра расмни каттароқ кўрсатган маъқул. Кўрсаткичлар
 * ҳар доим расм остида, ўз жойида қолади.
 *
 * Расм устига ҳеч нарса қўйилмайди: реестрда координата ҳам, харита ҳам,
 * геологик маълумот ҳам йўқ.
 */
function AreaBlock({ area }: { area: InvestArea }) {
  const [st, setSt] = useState<"load" | "ok" | "fail">("load");

  return (
    <Card
      className="flex h-full flex-col"
      title={<BlockHead tone="var(--s2)">Лойиҳа майдони</BlockHead>}
      note={area.note}
    >
      <div className="relative aspect-[16/10] w-full grow overflow-hidden rounded-card border border-grid bg-sunken">
        {st !== "fail" && (
          <img
            src={area.src}
            alt={area.alt}
            loading="lazy"
            onLoad={() => setSt("ok")}
            onError={() => setSt("fail")}
            className={
              "h-full w-full object-cover" + (st === "ok" ? "" : " opacity-0")
            }
          />
        )}
        {st === "fail" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-5 text-center">
            <span
              aria-hidden="true"
              className="h-px w-10 bg-rule"
            />
            <span className="text-[12px] text-ink-2">Сурат юкланмаган</span>
            <span className="max-w-[42ch] text-[11px] leading-[1.45] text-ink-3">
              Лойиҳа майдонининг сурати ҳали қўйилмаган. Қуйидаги кўрсаткичлар реестрдан
              олинган ва суратга боғлиқ эмас.
            </span>
          </div>
        )}
      </div>
      <FieldList fields={area.fields} />
    </Card>
  );
}

/** Пастки тасмадаги битта катак. */
function StripItem({ f }: { f: InvestField }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-ink-3">{f.k}</div>
      <div
        className={
          "mt-0.5 text-[13px] leading-[1.35]" +
          (f.num ? " font-mono tabular-nums" : "") +
          (f.v === NO_DATA ? " text-ink-3" : "")
        }
      >
        {f.v}
      </div>
    </div>
  );
}

/**
 * Битта лойиҳанинг паспорти.
 *
 * Тартиб: сарлавҳа ва иккита ҳалқа → тўртта плитка → уч устун (муддат ва
 * пул · лойиҳа майдони ва тайёргарлик · маҳсулот) → умумий тавсиф тасмаси
 * → хатарлар.
 *
 * Ҳалқалар **ёнма-ён**, ҳар бири ўз сони билан: жисмоний бажарилиш ва
 * молиявий ўзлаштириш бирлаштирилмайди ва ўртачаси олинмайди. Иккови ҳам
 * фоиз бўлгани учун улар бир хил шкалада ўқилади, лекин битта диаграммага
 * қўшилмайди — фарқи алоҳида нишонда ёзилган.
 */
function PassportView({ pp, risksAllSame }: { pp: InvestPassport; risksAllSame: boolean }) {
  // Recharts `var(--s1)` ни тушунмайди — ҳалқа ранги палитрадан олинади.
  const p = usePalette();

  return (
    <>
      <Card className="mb-3">
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: pp.token }}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
          <div className="min-w-0">
            <h3 className="text-[19px] leading-[1.25] [font-weight:660]">{pp.name}</h3>
            <p className="mt-1 text-[12px] text-ink-3">
              {pp.region} · {pp.enterprise}
            </p>
          </div>
          {/* Ҳолат нишони — манбадаги ёзувда, таржима қилинмайди. */}
          <Pill>{pp.state}</Pill>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-9 gap-y-4">
          <PercentRing
            label="Жисмоний бажарилиш"
            pct={pp.physPct}
            color={p.s1}
            note="реестрдаги бажарилиш устуни"
          />
          <PercentRing
            label="Молиявий ўзлаштириш"
            pct={pp.finPct}
            color={p.s3}
            note="ўзлаштирилган маблағнинг лойиҳа умумий қийматидаги улуши"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[11.5px] text-ink-3">Иккисининг фарқи</span>
            <span>
              <Pill status={pp.status}>{pp.gapText}</Pill>
            </span>
          </div>
        </div>

        <p className="mt-3.5 max-w-[100ch] text-[11.5px] leading-[1.45] text-ink-3">
          Иккита ҳалқа — иккита мустақил ўлчов, улар қўшилмайди ва ўртачаси олинмайди. Манфий
          фарқ иш пулдан олдинда кетганини билдиради. Ҳалқанинг ёйи 0–100 оралиғида, сон эса
          доим тўлиқ ёзилади.
        </p>
      </Card>

      <div className={GRID.g4}>
        {pp.tiles.map((t) => (
          <StatTile key={t.k} label={t.k} value={t.v} unit={t.unit} stripe={t.stripe} />
        ))}
      </div>

      <div className={GRID.g3 + " mt-3"}>
        <div className="flex min-w-0 flex-col gap-3">
          <Card title={<BlockHead tone="var(--s1)">{pp.goal.k}</BlockHead>}>
            <p className="mt-1 border-t border-grid pt-2 text-[12.5px] leading-[1.5]">
              {pp.goal.v}
            </p>
          </Card>
          {pp.left.map((b) => (
            <PassportBlock key={b.title} tone="var(--s1)" block={b} />
          ))}
        </div>
        <div className="min-w-0">
          {/* `key` — лойиҳа алмашганда расм ҳолати ноль ҳолатдан бошлансин:
              олдингисида расм йўқлиги янгисига ўтиб қолмаслиги керак. */}
          <AreaBlock key={pp.area.src} area={pp.area} />
        </div>
        {/* «Тайёргарлик» «Маҳсулот ва майдон» остида: иккови ҳам лойиҳанинг
            бугунги ҳолатини айтади, шунинг учун бир устунда кетма-кет туради.
            Ранг белгиси ўзгармади — блок ўз тусини сақлаб қолсин.

            `grow` — устун охирида бўш жой қолмасин: grid устунлари бир хил
            баландликка чўзилади, чап устун эса («Иш ўринлари» билан) одатда
            баландроқ тугайди. Ортиқча жойни охирги блок ўзи ютади ва пастки
            чети чап устун билан бир чизиқда туради. `flex-1` эмас, айнан
            `grow`: у `flex-basis: auto` ни сақлайди, шунинг учун блок ўз
            мазмунидан пастга сиқилиб қолмайди. */}
        <div className="flex min-w-0 flex-col gap-3">
          <PassportBlock tone="var(--s3)" block={pp.product} />
          <PassportBlock className="grow" tone="var(--s2)" block={pp.readiness} />
        </div>
      </div>

      <Card
        className="mt-3"
        title={<BlockHead tone="var(--rule)">Лойиҳа тавсифи</BlockHead>}
      >
        <div className="mt-1 flex flex-wrap gap-x-10 gap-y-3 border-t border-grid pt-2.5">
          {pp.strip.map((f) => (
            <StripItem key={f.k} f={f} />
          ))}
        </div>
      </Card>

      <Card
        className="mt-3"
        title={<BlockHead tone="var(--rule)">{pp.risks.k}</BlockHead>}
        note={
          <>
            Бу ерда манбадаги ёзувдан бошқа ҳеч нарса йўқ. Реестрда хатарнинг{" "}
            <b className="font-semibold text-ink-2">даражаси ҳам, рўйхати ҳам берилмаган</b> —
            фақат шу битта катак бор, шунинг учун даража ҳисоблаб ҳам, тахмин қилиб ҳам
            қўйилмади.
            {risksAllSame && " Ҳозирча реестрдаги барча лойиҳада бу катакда бир хил ёзув турибди."}
          </>
        }
      >
        <p
          className={
            "mt-1 border-t border-grid pt-2 text-[12.5px] leading-[1.5]" +
            (pp.risks.v === NO_DATA ? " text-ink-3" : "")
          }
        >
          {pp.risks.v}
        </p>
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* бўлим                                                                      */
/* -------------------------------------------------------------------------- */

/** Бўлимнинг иккита кўриниши. Бошланғичи — паспорт. */
type InvestViewId = "passport" | "compare";

const VIEWS: readonly SegmentOption<InvestViewId>[] = [
  {
    id: "passport",
    label: "Паспорт",
    hint: "Битта лойиҳа тўлиқ: бажарилиш, муддатлар, молиялаштириш, тайёргарлик, маҳсулот ва хатарлар — реестрдаги барча майдон.",
  },
  {
    id: "compare",
    label: "Таққослаш",
    hint: "Етти лойиҳа биргаликда: бажарилиш ҳолати, лойиҳа қиймати, кесимлар, тайёргарлик ва молиявий кўрсаткичлар.",
  },
] as const;

export function InvestPanel() {
  // Recharts `var(--s1)` ни тушунмайди — ранг палитрадан конкрет қиймат
  // сифатида олинади. Ранг серияга бириктирилган, қаторнинг тартибига эмас:
  // саралаш ёки фильтр ранг маъносини ўзгартирмайди.
  const p = usePalette();
  const vm = useMemo(() => investVM(), []);
  const t = vm.totals;

  // Кўриниш ва танланган лойиҳа — бўлимнинг ички ҳолати. Улар хэшга
  // ёзилмайди: хэш табнинг ўзига тегишли (`useHashTab`), бўлим ичидаги
  // кўриниш эса «Умумий кўрсаткичлар» ва «Кадрлар режаси» да ҳам шундай
  // сақланади.
  const [view, setView] = useState<InvestViewId>("passport");
  const [pid, setPid] = useState<string>(vm.passports[0]?.id ?? "");
  const pp = vm.passports.find((x) => x.id === pid) ?? vm.passports[0];

  // Кесим — битта блок ичида алмашади («Кадрлар режаси» бўлимидаги каби).
  const [cutId, setCutId] = useState<InvestCutId>("region");
  const cut = vm.sections.find((s) => s.id === cutId) ?? vm.sections[0];

  // Горизонтал диаграммада ёрлиққа ажратилган устон кенглиги. Кесим
  // номлари узун («Ўз маблағлари, ЎзТТЖ маблағлари, Кредит») — уларни
  // қисқартирмаслик учун устон блок кенглигидан ҳисобланади; тор экранда
  // диаграммага жой қолиши учун юқори чегара бор.
  const cutBox = useRef<HTMLDivElement>(null);
  const cutW = useElementWidth(cutBox, 720);
  const cutPadL = Math.min(320, Math.max(120, Math.round(cutW * 0.42)));

  // Қиймат ёрлиғи — фақат фарқи кескин бўлган лойиҳаларда, иккала устунга.
  // Айнан шу тўртта лойиҳада ўзлаштириш жисмоний бажарилишдан узилиб қолган
  // ва бирида у ҳақиқий нол — ёрлиқсиз бу нол экранда кўринмас эди.
  //
  // Қоида шаклан ҳам тўғри чиқади: ёнма-ён иккита ёрлиқ фақат устунлар
  // баландлиги яқин бўлганда бир-бирига тегади, чунки улар устун учида
  // туради. Ёрлиқ эса айнан фарқи катталарига қўйилади — у ерда ёрлиқлар
  // ўндан ортиқ пункт, яъни бир неча ўн пиксель узоқда бўлади. Устунлари
  // деярли тенгларида ёрлиқ иккита бир хил сон бўларди — улар тоза қолади.
  const progressLabel = (k: number, i: number): string | null => {
    const r = vm.progress[i];
    if (!r || r.status !== "crit") return null;
    return pctTxt(k === 0 ? r.physPct : r.finPct);
  };

  // Стекда ёрлиқ фақат устки бўлакка — у ердаги сон устуннинг бутун
  // баландлигини, яъни лойиҳанинг умумий қийматини англатади.
  const costLabel = (k: number, i: number): string | null => {
    const r = vm.cost[i];
    return k === 1 && r ? investExact(r.totalCost) : null;
  };

  /** Сон бўлмаган катак (масалан «ТИАда аниқланади») сўниқ ёзилади. */
  const valCell = (x: InvestVal) =>
    x.num ? (
      <span className="font-mono tabular-nums">{x.v}</span>
    ) : (
      <span className="text-ink-3">{x.v}</span>
    );

  return (
    <>
      <div className="mb-4">
        <SegmentSwitch
          label="Инвестиция лойиҳалари кўриниши"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
      </div>

      <p className="mb-3 max-w-[112ch] text-[12px] leading-[1.55] text-ink-3">
        Реестрда <b className="font-semibold text-ink-2">{t.count} та лойиҳа</b>. Барча сумма —{" "}
        <b className="font-semibold text-ink-2">{USD}</b>. Ўзлаштирилган маблағ январь–июнь
        оралиғи учун берилган, лекин{" "}
        <b className="font-semibold text-ink-2">йил манбада кўрсатилмаган</b>, шунинг учун бу
        ерда ҳам ёзилмайди ва бўлим юқоридаги давр танлагичига боғланмаган — у бу ердаги
        рақамларни ўзгартирмайди. Бўлим маълумоти ишлаб чиқариш сводкаларидан эмас, алоҳида
        лойиҳалар реестридан келади.
      </p>

      {view === "passport" && (
        <>
          <div className="mb-4">
            <SegmentSwitch
              label="Лойиҳани танлаш"
              // Тўлиқ ном танлагич остида такрорланмайди — у дарҳол
              // пастдаги паспорт сарлавҳасида турибди.
              options={vm.passports.map((x) => ({ id: x.id, label: x.short }))}
              value={pp.id}
              onChange={setPid}
            />
          </div>
          <PassportView pp={pp} risksAllSame={vm.risksAllSame} />
        </>
      )}

      {view === "compare" && (
        <>
          <p className="mb-4 max-w-[112ch] text-[12px] leading-[1.55] text-ink-3">
            <b className="font-semibold text-ink-2">Барча лойиҳаларда бир хил:</b>{" "}
            {vm.constants.map((c, i) => (
              <span key={c.k}>
                {i > 0 && " · "}
                {c.k} — {c.v}
              </span>
            ))}
            . Бу майдонлар лойиҳаларни бир-биридан ажратмайди, шунинг учун улар кесим ёки фильтр
            сифатида берилмаган; ҳар бир лойиҳанинг тўлиқ рўйхатида эса ўз ўрнида турибди.
          </p>

          {/* --- плиткалар ---------------------------------------------------- */}
          <div className={GRID.g4}>
            <StatTile
              label="Лойиҳалар сони"
              value={investExact(t.count)}
              unit="та"
              stripe="var(--s1)"
              foot={
                <span className="text-ink-3">
                  {vm.sections[0]?.groups.length ?? 0} та ҳудудда
                </span>
              }
            />
            <StatTile
              label="Умумий қиймат"
              value={investCalc(t.totalCost)}
              unit={USD}
              stripe="var(--s2)"
              foot={<span className="text-ink-3">{t.count} та лойиҳа бўйича жами</span>}
            />
            <StatTile
              label="Ўзлаштирилган"
              value={investCalc(t.disbursed)}
              unit={USD}
              stripe="var(--s3)"
              foot={
                <>
                  <Pill>{pctTxt(t.disbursedPct)}</Pill>
                  <span className="text-ink-3">умумий қийматдан</span>
                </>
              }
            />
            <StatTile
              label="Иш ўринлари"
              value={investExact(t.jobs)}
              unit="та"
              stripe="var(--rule)"
              foot={<span className="text-ink-3">реестрдаги етти лойиҳа бўйича</span>}
            />
          </div>

          {/* --- 1. бажарилиш ҳолати ------------------------------------------ */}
          <Section
            className="mt-5"
            title="Бажарилиш ҳолати"
            note="иккита мустақил ўлчов · фарқи катталаридан бошлаб"
          >
            <Card
              title="Жисмоний бажарилиш ва молиявий ўзлаштириш"
              sub="фоизда · фарқ бўйича тартибда"
              note={
                <>
                  Реестрда бажарилиш иккита ҳар хил устунда қайд этилган: биринчиси — ишнинг
                  жисмоний бажарилиши, иккинчиси — ўзлаштирилган маблағнинг лойиҳа умумий
                  қийматидаги улуши. Иккови қўшилмайди ва ўртачаси олинмайди — уларнинг{" "}
                  <b className="font-semibold text-ink-2">фарқи</b> асосий кўрсаткич, шунинг учун
                  улар ёнма-ён иккита устунда турибди ва лойиҳалар{" "}
                  <b className="font-semibold text-ink-2">айнан шу фарқ бўйича</b> сараланган:
                  ўзлаштириш ишдан энг кўп орқада қолгани биринчи. Иккови ҳам фоиз бўлгани учун
                  шкала битта ва иккинчи Y ўқи йўқ. Сон фарқи кескин бўлган лойиҳаларда устун
                  устига ёзилган — қолганларида иккала устун деярли тенг ва аниқ сон қуйидаги
                  жадвалда. Ўқда лойиҳанинг қисқа номи туради, тўлиқ ном — тултипда. Манфий фарқ
                  — иш пулдан олдинда кетган.
                </>
              }
            >
              <ChartLegend
                items={[
                  { name: "Жисмоний бажарилиш", color: p.s1 },
                  { name: "Молиявий ўзлаштириш", color: p.s3 },
                ]}
              />
              <Columns
                labels={vm.progress.map((r) => r.short)}
                fullLabels={vm.progress.map((r) => r.name)}
                height={CHART_H}
                yWidth={46}
                yTickFmt={(v) => nf(v, 0) + "%"}
                vFmt={pctTxt}
                valueLabel={progressLabel}
                ariaLabel="Лойиҳалар бўйича жисмоний бажарилиш ва молиявий ўзлаштириш, фоизда, фарқ бўйича тартибда"
                series={[
                  {
                    name: "Жисмоний бажарилиш",
                    color: p.s1,
                    values: vm.progress.map((r) => r.physPct),
                  },
                  {
                    name: "Молиявий ўзлаштириш",
                    color: p.s3,
                    values: vm.progress.map((r) => r.finPct),
                  },
                ]}
              />

              {vm.behind.length > 0 && (
                <p className="mt-3 text-[11.5px] leading-[1.45] text-ink-3">
                  {t.count} тадан{" "}
                  <b className="font-semibold text-ink-2">{vm.behind.length} тасида</b> жисмоний
                  бажарилиш молиявий ўзлаштиришдан кескин олдинда:{" "}
                  {vm.behind.map((b, i) => (
                    <span key={b.id}>
                      {i > 0 && "; "}
                      <b className="font-semibold text-ink-2">{b.name}</b> —{" "}
                      {pctTxt(b.physPct)} ва {pctTxt(b.finPct)}, фарқ {investPp(b.gapPp)}
                    </span>
                  ))}
                  . Фарқ ҳисоблаб тўғриланмаган ва ўртача қиймат билан алмаштирилмаган — манбадаги
                  ҳолат шундай.
                </p>
              )}

              <TableToggle
                caption="Лойиҳалар бўйича жисмоний бажарилиш ва молиявий ўзлаштириш"
                cols={[
                  { t: "Лойиҳа", wrap: true },
                  { t: "Жисмоний", num: true },
                  { t: "Молиявий", num: true },
                  { t: "Фарқ", num: true },
                  { t: `Умумий қиймат, ${USD}`, num: true },
                  { t: `Ўзлаштирилган, ${USD}`, num: true },
                ]}
                rows={vm.progress.map((r) => ({
                  key: r.id,
                  cells: [
                    r.name,
                    pctTxt(r.physPct),
                    pctTxt(r.finPct),
                    investPp(r.gapPp),
                    investExact(r.totalCost),
                    investExact(r.disbursed),
                  ],
                }))}
              />
            </Card>
          </Section>

          {/* --- 2. лойиҳа қиймати -------------------------------------------- */}
          <Section title="Лойиҳа қиймати" note={`қиймат бўйича тартибда · ${USD}`}>
            <Card
              title="Умумий қиймат ва ўзлаштирилган қисм"
              sub={`${USD} · қиймат бўйича тартибда`}
              note="Устун баландлиги — лойиҳанинг умумий қиймати, у устун устида сон билан ҳам ёзилган. Устун иккига бўлинган: пастки бўлак — ўзлаштирилган маблағ, устки бўлак — қолдиқ. Иккисининг йиғиндиси айнан умумий қиймат, шунинг учун бу ерда стек тўғри келади. Барча лойиҳа битта шкалада, чунки ўлчов бирлиги битта."
            >
              <ChartLegend
                items={[
                  { name: "Ўзлаштирилган", color: p.s3 },
                  { name: "Қолдиқ", color: p.rule },
                ]}
              />
              <Columns
                labels={vm.cost.map((r) => r.short)}
                fullLabels={vm.cost.map(
                  (r) => `${r.name} · умумий қиймат ${investExact(r.totalCost)} ${USD}`,
                )}
                height={CHART_H}
                yWidth={46}
                stacked
                vFmt={investCalc}
                valueLabel={costLabel}
                ariaLabel={`Лойиҳалар бўйича умумий қиймат: ўзлаштирилган маблағ ва қолдиқ, ${USD}`}
                series={[
                  { name: "Ўзлаштирилган", color: p.s3, values: vm.cost.map((r) => r.disbursed) },
                  { name: "Қолдиқ", color: p.rule, values: vm.cost.map((r) => r.remaining) },
                ]}
              />
              <TableToggle
                caption="Лойиҳалар бўйича умумий қиймат, ўзлаштирилган маблағ ва қолдиқ"
                cols={[
                  { t: "Лойиҳа", wrap: true },
                  { t: `Умумий қиймат, ${USD}`, num: true },
                  { t: `Ўзлаштирилган, ${USD}`, num: true },
                  { t: `Қолдиқ, ${USD}`, num: true },
                  { t: "Ўзлаштириш", num: true },
                  { t: `Йиллик ишлаб чиқариш, ${USD}`, num: true },
                ]}
                rows={vm.cost.map((r) => ({
                  key: r.id,
                  cells: [
                    r.name,
                    investExact(r.totalCost),
                    investExact(r.disbursed),
                    investCalc(r.remaining),
                    pctTxt(r.disbursedPct),
                    r.annualOutputUsd === null ? (
                      <span className="text-ink-3">{NO_DATA}</span>
                    ) : (
                      investExact(r.annualOutputUsd)
                    ),
                  ],
                }))}
              />
            </Card>
          </Section>

          {/* --- 3. кесимлар --------------------------------------------------- */}
          <Section title="Кесимлар" note={`лойиҳалар умумий қиймати бўйича · ${USD}`}>
            <Card
              title={cut.title}
              sub={`${cut.groups.length} та гуруҳ · ${USD}`}
              note={
                <>
                  Тўртта кесим битта блокда: гуруҳлар сони 2 тадан 5 тагача, ҳар бирига алоҳида
                  карточка берилса экран майдаланарди. Қатор узунлиги — гуруҳдаги лойиҳаларнинг
                  умумий қиймати, аниқ сон ҳар қаторнинг ўнг четида; гуруҳлар қиймат бўйича
                  сараланган. Ном манбадаги ҳолида, қисқартирилмасдан ёзилади. Кесим алмашганда
                  ранг ўзгармайди — у гуруҳга эмас, кўрсаткичнинг ўзига боғланган.
                </>
              }
            >
              <div className="mb-3">
                <SegmentSwitch
                  label="Кесимни танлаш"
                  options={vm.sections.map((x) => ({ id: x.id, label: x.title, hint: x.hint }))}
                  value={cut.id}
                  onChange={setCutId}
                />
              </div>
              <div ref={cutBox}>
                <BarsH
                  rows={cut.groups.map((g) => ({
                    label: g.name,
                    v: g.totalCost,
                    extra: ["Лойиҳалар", `${investExact(g.count)} та`],
                  }))}
                  rowH={34}
                  padL={cutPadL}
                  vFmt={investCalc}
                  vName={`Умумий қиймат, ${USD}`}
                  ariaLabel={`${cut.title} кесимида лойиҳаларнинг умумий қиймати, ${USD}`}
                />
              </div>
              <TableToggle
                caption={`${cut.title} кесими`}
                cols={[
                  { t: cut.title, wrap: true },
                  { t: "Лойиҳалар", num: true },
                  { t: `Умумий қиймат, ${USD}`, num: true },
                  { t: `Ўзлаштирилган, ${USD}`, num: true },
                ]}
                rows={cut.groups.map((g) => ({
                  key: g.name,
                  cells: [
                    g.name,
                    investExact(g.count),
                    investCalc(g.totalCost),
                    investCalc(g.disbursed),
                  ],
                }))}
              />
            </Card>
          </Section>

          {/* --- 4. тайёргарлик ------------------------------------------------- */}
          <Section title="Тайёргарлик" note="ҳужжатлар босқичи · лойиҳалар бўйича">
            <Card
              title="Қурилиш лойиҳа-смета ҳужжатлари ҳолати"
              sub={`${vm.readyDocGroups.length} та ҳолат`}
              note={
                <>
                  Реестрда бешта босқич кўзда тутилган, лойиҳалар ҳозирча уларнинг иккитасида
                  турибди. Қолган босқичларда биронта лойиҳа йўқ: {vm.unusedDocStates.join(" · ")}.
                  Учта ҳолат учун диаграмма ҳам, жадвал ҳам чизилмади — қуйидаги қатор шу учала
                  сонни тўлиқ ташийди; лойиҳа бўйича тафсилот (ТИА, ускуна, муддат) жадвал
                  кўринишида очилади. Ҳолат номи манбадаги ёзувда қолдирилган.
                </>
              }
            >
              <div className="flex flex-col">
                {vm.readyDocGroups.map((g) => (
                  <CountRow
                    key={g.state}
                    label={g.state}
                    count={g.count}
                    note={g.names.join(" · ")}
                    muted={g.noData}
                  />
                ))}
              </div>
              <TableToggle
                caption="Лойиҳаларнинг ТИА, ҳужжат ва ускуна тайёргарлиги"
                cols={[
                  { t: "Лойиҳа", wrap: true },
                  { t: "ТИА / ТИҲ ҳолати", wrap: true },
                  { t: "Лойиҳа-смета ҳужжатлари" },
                  { t: "Ускуналар" },
                  { t: "Тугаш санаси (режа)" },
                  { t: "Монтаж ва ишга тушириш" },
                ]}
                rows={vm.ready.map((r) => ({
                  key: r.id,
                  cells: [
                    r.name,
                    r.fsState,
                    r.docState === NO_DATA ? <span className="text-ink-3">{r.docState}</span> : r.docState,
                    r.equipment,
                    r.endYear,
                    r.commissioning === NO_DATA ? (
                      <span className="text-ink-3">{r.commissioning}</span>
                    ) : (
                      r.commissioning
                    ),
                  ],
                }))}
              />
            </Card>
          </Section>

          {/* --- 5. молиявий кўрсаткичлар -------------------------------------- */}
          <Section title="Молиявий кўрсаткичлар" note="IRR · NPV · қоплаш муддати">
            <Card
              title="Лойиҳаларнинг молиявий баҳоси"
              sub={`${t.count} тадан ${vm.finCounts.complete} тасида ҳисобланган`}
              note={
                <>
                  Учта кўрсаткич — IRR, NPV ва қоплаш муддати — реестрдаги{" "}
                  <b className="font-semibold text-ink-2">{vm.finCounts.complete} та</b> лойиҳада
                  ҳисобланган. Қолганларида кўрсаткич ҳали йўқ, лекин сабаби бир хил эмас:{" "}
                  <b className="font-semibold text-ink-2">{vm.finCounts.pending} тасида</b> манбада
                  «ТИАда аниқланади» деб ёзилган — ҳисоб-китоб техник-иқтисодий асослаш босқичида
                  бажарилади;{" "}
                  <b className="font-semibold text-ink-2">{vm.finCounts.empty} тасида</b> эса катак
                  бўш, яъни маълумотнинг ўзи йўқ. Бу — камчилик эмас, лойиҳанинг босқичи. Бўш катак
                  нол билан тўлдирилмади, «аниқланади» деб ҳам ёзилмади, кўрсаткичларнинг ўртачаси
                  олинмади ва диаграмма чизилмади: иккита қиймат бўйича диаграмма ёлғон тўлиқлик
                  берарди.
                </>
              }
            >
              <div className="mb-3 flex flex-col">
                <CountRow
                  label="Учаласи ҳам ҳисобланган"
                  count={vm.finCounts.complete}
                  note="IRR, NPV ва қоплаш муддати реестрда сон билан берилган"
                />
                <CountRow
                  label="«ТИАда аниқланади»"
                  count={vm.finCounts.pending}
                  note="камида битта катакда шу ёзув турибди — ҳисоблаш ТИА босқичида"
                />
                <CountRow
                  label="Катаклари бўш"
                  count={vm.finCounts.empty}
                  note="учала катак ҳам тўлдирилмаган — маълумот йўқ"
                  muted
                />
              </div>
              <DataTable
                caption="Лойиҳалар бўйича IRR, NPV ва қоплаш муддати"
                cols={[
                  { t: "Лойиҳа", wrap: true },
                  { t: "IRR" },
                  { t: `NPV, ${USD}` },
                  { t: "Қоплаш муддати" },
                ]}
                rows={vm.fin.map((r) => ({
                  key: r.id,
                  cells: [r.name, valCell(r.irr), valCell(r.npv), valCell(r.payback)],
                }))}
              />
            </Card>
          </Section>

          {/* --- 6. лойиҳалар рўйхати ------------------------------------------ */}
          <Section
            title="Лойиҳалар рўйхати"
            note="карточкани очиб реестрдаги барча майдонни кўриш мумкин"
          >
            <div className={GRID.g2}>
              {vm.cards.map((c) => (
                <ProjectCard key={c.id} card={c} />
              ))}
            </div>
          </Section>
        </>
      )}

      <p className="max-w-[112ch] text-[11.5px] leading-[1.6] text-ink-3">
        <b className="font-semibold text-ink-2">Манба:</b> инвестиция лойиҳалари реестри —
        «Production Report» API'дан келмайди, шунинг учун бўлим бошқа бўлимлардаги ойлик
        сводкаларга боғлиқ эмас. Реестрда мавжуд, лекин биронта лойиҳада тўлдирилмаган
        майдонлар устун сифатида чизилмади: {vm.emptyFields.join(" · ")}
        {vm.unnamedEmptyCount > 0 && (
          <>
            {" "}
            ва яна {vm.unnamedEmptyCount} та сарлавҳасиз устун
          </>
        )}
        . Улар яширилмади — шу ерда очиқ санаб ўтилди. Йиллик ишлаб чиқариш натурадаги
        кўрсаткичи аралаш ўлчовда (бир қисми тонна, бир қисми дона), шунинг учун у ҳеч қаерда
        қўшилмади ва битта шкалага қўйилмади.
      </p>
    </>
  );
}
