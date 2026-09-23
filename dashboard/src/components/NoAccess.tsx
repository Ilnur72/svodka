/**
 * «Кириш ҳуқуқи йўқ» экрани — дашбордни кўриш ҳуқуқи бўлмаган ҳолат.
 *
 * Дашборд хост илованинг `iframe` ичида очилади ва кириш ҳуқуқини ўша
 * хостдан олади (қаранг: `api/auth.ts`). Ҳуқуқ топилмаса дашборд ўрнига
 * айнан шу экран чизилади ва **биронта API сўрови юборилмайди** — бу ерда
 * ҳеч қандай маълумот юкланмайди, демак 401 ларнинг кетма-кетлиги ҳам йўқ.
 *
 * ⚠️ Матнда ТЕХНИК ТАФСИЛОТ йўқ ва қўшилмайди: қайси механизм, қайси калит,
 * қайси манба — булар бегона одамга йўл кўрсатади, ҳуқуқи бор фойдаланувчи
 * учун эса фойдасиз. Унга керагиси биргина нарса: қаердан кириш керак.
 *
 * Экран ўзи «тузалади»: ҳуқуқ пайдо бўлиши билан (хост ёзса ёки манзил
 * ўзгарса) `useAuthToken()` қайта рендер қилади ва дашборд очилади —
 * алоҳида «қайта уриниш» тугмаси ҳам, редирект ҳам керак эмас.
 */
export function NoAccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-5 py-10">
      <section
        role="alert"
        aria-labelledby="no-access-title"
        className="w-full max-w-[460px] rounded-card border border-hair bg-surface px-7 py-8 text-center shadow-card"
      >
        {/* Эмблема нисбий йўл билан (`./`) — илова сайт илдизида турмаса ҳам
            (масалан `/excel/`) топилиши учун; `vite.config.ts` да `base: "./"`. */}
        <img
          src="./logo-emblem.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto h-11 w-11 opacity-70"
        />

        <h1 id="no-access-title" className="mt-5 text-[16px] [font-weight:650] text-ink">
          Кириш ҳуқуқи йўқ
        </h1>

        <p className="mx-auto mt-3 max-w-[340px] text-[13px] leading-[1.6] text-ink-2">
          Бу бўлим ёпиқ. Уни кўриш учун корхонанинг ахборот тизимига киринг ва бўлимни
          ўша ердан очинг.
        </p>

        <p className="mx-auto mt-4 max-w-[340px] text-[12px] leading-[1.6] text-ink-3">
          Кириш ҳуқуқингиз бор деб ҳисобласангиз, тизим маъмурига мурожаат қилинг.
        </p>
      </section>
    </main>
  );
}
