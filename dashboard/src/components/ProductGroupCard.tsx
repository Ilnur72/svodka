import { useId, useState } from "react";
import type { ProdGroup } from "../lib/adapters/production";
import { nf, pctTxt, statusOf, stripeOf } from "../lib/format";
import { GRID } from "./layout";
import { Card } from "./Card";
import { KeyValueList } from "./KeyValueList";
import { Pill } from "./Pill";
import { ProductCard } from "./ProductCard";

/**
 * Бир оилага тегишли позицияларнинг **битта** карточкаси: «Резец» каби
 * ўнлаб вариант билан такрорланадиган маҳсулот гуруҳи.
 *
 * Тўртта қарор:
 *  - **сонлар ҲИСОБЛАНГАН**, шунинг учун `nf(v, 2)` билан чиқади (манбадаги
 *    хом қиймат `exact()` билан — у таркибдаги ҳар бир карточкада турибди).
 *    Қоида `adapters/invest.ts` да ёзилган ва бутун сводка бўйлаб бир хил;
 *  - **фоиз қайта ҳисобланган** — жами факт / жами режа. Алоҳида фоизларнинг
 *    ўртачаси олинмайди: у бошқа кўрсаткич (20 донали ва 3 300 донали
 *    позиция тенг вазн оларди);
 *  - **ҳеч нарса яширилмайди** — тугмада нечта позиция борлиги ёзилган ва
 *    бир босишда ҳаммаси очилади (`TableToggle` билан бир хил a11y:
 *    `aria-expanded` + `aria-controls` + `hidden`);
 *  - **режа қўйилмаган позиция нол деб қўшилмайди** — гуруҳда «N тадан M
 *    тасида режа кўрсатилган» деб ҳалол саналади.
 */
export interface ProductGroupCardProps {
  group: ProdGroup;
  /** Цех номи кўрсатилсинми (битта цех танланганда — керак эмас). */
  showWorkshop?: boolean;
}

export function ProductGroupCard({ group, showWorkshop = true }: ProductGroupCardProps) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelId = `fam-${uid}`;

  const n = group.items.length;
  const pc = group.percent;
  const unit = group.unit;
  const ref = Math.max(group.plan, group.fakt) || 1;
  const factW = Math.max(0, Math.min(100, (group.fakt / ref) * 100));
  const planW = group.plan > 0 ? Math.min(100, (group.plan / ref) * 100) : null;

  const val = (v: number) => `${nf(v, 2)} ${unit}`;
  const title =
    `${group.label} — ${n} позиция` +
    `\nЖами режа: ${val(group.plan)}\nЖами факт (давр бошидан): ${val(group.fakt)}` +
    `\nБажарилиш: ${pc === null ? "режа қўйилмаган" : pctTxt(pc)}`;

  return (
    <Card
      className={open ? "mid:col-span-2 wide:col-span-4" : undefined}
      stripe={stripeOf(pc)}
      title={
        <span className="block leading-[1.3]">
          {group.label}{" "}
          <span className="font-normal text-ink-3">· {nf(n)} позиция</span>
        </span>
      }
      sub={
        pc === null ? (
          <Pill>режасиз</Pill>
        ) : (
          <Pill status={statusOf(pc)}>{pctTxt(Math.min(pc, 9999))}</Pill>
        )
      }
    >
      <div className="text-[11.5px] text-ink-3">
        {unit}
        {showWorkshop && group.workshops.length > 0 && <> · {group.workshops.join(", ")}</>}
        {group.plants.length > 1 && <> · {group.plants.join(", ")}</>}
      </div>

      {/* Устун ҳар бир карточкада ўз шкаласида — `ProductCard` билан
          бир хил тил. */}
      <div className="relative mt-2.5 mb-0.5 h-3 rounded-[3px] bg-sunken" title={title}>
        <div
          className="absolute top-0 bottom-0 left-0 rounded-[4px] bg-s1"
          style={{ width: `${factW.toFixed(2)}%` }}
        />
        {planW !== null && (
          <div
            className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
            style={{ left: `calc(${planW.toFixed(2)}% - 1px)` }}
          />
        )}
      </div>

      <KeyValueList
        rows={[
          { k: "Жами режа", v: val(group.plan) },
          { k: "Жами факт (давр бошидан)", v: val(group.fakt) },
        ]}
      />

      {/* Ҳалол саноқ: нечта позицияда қиймат ҳақиқатан кўрсатилган.
          Кўрсатилмагани нол деб қўшилмаган. */}
      <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-3">
        {nf(n)} тадан {nf(group.planSetCount)} тасида режа, {nf(group.faktSetCount)} тасида факт
        кўрсатилган. Фоиз жами факт / жами режа бўйича ҳисобланган.
      </p>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={
          "mt-2.5 flex w-full cursor-pointer items-center gap-2 rounded-[5px] border px-2.5 py-[6px] text-left " +
          (open ? "border-s1 bg-surface-2 text-ink" : "border-hair bg-surface-2 text-ink-2 hover:text-ink")
        }
      >
        <span
          aria-hidden="true"
          className={
            "grid h-[16px] w-[16px] flex-none place-items-center rounded-[4px] font-mono text-[11px] leading-none " +
            (open ? "bg-s1 text-white" : "bg-sunken text-ink-3")
          }
        >
          {open ? "−" : "+"}
        </span>
        <span className="min-w-0 flex-1 text-[11.5px] font-semibold">
          {open ? "Таркибини ёпиш" : "Таркибини очиш"}
        </span>
        <span className="flex-none font-mono text-[11px] text-ink-3">{nf(n)} та</span>
      </button>

      <div id={panelId} hidden={!open} className="mt-2.5">
        {open && (
          <div className={GRID.g4}>
            {group.items.map((c) => (
              <ProductCard key={c.key} card={c} showWorkshop={showWorkshop} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
