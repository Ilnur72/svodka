import { UPLOAD_BASE } from "../../api/client";
import type { CamerasResponse } from "../../api/types";

/**
 * «Камералар девори» учун адаптер: сервернинг заводлар бўйича гуруҳланган
 * жавобини экран каталари рўйхатига айлантиради.
 *
 * ═══ Нега гуруҳлаш йўқолади ═════════════════════════════════════════════
 *
 * Жавоб зaвод → камералар шаклида келади, лекин девор бошқа мантиққа
 * қурилган: у ЭКРАН, дарахт эмас — 6 та катак ва тамом. Зaвод номи
 * йўқолмайди: ҳар бир катакнинг пастки қаторида камера номи билан ёнма-ён
 * туради, шунда «бу кадр қаердан» деган савол қолмайди.
 *
 * ═══ Тартиб `id` бўйича, сервер тартибида ЭМАС ══════════════════════════
 *
 * Жавобдаги камералар тартиби барқарор эмас (базадан қандай келса шундай),
 * девор эса ҳар куни БИР ХИЛ бўлиши керак: оператор «юқори чап — Ангрен»
 * деб ёдлаб қолади. Шунинг учун рўйхат доим `id` бўйича сараланади ва
 * деворлар ўша барқарор рўйхатнинг кетма-кет бўлаклари сифатида кесилади.
 */

/** Экрандаги битта катакка тушадиган камера. */
export interface WallCamera {
  id: number;
  /** Қисқа ном — охиридаги IP олиб ташланган (`stripAddr`). */
  title: string;
  /** Манбадаги тўлиқ ном, IP билан — `title` устига олиб борилганда кўринади. */
  fullTitle: string;
  /** Зaвод номи. Узун бўлса интерфейс ўзи қисқартиради. */
  factory: string;
  /**
   * WebRTC сигналлаш манзили. `stream_uuid` ёки `webrtc_server` бўлмаса
   * `null` — катак дарҳол «сигнал йўқ» ҳолатида чизилади, бекорга уринмайди.
   */
  streamUrl: string | null;
  /** Стрим кўтарилмаганда кўрсатиладиган охирги кадр. */
  snapshotUrl: string | null;
  hasPtz: boolean;
  /** Реестрда `active` эмас — камера ўзи ишламаслиги кутилади. */
  inactive: boolean;
}

/** Девордаги катак: камера бириктирилмаган бўлиши ҳам мумкин. */
export type WallSlot = WallCamera | null;

/**
 * Номнинг охиридаги IP (керак бўлса `:порт` билан) олиб ташланади.
 *
 * Манбада ном одатда «Navoi 2 PTZ 10.85.0.202» шаклида, яъни ичида техник
 * манзил бор. Ситуацион марказ экранида IP ҳеч кимга керак эмас ва фақат
 * жойни эгаллайди — лекин ЙЎҚОЛМАЙДИ: у `fullTitle` да қолади ва катакнинг
 * `title` атрибутида кўринади.
 */
function stripAddr(name: string): string {
  return name.replace(/\s*\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\s*$/, "").trim();
}

/** Жавобни барқарор (id бўйича) ягона рўйхатга ёзади. */
export function flattenCameras(res: CamerasResponse): WallCamera[] {
  const out: WallCamera[] = [];

  for (const factory of res.factories ?? []) {
    for (const cam of factory.cameras ?? []) {
      const name = (cam.model ?? "").trim() || `Камера №${cam.id}`;
      out.push({
        id: cam.id,
        title: stripAddr(name) || name,
        fullTitle: name,
        factory: (factory.name ?? "").trim(),
        // URL шакли бэкенддаги стрим серверининг келишуви:
        // `<server>/stream/<uuid>/channel/<n>/webrtc`. Уни шу ерда — маълумот
        // қаватида — ясаймиз, шунда компонент фақат «манзилга POST» қилади.
        streamUrl:
          cam.stream_uuid && cam.webrtc_server
            ? `${cam.webrtc_server.replace(/\/+$/, "")}/stream/${cam.stream_uuid}/channel/${cam.channel ?? 0}/webrtc`
            : null,
        snapshotUrl: cam.screenshot_url
          ? `${UPLOAD_BASE}/mnt/tmkupload/${cam.screenshot_url.replace(/^\/+/, "")}`
          : null,
        hasPtz: Boolean(cam.has_ptz),
        inactive: cam.status !== "active",
      });
    }
  }

  return out.sort((a, b) => a.id - b.id);
}

export interface WallPick {
  /** Доим `slots` та элемент: камера етмаса охиригача `null`. */
  slots: WallSlot[];
  /** Реестрдаги камералар сони — деворда нечтаси турганидан қатъи назар. */
  total: number;
  /** `?ids=` да сўралган, лекин реестрда топилмаган рақамлар. */
  unknownIds: number[];
}

/**
 * Девор учун камераларни танлайди.
 *
 * Иккита режим бор ва иккинчиси биринчисидан устун:
 *
 *   1. **Стандарт** — барқарор рўйхат кетма-кет бўлакларга бўлинади:
 *      1-девор биринчи 6 та, 2-девор кейинги 6 та. Ҳеч қандай созлама
 *      керак эмас, иккала экран бир-бирини такрорламайди.
 *   2. **Манзилдаги `?ids=4,9,12`** — айнан шу камералар, айнан шу
 *      тартибда. Бу қайта build қилмасдан деворни ўзгартириш йўли:
 *      экран одатда бир марта очилиб ҳафталаб турадиган қурилмада ишлайди,
 *      у ерга янги bundle етказиш қиммат.
 *
 * Топилмаган `id` ЖИМГИНА ташлаб юборилмайди — у `unknownIds` да қайтади ва
 * экранда очиқ айтилади, акс ҳолда оператор «нега 5 та катак?» деб қоларди.
 */
export function pickWall(
  all: WallCamera[],
  opts: { ids: number[] | null; part: 1 | 2; count: number },
): WallPick {
  const { ids, part, count } = opts;
  const byId = new Map(all.map((c) => [c.id, c]));
  const unknownIds: number[] = [];
  let chosen: WallCamera[];

  if (ids && ids.length > 0) {
    chosen = [];
    for (const id of ids.slice(0, count)) {
      const cam = byId.get(id);
      if (cam) chosen.push(cam);
      else unknownIds.push(id);
    }
  } else {
    chosen = all.slice((part - 1) * count, part * count);
  }

  const slots: WallSlot[] = [];
  for (let i = 0; i < count; i++) slots.push(chosen[i] ?? null);

  return { slots, total: all.length, unknownIds };
}

/**
 * `?ids=4,9,12` ни ўқийди. Нотўғри ёзилган қисм ташлаб юборилади, такрорлар
 * олиб ташланади. Параметр умуман бўлмаса `null` — стандарт режим ишлайди.
 */
export function idsFromSearch(search: string): number[] | null {
  const raw = new URLSearchParams(search).get("ids");
  if (!raw) return null;

  const seen = new Set<number>();
  for (const part of raw.split(",")) {
    const n = Number.parseInt(part.trim(), 10);
    if (Number.isFinite(n) && n > 0) seen.add(n);
  }

  return seen.size > 0 ? [...seen] : null;
}
