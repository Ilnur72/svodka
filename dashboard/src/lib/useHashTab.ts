import { useCallback, useEffect, useState } from "react";
import type { TabId } from "../types";

export const TABS: { id: TabId; label: string }[] = [
  // «Корхона» — бутун корхонанинг бир экранли кўриниши (хомашё базаси →
  // қайта ишлаш → бозор). «Умумий кўрсаткичлар» билан адашмасин: у паспорт,
  // баланс, занжир ва кунлик сводка кўринишлари; бу эса манбалар йиғмаси.
  { id: "company", label: "Корхона" },
  { id: "obzor", label: "Умумий кўрсаткичлар" },
  { id: "prod", label: "Ишлаб чиқариш" },
  // «Ишлаб чиқариш» ёнида: иккови ҳам production-report'дан, лекин бу —
  // металл кесимида йиғма дашборд (`/dashboard`), у эса завод/цех/маҳсулот
  // дарахти (`/production/tree`).
  { id: "metals", label: "Технологик металлар" },
  { id: "sgp", label: "Сотиш ва қолдиқлар (СГП)" },
  { id: "energy", label: "Электр энергия" },
  // «Электр энергия» ёнида: иккови ҳам энергия, лекин манбаси бошқа —
  // у цех сводкалари, бу эса станцияларнинг ўз ўлчовлари.
  { id: "solar", label: "Қуёш станциялари" },
  { id: "h2", label: "Водород ва газ" },
  { id: "cist", label: "Цистерна ва юклар" },
  { id: "ogarok", label: "Огарок" },
  { id: "ing", label: "Ингичка ИОФ" },
  { id: "fin", label: "Молиявий кўрсаткичлар" },
  { id: "invest", label: "Инвестиция лойиҳалари" },
  // «Инвестиция лойиҳалари» ёнида: иккови ҳам инвестиция, лекин манбаси ва
  // кесими бошқа — у лойиҳалар реестри (қиймат, молиялаштириш, ижро фоизи),
  // бу эса ҳар бир лойиҳанинг иш графиги (Gantt: босқич, иш, муддат, масъул),
  // алоҳида бэкенд модули — `project-schedule`.
  { id: "schedule", label: "Лойиҳа графиклари" },
  { id: "mobplan", label: "Кадрлар режаси" },
  { id: "projects", label: "Лойиҳалар паспорти" },
  // «Лойиҳалар паспорти» ёнида: иккови ҳам лойиҳа, лекин манбаси бошқа —
  // у Word ҳужжатлари, бу эса Геология бошқармасининг тақдимоти (алоҳида
  // бэкенд модули, `geology-projects`).
  { id: "geology", label: "Геология лойиҳалари" },
  // «Умумий кўрсаткичлар» ичидаги «Цехлар занжири» билан адашмасин: у бутун
  // комбинатнинг йиғма занжир харитаси, бу эса цех-ма-цех батафсил жараён
  // схемаси — босқичлар, ускуна расмлари, реагентлар ва шароитлар билан.
  { id: "tex", label: "Технологик жараён" },
];

const IDS = new Set<string>(TABS.map((t) => t.id));

/**
 * Хэш иккита сегментдан иборат бўлиши мумкин: `#geology/12` — таб ва таб
 * ичидаги ҳолат (масалан очилган лойиҳа). Биринчи сегмент **доим** таб,
 * иккинчиси эса фақат ўша табнинг ўзига тегишли — бошқа табларда у ўқилмайди.
 */
const splitHash = (): [string, string | null] => {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  const i = h.indexOf("/");
  return i === -1 ? [h, null] : [h.slice(0, i), h.slice(i + 1)];
};

const fromHash = (): TabId => {
  const [base] = splitHash();
  return IDS.has(base) ? (base as TabId) : "obzor";
};

/**
 * Номаълум хэш (масалан эскирган `#chain` ҳаволаси) хатога олиб келмайди —
 * `fromHash()` уни `obzor` га туширади. Лекин манзил қаторида эски идентификатор
 * қолиб кетса, у ёлғон гапириб турарди ва кейинги `hashchange` да яна ўша
 * ҳолатга қайтарарди. Шунинг учун бўш бўлмаган номаълум хэш бир марта
 * ҳақиқий табга алмаштирилади (`replaceState` — тарихга янги ёзув қўшмайди).
 */
function normaliseHash(tab: TabId): void {
  if (typeof window === "undefined") return;
  const [base] = splitHash();
  // Иккинчи сегмент (`#geology/12`) базаси ҳақиқий бўлса тегилмайди — уни
  // табнинг ўзи ўқийди. Тозаланадигани фақат номаълум база.
  if (base === "" || IDS.has(base)) return;
  window.history.replaceState(null, "", "#" + tab);
}

/**
 * Tab state lives in the URL hash so a panel can be linked to and the browser
 * back button behaves. `hashchange` is an external system, hence the effect.
 */
export function useHashTab(): [TabId, (t: TabId) => void] {
  const [tab, setTab] = useState<TabId>(fromHash);

  useEffect(() => {
    // Биринчи рендердаги хэшни бир марта тозалаш. Кейинги алмашишларни
    // `select()` нинг ўзи ёзади, шунинг учун бу эффект қайта ишламайди —
    // `fromHash()` эса эффект ичида чақирилади ва доим янги қийматни ўқийди.
    normaliseHash(fromHash());
    const onHash = () => setTab(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = useCallback((t: TabId) => {
    setTab(t);
    if (window.location.hash.slice(1) !== t) {
      window.history.replaceState(null, "", "#" + t);
      // `replaceState` `hashchange` ни ўзи чиқармайди, шунинг учун иккинчи
      // сегментга боғланган ҳолат (`useHashSub`) эскириб қоларди: очиқ
      // турган лойиҳадан таб алмаштирилганда манзил `#geology` бўлиб,
      // экранда эса ҳамон тафсилот қоларди. Ҳодиса қўлда чиқарилади —
      // хэшдан ўқийдиган ҳамма ҳолат бир вақтда янгиланади.
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return [tab, select];
}

/** Берилган таб очиқ бўлса — хэшнинг иккинчи сегменти, акс ҳолда `null`. */
const subOf = (tab: TabId): string | null => {
  const [base, sub] = splitHash();
  return base === tab && sub !== null && sub !== "" ? decodeURIComponent(sub) : null;
};

/**
 * Таб ичидаги иккинчи даражали ҳолат — масалан очилган лойиҳа (`#geology/12`).
 *
 * Нега хэш, панелнинг ичидаги `useState` эмас: очиқ лойиҳага ҳавола бериш
 * (deep-link) ва браузернинг «орқага» тугмаси шу ҳолда ишлайди. Очиш/ёпиш
 * `location.hash` га ёзиш орқали бўлади — у тарихга ёзув қўшади, шунинг учун
 * «орқага» тафсилотдан рўйхатга қайтаради. Рўйхатнинг ўз ҳолати (фильтр,
 * қидирув) панелда `useState` да қолади ва бу ерга умуман тегмайди.
 *
 * `replace: true` — тарихга ёзув қўшмасдан алмаштириш; мавжуд бўлмаган
 * идентификаторли ҳаволани тозалаш учун (акс ҳолда «орқага» яна ўша ёлғон
 * манзилга қайтарарди).
 */
export function useHashSub(
  tab: TabId,
): [string | null, (sub: string | null, replace?: boolean) => void] {
  const [sub, setSub] = useState<string | null>(() => subOf(tab));

  useEffect(() => {
    const read = () => setSub(subOf(tab));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [tab]);

  const go = useCallback(
    (next: string | null, replace = false) => {
      setSub(next);
      const h = "#" + (next === null ? tab : `${tab}/${encodeURIComponent(next)}`);
      if (window.location.hash !== h) {
        if (replace) window.history.replaceState(null, "", h);
        else window.location.hash = h;
      }
      if (!replace) window.scrollTo({ top: 0, behavior: "instant" });
    },
    [tab],
  );

  return [sub, go];
}
