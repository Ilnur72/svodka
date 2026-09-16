import { useEffect, useMemo, useRef, useState } from "react";
import { getCameras } from "../api/endpoints";
import { flattenCameras, idsFromSearch, pickWall } from "../lib/adapters/cameras";
import type { WallCamera, WallSlot } from "../lib/adapters/cameras";
import { useQuery } from "../lib/useQuery";
import { CameraTile } from "../panels/camera/CameraTile";
import { WallBrand } from "../panels/camera/WallBrand";

/**
 * `/camera1` ва `/camera2` — камералар ДЕВОРИ.
 *
 * ═══ Тузилиш ═══════════════════════════════════════════════════════════
 *
 * Кенг экранда тўр тўртта устун ва иккита қатордан иборат. Устунларнинг
 * учтаси — олтита жонли кадр, тўртинчиси — ТМК устуни (иккала қаторни
 * эгаллайди). Иккита девор бир-бирининг КЎЗГУСИ:
 *
 *   `/camera1`  →  [кадр][кадр][кадр][ТМК]
 *   `/camera2`  →  [ТМК][кадр][кадр][кадр]
 *
 * Шунинг учун иккита алоҳида саҳифа ёзилмади: фарқ атиги `part` да ва у
 * устуннинг қайси четда туришини ҳамда қайси олтита камера кўрсатилишини
 * белгилайди. Иккита нусха бўлганда биридаги тузатиш иккинчисига тушмай
 * қоларди.
 *
 * Тор экранда (телефон, ён монитор) тўр аввал иккита, сўнг битта устунга
 * тушади — қаранг: `index.css` даги `.wall`. Бу ерда девор эмас, оддий
 * рўйхат бўлади ва саҳифа сурилади: 400px энида тўртта устун ўқилмайди.
 *
 * ═══ Нега саҳифа токен дарвозасидан ОЛДИН ══════════════════════════════
 *
 * Девор мустақил экран: у ситуацион марказ мониторида очилиб ҳафталаб
 * туради, дашборд қобиғи (таблар, давр танлагич) унга умуман керак эмас.
 * Токен эса КЕРАК — камералар рўйхати ҳимояланган endpoint'дан келади.
 * Токен топилмаса саҳифа барибир чизилади: ТМК устуни ва бўш каталар
 * жойида қолади, сабаби эса пастдаги қаторда ёзилади. Мониторда бутунлай
 * бошқа экран пайдо бўлганидан кўра, шу яхши.
 *
 * ═══ Реестр қайта сўралади, стрим эса узилмайди ════════════════════════
 *
 * Камералар рўйхати ҳар `REFRESH_MS` да янгиланади (янги камера қўшилса
 * экран уни ўзи кўради). Бунда жонли уланишлар УЗИЛМАЙДИ: катакка
 * примитив қийматлар узатилади ва уланиш эффекти фақат стрим манзили
 * ўзгарса қайта ишлайди. Сўров хато берса ҳам (масалан токен эскирса)
 * охирги ишлаган рўйхат экранда қолади — `lastGood`.
 */

/** Кадр каталари сони: учта устун × иккита қатор. */
const SLOTS = 6;

/** Реестрни қайта сўраш даври. Рўйхат кам ўзгаради — тез-тез сўраш шарт эмас. */
const REFRESH_MS = 5 * 60_000;

const FIT_KEY = "tmk-wall-fit";

export interface CameraWallPageProps {
  part: 1 | 2;
}

export function CameraWallPage({ part }: CameraWallPageProps) {
  const q = useQuery("cameras", (s) => getCameras(s));
  const [fit, setFit] = useState<"contain" | "cover">(readFit);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Реестр сўрови хато берса экран бўшаб қолмаслиги учун охирги ишлаган
  // рўйхат сақланади — қаранг: файл бошидаги изоҳ.
  const lastGood = useRef<WallCamera[]>([]);
  const all = useMemo(() => {
    if (!q.data) return lastGood.current;
    const list = flattenCameras(q.data);
    lastGood.current = list;
    return list;
  }, [q.data]);

  const ids = useMemo(() => idsFromSearch(window.location.search), []);
  const pick = useMemo(
    () => pickWall(all, { ids, part, count: SLOTS }),
    [all, ids, part],
  );

  // Даврий янгилаш. `refetch` `useQuery` дан келади ва барқарор.
  const { refetch } = q;
  useEffect(() => {
    const t = window.setInterval(refetch, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [refetch]);

  useEffect(() => {
    try {
      localStorage.setItem(FIT_KEY, fit);
    } catch {
      /* приват режимда сақлаб бўлмаса ҳам режим шу сеансда ишлайверади */
    }
  }, [fit]);

  // Esc — кенгайтирилган кадрдан қайтади. Бутун экран режимини браузернинг
  // ўзи Esc билан ёпади, шунинг учун иккови бир-бирига халақит бермайди:
  // бу ерда фақат ўз кенгайтиришимиз ёпилади.
  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const shown = pick.slots.filter(Boolean).length;

  const notice = noticeOf(q, pick.unknownIds, all.length, shown);
  const side = part === 1 ? "right" : "left";

  return (
    <main className={`wall wall--${side}`}>
      <WallBrand
        side={side}
        fit={fit}
        onToggleFit={() => setFit((f) => (f === "contain" ? "cover" : "contain"))}
      />

      {pick.slots.map((slot: WallSlot, i) => (
        <CameraTile
          key={slot ? `cam-${slot.id}` : `empty-${i}`}
          camera={slot}
          no={i + 1}
          fit={fit}
          expanded={slot !== null && expanded === slot.id}
          onToggleExpand={() =>
            slot && setExpanded((cur) => (cur === slot.id ? null : slot.id))
          }
        />
      ))}

      {notice && (
        <p className="wall__notice" role="status">
          {notice}
        </p>
      )}
    </main>
  );
}

/**
 * Экраннинг пастидаги қатор: фақат АЙТИЛИШИ керак бўлган нарса учун.
 *
 * Ҳаммаси жойида бўлса (реестр келди, олтита катак тўлди) қатор умуман
 * чизилмайди — деворда ортиқча ёзув турмайди. Жимгина йўқолиш эса бўлмайди:
 * топилмаган `?ids=` рақами ҳам, камера етишмагани ҳам шу ерда кўринади.
 */
function noticeOf(
  q: { loading: boolean; error: Error | null; notAvailable: boolean },
  unknownIds: number[],
  total: number,
  shown: number,
): string | null {
  if (q.loading) return "Камералар реестри юкланмоқда…";
  if (q.notAvailable) return "Камералар бўлими серверда мавжуд эмас (404).";
  if (q.error && total === 0) return q.error.message;

  const parts: string[] = [];
  if (q.error) parts.push(`Реестр янгиланмади: ${q.error.message}`);
  if (unknownIds.length > 0)
    parts.push(`Манзилдаги ${unknownIds.join(", ")} рақамли камера реестрда йўқ`);
  if (total > 0 && shown < SLOTS)
    parts.push(`Реестрда ${total} та камера бор — бу деворга ${shown} таси тушди`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Сақланган кадр режими. Нотўғри қиймат `contain` га тушади. */
function readFit(): "contain" | "cover" {
  try {
    return localStorage.getItem(FIT_KEY) === "cover" ? "cover" : "contain";
  } catch {
    return "contain";
  }
}
