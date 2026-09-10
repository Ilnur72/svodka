import { useId } from "react";
import { nf } from "../../lib/format";
import {
  schedFilterDirty,
  type SchedFilter,
  type SchedProject,
  type SchedStateFilter,
} from "../../lib/adapters/schedule";
import { SegmentSwitch } from "../../components/SegmentSwitch";
import { CheckSelect } from "../../components/CheckSelect";

/**
 * Ишлар фильтри — лойиҳалар рўйхатида ҳам, битта лойиҳанинг Gantt
 * графигида ҳам **айнан бир хил** бошқарув.
 *
 * Нега битта компонент: фильтр ҳолати панелда битта (`SchedulePanel` даги
 * `useState`), шунинг учун иккита экранда иккита турли бошқарув қатори
 * бўлса — фойдаланувчи бир жойда танлаган шарти иккинчи жойда бошқача
 * кўринарди. Тафсилот саҳифасида фақат лойиҳа танлагичи чизилмайди: лойиҳа
 * у ерда аллақачон танланган (манзилда).
 */

const LBL = "text-[11.5px] font-medium tracking-[0.02em] text-ink-3";

export interface ScheduleFilterBarProps {
  filter: SchedFilter;
  onChange: (f: SchedFilter) => void;
  /** Тозалаш тугмаси нимага қайтариши — рўйхатда «муддати ўтган», тафсилотда «барчаси». */
  base: SchedFilter;
  /** `null` — лойиҳа танлагичи чизилмайди (тафсилот саҳифаси). */
  projects: SchedProject[] | null;
  responsibles: { key: string; label: string; count: number }[];
  stateCounts: Record<SchedStateFilter, number>;
}

export function ScheduleFilterBar({
  filter,
  onChange,
  base,
  projects,
  responsibles,
  stateCounts,
}: ScheduleFilterBarProps) {
  const uid = useId();
  const set = <K extends keyof SchedFilter>(k: K, v: SchedFilter[K]) =>
    onChange({ ...filter, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SegmentSwitch<SchedStateFilter>
        label="Иш ҳолати бўйича фильтр"
        options={[
          { id: "all", label: `Барчаси (${nf(stateCounts.all)})` },
          { id: "overdue", label: `Муддати ўтган (${nf(stateCounts.overdue)})` },
          { id: "run", label: `Жараёнда (${nf(stateCounts.run)})` },
          { id: "done", label: `Бажарилган (${nf(stateCounts.done)})` },
          { id: "todo", label: `Бошланмаган (${nf(stateCounts.todo)})` },
        ]}
        value={filter.state}
        onChange={(s) => set("state", s)}
      />

      {projects !== null && (
        <>
          <label htmlFor={`${uid}-proj`} className={LBL}>
            Лойиҳа
          </label>
          <select
            id={`${uid}-proj`}
            value={filter.project}
            onChange={(ev) =>
              // Лойиҳа алмашганда масъул рўйхати ҳам бошқа бўлади, шунинг
              // учун эски танлов қолдирилмайди — акс ҳолда рўйхат сабабсиз
              // бўш кўринарди.
              onChange({ ...filter, project: ev.target.value, responsible: [] })
            }
          >
            <option value="">Барчаси ({nf(projects.length)})</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.title}
              </option>
            ))}
          </select>
        </>
      )}

      <span className={LBL}>Масъул</span>
      <CheckSelect
        label="Масъул бўйича фильтр"
        options={responsibles}
        picked={filter.responsible}
        onChange={(r) => set("responsible", r)}
        emptyText="барчаси"
      />

      <label htmlFor={`${uid}-q`} className={LBL}>
        Қидирув
      </label>
      <input
        id={`${uid}-q`}
        type="search"
        placeholder="иш ёки босқич номи…"
        value={filter.query}
        onChange={(ev) => set("query", ev.target.value)}
      />

      {schedFilterDirty(filter, base) && (
        <button
          type="button"
          onClick={() => onChange(base)}
          className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
        >
          Фильтрни тозалаш
        </button>
      )}
    </div>
  );
}
