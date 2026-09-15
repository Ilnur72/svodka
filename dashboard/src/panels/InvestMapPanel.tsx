import { useMemo, useState } from "react";
import { investMapVM } from "../lib/adapters/investMap";
import { nf } from "../lib/format";
import { GRID } from "../components/layout";
import { Card, Section } from "../components/Card";
import { Pill } from "../components/Pill";
import { EmptyState } from "../components/states";
import { MapCanvas } from "./investMap/MapCanvas";

/**
 * «Лойиҳалар харитаси» бўлими.
 *
 * ═══ «Геология лойиҳалари» харитаси билан адашмасин ═════════════════════
 *
 * Дашбордда иккита харита бор ва улар бошқа-бошқа саволга жавоб беради:
 *
 *   · «Геология лойиҳалари» ичидаги харита — вилоятларнинг SVG контури,
 *     маркер вилоят марказида ва унда лойиҳалар СОНИ ёзилади. У «қайси
 *     вилоятда нечта лойиҳа бор» деган саволга жавоб беради;
 *   · бу бўлим — аниқ нуқтали фон харитаси: ҳар бир лойиҳанинг ўз маркери
 *     ва ўз карточкаси бор. У «фалон лойиҳа қаерда ва у нима» саволига
 *     жавоб беради.
 *
 * ═══ Нега давр танлагичига боғланмаган ══════════════════════════════════
 *
 * Манба — «Инвестиция лойиҳалари» бўлими билан битта: лойиҳалар реестри
 * (`lib/invest/investSource.ts`). Унда йил йўқ, шунинг учун панел `props`
 * олмайди ва юқоридаги `PeriodPicker` унга таъсир қилмайди.
 *
 * ═══ Координата ҳақидаги ростгўйлик ═════════════════════════════════════
 *
 * Хаританинг ўзи ҳақиқий геодезик асосда (OpenStreetMap маълумоти, EPSG:3857
 * проекцияси), лекин **еттита нуқта** аниқ эмас: реестрда координата майдони
 * умуман йўқ, фақат матнли ҳудуд номи бор, шунинг учун маркер туман
 * марказига қўйилган. Бу экранда уч жойда очиқ ёзилади: карточканинг
 * изоҳида, ҳар бир маркер карточкасидаги «тахминий жой» белгисида ва
 * пастдаги «Координаталар қандай қўйилган» блокида. Ҳеч қаерда «аниқ жой»
 * деб кўрсатилмайди.
 */

export function InvestMapPanel() {
  const vm = useMemo(() => investMapVM(), []);
  const [selected, setSelected] = useState<string | null>(null);
  // Рўйхатдан танланганда харита маркерни марказга олиб келади; маркернинг
  // ўзи босилганда эса силжимайди — шу сабабли алоҳида ҳисоблагич.
  const [focusNonce, setFocusNonce] = useState(0);

  const pickFromList = (id: string) => {
    setSelected((cur) => (cur === id ? cur : id));
    setFocusNonce((n) => n + 1);
  };

  const unknown = vm.legend.filter((l) => l.unknown);

  return (
    <>
      <Section
        title="Лойиҳалар харитаси"
        note="Инвестиция реестридаги лойиҳалар Ўзбекистон харитасида"
      >
        <Card
          title="Ўзбекистон — тунги сунъий йўлдош харитаси"
          sub={`${nf(vm.pins.length)} лойиҳа · ${nf(vm.legend.length)} тур`}
          note="Маркер лойиҳанинг аниқ координатаси эмас — реестрда координата йўқ, туман маркази олинган. Ғилдирак билан яқинлаштиринг (яқинлашганда йўллар, дарёлар ва шаҳар номлари очилади), харитани ушлаб суринг, маркерни босиб карточкасини очинг."
        >
          {vm.pins.length === 0 ? (
            <EmptyState
              title="Харитага қўйиладиган лойиҳа йўқ"
              text="Реестрдаги лойиҳаларнинг биронтаси координата жадвалида топилмади — рўйхат қуйида турибди."
            />
          ) : (
            <>
              <MapCanvas
                vm={vm}
                selected={selected}
                onSelect={setSelected}
                focusNonce={focusNonce}
              />
              {/* Легенда — маркер ранги нимани билдиришининг калити. Ранг
                  ёлғиз маъно ташувчи эмас: ёнида турнинг номи ва лойиҳалар
                  сони ёзилади. */}
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink-2">
                {vm.legend.map((l) => (
                  <span key={l.kind} className="inline-flex items-center gap-1.5">
                    <i
                      aria-hidden="true"
                      className="h-2.5 w-2.5 flex-none rounded-full"
                      style={{ background: l.token }}
                    />
                    {l.kind}
                    <span className="font-mono tabular-nums text-ink-3">{nf(l.count)} та</span>
                    {l.unknown && <span className="text-ink-3">· жадвалда йўқ тур</span>}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </Section>

      <Section
        title="Харитадаги лойиҳалар"
        note="Қаторни босинг — харита ўша маркерга бориб карточкасини очади"
      >
        <div className={GRID.g4}>
          {vm.pins.map((pin) => {
            const on = selected === pin.id;
            return (
              <button
                key={pin.id}
                type="button"
                onClick={() => pickFromList(pin.id)}
                aria-pressed={on}
                className={
                  "flex min-w-0 cursor-pointer flex-col rounded-card border bg-surface px-3 py-2.5 text-left shadow-card " +
                  (on ? "border-s1" : "border-hair hover:border-rule")
                }
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <i
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: pin.token }}
                  />
                  <span className="min-w-0 truncate text-[12.5px] [font-weight:650]">
                    {pin.short}
                  </span>
                </span>
                <span className="mt-1 text-[11px] leading-[1.35] text-ink-3">{pin.region}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Координаталар қандай қўйилган">
        <div className={GRID.g23}>
          <Card
            title="Жой — тахмин, ўлчов эмас"
            stripe="var(--warn)"
            note="Бу блок маркерларнинг аниқлиги ҳақида: хаританинг ўзи ҳақиқий, лекин еттита нуқта ўлчов натижаси эмас."
          >
            <div className="flex flex-col gap-2 border-t border-grid pt-2.5 text-[12px] leading-[1.5] text-ink-2">
              <p>
                Инвестиция лойиҳалари реестрида{" "}
                <b className="font-semibold text-ink">координата майдони умуман йўқ</b> — жой
                ҳақида ягона маълумот матнли ҳудуд номи («Тошкент вилояти Пискент тумани»).
                Шунинг учун ҳар бир маркер ўша <b className="font-semibold text-ink">туманнинг
                маркази</b>да туради, хатоси бир неча километр бўлиши мумкин.
              </p>
              <p>
                Хаританинг ўзи ҳақиқий: у OpenStreetMap маълумоти, NASA'нинг тунги ёруғлик
                мозаикаси ва баландлик моделидан йиғилади, проекцияси EPSG:3857. Яъни аниқ
                бўлмаган нарса — фон эмас, шу еттита нуқта. Шунга қарамай харита ўлчов воситаси
                сифатида ишлатилмайди: ундан масофа ҳам, майдон ҳам олинмайди.
              </p>
              <p>
                Битта туманда иккита лойиҳа бўлса (Оҳангарон ва Нуробод), туман маркази иккови
                учун бир хил бўлади ва маркерлар устма-уст тушарди. Жуфтликнинг иккинчиси бир оз
                силжитилган — <b className="font-semibold text-ink">0,02–0,04°</b>, яъни тахминан
                2–4 км: маркер барибир ўз туманининг ичида қолади. Миқдори ёнидаги рўйхатда
                ёзилган.
              </p>
              <p>
                Нуқтани тўғрилаш мумкин: харитадаги <b className="font-semibold text-ink">қалам</b>{" "}
                тугмасини босиб маркерни керакли жойга суринг. Янги координата фақат шу браузерда
                сақланади — манбага ҳам, бэкендга ҳам ёзилмайди ва бошқа фойдаланувчида
                кўринмайди. <b className="font-semibold text-ink">Тиклаш</b> тугмаси ҳаммасини
                манбадаги ҳолига қайтаради.
              </p>
            </div>
          </Card>

          <Card
            title="Атайин силжитилган маркерлар"
            sub={`${nf(vm.nudges.length)} та`}
            note="Битта туманда иккита лойиҳа бўлса, туман маркази иккови учун бир хил бўлади ва маркерлар устма-уст тушарди. Силжиш градуснинг юздан бир улушида — маркер ўз туманидан чиқмайди."
          >
            {vm.nudges.length === 0 ? (
              <p className="border-t border-grid pt-2.5 text-[12px] text-ink-3">
                Силжитилган маркер йўқ — барча нуқта туман марказида турибди.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 border-t border-grid pt-2.5">
                {vm.nudges.map((n) => (
                  <li key={n.short} className="min-w-0">
                    <span className="text-[12.5px] [font-weight:650]">{n.short}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-ink-3">
                      {n.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Харитага тушмаган лойиҳа ва ранг жадвалида йўқ тур — иккови ҳам
                жимгина йўқолмайди, шу ерда очиқ санаб ўтилади. */}
            {(vm.offMap.length > 0 || unknown.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-grid pt-2.5">
                {vm.offMap.map((o) => (
                  <Pill key={o.id} status="warn">
                    {o.short} · харитада йўқ
                  </Pill>
                ))}
                {unknown.map((u) => (
                  <Pill key={u.kind} status="warn">
                    {u.kind} · ранг жадвалида йўқ
                  </Pill>
                ))}
              </div>
            )}

            {vm.offMap.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-3">
                Бу лойиҳалар координата жадвалида топилмади (реестрга янги қатор қўшилган
                бўлиши мумкин). Улар харитада кўринмайди, лекин реестрдан тушиб қолмади —
                жами {nf(vm.total)} та лойиҳадан {nf(vm.pins.length)} таси харитада.
              </p>
            )}
          </Card>
        </div>
      </Section>
    </>
  );
}
