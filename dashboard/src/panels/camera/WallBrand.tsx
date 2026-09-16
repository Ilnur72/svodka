import { useEffect, useState } from "react";

/**
 * Девордаги брендли устун: КОМПАНИЯ ЛОГОТИПИ ва тўлиқ номи, бошқа ҳеч нарса.
 *
 * ═══ Нега устун бўм-бўш ═════════════════════════════════════════════════
 *
 * Бу экран ситуацион марказ деворида, узоқдан кўриш учун. Устунга соат,
 * ҳисоблагич ёки ёрдамчи ёзув қўйилса, улар кадрлар билан диққат учун
 * рақобатлашарди — ҳолбуки улар иккиламчи маълумот. Экраннинг бешдан бири
 * ҚАСДДАН тинч қолдирилган: у фақат ким экани айтади.
 *
 * ═══ Бошқарув кўринмайдиган жойда ══════════════════════════════════════
 *
 * Иккита созлама (бутун экран ва кадр режими) барибир керак, лекин улар
 * кундалик эмас — бир марта қўйиб, ойлаб тегилмайди. Шунинг учун улар
 * ёзувли тугма эмас, устуннинг ПАСТКИ БУРЧАГИДАГИ кичкина белгилар: одатда
 * деярли кўринмайди, сичқонча устунга яқинлашганда чиқади. Шунда девор
 * тоза қолади, созлама эса йўқолмайди — уни топиш учун ҳужжат ўқиш шарт
 * эмас. Клавиатура билан юрганда ҳам белгилар кўринади (`:focus-visible`),
 * яъни улар сичқончасиз ҳам етиб бориладиган жойда.
 *
 * ═══ Логотип: учта қатлам, устма-уст ═══════════════════════════════════
 *
 * Юқорида эмблема (`public/logo-emblem.svg`, 122×122), остида «ТМК» ёзуви
 * (`public/logo-tmk.svg`, 496×122), энг остида тўлиқ ном. Иккита файл
 * АЛОҲИДА турибди, битта кенг расм эмас: тор устунда ёнма-ён жойлашган
 * логотип жуда кичрайиб кетарди, устма-уст қўйилганда эса иккови ҳам
 * экраннинг бутун энидан фойдаланади.
 *
 * Расмлар inline қилинмайди, `<img>` орқали юкланади — уларни JSX'га
 * кўчириш компонентни ўқилмас ҳолга келтирарди ва дизайнер файлни
 * янгилаганда код ҳам ўзгариши керак бўларди. Йўллар НИСБИЙ
 * (`./logo-emblem.svg`): илова сайтнинг ичида (`/svodka/camera1`) турганда
 * ҳам тўғри ҳал бўлади, худди `vite.config.ts` даги `base: "./"` каби.
 *
 * Эмблеманинг `alt` и БЎШ — у безак, ёнидаги ёзув айнан шу маънони
 * такрорларди. Ном эса расмда эмас, ҳақиқий матн: логотип юкланмаса ҳам
 * экранда ким экани ўқилади.
 *
 * ⚠️ `public/logouz.svg` — иккови бирлашган эски файл. У энди
 * ишлатилмайди, лекин ўчирилмади: бошқа жойда керак бўлиши мумкин.
 *
 * Орқасидаги ёруғлик ва ном устидаги металл ялтироғи — ягона безак; иккови
 * ҳам `prefers-reduced-motion` да ўз-ўзидан тўхтайди (`index.css`).
 */

export interface WallBrandProps {
  /** Устун экраннинг қайси четида — фақат жойлашув синфи учун. */
  side: "left" | "right";
  fit: "contain" | "cover";
  onToggleFit: () => void;
}

export function WallBrand({ side, fit, onToggleFit }: WallBrandProps) {
  return (
    <aside className={`wall-brand wall-brand--${side}`}>
      <div className="wall-brand__logo">
        <span className="wall-brand__glow" aria-hidden="true" />
        <img className="wall-brand__emblem" src="./logo-emblem.svg" alt="" />
        <img className="wall-brand__wordmark" src="./logo-tmk.svg" alt="ТМК" />
      </div>

      <h1 className="wall-brand__full">O'zbekiston Texnologik Metallar Kombinati AJ</h1>

      {/* Сўник бурчак — юқоридаги изоҳга қаранг. */}
      <div className="wall-brand__tools">
        <button
          type="button"
          className="wall-icon"
          onClick={onToggleFit}
          title={
            fit === "contain"
              ? "Кадр тўлиқ кўринмоқда — катакни тўлдиришга ўтиш"
              : "Кадр катакни тўлдирмоқда — тўлиқ кўринишга ўтиш"
          }
          aria-label="Кадр режими"
        >
          {fit === "contain" ? <IconFitContain /> : <IconFitCover />}
        </button>
        <FullscreenButton />
      </div>
    </aside>
  );
}

/**
 * Бутун экран белгиси.
 *
 * Ҳолати браузердан ўқилади (`fullscreenElement`), ўз `state` идан эмас:
 * фойдаланувчи F11 ёки Esc билан ҳам чиқиши мумкин ва у ҳолда белги ёлғон
 * кўрсатарди. API йўқ браузерда (ёки ман қилинган iframe'да) тугма умуман
 * чизилмайди — босилса ҳеч нарса бўлмайдиган тугма кўрсатилмайди.
 */
function FullscreenButton() {
  const [on, setOn] = useState(false);
  const supported =
    typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  const label = on ? "Бутун экрандан чиқиш" : "Бутун экран";

  return (
    <button
      type="button"
      className="wall-icon"
      onClick={toggle}
      title={label}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={
            on
              ? "M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5"
              : "M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5"
          }
        />
      </svg>
    </button>
  );
}

/** Кадр катак ичига тўлиқ сиғади — ён томонларда бўш жой қолади. */
function IconFitContain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <rect x="6.5" y="8.5" width="11" height="7" rx="1" opacity={0.55} />
    </svg>
  );
}

/** Кадр катакни тўлдиради — юқори ва пасти кесилади. */
function IconFitCover() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 8.5h18M3 15.5h18" opacity={0.55} />
    </svg>
  );
}
