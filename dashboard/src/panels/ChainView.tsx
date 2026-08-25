import { useId, useMemo, useState } from "react";
import type { PanelProps } from "../types";
import type { ChainStepVM } from "../lib/adapters/chain";
import { getChain } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { chainLayout, chainMonth, chainView, chainWhyMute } from "../lib/adapters/chain";
import { exact, monthLabel, pctTxt } from "../lib/format";
import { Card, Section } from "../components/Card";
import { Pill } from "../components/Pill";
import { SegmentSwitch } from "../components/SegmentSwitch";
import { StatusMix, StatusMixLegend } from "../components/StatusMix";
import {
  CHAIN_LEVEL_ALL,
  ChainInspector,
  ChainLegend,
  ChainMap,
  chainLevelOptions,
} from "../components/ChainFlow";
import { TableToggle } from "../components/TableToggle";
import { Loader } from "../components/states";

/**
 * «Цехлар занжири» — хомашёдан тайёр маҳсулотгача бўлган бутун комбинат
 * технологик оқими: 43 босқич + 3 ресурс, 5 даража, 12 сех, устига омбор,
 * чиқинди ва тўхташлар.
 *
 * Бўлим **битта боғланган оқим харитаси** сифатида қурилган: асосий вазн
 * стрелкаларда ва боғланишларда, тугунлар эса атайлаб кичик (ном + факт +
 * режа + %). Босқичнинг қолган тафсилоти — жараён, чиқинди, ресурс сарфи,
 * эҳтимолий кириш — харита остидаги инспекторда, босқич танланганда чиқади.
 * Шу сабабли экран карточкалар тўрига айланмайди ва оқим бутун кенгликка
 * ёйилади.
 *
 * ─── Уч фильтр, уччаласи бошқа саволга ────────────────────────────────────
 *
 *  · **Давр** (юқоридаги умумий танлагич) — серверга қайси ойлар сўралиши;
 *  · **Занжир ойи** — шулардан қайси бири чизилиши. Занжир **битта ойни**
 *    кўрсатади: босқичлар турли бирликда (т, кг, м³, шт, соат) ва айримлари
 *    қолдиқ, шунинг учун қийматларни ойлар бўйича қўшиб бўлмайди;
 *  · **Уровень** — қайси технологик даража чизилиши. «Все» да ҳамма даража
 *    битта боғланган занжирда қолади, боғланишлар узилмайди.
 *
 * Уччаласи бир-бирини алмаштирмайди: давр қайси ойлар келишини, ой қайси
 * бири чизилишини, даража эса қайси босқичлар кўринишини белгилайди.
 *
 * ─── «Металлар баланси» билан алмаштирилмайди ─────────────────────────────
 *
 * Баланс W/Mo/Re занжирларини **металл кесимида** беради, бу кўриниш эса
 * ўшаларнинг ҳаммасини битта оқимда кўрсатиб, устига 10ц/35ц, омбор,
 * чиқинди ва тўхташларни ҳам қўшади. Иккиси турли саволга жавоб беради:
 * баланс — «металл бўйича қанча», занжир — «жараён қандай кетади». Улар
 * бир вақтда чизилмайди, шунинг учун битта босқич экранда икки марта
 * турмайди.
 */
export function ChainView({ period, months }: PanelProps) {
  const uid = useId();
  const key = `${period.from}_${period.to}`;
  const q = useQuery(`chain_${key}`, (s) => getChain(period, s));
  const [picked, setPicked] = useState<string | null>(null);
  const [levelId, setLevelId] = useState<string>(CHAIN_LEVEL_ALL);
  const [pickedStep, setPickedStep] = useState<string | null>(null);

  // Танлов даврдан ташқарида қолса ўзи охирги ойга қайтади — эффект керак эмас.
  const month = q.data ? chainMonth(q.data, picked) : null;
  const vm = useMemo(
    () => (q.data && month ? chainView(q.data, month) : null),
    [q.data, month],
  );

  const level = levelId === CHAIN_LEVEL_ALL ? null : Number(levelId);
  const layout = useMemo(() => (vm ? chainLayout(vm, level) : null), [vm, level]);

  // Танланган босқич фильтрдан чиқиб қолса — инспектор ўзи бўшайди, лекин
  // танлов эсда қолади: фильтр қайтарилса яна ажратиб кўрсатилади.
  const pickedNode = pickedStep ? (layout?.byId.get(pickedStep) ?? null) : null;

  const refInRange = q.data ? q.data.months.includes(q.data.reference) : false;

  return (
    <Section
      title="Цехлар занжири"
      note={
        vm
          ? `${monthLabel(vm.month)} · ${vm.counts.total} босқич · босқичлар орасида қиймат қўшилмайди, ҳар бири ўз бирлигида`
          : "хомашёдан тайёр маҳсулотгача"
      }
    >
      {vm && (
        <div className="mb-2.5">
          <SegmentSwitch
            label="Технологик даража"
            options={chainLevelOptions(vm.levels, vm.steps.length)}
            value={levelId}
            onChange={setLevelId}
          />
        </div>
      )}

      {vm && vm.months.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <label
            htmlFor={`${uid}-month`}
            className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
          >
            Занжир ойи
          </label>
          <select
            id={`${uid}-month`}
            value={vm.month}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Занжир кўрсатиладиган ой"
          >
            {vm.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
                {m === vm.reference ? " · эталон" : ""}
              </option>
            ))}
          </select>
          {refInRange && (
            <button
              type="button"
              disabled={vm.month === vm.reference}
              onClick={() => setPicked(vm.reference)}
              className={
                "rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold " +
                (vm.month === vm.reference
                  ? "cursor-not-allowed text-ink-3 opacity-55"
                  : "cursor-pointer text-ink-2 hover:text-ink")
              }
            >
              Эталон ой: {monthLabel(vm.reference)}
            </button>
          )}
          <span className="text-[11.5px] text-ink-3">
            {months.length > 1
              ? `танланган давр ${months.length} ойни қамрайди — занжир шулардан биттасини кўрсатади`
              : "эталон ой — босқич номлари шу варақдан олинган"}
          </span>
        </div>
      )}

      <Loader
        q={q}
        height={320}
        notAvailableWhat="/chain"
        isEmpty={() => !vm || vm.steps.length === 0 || !vm.hasValues}
        emptyTitle={
          vm && vm.steps.length > 0
            ? `${monthLabel(vm.month)} учун занжир маълумоти йўқ`
            : "Ушбу давр учун занжир маълумоти йўқ"
        }
        emptyText="Юқоридаги «Занжир ойи» рўйхатидан бошқа ойни танланг."
      >
        {() =>
          vm &&
          layout && (
            <>
              {/* Ҳолат тақсимоти — харитадан олдин битта тор қатор: карточка
                  тўри ясалмайди, оқим экраннинг асосий элементи бўлиб қолади. */}
              <div className="mb-2.5 flex flex-col gap-2.5 mid:flex-row mid:items-center mid:gap-5">
                <div className="min-w-0 flex-1">
                  <StatusMix counts={layout.counts} height={10} />
                </div>
                <div className="flex flex-none flex-wrap items-center gap-1.5">
                  <Pill>
                    {layout.nodes.length} босқич · {layout.edges.length} боғланиш
                  </Pill>
                  {layout.inputUnknownCount > 0 && (
                    <Pill status="warn">{layout.inputUnknownCount} та кириши аниқланмаган</Pill>
                  )}
                  {layout.unavailableCount > 0 && (
                    <Pill>{layout.unavailableCount} та режа/факт юритилмайди</Pill>
                  )}
                </div>
              </div>

              <div className="mb-2.5">
                <ChainInspector node={pickedNode} onClose={() => setPickedStep(null)} />
              </div>

              <ChainMap
                layout={layout}
                picked={pickedNode ? pickedStep : null}
                onPick={setPickedStep}
              />

              <div className="mt-3">
                <Card>
                  <ChainLegend
                    counts={vm.linkCounts}
                    drawn={layout.edges.length}
                    hidden={layout.hiddenLinks}
                    inputUnknown={layout.inputUnknownCount}
                  />
                  <div className="mt-2.5 border-t border-grid pt-2.5">
                    <StatusMixLegend />
                  </div>
                </Card>
              </div>

              <div className="mt-3">
                <Card
                  title="Занжир — тўлиқ рўйхат"
                  sub={monthLabel(vm.month)}
                  note="Жадвалда ҳеч нарса яширилмайди: аномал фоиз қисқартирилмайди, маълумоти йўқ катаклар «—» билан белгиланади ва нолга айлантирилмайди. Даража фильтри жадвалга таъсир қилмайди — ресурс сарфи қаторлари ҳам шу ерда."
                >
                  <ChainTable rows={vm.all} />
                </Card>
              </div>
            </>
          )
        }
      </Loader>
    </Section>
  );
}

function ChainTable({ rows }: { rows: ChainStepVM[] }) {
  return (
    <TableToggle
      caption="Цехлар занжири — босқичлар ва ресурслар"
      cols={[
        { t: "Даража", num: true },
        { t: "Босқич", wrap: true },
        { t: "Сех/участка" },
        { t: "Кириш", wrap: true },
        { t: "Чиқиш", wrap: true },
        { t: "Бирлик" },
        { t: "Режа", num: true },
        { t: "Факт", num: true },
        { t: "Бажарилиш", num: true },
        { t: "Изоҳ", wrap: true },
      ]}
      rows={rows.map((s) => {
        const c = s.cell;
        const why = chainWhyMute(s);
        return {
          key: s.id,
          cells: [
            s.level,
            s.stage,
            s.site,
            s.inputKnown ? s.input : `${s.input} (аниқланмаган)`,
            s.output,
            s.unit,
            c?.plan == null ? "—" : exact(c.plan),
            c?.fakt == null ? "—" : exact(c.fakt),
            pctTxt(c?.pct ?? null),
            [why, s.hasLimit ? "⚠ манбада чеклов қайд этилган" : null].filter(Boolean).join(" · ") ||
              "—",
          ],
        };
      })}
    />
  );
}
