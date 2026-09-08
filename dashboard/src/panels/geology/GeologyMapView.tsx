import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoProject } from "../../lib/adapters/geology";
import { geoMapView } from "../../lib/adapters/geologyMap";
import { exact, nf } from "../../lib/format";
import { GRID } from "../../components/layout";
import { Card } from "../../components/Card";
import { Pill } from "../../components/Pill";
import { Modal } from "../../components/Modal";
import { EmptyState } from "../../components/states";
import { GeologyMap } from "./GeologyMap";
import { GeologyProjectBrief } from "./GeologyProjectBrief";
import { GroupChip, Metric } from "./parts";

/**
 * «Геология лойиҳалари» — харита кўриниши.
 *
 * ═══ Фильтр харитага ҳам таъсир қилади ══════════════════════════════════
 *
 * Кириш сифатида **фильтрланган** рўйхат келади, шунинг учун гуруҳ, тоифа,
 * йўналиш ва қидирув маркерлардаги сонларни ҳам ўзгартиради. Рўйхат ва
 * харита битта маълумотнинг иккита кўриниши — улар ҳеч қачон бошқа-бошқа
 * сонни кўрсатмайди.
 *
 * ═══ Ҳудудсиз лойиҳалар йўқолмайди ══════════════════════════════════════
 *
 * Ҳудуди вилоят даражасида кўрсатилмаган лойиҳалар (республика миқёсидаги
 * ва умуман бўш қаторлар) харита остидаги карточкада тўлиқ рўйхат бўлиб
 * туради ва улар ҳам босилиб очилади. Харитада кўринмаган нарса «йўқ»
 * дегани эмас.
 *
 * ═══ Фокус ва модал ═════════════════════════════════════════════════════
 *
 * Вилоят босилганда иккита нарса бирга бўлади: харита ўша вилоятга
 * яқинлашади ва модал очилади. Улар алоҳида ҳолат: модал ёпилгач фокус
 * сақланади (фойдаланувчи ўша вилоятда қолади), фокусдан чиқиш эса
 * «← Бутун харита» ёки `Esc` орқали.
 */

export interface GeologyMapViewProps {
  /** Фильтрланган лойиҳалар. */
  projects: GeoProject[];
  /** Тўлиқ тафсилот саҳифасига ўтиш — модални ёпиб, хэшни алмаштиради. */
  onOpenFull: (no: number) => void;
}

const BTN =
  "cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink";

/** Модал ичидаги ва харита остидаги рўйхатнинг битта қатори. */
function ProjectRow({ p, onOpen }: { p: GeoProject; onOpen: (p: GeoProject) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p)}
      className="flex w-full min-w-0 cursor-pointer flex-col rounded-[6px] border border-hair bg-surface-2 px-3 py-2.5 text-left hover:border-s1"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2.5 gap-y-1">
        <h4 className="min-w-0 flex-1 text-[12.5px] leading-[1.35] [font-weight:650] break-words">
          {p.shortName}
        </h4>
        <GroupChip group={p.group} groupKey={p.groupKey} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="Қиймати" value={p.cost === null ? null : exact(p.cost)} unit="млн $" />
        <Metric label="Тугаш йили" value={p.endYear === null ? null : String(p.endYear)} />
        <Metric label="Ҳудуд" value={p.region} />
      </div>
    </button>
  );
}

export function GeologyMapView({ projects, onOpenFull }: GeologyMapViewProps) {
  const mv = useMemo(() => geoMapView(projects), [projects]);

  const [focusKey, setFocusKey] = useState<string | null>(null);
  // Модалнинг иккита манбаи: вилоят (рўйхат ёки ягона лойиҳа) ва рўйхатдан
  // танланган лойиҳа. Иккови бирга бўлса — «← ортга» рўйхатга қайтаради.
  const [pickedRegion, setPickedRegion] = useState<string | null>(null);
  const [pickedProject, setPickedProject] = useState<GeoProject | null>(null);

  const region = useMemo(
    () => (pickedRegion === null ? null : (mv.regions.find((r) => r.key === pickedRegion) ?? null)),
    [pickedRegion, mv.regions],
  );

  const modalOpen = pickedRegion !== null || pickedProject !== null;

  const closeModal = useCallback(() => {
    setPickedRegion(null);
    setPickedProject(null);
  }, []);

  const pick = useCallback((key: string) => {
    setFocusKey(key);
    setPickedRegion(key);
    setPickedProject(null);
  }, []);

  // `Esc` — фокусдан чиқиш. Модал очиқ бўлса эшитувчи умуман қўйилмайди:
  // ўша ҳолатда `Esc` модалники, у ўз навбатида фақат ойнани ёпади.
  useEffect(() => {
    if (focusKey === null || modalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setFocusKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusKey, modalOpen]);

  // Фильтр ўзгариб, фокусдаги вилоятда лойиҳа қолмаса — бўш вилоятда
  // қотиб қолмаслик учун харита бутун кўринишга қайтади.
  useEffect(() => {
    if (focusKey === null) return;
    const r = mv.regions.find((x) => x.key === focusKey);
    if (!r || r.count === 0) {
      setFocusKey(null);
      closeModal();
    }
  }, [focusKey, mv.regions, closeModal]);

  const focused = focusKey === null ? null : (mv.regions.find((r) => r.key === focusKey) ?? null);

  // Вилоятда битта лойиҳа бўлса — рўйхат кўрсатилмайди, дарҳол ўша лойиҳа.
  const single = region !== null && region.count === 1 ? region.projects[0] : null;
  const detail = pickedProject ?? single;
  const canBack = pickedProject !== null && region !== null && region.count > 1;

  const mapCard = (
      <Card
        title="Ўзбекистон харитаси"
        sub={`${nf(mv.mapped)} лойиҳа · ${nf(mv.activeRegions)} вилоят`}
        note="Маркер вилоят марказига қўйилган — манбада аниқ координата йўқ."
      >
        {mv.mapped === 0 ? (
          <EmptyState
            title="Танланган шартга мос, ҳудуди кўрсатилган лойиҳа йўқ"
            text="Фильтрни ўзгартиринг — ҳудудсиз лойиҳалар пастда қолади."
          />
        ) : (
          <div className="relative">
            <GeologyMap
              regions={mv.regions}
              max={mv.max}
              focusKey={focusKey}
              onPick={pick}
            />
            {/* Тугма харита устида — фокусга кирганда/чиққанда карточка
                баландлиги сакрамаслиги учун оқимдан ташқарида. */}
            {focused && (
              <div className="absolute top-0 left-0 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setFocusKey(null)} className={BTN}>
                  ← Бутун харита
                </button>
                <Pill>
                  {focused.nameUz} · {nf(focused.count)} та лойиҳа
                </Pill>
              </div>
            )}
          </div>
        )}

        {mv.multi > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill>
              {nf(mv.multi)} та лойиҳа бир нечта вилоятда — ҳар бирида ҳисобланган
            </Pill>
            <Pill>жами маркер сони {nf(mv.markers)}</Pill>
          </div>
        )}
      </Card>
  );

  const offCard =
    mv.offMap.length === 0 ? null : (
      <Card
        title="Ҳудуд аниқ кўрсатилмаган"
        sub={`${nf(mv.offMap.length)} та лойиҳа`}
        note="Манбада вилоят эмас, республика миқёси кўрсатилган ёки катак бўш — шунинг учун харитада эмас, лекин рўйхатдан тушиб қолмайди."
      >
        <div className="flex flex-col gap-2">
          {mv.offMap.map((p) => (
            <ProjectRow key={p.id} p={p} onOpen={setPickedProject} />
          ))}
        </div>
      </Card>
    );

  return (
    <>
      {/* Ҳудудсиз лойиҳалар хаританинг ёнида: харита ўз нисбатини сақлагани
          учун кенг экранда карточканинг бутун энини эгалламайди, бўш жой эса
          айнан шу рўйхатга берилади. Тор экранда иккови устма-уст тушади. */}
      {offCard === null ? (
        mapCard
      ) : (
        <div className={`${GRID.g32} items-start`}>
          {mapCard}
          {offCard}
        </div>
      )}

      {modalOpen && (
        <Modal
          onClose={closeModal}
          title={detail ? detail.shortName : (region?.nameUz ?? "")}
          sub={
            detail
              ? (detail.region ?? "ҳудуд кўрсатилмаган")
              : region
                ? `${nf(region.count)} та лойиҳа`
                : undefined
          }
          lead={
            canBack ? (
              <button type="button" onClick={() => setPickedProject(null)} className={BTN}>
                ← {region?.nameUz} рўйхатига
              </button>
            ) : undefined
          }
          foot={
            detail ? (
              <>
                <span className="text-[11.5px] text-ink-3">№ {detail.no}</span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    onOpenFull(detail.no);
                  }}
                  className="cursor-pointer rounded-[5px] bg-s1 px-3.5 py-[7px] text-[12.5px] [font-weight:650] text-white"
                >
                  Тўлиқ саҳифани очиш →
                </button>
              </>
            ) : undefined
          }
        >
          {detail ? (
            <GeologyProjectBrief p={detail} />
          ) : (
            <div className="flex flex-col gap-2">
              {region?.projects.map((p) => (
                <ProjectRow key={p.id} p={p} onOpen={setPickedProject} />
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
