import { Card } from "../../components/Card";
import { GRID } from "../../components/layout";
import { Pill } from "../../components/Pill";
import { EmptyState } from "../../components/states";
import { nf } from "../../lib/format";
import type { RegMapVM } from "../../lib/adapters/registryMap";
import { MapCanvas } from "../investMap/MapCanvas";

/**
 * «Лойиҳалар географияси» — реестр бўлимидаги харита.
 *
 * ═══ Харита ЯНГИДАН ёзилмади ════════════════════════════════════════════
 *
 * Бу компонент `panels/investMap/MapCanvas` ни АЙНАН шундайлигича ишлатади:
 * MapLibre қатлами, маркер геометрияси, ёрлиқ тўқнашуви ва карточка
 * аллақачон бор ва экранда ўлчанган. Фарқ фақат маълумотда, у эса
 * `lib/adapters/registryMap.ts` да — панел API тузилмасини билмайди.
 *
 * ═══ Битта маркер = битта НУҚТА ═════════════════════════════════════════
 *
 * Реестрдаги координата `Ҳудуди` устунидаги матндан аниқланган маъмурий
 * марказ, шунинг учун 133 лойиҳа атиги 20 та нуқтада туради (фақат Чирчиқда
 * 63 та). Ҳар бир лойиҳага алоҳида маркер чизилса, экранда учта белги
 * кўринарди ва у ЁЛҒОН бўларди. Шунинг учун маркер — нуқтадаги лойиҳалар
 * тўплами, сони эса ёрлиқда, карточкада ва легендада ёзилади.
 *
 * ═══ Маркер босилганда ══════════════════════════════════════════════════
 *
 * Иккита нарса бирга бўлади: нуқтадаги БАРЧА лойиҳалар модал ойнада
 * очилади (`RegistryPlaceModal`, панел чизади) ва пастдаги лойиҳалар
 * рўйхати шу нуқтага фильтрланади (`RegFilter.places`). Хаританинг бўш
 * жойи босилса иккови ҳам бекор бўлади.
 *
 * ⚠️ Бу ерда `MapCanvas` нинг ўз карточкаси АТАЙИН ўчирилган
 * (`pinClick="select"`). Карточка хаританинг ичида туради ва ундан баланд
 * бўлолмайди — 63 лойиҳали нуқтада у номларни олтитадан кейин «яна 57 та»
 * деб кесарди. `/investmap` саҳифасида эса карточка ЖОЙИДА қолади: у ерда
 * битта маркер — битта объект (47 та) ва карточка унга етарли. Фарқ фақат
 * пропда, шунинг учун иккала саҳифа бир-бирига таъсир қилмайди.
 */
export function RegistryMap({
  vm,
  selected,
  onSelect,
  onOpen,
}: {
  vm: RegMapVM;
  /** Танланган нуқта калити (`RegProject.placeKey`); `null` — танланмаган. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Лойиҳа тафсилоти ойнасини очиш. */
  onOpen: (id: number) => void;
}) {
  const total = vm.onMap + vm.offCount;

  return (
    <div className={GRID.g32}>
      <div className="min-w-0">
        {vm.pins.length === 0 ? (
          <EmptyState
            title="Харитада кўрсатиладиган нуқта йўқ"
            text="Реестрдаги биронта лойиҳанинг «Ҳудуди» устунидан координата аниқланмади."
          />
        ) : (
          <MapCanvas
            vm={vm}
            selected={selected}
            onSelect={onSelect}
            // Рўйхатдан маркерга «учиб бориш» бу бўлимда йўқ: танлов фақат
            // хаританинг ўзидан бошланади, шунинг учун сигнал доим 0.
            focusNonce={0}
            // Карточка ўрнига модал ойна — қаранг: файл бошидаги изоҳ.
            pinClick="select"
          />
        )}

        {/* Легенда — ранг калити. Ранг ЁЛҒИЗ маъно ташувчи эмас: ёнида
            даража номи, оралиғи ва иккита сон туради. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {vm.buckets.map((b) => (
            <span key={b.key} className="inline-flex items-baseline gap-1.5 text-[11.5px]">
              <i
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 flex-none translate-y-[1px] rounded-sm"
                style={{ background: b.token }}
              />
              <span className="text-ink-2">{b.name}</span>
              <span className="text-ink-3">({b.range})</span>
              <span className="font-mono tabular-nums text-ink-3">
                {nf(b.places)} нуқта · {nf(b.projects)} лойиҳа
              </span>
            </span>
          ))}
        </div>

        {/* Нуқтанинг маъноси — БИР МАРТА, қисқа. Усиз харита «ҳар бир белги —
            лойиҳанинг аниқ жойи» деб ўқилар ва ёлғон аниқлик ваъда қиларди. */}
        <p className="mt-2 border-t border-grid pt-2 text-[11.5px] leading-[1.5] text-ink-3">
          Нуқта — реестрнинг «Ҳудуди» устунидаги матндан аниқланган{" "}
          <b className="font-semibold text-ink-2">туман ёки шаҳар маркази</b>, лойиҳанинг ўз жойи
          эмас: шунинг учун ҳар бир маркер узуқ ҳалқа билан белгиланган. Битта маркер —{" "}
          <b className="font-semibold text-ink-2">нуқтадаги лойиҳалар тўплами</b>: {nf(vm.onMap)}{" "}
          лойиҳа {nf(vm.places)} та нуқтада турибди, энг зичида {nf(vm.densest)} та. Маркер
          босилса ўша нуқтадаги{" "}
          <b className="font-semibold text-ink-2">барча лойиҳалар ойнада</b> очилади — рўйхат
          қисқартирилмайди.
          {vm.multiRegion > 0 && (
            <>
              {" "}
              ⚠ {nf(vm.multiRegion)} лойиҳада манбада бир нечта ҳудуд аталган — нуқта
              БИРИНЧИСИНИКИ, қолгани харитада кўринмайди.
            </>
          )}
        </p>
      </div>

      <Card
        title="Харитада кўрсатиб бўлмайди"
        sub={`${nf(vm.offCount)} / ${nf(total)} лойиҳа`}
        note="Бу лойиҳаларда «Ҳудуди» устунида жой номи йўқ, шунинг учун уларга нуқта берилмайди. Координата номидан ТАХМИН ҚИЛИНМАЙДИ — ўйлаб топилган жой хатодан ёмонроқ."
      >
        {vm.offMap.length === 0 ? (
          <EmptyState title="Барча лойиҳа харитада" />
        ) : (
          vm.offMap.map((g) => (
            <div key={g.key} className="mt-2.5 border-t border-grid pt-2 first:mt-0 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="min-w-0 flex-1 text-[12px] [font-weight:650] break-words">
                  {g.region ?? "«Ҳудуди» устуни бўш"}
                </span>
                <Pill status={g.actionable ? "warn" : "mute"}>{nf(g.rows.length)} та</Pill>
              </div>
              <p className="mt-0.5 text-[11px] leading-[1.4] text-ink-3">{g.reason}</p>
              <ul className="mt-1 flex flex-col gap-0.5 border-l border-rule pl-2.5">
                {g.rows.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(p.id)}
                      className="w-full cursor-pointer text-left text-[11.5px] leading-[1.35] text-ink-2 hover:text-ink"
                    >
                      {p.ordinal !== null && (
                        <span className="mr-1.5 font-mono text-[10.5px] tabular-nums text-ink-3">
                          {nf(p.ordinal)}
                        </span>
                      )}
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
