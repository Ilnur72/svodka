import { useId, useMemo, useState } from "react";
import { nf } from "../lib/format";
import {
  projectList,
  projectMatches,
  projectPassport,
  projectSources,
} from "../lib/adapters/projects";
import { Section } from "../components/Card";
import { GRID } from "../components/layout";
import { Pill } from "../components/Pill";
import { StatTile } from "../components/StatTile";
import { EmptyState } from "../components/states";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectPassport } from "../components/ProjectPassport";

/**
 * «Лойиҳалар паспорти» бўлими — иккита кўриниш, битта таб ичида.
 *
 *  · **Рўйхат** (бошланғич) — ҳамма лойиҳа қисқа карточкада, устида қидирув
 *    ва фильтрлар.
 *  · **Паспорт** — битта лойиҳа тўлиқ, ҳужжатдаги олти бўлим бўйича.
 *
 * ═══ Экранда фақат ҳужжатдаги нарса ════════════════════════════════════
 *
 * Манба — иккита Word ҳужжати (`etl/projects.json` → `lib/projects/…`).
 * Ҳужжатда бўлмаган ҳеч қандай кўрсаткич бу бўлимда йўқ ва бўлиши ҳам
 * мумкин эмас: тайёрлик фоизи, лойиҳа статуси, муддат ҳисоби, «жами
 * қиймат» — буларнинг ҳеч бири манбада йўқ, шунинг учун ҳисоблаб ҳам,
 * ўйлаб ҳам қўйилмайди.
 *
 * Юқоридаги плиткалар — фақат **саноқ**: нечта лойиҳа ва нечта манба
 * ҳужжати. Сумма йиғиндиси йўқ: ҳужжатда қиймат
 * турли шаклда («14,8 млн доллар», «67 млн. доллар», «дастлабки инвестиция
 * харажатлари 112,2 млн доллар») ёзилган ва уларни жамлаш тахмин бўларди.
 *
 * ═══ Нега бу бўлим давр танлагичига боғланмаган ════════════════════════
 *
 * Манба «Production Report» API'дан келмайди ва ой кесимида эмас — ҳужжат
 * ўз санаси билан яхлит ҳолда туради. Шунинг учун панел `PanelProps` олмайди
 * («Молиявий кўрсаткичлар» ва «Инвестиция лойиҳалари» каби).
 *
 * ═══ Лойиҳалар сони ════════════════════════════════════════════════════
 *
 * Ҳеч қаерда қаттиқ ёзилмаган: барча саноқ рўйхат узунлигидан келиб чиқади,
 * фильтр рўйхати эса маълумотнинг ўзидан йиғилади. Ҳужжатга лойиҳа қўшилса,
 * генерацияни қайта ишга тушириш кифоя — бу файл ўзгармайди.
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

export function ProjectsPanel() {
  const uid = useId();
  const all = useMemo(() => projectList(), []);
  const sources = useMemo(() => projectSources(), []);

  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string>("");

  const shown = useMemo(
    () =>
      all.filter(
        (p) =>
          (source === "" || p.source === source) &&
          projectMatches(p.id, query),
      ),
    [all, source, query],
  );

  const passport = useMemo(() => (openId ? projectPassport(openId) : null), [openId]);
  const dirty = query !== "" || source !== "";

  // ─── Паспорт кўриниши ────────────────────────────────────────────────
  if (passport) {
    // Олдинги/кейинги — фильтрланган рўйхат бўйича: экранда кўринмаётган
    // лойиҳага ўтиб кетмаслик учун.
    const i = shown.findIndex((p) => p.id === passport.id);
    const prev = i > 0 ? shown[i - 1] : null;
    const next = i >= 0 && i < shown.length - 1 ? shown[i + 1] : null;

    return (
      <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink"
          >
            ← Лойиҳалар рўйхати
          </button>
          <span className="flex-1" />
          {i >= 0 && (
            <span className="text-[11.5px] text-ink-3">
              {i + 1} / {shown.length}
            </span>
          )}
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && setOpenId(prev.id)}
            className="cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-40"
          >
            ← Олдинги
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && setOpenId(next.id)}
            className="cursor-pointer rounded-[5px] border border-hair bg-surface px-3 py-[6px] text-[12.5px] font-semibold text-ink-2 hover:text-ink disabled:cursor-default disabled:opacity-40"
          >
            Кейинги →
          </button>
        </div>

        <ProjectPassport vm={passport} />

        <p className="mt-4 max-w-[110ch] text-[11.5px] leading-[1.6] text-ink-3">
          <b className="font-semibold text-ink-2">Манба:</b> «{passport.sourceLabel}» ҳужжати.
          Барча матн, сана ва сон ҳужжатдан ўзгартирилмасдан олинган. Ҳужжатда
          кўрсатилмаган кўрсаткичлар (тайёрлик даражаси, лойиҳа ҳолати, муддат ҳисоби)
          бу ерда ҳисобланмайди ва кўрсатилмайди.
        </p>
      </>
    );
  }

  // ─── Рўйхат кўриниши ─────────────────────────────────────────────────
  return (
    <>
      <Section
        title="Лойиҳалар паспорти"
        note="Ҳужжатлардан олинган лойиҳа маълумотлари — қидирув, манба бўйича фильтр ва тўлиқ паспорт."
      >
        {/* Битта плитка — грид керак эмас: `GRID.g3` да у учдан бир кенгликда
            қолиб, ёнида иккита бўш устун турарди. */}
        <StatTile label="Лойиҳалар сони" value={nf(all.length)} stripe="var(--s1)" />
      </Section>

      <Section title="Лойиҳалар">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <label htmlFor={`${uid}-src`} className={LBL}>
            Манба ҳужжати
          </label>
          <select
            id={`${uid}-src`}
            value={source}
            onChange={(ev) => setSource(ev.target.value)}
          >
            <option value="">Барчаси ({all.length})</option>
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>

          <label htmlFor={`${uid}-q`} className={LBL}>
            Қидирув
          </label>
          <input
            id={`${uid}-q`}
            type="search"
            placeholder="лойиҳа номи ёки матн…"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
          />

          {dirty && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSource("");
              }}
              className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
            >
              Фильтрни тозалаш
            </button>
          )}

          <span className="flex-1" />
          <Pill>
            {shown.length} / {all.length} лойиҳа
          </Pill>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            title="Танланган шартга мос лойиҳа топилмади"
            text="Қидирув сўзини ёки фильтрни ўзгартиринг."
          />
        ) : (
          <div className={GRID.g3}>
            {shown.map((p) => (
              <ProjectCard key={p.id} item={p} onOpen={setOpenId} />
            ))}
          </div>
        )}
      </Section>

      <p className="max-w-[110ch] text-[11.5px] leading-[1.6] text-ink-3">
        <b className="font-semibold text-ink-2">Манба:</b>{" "}
        {sources.map((s) => `«${s.label}»`).join(", ")} ҳужжатлари. Маълумот «Production
        Report» API'дан келмайди — у ҳужжатлардан кўчирилган статик манба. Лойиҳаларнинг
        умумий қиймати бу ерда жамланмайди: ҳужжатда суммалар турли шакл ва кесимда
        ёзилган, уларни қўшиш тахмин бўларди.
      </p>
    </>
  );
}
