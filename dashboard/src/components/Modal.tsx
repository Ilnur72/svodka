import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Умумий модал ойна.
 *
 * ═══ Нима учун алоҳида компонент ════════════════════════════════════════
 *
 * Модалнинг «тўғри» бўлиши учун бир нечта шарт бир вақтда бажарилиши керак
 * ва уларнинг ҳар бирини панел ичида қайта ёзиш — хатога таклифнома. Шунинг
 * учун ҳаммаси шу ерда, бир марта:
 *
 *  · `Esc` ёпади;
 *  · орқа фон (перде) босилса ёпади;
 *  · очилганда фокус ойна ичига ўтади, ёпилганда **чақирган тугмага** қайтади;
 *  · `Tab` ойна ичида айланади (фокус орқадаги саҳифага тушиб кетмайди);
 *  · `role="dialog"` + `aria-modal="true"` + `aria-labelledby`;
 *  · орқадаги саҳифа скролл қилинмайди.
 *
 * Компонент **фақат очиқ ҳолатда** монтаж қилинади (чақирувчи томонда
 * шартли рендер) — шунда фокусни қайтариш `useEffect` нинг тозалашида
 * табиий равишда бажарилади.
 *
 * ═══ Перде ранги ════════════════════════════════════════════════════════
 *
 * `var(--scrim)` — палитра ранги эмас, ортидаги саҳифани сусайтирувчи
 * қатлам. Иккала мавзуда ҳам қоронғи: `--ink` дан ҳосил қилинса, қоронғи
 * мавзуда оқарган перде чиқарди.
 */

export interface ModalProps {
  /** Сарлавҳа — `aria-labelledby` шу матнга боғланади. */
  title: ReactNode;
  /** Сарлавҳа остидаги кичик изоҳ. */
  sub?: ReactNode;
  /** Сарлавҳадан юқорида — масалан «← ортга» тугмаси. */
  lead?: ReactNode;
  /** Пастки қатор: ҳаракат тугмалари. Бўлмаса чизилмайди. */
  foot?: ReactNode;
  /** Ойна кенглиги — узун матнли тафсилот учун кенгроқ вариант. */
  width?: "md" | "lg";
  onClose: () => void;
  children: ReactNode;
}

/** Фокус олиши мумкин бўлган элементлар — `Tab` айланаси учун. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const WIDTH: Record<"md" | "lg", string> = {
  md: "max-w-[620px]",
  lg: "max-w-[900px]",
};

export function Modal({ title, sub, lead, foot, width = "lg", onClose, children }: ModalProps) {
  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * Чақирган элемент — ёпилгандан кейин фокус айнан шу ерга қайтади.
   *
   * Тип `HTMLElement | SVGElement`: модал HTML тугмадан ҳам, SVG ичидаги
   * элементдан ҳам очилиши мумкин (харитадаги маркер — `<g role="button">`,
   * у эса `HTMLElement` ЭМАС). Фақат `HTMLElement` текширилса, харитадан
   * очилган ойна ёпилгач фокус `<body>` га тушиб қоларди — клавиатура билан
   * ишлаётган фойдаланувчи ўз ўрнини йўқотарди.
   */
  const openerRef = useRef<HTMLElement | SVGElement | null>(null);
  /** Босиш перданинг ўзида бошланганми — қаранг: `onMouseDown`/`onClick`. */
  const downOnScrim = useRef(false);

  useEffect(() => {
    const active = document.activeElement;
    openerRef.current =
      active instanceof HTMLElement || active instanceof SVGElement ? active : null;
    // Фокус ойнанинг ўзига: экран ўқувчи сарлавҳани ўқийди, кейинги `Tab`
    // эса ичкаридаги биринчи тугмага тушади.
    panelRef.current?.focus();

    // Орқадаги саҳифа скролл қилинмасин. Скроллбар кенглиги ўрнига
    // padding қўйилади — акс ҳолда саҳифа очилиш пайтида сакраб кетарди.
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (bar > 0) body.style.paddingRight = `${bar}px`;

    // `Esc` — ойна ичида фокус бўлмаган ҳолат ҳам бор (масалан фойдаланувчи
    // сичқонча билан ташқарига босган), шунинг учун эшитувчи `window` да.
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      // Фокус дарҳол қайтарилади, кечиктирилмайди: `StrictMode` да эффект
      // икки марта ишлайди (mount → cleanup → mount) ва кечиктирилган
      // қайтариш иккинчи монтаждан КЕЙИН ишлаб, фокусни энди очилган
      // ойнадан тортиб оларди.
      //
      // Элемент саҳифада қолмаган бўлса (масалан бутун кўриниш алмашган)
      // фокусни қайтариш маъносиз — шунинг учун `isConnected` текширилади.
      const opener = openerRef.current;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [onClose]);

  /** `Tab` ойна ичида айланади. */
  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === panel,
    );
    if (items.length === 0) {
      ev.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (ev.shiftKey && (active === first || active === panel)) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 mid:p-6"
      style={{ background: "var(--scrim)" }}
      // Перде босиш **иккита** шартни талаб қилади: босиш ҳам, қўйиб
      // юбориш ҳам айнан перданинг ўзида бўлсин.
      //
      //  · Фақат `mousedown` да ёпилса — фокус бузиларди: ойна `mousedown`
      //    да йўқолиб, ўша босишнинг қолган қисми (`mouseup`/`click`) ой
      //    остидаги бўш жойга тушар ва фокусни `<body>` га олиб қўярди.
      //  · Фақат `click` да ёпилса — ичкарида матн белгилаб, сичқончани
      //    ташқарида қўйиб юборганда ойна ёпилиб кетарди.
      onMouseDown={(ev) => {
        downOnScrim.current = ev.target === ev.currentTarget;
      }}
      onClick={(ev) => {
        if (downOnScrim.current && ev.target === ev.currentTarget) onClose();
        downOnScrim.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-card border border-hair bg-surface shadow-card outline-none " +
          WIDTH[width]
        }
      >
        {/* --- сарлавҳа --- */}
        <div className="flex flex-none items-start gap-3 border-b border-grid px-4 pt-3 pb-2.5">
          <div className="min-w-0 flex-1">
            {lead && <div className="mb-1.5">{lead}</div>}
            <h2 id={`${uid}-title`} className="text-[15px] leading-[1.3] [font-weight:670] break-words">
              {title}
            </h2>
            {sub && <p className="mt-0.5 text-[11.5px] leading-[1.45] text-ink-3">{sub}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ойнани ёпиш"
            className="flex-none cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-2 py-[3px] text-[15px] leading-none text-ink-3 hover:text-ink"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* --- мазмун --- */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">{children}</div>

        {foot && (
          <div className="flex flex-none flex-wrap items-center gap-2 border-t border-grid px-4 py-2.5">
            {foot}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
