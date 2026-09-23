import { useMemo, useState } from "react";
import { getMapObjects } from "../api/endpoints";
import { ErrorState, NotAvailableState, Skeleton } from "../components/states";
import { mapVM, type MapOffItem, type MapPin } from "../lib/adapters/mapObjects";
import { nf } from "../lib/format";
import { useQuery } from "../lib/useQuery";
import { MapCanvas } from "../panels/investMap/MapCanvas";

/**
 * `/investmap` — хаританинг АЛОҲИДА саҳифаси.
 *
 * ═══ Нега таб эмас, алоҳида йўл ═════════════════════════════════════════
 *
 * Харита дашборднинг бир бўлими эмас: у мустақил экран сифатида ишлатилади
 * (ситуацион марказ деворида, тақдимотда, алоҳида ойнада). Шунинг учун унда
 * дашборднинг қобиғи — сарлавҳа, таблар қатори, давр танлагичи — умуман
 * йўқ: экраннинг ҳаммаси харитага берилади.
 *
 * ═══ Манба: реестр эмас, бэкенд ═════════════════════════════════════════
 *
 * Аввал бу саҳифа бандл ичидаги реестрдан (`lib/invest/investSource.ts`) ва
 * қўлда ёзилган координата жадвалидан 7 та нуқта чизарди. Энди манба —
 * `GET /map/objects`: **192 объект**, уччала қатлам аралаш (заводлар,
 * геология лойиҳалари ва лойиҳалар реестри — 144 лойиҳа).
 *
 * ⚠️ Шу сабабли саҳифа энди **ТОКЕН ТАЛАБ ҚИЛАДИ** (`UniversalAuthGuard`).
 * Илгари у токенсиз ишларди ва `App` уни токен дарвозасидан олдин
 * қайтарарди — бу ҳолат `App.tsx` да тузатилди.
 *
 * ═══ Ҳеч нарса жимгина йўқолмайди ═══════════════════════════════════════
 *
 * Уч хил «кўринмаслик» бор ва уччаласи ҳам экранда очиқ айтилади:
 *
 *   1. **Координатаси йўқ объект** (жонли жавобда 19 та: 8 геология +
 *      11 реестр лойиҳаси) — харитада нуқта бўлолмайди. У пастдаги
 *      рўйхатда алоҳида гуруҳда туради;
 *   2. **Тахминий жой** (вилоят маркази ёки мерос) — маркер узуқ ҳалқа
 *      билан белгиланади, сабаби эса карточкада ёзилади;
 *   3. **Сиғмаган ёрлиқ** — ном яширилган, лекин объект кўринади; сони
 *      харита остида ёзилади ва номи рўйхатда, изоҳда ва карточкада қолади.
 */
export function InvestMapPage() {
  const q = useQuery("map/objects", (signal) => getMapObjects(signal));
  const base = import.meta.env.BASE_URL;
  const vm = useMemo(() => (q.data === null ? null : mapVM(q.data, base)), [q.data, base]);

  const [selected, setSelected] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  // Рўйхатдан танлаш: карточка очилади ВА харита маркерга учиб боради.
  // Маркернинг ўзи босилганда харита силжимайди — қаранг: `focusNonce`.
  const pick = (id: string) => {
    setSelected(id);
    setFocusNonce((n) => n + 1);
  };

  if (q.notAvailable || (q.error && q.data === null) || vm === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-5 py-10">
        {q.notAvailable ? (
          <NotAvailableState what="GET /map/objects" />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : (
          <Skeleton height={240} />
        )}
      </main>
    );
  }

  const unknown = vm.legend.filter((l) => l.unknown);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-sunken">
      <MapCanvas
        fill
        vm={vm}
        selected={selected}
        onSelect={setSelected}
        focusNonce={focusNonce}
      />

      {/* Сарлавҳа — экраннинг ЮҚОРИ ЎРТАСИДА, харита устида. Босилмайдиган
          қатлам: сичқонча ости харитага ўтиб кетади, шунда суриш ҳалақит
          бермайди. */}
      <header className="map-page__head">
        <h1 className="map-page__title">Лойиҳалар ва объектлар харитаси</h1>
      </header>

      {/* Рўйхат — «номи йўқолмасин» кафолати. Ёрлиғи сиғмаган ва
          координатаси умуман йўқ объектлар АЙНАН шу ерда топилади. */}
      <ObjectList
        open={listOpen}
        onToggle={() => setListOpen((v) => !v)}
        pins={vm.pins}
        offMap={vm.offMap}
        selected={selected}
        onPick={pick}
      />

      {/* Легенда — маркер рангининг калити. Ранг ёлғиз маъно ташувчи эмас:
          ёнида доим қатламнинг номи ва объектлар сони ёзилади. */}
      <div className="map-page__legend">
        {vm.legend.map((l) => (
          <span key={l.type} className="map-page__legend-item">
            <i aria-hidden="true" style={{ background: l.token }} />
            {l.name}
            <b>{nf(l.count)} та</b>
            {l.offCount > 0 && <em>· {nf(l.offCount)} таси харитасиз</em>}
            {l.unknown && <em>· жадвалда йўқ қатлам</em>}
          </span>
        ))}

        {/* Маълумот сифати — яширилмайди. Ҳар бир сон бэкенд жавобидан. */}
        <span className="map-page__warn">
          {vm.withoutCoords > 0 &&
            `${nf(vm.withoutCoords)} объектда координата йўқ (жами ${nf(vm.total)} тадан ${nf(vm.pins.length)} таси харитада) · рўйхатда кўрсатилган`}
          {vm.approxCount > 0 && ` · ${nf(vm.approxCount)} нуқта тахминий (узуқ ҳалқа)`}
          {vm.displacedCount > 0 &&
            ` · ${nf(vm.displacedCount)} белги сервер томонида устма-устликдан ажратилган`}
          {vm.factoryNote !== null && ` · ${vm.factoryNote}`}
          {unknown.length > 0 && ` · ${nf(unknown.length)} қатлам ранг жадвалида йўқ`}
        </span>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* объектлар рўйхати                                                          */
/* -------------------------------------------------------------------------- */

interface ObjectListProps {
  open: boolean;
  onToggle: () => void;
  pins: MapPin[];
  offMap: MapOffItem[];
  selected: string | null;
  onPick: (id: string) => void;
}

/**
 * Чап томондаги йиғиладиган рўйхат.
 *
 * ═══ Нега керак ═════════════════════════════════════════════════════════
 *
 * Харитада 192 объект бор, ёрлиқлар эса тўқнашганда яширилади (қаранг:
 * `MapCanvas` → `layoutLabels`). Шунинг учун «ҳар бир объектнинг номи
 * йўқолмасин» талаби фақат хаританинг ўзи билан бажарилмайди — рўйхат
 * ўша кафолатнинг иккинчи ярми: у ДОИМ тўлиқ, зумга ҳам, тўқнашувга ҳам
 * боғлиқ эмас.
 *
 * Устига координатаси йўқ объектлар (жонли жавобда 19 та) фақат шу ерда
 * кўринади: улар харитага нуқта сифатида умуман тушолмайди.
 *
 * Бошланғич ҳолати — ЁПИҚ: харита ситуацион марказ деворида очилганда
 * экраннинг ҳаммаси харитага берилиши керак.
 */
function ObjectList({ open, onToggle, pins, offMap, selected, onPick }: ObjectListProps) {
  // Гуруҳлар тартиби — маркерлар тартиби, яъни жавобдаги тартиб. Алифбо
  // бўйича қайта тизилмайди: манбадаги тартиб ўзи маънога эга (қатлам
  // бўйича гуруҳланган).
  const groups = useMemo(() => {
    const by = new Map<string, { name: string; token: string; items: MapPin[] }>();
    for (const p of pins) {
      const got = by.get(p.type);
      if (got) got.items.push(p);
      else by.set(p.type, { name: p.layerName, token: p.token, items: [p] });
    }
    return [...by.values()];
  }, [pins]);

  return (
    <div className={"map-list" + (open ? " map-list--open" : "")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="map-list__toggle">
        {open ? "Рўйхатни ёпиш ✕" : `Объектлар рўйхати (${nf(pins.length + offMap.length)} та)`}
      </button>

      {open && (
        <div className="map-list__body">
          {groups.map((g) => (
            <section key={g.name} className="map-list__group">
              <h2 className="map-list__head">
                <i aria-hidden="true" style={{ background: g.token }} />
                {g.name}
                <b>{nf(g.items.length)} та</b>
              </h2>
              <ul>
                {g.items.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p.id)}
                      aria-current={selected === p.id || undefined}
                      className={"map-list__item" + (selected === p.id ? " is-on" : "")}
                    >
                      {/* Тўлиқ ном — қисқартирилмаган. Ёрлиқда у кесилиши
                          мумкин, бу ерда эса ҳеч қачон. */}
                      <span className="map-list__name">{p.name}</span>
                      <span className="map-list__sub">
                        {p.region}
                        {p.place.approx && " · жойи тахминий"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* Координатаси йўқ объектлар — босилмайди, чунки харитада уларга
              учиб бориладиган нуқта ЙЎҚ. Сабаби ёнида ёзилган. */}
          {offMap.length > 0 && (
            <section className="map-list__group">
              <h2 className="map-list__head map-list__head--off">
                Харитада кўрсатиб бўлмайди
                <b>{nf(offMap.length)} та</b>
              </h2>
              <p className="map-list__note">
                Базада бу объектларнинг координатаси йўқ, шунинг учун улар нуқта сифатида
                чизилмайди. Маълумотнинг қолган қисми жойида.
              </p>
              <ul>
                {offMap.map((o) => (
                  <li key={o.id}>
                    <span className="map-list__item map-list__item--off">
                      <span className="map-list__name">{o.name}</span>
                      {/* Реестр лойиҳаси учун бэкенд берган аниқ САБАБ
                          кўрсатилади (масалан «Ҳудуди» бўш, «Республика
                          ҳудудида» — жой номи эмас), геологияда эса ҳудуд:
                          иккови ҳам «нега харитада йўқ» саволига жавоб. */}
                      <span className="map-list__sub">
                        {o.layerName} · {o.reason ?? o.region}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
