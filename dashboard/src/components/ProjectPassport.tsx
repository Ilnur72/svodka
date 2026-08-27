import { Card } from "./Card";
import { GRID } from "./layout";
import { ProjectCost } from "./ProjectCost";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectKpis } from "./ProjectKpis";
import { ProjectResults } from "./ProjectResults";
import { ProjectTimeline } from "./ProjectTimeline";
import { planTitle, type ProjectPassportVM } from "../lib/adapters/projects";

/**
 * Битта лойиҳанинг тўлиқ паспорти.
 *
 * ═══ Бўш бўлим чизилмайди ═══════════════════════════════════════════════
 *
 * Ҳужжатда бўлмаган бўлим учун бу ерда «маълумот йўқ» деган карточка ҳам
 * чиқмайди — блок умуман бўлмайди. Шунинг учун ҳар бир блок ўз шарти билан
 * ўралган, ҳеч қаерда «доим чизиладиган» жой йўқ.
 *
 * Иккита блок ёнма-ён турганда грид ишлатилади, биттаси бўлмаса иккинчиси
 * бутун кенгликни олади — бўш устун қолмайди.
 *
 * ═══ Аралашмаслик ══════════════════════════════════════════════════════
 *
 * Компонент фақат ўзига берилган `vm` ни чизади ва бошқа лойиҳага умуман
 * мурожаат қилмайди, шунинг учун бир лойиҳанинг маълумоти иккинчисиникига
 * қўшилиб кетиши мумкин эмас.
 */
export function ProjectPassport({ vm }: { vm: ProjectPassportVM }) {
  const cost = vm.cost && (
    <Card title={vm.label.qiymat}>
      <ProjectCost headline={vm.cost.headline} lines={vm.cost.lines} />
    </Card>
  );

  const done = vm.done.length > 0 && (
    <Card title={vm.label.bajarilgan} sub={`${vm.done.length} ёзув`}>
      <ProjectTimeline items={vm.done} />
    </Card>
  );

  const plan = vm.plan && (
    <Card title={planTitle(vm.plan.year)} sub={`${vm.plan.items.length} ёзув`}>
      <ProjectTimeline items={vm.plan.items} tone="plan" />
    </Card>
  );

  return (
    <div className="flex flex-col gap-3">
      <ProjectHeader title={vm.title} place={vm.place} sourceLabel={vm.sourceLabel} />

      {vm.goal && (
        <Card title={vm.label.maqsad}>
          <p className="max-w-[100ch] text-[13.5px] leading-[1.6] text-ink">{vm.goal.text}</p>
          <ProjectKpis details={vm.goal.details} />
        </Card>
      )}

      {cost}

      {done && plan ? (
        <div className={GRID.g2}>
          {done}
          {plan}
        </div>
      ) : (
        <>
          {done}
          {plan}
        </>
      )}

      {vm.results.length > 0 && (
        <Card title={vm.label.natija}>
          <ProjectResults lines={vm.results} />
        </Card>
      )}
    </div>
  );
}
