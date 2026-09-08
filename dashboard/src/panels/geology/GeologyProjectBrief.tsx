import type { GeoProject } from "../../lib/adapters/geology";
import { GRID } from "../../components/layout";
import { Card } from "../../components/Card";
import { Pill } from "../../components/Pill";
import {
  GroupChip,
  HeroTile,
  ProjectFacts,
  ProjectVolumeList,
  ResultBox,
  WorkList,
  heroTilesOf,
} from "./parts";

/**
 * Битта лойиҳанинг ихчам кўриниши — харитадаги модал ичида.
 *
 * ═══ Тафсилот саҳифасининг такрори эмас ═════════════════════════════════
 *
 * Ҳамма блок `parts.tsx` дан олинади: ҳеро кўрсаткичлари, асосий
 * маълумотлар, 2026 режаси, иш режаси ва кутилаётган натижа — тафсилот
 * саҳифаси билан **айнан бир хил** бўлаклар. Шунинг учун иккита жойда
 * иккита ҳақиқат пайдо бўлмайди: манбадаги қатор ўзгарса, иккови ҳам
 * бирданига ўзгаради.
 *
 * Модалда **йўқ** нарсалар — атайин: 2026 диаграммалари (тор ойнада ўз
 * шкаласини йўқотади), ҳалқали «лойиҳа ҳолати» карточкаси ва матнли
 * абзацлар. Улар керак бўлса — пастдаги «Тўлиқ саҳифани очиш» тугмаси.
 * Ҳеро плиткалари бу ерда икки устунда (`g2`), саҳифада эса тўртта: ойна
 * тор, тўртта устун ўқилмас бўларди.
 */

export function GeologyProjectBrief({ p }: { p: GeoProject }) {
  return (
    <div className="flex flex-col gap-3">
      {/* --- чиплар ва тўлиқ ном ------------------------------------------ */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill>{p.category}</Pill>
          <Pill>{p.direction}</Pill>
          <Pill>№ {p.no}</Pill>
          <span className="flex-1" />
          <GroupChip group={p.group} groupKey={p.groupKey} />
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.55] text-ink-2 break-words">{p.name}</p>
      </div>

      <div className={GRID.g2}>
        {heroTilesOf(p).map((t) => (
          <HeroTile key={t.label} {...t} />
        ))}
      </div>

      <Card title="Асосий маълумотлар">
        <ProjectFacts p={p} />
      </Card>

      {/* 31 та лойиҳада ҳажм умуман кўрсатилмаган — карточка «0» билан
          тўлдирилмайди, умуман чизилмайди. */}
      {p.volume && (
        <Card title="2026 йил режаси" stripe="var(--s1)">
          <ProjectVolumeList v={p.volume} />
        </Card>
      )}

      {p.works.length > 0 && (
        <Card
          title="Иш режаси"
          sub={
            p.progress === null
              ? `${p.works.length} та иш`
              : `${p.progress.done} / ${p.progress.total} бажарилди`
          }
        >
          <WorkList works={p.works} />
        </Card>
      )}

      <ResultBox text={p.result} />
    </div>
  );
}
