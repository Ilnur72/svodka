import { useEffect, useRef, useState } from "react";
import type { WallCamera } from "../../lib/adapters/cameras";

/**
 * Девордаги битта катак — WebRTC орқали жонли кадр.
 *
 * ═══ Улаш кетма-кетлиги ═════════════════════════════════════════════════
 *
 * Стрим сервери (`tmkstream.bgs.uz`) оддий бир қадамли сигналлашни кутади:
 * браузер offer'ни base64 қилиб `data` майдонида POST қилади, сервер эса
 * жавоб SDP'ни худди шундай base64 матн сифатида қайтаради. ICE сервери
 * битта — оммавий STUN; TURN керак эмас, чунки стрим сервери оммавий
 * манзилда туради. Айнан шу келишув `frontend/` даги `CameraStreamCell`
 * да ҳам ишлатилади — бу ерда ундан фарқ фақат қайта уланишда.
 *
 * ═══ «Жонли» — трек эмас, КАДР ══════════════════════════════════════════
 *
 * Энг муҳим қоида: катак `live` ҳолатига `ontrack` да ЎТМАЙДИ.
 *
 * Стрим сервери оммавий манзилда, камералар эса ичкарида (`10.85.0.x`).
 * Сервер камерага ета олмаганда ҳам SDP алмашинуви муваффақиятли тугайди
 * ва бўш трек очилади — битта ҳам кадр келмайди. `ontrack` да `live` деб
 * ҳисоблаш айнан шу ерда ёлғон ҳолат берарди: экранда қоп-қора тўртбурчак,
 * устида эса яшил нуқта билан «Жонли эфир».
 *
 * Шунинг учун ҳақиқий КАДР кутилади: `<video>` да маълумот бўлиши
 * (`readyState >= HAVE_CURRENT_DATA`) ва ўлчами кадрга ўхшаши
 * (`MIN_FRAME_PX`). Иккинчи шарт шунчаки эҳтиёт эмас — кадр бермайдиган
 * трекда Chrome `videoWidth` ни 2 қилиб кўрсатади, яъни «нолдан катта»
 * текшируви бу ерда АЛДАР эди.
 *
 * Текшируш уч йўл билан бошланади, чунки бирортаси ҳам ҳамма браузерда
 * ишончли эмас: `requestVideoFrameCallback` (энг аниқ, Firefox'да йўқ),
 * медиа ҳодисалари (`FRAME_EVENTS`) ва оддий поллинг (`FRAME_POLL_MS`).
 *
 * ═══ Нега ўз-ўзидан қайта уланиш БОР ════════════════════════════════════
 *
 * Бу компонент ситуацион марказ деворида очилади ва ҳафталаб ёпилмайди.
 * Уланиш узилганда (сервер қайта ишга тушди, тармоқ сакради) экранда
 * абадий «сигнал йўқ» туриб қолиши мумкин эмас — ҳеч ким F5 босмайди.
 * Шунинг учун ҳар бир узилишдан кейин катак ЎЗИ қайта уланади, кечикиш
 * эса ошиб боради (`RETRY_MS`): сервер ўчиқ турганда 12 та катак уни
 * секундига бир неча марта уришининг маъноси йўқ.
 *
 * ═══ Соат бўйича назорат (`TRACK_TIMEOUT_MS`) ═══════════════════════════
 *
 * WebRTC'да «уланмади» ҳодисаси ҳар доим ҳам келмайди: SDP алмашинуви
 * муваффақиятли тугаб, кадр эса умуман келмаслиги мумкин. Шунинг учун
 * алоҳида таймер: белгиланган вақтда биринчи КАДР келмаса — хато деб
 * ҳисобланади ва қайта уриниш бошланади.
 *
 * ═══ Қора экран бўлмайди ════════════════════════════════════════════════
 *
 * Жонли кадр йўқ пайтда катак уч қаватдан иборат ва улар бир-бирининг
 * устида туради, шунинг учун ҳеч қандай ҳолатда қора тўртбурчак қолмайди:
 *
 *   0. `wall-tile__blank` — доим остида: белги ва тус. Расм юкланаётганда
 *      ҳам, умуман топилмаганда ҳам кўринадигани шу.
 *   1. `wall-tile__snap`  — серверда сақланган охирги кадр, ТЎЛИҚ
 *      кўринишда. У эскириб қолмаслиги учун `SNAP_REFRESH_MS` да бир
 *      марта қайта сўралади.
 *
 * ⚠️ Учинчи қатлам (`wall-tile__down` — «Уланиш йўқ» ёзуви, изоҳ ва қўлда
 * уриниш тугмаси) ОЛИБ ТАШЛАНДИ. Фойдаланувчи талаби: «ulanish yo'q degan
 * yozuv tursa hunik ko'rinadi» — катак оддий сурат каби кўриниши керак.
 * Ҳолат йўқолмади: у юқоридаги `wall-tile__status` ёрлиғида ранг ва матн
 * билан туради, қайта уланиш эса `backoff` орқали ўзи давом этади.
 *
 * ═══ Нега илдиз `<button>` ЭМАС ════════════════════════════════════════
 *
 * Катакнинг ичида иккита босиладиган нарса бор: бутун кадр (кенгайтириш)
 * ва хато ҳолатидаги «ҳозир уриниб кўриш». Тугма ичида тугма — нотўғри
 * HTML, шунинг учун илдиз оддий контейнер, кенгайтириш эса катакни тўлиқ
 * қоплайдиган алоҳида тугма (`wall-tile__hit`). Қайта уланиш тугмаси
 * ундан юқорида туради ва босилганда кенгайтириш ишламайди.
 */

type Phase = "connecting" | "live" | "error";

/** Захира кадрнинг ҳолати: юкланмоқда / кўринди / файл топилмади. */
type Snap = "idle" | "ok" | "fail";

/** Биринчи КАДР шунча вақтда келмаса, уланиш муваффақиятсиз деб ҳисобланади. */
const TRACK_TIMEOUT_MS = 12_000;

/** Қайта уриниш кечикишлари; охиргиси такрорланаверади. */
const RETRY_MS = [3_000, 6_000, 12_000, 30_000];

/**
 * Кадр келганини билдириши мумкин бўлган медиа ҳодисалари. Уларнинг
 * бирортаси ҳам ўзича етарли эмас — ҳар бири `check()` ни чақиради, қарор
 * эса фақат `videoWidth` бўйича қабул қилинади.
 */
const FRAME_EVENTS = ["loadeddata", "playing", "timeupdate", "resize"] as const;

/** Ҳодисалар ҳам, `requestVideoFrameCallback` ҳам ишламаган ҳолат учун захира. */
const FRAME_POLL_MS = 400;

/**
 * Кадр «ҳақиқий» ҳисобланиши учун энг кичик ўлчам, пиксел.
 *
 * Бу сон ЎЙЛАБ ТОПИЛГАН эмас, ўлчаб олинган: кадр бермайдиган Navoi
 * камераларига уланганда Chrome `videoWidth` ни нол эмас, **2** қилиб
 * кўрсатади — трек очилган, лекин декодер ҳали ҳеч нарса чизмаган. Шунинг
 * учун «нолдан катта» шарти етарли эмас, ҳақиқий кадр талаб қилинади.
 * Энг паст сифатли кузатув камераси ҳам 320×240 дан кичик бўлмайди.
 */
const MIN_FRAME_PX = 16;

/**
 * Сақланган кадрни қайта сўраш даври. Девор ҳафталаб очиқ туради — шу
 * бўлмаса катакда бир марта юкланган, ойлик эски расм осилиб қоларди.
 */
const SNAP_REFRESH_MS = 3 * 60_000;

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export interface CameraTileProps {
  /** `null` — девордаги бўш катак (камера бириктирилмаган). */
  camera: WallCamera | null;
  /** Катакнинг девордаги рақами — экранда «01», «02» … кўринишида. */
  no: number;
  /** `contain` — кадр тўлиқ кўринади; `cover` — катакни тўлдиради, четлари кесилади. */
  fit: "contain" | "cover";
  expanded: boolean;
  onToggleExpand: () => void;
}

export function CameraTile({ camera, no, fit, expanded, onToggleExpand }: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  /** Қайта уриниш рақами. Ўзгарса эффект қайтадан ишлайди. */
  const [nonce, setNonce] = useState(0);
  /** Кечикиш поғонаси. `state` эмас — ўзгариши қайта уланишни бошламаслиги керак. */
  const backoff = useRef(0);
  const [snap, setSnap] = useState<Snap>("idle");
  /** Захира кадрни кэшдан эмас, серверда ёзилган янгисидан олиш учун. */
  const [snapTick, setSnapTick] = useState(0);

  const url = camera?.streamUrl ?? null;

  useEffect(() => {
    if (!url) {
      setPhase("error");
      return;
    }

    let alive = true;
    let watchdog = 0;
    let retry = 0;
    let poll = 0;
    let frameCb = 0;
    /** Биринчи кадр аллақачон қабул қилинганми — такрор ишламаслик учун. */
    let got = false;
    setPhase("connecting");

    const ac = new AbortController();
    const pc = new RTCPeerConnection(ICE);
    const video = videoRef.current;

    // Олдинги уринишдан қолган кадр тозаланади. Бўлмаса `videoWidth` эски
    // қийматида қолар ва янги уланиш ҳали бирорта кадр бермасдан «жонли»
    // деб ҳисобланарди.
    if (video) video.srcObject = null;

    /** Кадр кузатувини тўхтатади: кадр келди ёки катак ёпилди. */
    const stopWatch = () => {
      window.clearInterval(poll);
      const v = videoRef.current;
      if (!v) return;
      for (const ev of FRAME_EVENTS) v.removeEventListener(ev, check);
      if (frameCb && typeof v.cancelVideoFrameCallback === "function") {
        v.cancelVideoFrameCallback(frameCb);
        frameCb = 0;
      }
    };

    /**
     * Ҳақиқий кадр келдими? Фақат шу ер `live` ни ёқади — қаранг: файл боши.
     *
     * Иккала шарт ҳам зарур: `readyState` декодерда маълумот борлигини
     * (`HAVE_CURRENT_DATA`), ўлчам эса унинг кадр эканини тасдиқлайди —
     * бўш трекда Chrome 2×2 кўрсатади (`MIN_FRAME_PX`).
     */
    const check = () => {
      if (!alive || got) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      if (v.videoWidth < MIN_FRAME_PX || v.videoHeight < MIN_FRAME_PX) return;
      got = true;
      window.clearTimeout(watchdog);
      stopWatch();
      backoff.current = 0;
      setPhase("live");
    };

    /** Кадр кузатувини бошлайди — фақат трек келганидан кейин маъноси бор. */
    const startWatch = () => {
      const v = videoRef.current;
      if (!v) return;
      for (const ev of FRAME_EVENTS) v.addEventListener(ev, check);
      if (typeof v.requestVideoFrameCallback === "function") {
        frameCb = v.requestVideoFrameCallback(() => check());
      }
      poll = window.setInterval(check, FRAME_POLL_MS);
      check();
    };

    /** Узилиш: ресурслар ёпилади ва кейинги уриниш режалаштирилади. */
    const fail = () => {
      if (!alive) return;
      alive = false;
      window.clearTimeout(watchdog);
      stopWatch();
      ac.abort();
      try {
        pc.close();
      } catch {
        /* аллақачон ёпиқ */
      }
      setPhase("error");
      const wait = RETRY_MS[Math.min(backoff.current, RETRY_MS.length - 1)];
      backoff.current += 1;
      retry = window.setTimeout(() => setNonce((n) => n + 1), wait);
    };

    pc.addTransceiver("video", { direction: "recvonly" });
    // Овоз ҳам сўралади (сервер шуни кутади), лекин `<video muted>` —
    // деворда олтита катак бор, уларнинг овози бир-бирига қўшилиб кетарди.
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (e) => {
      if (!alive || !videoRef.current || !e.streams[0]) return;
      // `live` га ЎТИЛМАЙДИ ва соат ТЎХТАТИЛМАЙДИ: трек келгани кадр
      // келганини англатмайди (файл бошидаги изоҳ). Кадр `TRACK_TIMEOUT_MS`
      // ичида келмаса `fail()` ишлайди ва катакда захира кадр кўринади.
      videoRef.current.srcObject = e.streams[0];
      startWatch();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") fail();
    };

    watchdog = window.setTimeout(fail, TRACK_TIMEOUT_MS);

    void (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!alive || !offer.sdp) return;

        const body = new FormData();
        body.append("data", btoa(offer.sdp));

        const res = await fetch(url, { method: "POST", body, signal: ac.signal });
        if (!res.ok) throw new Error(String(res.status));

        const answer = atob((await res.text()).trim());
        if (!alive) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (e) {
        // Тозалаш пайтидаги `abort` хато эмас — катак аллақачон ёпилган.
        if (e instanceof DOMException && e.name === "AbortError") return;
        fail();
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(watchdog);
      window.clearTimeout(retry);
      stopWatch();
      ac.abort();
      try {
        pc.close();
      } catch {
        /* аллақачон ёпиқ */
      }
    };
  }, [url, nonce]);

  // Стрим кўтарилмаган пайтда захира кадр даврий равишда янгиланади: экранда
  // «охирги кадр» ёзуви турганда унинг ростдан ҳам охиргиси бўлгани маъқул.
  // Жонли эфирда сўров умуман юборилмайди.
  useEffect(() => {
    if (phase === "live") return;
    const t = window.setInterval(() => {
      setSnap("idle");
      setSnapTick((n) => n + 1);
    }, SNAP_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [phase]);

  // Қўлда қайта уланиш тугмаси ОЛИБ ТАШЛАНДИ: у «Уланиш йўқ» қатлами
  // ичида турарди, қатлам эса фойдаланувчи талаби билан кетди. Қайта
  // уланиш барибир ўзи давом этади — `backoff` ва `RETRY_MS` га қаранг.

  if (!camera) {
    return (
      <div className="wall-tile wall-tile--empty">
        <span className="wall-tile__no">{String(no).padStart(2, "0")}</span>
        <p className="wall-tile__empty-text">Камера бириктирилмаган</p>
      </div>
    );
  }

  const status =
    phase === "live"
      ? { label: "Жонли эфир", tone: "var(--good)" }
      : phase === "connecting"
        ? { label: "Уланмоқда…", tone: "var(--warn)" }
        : { label: "Сигнал йўқ", tone: "var(--crit)" };

  // Захира кадр — фақат файл ҳақиқатан юкланганда «бор» ҳисобланади, шунда
  // пастдаги ёзув ҳам рост бўлади. Кэшни четлаб ўтиш учун `?t=` қўшилади,
  // лекин биринчи юкланишда эмас — у ерда браузер кэши фойдали.
  const snapSrc = snapTick > 0 ? `${camera.snapshotUrl}?t=${snapTick}` : camera.snapshotUrl;

  return (
    <div className={`wall-tile${expanded ? " wall-tile--full" : ""}`}>
      {/* Стрим. Хато ҳолатида ҳам DOM'дан олиб ташланмайди: қайта уланиш
          муваффақиятли бўлганда `srcObject` айнан шу элементга ёзилади. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="wall-tile__video"
        style={{ objectFit: fit, opacity: phase === "live" ? 1 : 0 }}
      />

      {/* Энг остки қатлам. Расм юкланаётганда ҳам, умуман топилмаганда ҳам
          катак қоп-қора қолмайди — шу ерда белги ва тус туради. */}
      {phase !== "live" && (
        <span className="wall-tile__blank" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10ZM2 2l20 20"
            />
          </svg>
        </span>
      )}

      {/* Захира: серверда сақланган охирги кадр. ТЎЛИҚ кўринишда — устига
          ёзув ёки суст пардa қўйилмайди (фойдаланувчи талаби: «ulanish yo'q
          degan yozuv tursa hunik ko'rinadi»). Жонли эфирдан фарқи юқоридаги
          кичик ёрлиқда: у ерда ранг ва матн ҳолатни ҳалол айтиб туради.
          Файл топилмаса қатлам ўчади ва остидагиси кўринади. */}
      {phase !== "live" && snap !== "fail" && (
        <img
          src={snapSrc}
          alt=""
          className="wall-tile__snap"
          style={{ objectFit: fit }}
          onLoad={() => setSnap("ok")}
          onError={() => setSnap("fail")}
        />
      )}

      {/* Кенгайтириш — бутун катакни қоплайдиган тугма. Ёзувлар ундан
          юқорида, лекин сичқончани ўтказиб юборади. */}
      <button
        type="button"
        className="wall-tile__hit"
        onClick={onToggleExpand}
        title={`${camera.fullTitle}${camera.factory ? ` · ${camera.factory}` : ""}`}
        aria-label={
          expanded
            ? `${camera.title} — кичрайтириш`
            : `${camera.title} — бутун экранга кенгайтириш`
        }
      />

      {/* Айланма ФАҚАТ захира кадр йўқ пайтда. Расм бор бўлса катак
          тўлдирилган — устига белги ёки ёзув қўйиш кераксиз шовқин
          бўларди. Ҳолат барибир юқоридаги кичик ёрлиқда ёзилган, ва
          қайта уланиш `backoff` билан ўзи давом этади. */}
      {phase !== "live" && snap !== "ok" && (
        <span className="wall-tile__spinner" aria-hidden="true" />
      )}

      <span className="wall-tile__no">{String(no).padStart(2, "0")}</span>

      {/* Ҳолат. Ранг ёлғиз маъно ташимайди — ёнида доим матн туради. */}
      <span className="wall-tile__status">
        <i
          aria-hidden="true"
          style={{ background: status.tone }}
          className={phase === "live" ? "wall-pulse" : undefined}
        />
        {status.label}
      </span>

      <span className="wall-tile__caption">
        <b>{camera.title}</b>
        {camera.factory && <em>{camera.factory}</em>}
      </span>

      {/* Кенгайтириш белгиси — фақат сичқонча ости ёки фокусда кўринади. */}
      <span className="wall-tile__zoom" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          {expanded ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5"
            />
          )}
        </svg>
      </span>
    </div>
  );
}
