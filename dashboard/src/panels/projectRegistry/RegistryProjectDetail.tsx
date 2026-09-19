import { useMemo } from "react";
import { exact, nf, pctTxt } from "../../lib/format";
import { usePalette } from "../../lib/theme";
import {
  regDetail,
  type RegArea,
  type RegBlock,
  type RegFact,
  type RegProject,
} from "../../lib/adapters/projectRegistry";
import { GRID } from "../../components/layout";
import { AreaPhoto } from "../../components/AreaPhoto";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { Pill } from "../../components/Pill";
import { PercentRing } from "../../components/PercentRing";
import { StatTile } from "../../components/StatTile";
import { ClusterChip, Muted, Num, SourceDot } from "./parts";

/**
 * Битта лойиҳанинг тафсилоти — модал ойнада, «Инвестиция лойиҳалари»
 * паспорти билан БИТТА шаблонда.
 *
 * ═══ Тартиб ═════════════════════════════════════════════════════════════
 *
 *  1. Сарлавҳа карточкаси: ҳудуд · масъул шахс, лойиҳа тури ва иккита
 *     ҳалқа (жисмоний бажарилиш · молиявий ўзлаштириш) ёнма-ён;
 *  2. Тўртта плитка: қиймат · иш ўринлари · муддат · ишга тушириш;
 *  3. Уч устун — чапда мақсад, муддатлар, молиялаштириш ва самарадорлик;
 *     ўртада СУРАТ ва лойиҳа майдони; ўнгда маҳсулот ва тайёргарлик;
 *  4. Инфратузилма (кенг блок) ва тавсиф тасмаси;
 *  5. Манба кузатуви.
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
 *
 * ═══ Ҳалқа ҳам шундай ═══════════════════════════════════════════════════
 *
 * Жисмоний бажарилиш 5/144, ўзлаштирилган маблағ эса 2/144 лойиҳада
 * тўлдирилган. Қиймати йўқ ҳалқа **нол фоиз билан чизилмайди** — у «иш
 * бошланмаган» деган ёлғон хулоса берарди. Иккови ҳам йўқ бўлса ҳалқалар
 * ўрнида нима учун йўқлиги ёзилади.
 */

/**
 * Блок сарлавҳаси: кичик белги ва ном — «Инвестиция лойиҳалари»
 * паспортидаги билан бир хил. Белги ёлғиз маъно ташимайди: ном доим ёнида.
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

/** Ёрлиқ / қиймат рўйхати. Бўш катак «кўрсатилмаган» бўлиб ўз ўрнида қолади. */
function FactList({ facts }: { facts: RegFact[] }) {
  return (
    <dl className="mt-1 flex flex-col">
      {facts.map((f) => (
        <div
          key={f.k}
          className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px]"
        >
          <dt className="w-[150px] flex-none text-ink-3">{f.k}</dt>
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
  );
}

/** Оддий блок: сарлавҳа, тўлиқлик кўрсаткичи ва ёрлиқ/қиймат рўйхати. */
function FactBlock({
  block,
  tone,
  className,
}: {
  block: RegBlock;
  tone: string;
  /** Устун охиридаги блокка `grow` бериш учун. */
  className?: string;
}) {
  return (
    <Card
      className={className}
      title={<BlockHead tone={tone}>{block.title}</BlockHead>}
      sub={`${nf(block.filled)} / ${nf(block.facts.length)} тўлдирилган`}
    >
      <FactList facts={block.facts} />
    </Card>
  );
}

/**
 * Марказдаги «Лойиҳа майдони» блоки: сурат ва тўртта кўрсаткич.
 *
 * Сурат `public/registry/<id>.jpg` дан олинади ва ҳозирча биронта лойиҳада
 * йўқ — реестрда сурат устуни умуман мавжуд эмас, файллар қўлда қўйилади.
 * Шунинг учун блокда `AreaPhoto` нинг хотиржам плашкаси туради: синиқ расм
 * иконкаси ҳам, бўш ромка ҳам кўринмайди, остидаги кўрсаткичлар эса
 * реестрдан олинади ва суратга умуман боғлиқ эмас.
 *
 * ⚠️ Сурат лойиҳа НОМИГА ҚАРАБ танланмайди — сабаби адаптердаги `RegArea`
 * изоҳида. `key` эса лойиҳа алмашганда расм ҳолати ноль ҳолатдан
 * бошлансин: олдингисида расм йўқлиги янгисига ўтиб қолмаслиги керак.
 *
 * `fill={false}` — расм ортиқча жойни ЮТМАЙДИ. Паспортда у ютади, лекин
 * бу ерда чап устун тўртта карточкадан иборат бўлиши мумкин ва ўша
 * баландликка чўзилган плашка 700px лик бўм-бўш ромка бўлиб қоларди.
 */
function AreaBlock({ area }: { area: RegArea }) {
  return (
    <Card title={<BlockHead tone="var(--s2)">Лойиҳа майдони</BlockHead>} note={area.note}>
      <AreaPhoto src={area.src} alt={area.alt} note={area.photoNote} fill={false} />
      <FactList facts={area.fields} />
    </Card>
  );
}

/**
 * Пастки тасмадаги битта катак.
 *
 * `max-w-[72ch]` — реестрда «Ҳозирги ҳолати» баъзан бутун бир абзац
 * («Учта объект бўйича ишчи лойиҳалар (РП), смета/ПОС ҳужжатлари…»).
 * Чегарасиз у бутун қаторни эгаллаб, ёнидаги қисқа катакни ўнг четга
 * итариб юборарди. Матн қисқартирилмайди — фақат ўралади.
 */
function StripItem({ f }: { f: RegFact }) {
  return (
    <div className="min-w-0 max-w-[72ch]">
      <div className="text-[11px] text-ink-3">{f.k}</div>
      <div className="mt-0.5 text-[13px] leading-[1.35] break-words">{f.v}</div>
    </div>
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
  // Recharts `var(--s1)` ни тушунмайди — ҳалқа ранги палитрадан олинади.
  const pal = usePalette();
  const pr = d.progress;

  const navBtn =
    "cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-45";

  return (
    <Modal
      width="2xl"
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
      {/* --- 1. сарлавҳа карточкаси ва иккита ҳалқа ------------------------- */}
      <Card className="mb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
          <div className="min-w-0 text-[12px] text-ink-3">
            {d.head.region ?? "ҳудуди кўрсатилмаган"}
            {d.head.responsible !== null && <> · масъул: {d.head.responsible}</>}
          </div>
          {/* Лойиҳа тури манбадаги ёзувда — таржима қилинмайди. */}
          <Pill>{p.kind}</Pill>
        </div>

        {pr.physPct === null && pr.finPct === null ? (
          /* Иккита ҳалқанинг бирортаси ҳам чизилмади — нега чизилмагани
             ЁЗИЛАДИ. Нол фоизли ҳалқа «иш бошланмаган» деган ёлғон хулоса
             берарди, бўш жой эса саволни жавобсиз қолдирарди. */
          <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
            Реестрда бу лойиҳа учун бажарилиш фоизи ҳам, ўзлаштирилган маблағ ҳам
            кўрсатилмаган, шунинг учун ҳалқалар чизилмади. Бу устунлар бутун реестрда
            жуда кам тўлдирилган: бажарилиш{" "}
            <b className="font-semibold text-ink-2">
              {nf(pr.physFilled)} / {nf(pr.total)}
            </b>
            , ўзлаштирилган маблағ{" "}
            <b className="font-semibold text-ink-2">
              {nf(pr.finFilled)} / {nf(pr.total)}
            </b>{" "}
            лойиҳада.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-x-9 gap-y-4">
            {pr.physPct !== null && (
              <PercentRing
                label="Жисмоний бажарилиш"
                pct={pr.physPct}
                color={pal.s1}
                note={`реестрдаги бажарилиш устуни · ${nf(pr.physFilled)} / ${nf(pr.total)} лойиҳада`}
              />
            )}
            {pr.finPct !== null && (
              <PercentRing
                label="Молиявий ўзлаштириш"
                pct={pr.finPct}
                color={pal.s3}
                note={`ўзлаштирилган маблағнинг лойиҳа умумий қийматидаги улуши · ${nf(pr.finFilled)} / ${nf(pr.total)} лойиҳада`}
              />
            )}
            {/* Фарқ ФАҚАТ иккови ҳам бор бўлганда ҳисобланади: битта ўлчов
                бўйича «фарқ» деган сон бўлиши мумкин эмас. */}
            {pr.gapText !== null ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px] text-ink-3">Иккисининг фарқи</span>
                <span>
                  <Pill status={pr.status}>{pr.gapText}</Pill>
                </span>
              </div>
            ) : (
              <p className="min-w-[200px] flex-1 text-[11.5px] leading-[1.45] text-ink-3">
                Иккинчи ўлчов реестрда йўқ, шунинг учун фарқ ҳисобланмади:{" "}
                {pr.physPct === null
                  ? "бажарилиш фоизи кўрсатилмаган"
                  : "ўзлаштирилган маблағ кўрсатилмаган"}
                .
              </p>
            )}
          </div>
        )}

        {/* Бажарилиш % манбада иккита шкалада ёзилган — кўрсатилаётган фоиз
            бэкенднинг ТАХМИНИ. Буни сон ёнида айтиб қўйиш шарт. */}
        {pr.raw !== null && (
          <p className="mt-3 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
            Манбада «Бажарилиш %» устунида шкала аралаш: баъзи қаторда улуш (0,8),
            баъзисида фоиз (82). Фоиз қиймати шу тахминдан ҳисобланган, хом қиймат{" "}
            <b className="font-mono font-semibold text-ink-2">{exact(pr.raw)}</b> (
            {pr.scale === "share" ? "улуш" : "фоиз"}) ўзгаришсиз қолдирилган.
          </p>
        )}
      </Card>

      {/* --- 2. тўртта плитка ----------------------------------------------- */}
      <div className={GRID.g4}>
        {d.tiles.map((t) => (
          <StatTile
            key={t.k}
            label={t.k}
            value={t.v === null ? <Muted /> : t.v}
            unit={t.v === null ? undefined : t.unit}
            stripe={t.stripe}
            foot={<span className="text-ink-3">{t.foot}</span>}
          />
        ))}
      </div>

      {/* --- 3. уч устун ----------------------------------------------------- */}
      <div className={GRID.g3 + " mt-3"}>
        {/* чап: мақсад · муддатлар · молиялаштириш · самарадорлик */}
        <div className="flex min-w-0 flex-col gap-3">
          {d.goal !== null && (
            <Card title={<BlockHead tone="var(--s1)">Лойиҳа мақсади</BlockHead>}>
              <p className="mt-1 border-t border-grid pt-2 text-[12.5px] leading-[1.5]">{d.goal}</p>
            </Card>
          )}

          {d.terms && <FactBlock tone="var(--s1)" block={d.terms} />}

          {/* Молиялаштириш блоки — реестрга хос: олтита манба ўз ранги билан,
              остида йиғинди ва эълон қилинган қиймат билан фарқи. */}
          <Card
            title={<BlockHead tone="var(--s3)">Молиялаштириш</BlockHead>}
            sub={
              d.financeSum === null
                ? "манбалар кўрсатилмаган"
                : `${exact(d.financeSum)} млн $ йиғинди`
            }
          >
            <ul className="mt-1 flex flex-col">
              {d.finance.map((f) => (
                <li
                  key={f.key}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-grid py-[7px] text-[12.5px]"
                >
                  <SourceDot color={f.color} />
                  <span className="min-w-0 flex-1 break-words text-ink-3">{f.label}</span>
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

            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-grid pt-2 text-[12.5px]">
              <span className="min-w-0 flex-1 text-ink-3">Ўзлаштирилган маблағ</span>
              <span className="flex-none">
                {d.disbursed === null ? <Muted /> : <Num v={d.disbursed} unit="млн $" />}
              </span>
            </div>
            {d.disbursed !== null && pr.finPct !== null && (
              <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-3">
                Умумий қийматнинг {pctTxt(pr.finPct)} и — юқоридаги «Молиявий ўзлаштириш»
                ҳалқаси шу нисбатдан ҳисобланган.
              </p>
            )}

            {/* Эълон қилинган умумий қиймат манбалар йиғиндисига ҳар доим ҳам
                тенг эмас. Бу МАНБАДАГИ номувофиқлик — тузатилмайди ва
                яширилмайди. */}
            {d.financeGap !== null && (
              <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-3">
                Эълон қилинган умумий қиймат{" "}
                <b className="font-mono font-semibold text-ink-2">{exact(p.totalCost)}</b> млн $ —
                манбалар йиғиндисидан{" "}
                <b className="font-mono font-semibold text-ink-2">{exact(d.financeGap)}</b> млн $
                фарқ қилади (манбада шундай).
              </p>
            )}
          </Card>

          {d.effect && <FactBlock tone="var(--s1)" block={d.effect} />}
        </div>

        {/* ўрта: сурат ва лойиҳа майдони */}
        <div className="min-w-0">
          <AreaBlock key={d.area.src} area={d.area} />
        </div>

        {/* ўнг: маҳсулот ва тайёргарлик.

            `grow` охирги блокда — grid устунлари бир хил баландликка
            чўзилади, чап устун эса (тўртта карточка билан) одатда
            баландроқ тугайди. Ортиқча жойни охирги блок ўзи ютади ва
            пастки чети чап устун билан бир чизиқда туради. `flex-1` эмас,
            айнан `grow`: у `flex-basis: auto` ни сақлайди, шунинг учун
            блок ўз мазмунидан пастга сиқилиб қолмайди. */}
        <div className="flex min-w-0 flex-col gap-3">
          {d.product && <FactBlock tone="var(--s3)" block={d.product} />}
          {d.readiness && (
            <FactBlock className={d.product ? "grow" : "h-full"} tone="var(--s2)" block={d.readiness} />
          )}
          {!d.product && !d.readiness && (
            <Card className="h-full" title={<BlockHead tone="var(--rule)">Маҳсулот ва тайёргарлик</BlockHead>}>
              <p className="mt-1 border-t border-grid pt-2 text-[12px] leading-[1.5] text-ink-3">
                Реестрда бу лойиҳа учун на маҳсулот, на ҳужжат тайёргарлиги устунлари
                тўлдирилган — шунинг учун бу ерда бўш жадвал чизилмади.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* --- 4. инфратузилма ------------------------------------------------- */}
      {d.infra && (
        <Card
          className="mt-3"
          title={<BlockHead tone="var(--rule)">{d.infra.title}</BlockHead>}
          sub={`${nf(d.infra.filled)} / ${nf(d.infra.facts.length)} тўлдирилган`}
        >
          {/* Ўн иккита катак битта устунда узун тасмага айланарди — улар
              кенг блокда уч устунга ёйилади. Тартиб устун бўйлаб эмас,
              қатор бўйлаб: тармоқ ва унинг эҳтиёжи ёнма-ён турсин. */}
          <dl className="mt-1 grid grid-cols-1 gap-x-8 mid:grid-cols-2 wide:grid-cols-3">
            {d.infra.facts.map((f) => (
              <div
                key={f.k}
                className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-grid py-[7px] text-[12.5px]"
              >
                <dt className="w-[150px] flex-none text-ink-3">{f.k}</dt>
                <dd className="min-w-0 flex-1 break-words">{f.v === null ? <Muted /> : f.v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* --- 5. тавсиф тасмаси ----------------------------------------------- */}
      {d.strip.length > 0 && (
        <Card className="mt-3" title={<BlockHead tone="var(--rule)">Лойиҳа тавсифи</BlockHead>}>
          <div className="mt-1 flex flex-wrap gap-x-10 gap-y-3 border-t border-grid pt-2.5">
            {d.strip.map((f) => (
              <StripItem key={f.k} f={f} />
            ))}
          </div>
        </Card>
      )}

      {d.missing.length > 0 && (
        <p className="mt-3 text-[11.5px] leading-[1.5] text-ink-3">
          Реестрда бу лойиҳа учун умуман тўлдирилмаган бўлимлар: {d.missing.join(", ")}.
        </p>
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
