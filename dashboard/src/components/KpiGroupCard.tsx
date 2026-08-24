import { useId, useState } from "react";
import type { KpiGroupVM } from "../lib/adapters/kpi";
import { Card } from "./Card";
import { Pill } from "./Pill";
import { StatusMix } from "./StatusMix";
import { KpiList } from "./KpiList";

/**
 * Гуруҳ (категория ёки сех) карточкаси.
 *
 * Асосий экранда фақат **йиғма ҳолат** кўринади: нечта кўрсаткич ва улар
 * қайси ҳолатда. Якка кўрсаткичлар номи ва қиймати фойдаланувчи очгандагина
 * чиқади — шу сабабли 45 кўрсаткич бирданига экранга тўкилмайди ва TOP
 * рўйхатлар билан такрорланиш ҳам бўлмайди (очиш — фойдаланувчининг ўз
 * ҳаракати, автомат кўриниш эмас).
 */
export function KpiGroupCard({
  group,
  /** Гуруҳ остидаги қўшимча тавсиф — масалан, ўлчов бирликлари рўйхати. */
  sub,
  defaultOpen = false,
}: {
  group: KpiGroupVM;
  sub?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const panelId = `kg-${uid}`;
  const c = group.counts;

  return (
    <Card title={group.title} sub={sub ?? `${c.total} та кўрсаткич`}>
      <div className="mt-1.5">
        <StatusMix counts={c} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {c.crit > 0 && <Pill status="crit">{c.crit} та муаммо</Pill>}
        {c.warn > 0 && <Pill status="warn">{c.warn} та диққат</Pill>}
        {c.good > 0 && <Pill status="good">{c.good} та бажарилган</Pill>}
        {c.mute > 0 && <Pill>{c.mute} та баҳоланмайди</Pill>}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="mt-2.5 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-ink-2 hover:text-ink"
      >
        {open ? "Кўрсаткичларни яшириш" : `Кўрсаткичларни очиш (${c.total})`}
      </button>

      <div id={panelId} hidden={!open} className="mt-1.5">
        {open && <KpiList rows={group.rows} />}
      </div>
    </Card>
  );
}
