import { exact, nf } from "../../lib/format";
import { NO_DATA, type RegProject } from "../../lib/adapters/projectRegistry";
import type { RegMapPlace, RegMapPlaceGroup } from "../../lib/adapters/registryMap";
import { Modal } from "../../components/Modal";
import { Fact, Muted, Num } from "./parts";

/**
 * Харитадаги битта НУҚТАнинг тўлиқ мазмуни — модал ойнада.
 *
 * ═══ Нега ойна, харита устидаги карточка эмас ═══════════════════════════
 *
 * Реестрдаги координата «Ҳудуди» устунидаги матндан аниқланган маъмурий
 * марказ, шунинг учун 133 лойиҳа атиги 20 та нуқтада туради ва уларнинг
 * бирида — Чирчиқ шаҳрида — 63 таси бирга турибди.
 *
 * Аввал маркер босилганда харита УСТИДА кичик карточка очиларди. У
 * хаританинг ичида, яъни ундан баланд бўлолмайдиган элемент эди, шунинг
 * учун олтита номдан кейин «яна 57 та» деб тўхтарди: экранда нуқтадаги
 * маълумотнинг 10% и кўриниб, 90% и яширин қоларди. Ойна саҳифанинг
 * устида туради ва ўз ичида сурилади — чегаранинг сабаби ҳам йўқолди,
 * шунинг учун бу ерда рўйхат ҲЕЧ ҚАЕРДА кесилмайди.
 *
 * ═══ Тузилиш ════════════════════════════════════════════════════════════
 *
 *  1. Сарлавҳа — жой номи, даражаси ва координатаси;
 *  2. Тўртта кўрсаткич — нуқтанинг ЙИҒМА ҳолати;
 *  3. Нуқтанинг маъноси (маъмурий марказ) — яширилмайди;
 *  4. Устун сарлавҳалари (ёпишқоқ) ва кластер бўйича гуруҳланган
 *     лойиҳалар — ҳаммаси, биттаси ҳам қолмасдан.
 *
 * ═══ Яхлитлаш ═══════════════════════════════════════════════════════════
 *
 * Манбадаги сон — `exact()` (`parts.tsx` даги `Num` шуни ишлатади), яъни
 * ҳар бир лойиҳанинг ўз қиймати реестрдагидек чиқади. Бу ерда ҲИСОБЛАНГАН
 * сонлар ҳам бор (нуқтадаги ва кластердаги йиғинди) — улар `nf(v, 2)`
 * билан, чунки улар манбада умуман йўқ ва қўшишдан ҳосил бўлган.
 *
 * ═══ «Кўрсатилмаган» ≠ «0» ══════════════════════════════════════════════
 *
 * 144 лойиҳанинг 44 тасида иш ўрни, 46 тасида ишга тушириш санаси
 * умуман ёзилмаган. Бўш катак нол билан ҳам, жимгина чизиқча билан ҳам
 * тўлдирилмайди: бўлимнинг қолган қисми билан БИР ХИЛ сўз ишлатилади
 * (`parts.tsx` → `Muted`, `NO_DATA`), ва йиғинди ёнида доим нечта
 * лойиҳадан олингани туради.
 */

/**
 * Устун кенгликлари — сарлавҳа ва қатор БИТТА манбадан олади.
 *
 * Иккови алоҳида ёзилса, биттасини ўзгартирганда иккинчиси сурилиб
 * қолар ва жадвал сонларни бошқа устун тагида кўрсатарди.
 */
const COL = {
  no: "w-[34px] flex-none",
  cost: "w-[124px] flex-none text-right",
  jobs: "w-[124px] flex-none text-right",
  deadline: "w-[148px] flex-none",
  launch: "w-[148px] flex-none",
};

/** Қатор ва сарлавҳа учун умумий ёйилиш — иккови бир хил бўлиши шарт. */
const LINE = "flex w-full items-baseline gap-x-3";

/* -------------------------------------------------------------------------- */
/* битта лойиҳа                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Қаторнинг экран ўқувчи учун матни.
 *
 * Устун сарлавҳалари ЁПИШҚОҚ ва улар `aria-hidden` — ёрлиқ билан катакни
 * боғлаб турадиган жадвал тузилмаси бу ерда йўқ (қатор — тугма). Шунинг
 * учун сон ёнида нима экани АЙТИЛАДИ: усиз ўқувчи «67 · 45 · 200 · 2026»
 * деган боғланмаган сонлар кетма-кетлигини эшитарди.
 */
function rowLabel(p: RegProject): string {
  return [
    p.ordinal === null ? null : `Т/р ${nf(p.ordinal)}`,
    p.name,
    `Йўналиш: ${p.direction ?? NO_DATA}`,
    `Тури: ${p.kind}`,
    `Қиймати: ${p.totalCost === null ? NO_DATA : `${exact(p.totalCost)} млн доллар`}`,
    `Иш ўринлари: ${p.jobs === null ? NO_DATA : `${exact(p.jobs)} та`}`,
    `Муддати: ${p.deadline ?? NO_DATA}`,
    `Ишга тушириш: ${p.commissioning ?? NO_DATA}`,
  ]
    .filter((s): s is string => s !== null)
    .join(". ");
}

function ProjectLine({ p, onOpen }: { p: RegProject; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      aria-label={rowLabel(p)}
      className={
        LINE +
        " cursor-pointer border-t border-grid px-1 py-[7px] text-left first:border-t-0 hover:bg-surface-2"
      }
    >
      <span className={COL.no + " font-mono text-[11px] tabular-nums text-ink-3"}>
        {p.ordinal === null ? "—" : nf(p.ordinal)}
      </span>

      <span className="min-w-0 flex-1">
        {/* Ном ҚИСҚАРТИРИЛМАЙДИ: реестрда 156 белгигача номлар бор ва улар
            бир нечта қаторга ёйилади — кесилгандан кўра узун бўлгани яхши. */}
        <span className="block text-[12.5px] leading-[1.35] [font-weight:600] break-words">
          {p.name}
        </span>
        <span className="mt-[3px] block text-[11px] leading-[1.35] break-words text-ink-3">
          {/* Йўналиш 144 лойиҳанинг 65 тасида умуман йўқ — бу ҳам маълумот,
              шунинг учун ёзиб қўйилади. */}
          {p.direction ?? "йўналиш кўрсатилмаган"} · {p.kind}
        </span>
      </span>

      <span className={COL.cost + " font-mono text-[12px] tabular-nums"}>
        <Num v={p.totalCost} />
      </span>
      <span className={COL.jobs + " font-mono text-[12px] tabular-nums"}>
        <Num v={p.jobs} />
      </span>
      <span className={COL.deadline + " text-[11.5px] leading-[1.35] break-words"}>
        {p.deadline ?? <Muted />}
      </span>
      <span className={COL.launch + " text-[11.5px] leading-[1.35] break-words"}>
        {p.commissioning ?? <Muted />}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* битта кластер                                                              */
/* -------------------------------------------------------------------------- */

function Group({ g, onOpen }: { g: RegMapPlaceGroup; onOpen: (id: number) => void }) {
  return (
    <section className="mt-3.5 first:mt-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-rule pb-1">
        {g.clusterNo && (
          <span className="flex-none font-mono text-[10.5px] text-ink-3">{g.clusterNo}</span>
        )}
        <span className="min-w-0 flex-1 text-[11.5px] [font-weight:650] tracking-[0.04em] break-words text-ink-2 uppercase">
          {g.cluster}
        </span>
        {/* Кластердаги йиғинди — ҲИСОБЛАНГАН, шунинг учун `nf(v, 2)`. Ёнида
            доим нечта лойиҳадан олингани туради, йиғинди умуман чиқмаса эса
            ЖИМ қолинмайди: «кўрсатилмаган» деб ёзилади. Акс ҳолда устун
            йўқолиб, сони кам кўринган кластер «арзон» бўлиб қоларди. */}
        <span className="flex-none font-mono text-[11px] tabular-nums text-ink-3">
          {nf(g.projects)} та ·{" "}
          {g.totalCost === null
            ? "қиймати кўрсатилмаган"
            : `${nf(g.totalCost, 2)} млн $ (${nf(g.totalCostFilled)}/${nf(g.projects)})`}{" "}
          ·{" "}
          {g.jobs === null
            ? "иш ўрни кўрсатилмаган"
            : `${nf(g.jobs)} иш ўрни (${nf(g.jobsFilled)}/${nf(g.projects)})`}
        </span>
      </div>
      {g.rows.map((p) => (
        <ProjectLine key={p.id} p={p} onOpen={onOpen} />
      ))}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* ойна                                                                        */
/* -------------------------------------------------------------------------- */

export interface RegistryPlaceModalProps {
  place: RegMapPlace;
  /** Битта лойиҳанинг тафсилот ойнасини очиш. */
  onOpenProject: (id: number) => void;
  onClose: () => void;
}

export function RegistryPlaceModal({ place, onOpenProject, onClose }: RegistryPlaceModalProps) {
  // Энг йирик кластер — «Кластерлар» катагининг изоҳи учун. Гуруҳлар
  // манбадаги тартибда, шунинг учун энг йириги қидириб топилади.
  const biggest = place.groups.reduce<RegMapPlaceGroup | null>(
    (best, g) => (best === null || g.projects > best.projects ? g : best),
    null,
  );

  return (
    <Modal
      width="xl"
      title={place.name}
      sub={
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {/* Ранг ёлғиз маъно ташувчи эмас: ёнида даражанинг НОМИ ёзилади —
              легендадаги билан бир хил сўз. */}
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 flex-none translate-y-[1px] rounded-sm"
              style={{ background: place.token }}
            />
            {place.bucket}
          </span>
          <span>
            {nf(place.projects)} лойиҳа · {nf(place.clusters)} кластер
          </span>
          <span className="font-mono tabular-nums">
            {place.lat}, {place.lon}
          </span>
        </span>
      }
      onClose={onClose}
      foot={
        <>
          <span className="min-w-0 flex-1 text-[11.5px] leading-[1.4] text-ink-3">
            Пастдаги «Лойиҳалар» рўйхати шу нуқтага фильтрланди — ойна ёпилгач ҳам шундай
            қолади, фильтрни рўйхат устидаги чипдан бекор қилиш мумкин.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-none cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[13px] py-[5px] text-[12px] font-semibold text-ink-2 hover:text-ink"
          >
            Ёпиш
          </button>
        </>
      }
    >
      {/* --- нуқтанинг йиғма ҳолати ---------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 rounded-[6px] border border-hair bg-surface-2 px-3.5 py-3 mid:grid-cols-4">
        <Fact label="Лойиҳалар" value={nf(place.projects)} unit="та" foot="нуқтадаги барчаси" />
        <Fact
          label="Умумий қиймати"
          // ҲИСОБЛАНГАН йиғинди (манбада бундай сон йўқ) — `nf(v, 2)`.
          value={place.totalCost === null ? null : nf(place.totalCost, 2)}
          unit="млн $"
          foot={`${nf(place.totalCostFilled)} / ${nf(place.projects)} лойиҳада кўрсатилган`}
        />
        <Fact
          label="Иш ўринлари"
          // Иш ўрни — бутун сон (реестрда каср қиймат йўқ), шунинг учун
          // йиғинди ҳам бутун: «704,00 та» деб ёзиш сохта аниқлик берарди.
          value={place.jobs === null ? null : nf(place.jobs)}
          unit="та"
          foot={`${nf(place.jobsFilled)} / ${nf(place.projects)} лойиҳада кўрсатилган`}
        />
        <Fact
          label="Кластерлар"
          value={nf(place.clusters)}
          unit="та"
          foot={
            biggest === null
              ? undefined
              : `энг йириги — ${biggest.cluster}: ${nf(biggest.projects)} та`
          }
        />
      </div>

      {/* Нуқтанинг маъноси — харита остидаги изоҳ билан бир хил гап. Ойна
          алоҳида контекст: уни очган фойдаланувчи харита остидаги матнни
          кўрмай турибди, шунинг учун огоҳлантириш бу ерда ҳам такрорланади. */}
      <p className="mt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
        Нуқта — реестрнинг «Ҳудуди» устунидаги матндан аниқланган{" "}
        <b className="font-semibold text-ink-2">туман ёки шаҳар маркази</b>, лойиҳаларнинг ўз
        жойи эмас: қуйидаги {nf(place.projects)} лойиҳа шу марказга боғланган, аниқ манзили
        реестрда йўқ.
        {place.multiRegion > 0 && (
          <>
            {" "}
            ⚠ Улардан <b className="font-semibold text-ink-2">{nf(place.multiRegion)}</b> тасида
            манбада бир нечта ҳудуд аталган — нуқта БИРИНЧИСИНИКИ, қолгани харитада кўринмайди.
          </>
        )}
      </p>

      {/* --- лойиҳалар ------------------------------------------------------ */}
      {/* Устун сарлавҳалари ЁПИШҚОҚ: 63 қаторни суриб ўқиётганда қайси сон
          қайси устун эканини эслаб туриш керак бўлмасин.

          `-mx-4 px-4` — фон ойнанинг ичини четдан четгача ёпади, акс ҳолда
          сурилаётган матн сарлавҳанинг ён томонидан кўриниб турарди.

          ⚠️ `-top-3` (нол ЭМАС) — `Modal` нинг мазмун идиши `py-3` билан
          ёзилган, ёпишқоқ элемент эса скроллпортнинг ПАДДИНГ қиррасига
          ёпишади. `top-0` да юқорида 12px тирқиш қоларди ва ундан
          сурилаётган қаторнинг бир бўлаги кўриниб турарди — экранда у
          «осилиб қолган» матндек ўқиларди. Манфий силжиш сарлавҳани ўша
          тирқиш устига ҳам чиқаради. `Modal` нинг ўз паддинги ЎЗГАРМАЙДИ:
          унга бошқа ойналар таянади. */}
      <div
        aria-hidden="true"
        className={
          LINE +
          " sticky -top-3 z-10 -mx-4 mt-1 border-b border-grid bg-surface px-4 pt-5 pb-1.5 text-[10.5px] tracking-[0.06em] text-ink-3 uppercase"
        }
      >
        <span className={COL.no}>Т/р</span>
        <span className="min-w-0 flex-1">Лойиҳа · йўналиш ва тури</span>
        <span className={COL.cost}>Қиймати, млн $</span>
        <span className={COL.jobs}>Иш ўринлари</span>
        <span className={COL.deadline}>Муддати</span>
        <span className={COL.launch}>Ишга тушириш</span>
      </div>

      {place.groups.map((g) => (
        <Group key={g.key} g={g} onOpen={onOpenProject} />
      ))}

      <p className="mt-3.5 border-t border-grid pt-2.5 text-[11.5px] leading-[1.5] text-ink-3">
        Рўйхат кластер бўйича гуруҳланган ва ҳеч қаерда қисқартирилмаган:{" "}
        {nf(place.projects)} лойиҳанинг ҳаммаси шу ерда. Ҳар бир қатор босилса ўша лойиҳанинг
        тўлиқ тафсилоти очилади — ундан «← ортга» билан шу рўйхатга қайтиш мумкин.
      </p>
    </Modal>
  );
}
