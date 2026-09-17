import { useCallback, useEffect, useRef, useState } from "react";
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
 * алоҳида таймер: белгиланган вақтда биринчи трек келмаса — хато деб
 * ҳисобланади ва қайта уриниш бошланади.
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

/** Биринчи трек шунча вақтда келмаса, уланиш муваффақиятсиз деб ҳисобланади. */
const TRACK_TIMEOUT_MS = 12_000;

/** Қайта уриниш кечикишлари; охиргиси такрорланаверади. */
const RETRY_MS = [3_000, 6_000, 12_000, 30_000];

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
  const [snapFailed, setSnapFailed] = useState(false);

  const url = camera?.streamUrl ?? null;

  useEffect(() => {
    if (!url) {
      setPhase("error");
      return;
    }

    let alive = true;
    let watchdog = 0;
    let retry = 0;
    setPhase("connecting");

    const ac = new AbortController();
    const pc = new RTCPeerConnection(ICE);

    /** Узилиш: ресурслар ёпилади ва кейинги уриниш режалаштирилади. */
    const fail = () => {
      if (!alive) return;
      alive = false;
      window.clearTimeout(watchdog);
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
      videoRef.current.srcObject = e.streams[0];
      window.clearTimeout(watchdog);
      backoff.current = 0;
      setPhase("live");
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
      ac.abort();
      try {
        pc.close();
      } catch {
        /* аллақачон ёпиқ */
      }
    };
  }, [url, nonce]);

  /** Қўлда қайта уланиш — кечикишни кутмасдан, поғонани ҳам нолдан бошлаб. */
  const retryNow = useCallback(() => {
    backoff.current = 0;
    setSnapFailed(false);
    setNonce((n) => n + 1);
  }, []);

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

      {/* Захира: охирги сақланган кадр. Сусайтирилган — уни жонли эфир деб
          ўйлаб қолиш мумкин эмас, устидаги ёзув эса буни очиқ айтади. */}
      {phase !== "live" && camera.snapshotUrl && !snapFailed && (
        <img
          src={camera.snapshotUrl}
          alt=""
          className="wall-tile__snap"
          style={{ objectFit: fit }}
          onError={() => setSnapFailed(true)}
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

      {phase === "connecting" && <span className="wall-tile__spinner" aria-hidden="true" />}

      {phase === "error" && (
        <div className="wall-tile__down">
          <p className="wall-tile__down-head">Сигнал йўқ</p>
          <p className="wall-tile__down-hint">
            {camera.streamUrl
              ? "Ўзи қайта уланмоқда"
              : "Стрим манзили реестрда кўрсатилмаган"}
          </p>
          {camera.streamUrl && (
            <button type="button" className="wall-tile__retry" onClick={retryNow}>
              Ҳозир уриниб кўриш
            </button>
          )}
        </div>
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
