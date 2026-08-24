import type { ProdCard } from "../lib/adapters/production";
import { exact, nf, pctTxt, statusOf, stripeOf } from "../lib/format";
import { Card } from "./Card";
import { KeyValueList } from "./KeyValueList";
import { Pill } from "./Pill";

/**
 * Битта маҳсулот бўйича карточка: режа, давр бошидан йиғилган факт ва
 * бажарилиш фоизи.
 *
 * Уч қарор:
 *  - **фоиз бэкенддан келгани билан кўрсатилади** (`ProdCard.percent`), қайта
 *    ҳисобланмайди; режа нол бўлса «режасиз» деб ёзилади — `0%` ҳам,
 *    `Infinity` ҳам чиқмайди;
 *  - **сон яхлитланмайди** — `exact()`, манбада қандай бўлса шундай;
 *  - устун ҳар бир карточкада **ўз шкаласида** (`max(режа, факт)`), чунки
 *    позициялар турли ўлчов бирлигида — умумий шкала маъносиз бўларди
 *    (`BulletRow` билан бир хил тамойил).
 */
export interface ProductCardProps {
  card: ProdCard;
  /** Цех номи сарлавҳа остида кўрсатилсинми (битта цех танланганда — керак эмас). */
  showWorkshop?: boolean;
}

export function ProductCard({ card, showWorkshop = true }: ProductCardProps) {
  const pc = card.percent;
  const unit = card.unit ?? "";
  const ref = Math.max(card.plan, card.fakt) || 1;
  const factW = Math.max(0, Math.min(100, (card.fakt / ref) * 100));
  const planW = card.plan > 0 ? Math.min(100, (card.plan / ref) * 100) : null;

  const val = (v: number) => `${exact(v)}${unit ? " " + unit : ""}`;
  const title =
    `${card.name}\nРежа: ${val(card.plan)}\nФакт (давр бошидан): ${val(card.fakt)}` +
    `\nБажарилиш: ${pc === null ? "режа қўйилмаган" : pctTxt(pc)}` +
    (card.day ? `\nСўнгги кун (${card.day.label}): ${val(card.day.fakt)}` : "");

  const rows = [
    { k: "Режа", v: val(card.plan) },
    { k: "Факт (давр бошидан)", v: val(card.fakt) },
    ...(card.day ? [{ k: `Сўнгги кун · ${card.day.label}`, v: val(card.day.fakt) }] : []),
  ];

  return (
    <Card
      title={<span className="block leading-[1.3]">{card.name}</span>}
      sub={
        pc === null ? (
          <Pill>режасиз</Pill>
        ) : (
          <Pill status={statusOf(pc)}>{pctTxt(Math.min(pc, 9999))}</Pill>
        )
      }
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: stripeOf(pc) }}
      />
      <div className="text-[11.5px] text-ink-3">
        {unit || "—"}
        {showWorkshop && <> · {card.workshop}</>}
      </div>

      {/* Факт устуни ва режа белгиси — «Ҳажм бўйича» бўлимидаги
          `BulletRow` билан бир хил тил. */}
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

      <KeyValueList rows={rows} />

      {pc !== null && pc > 9999 && (
        <p className="mt-1.5 text-[11px] leading-[1.4] text-ink-3">
          Бажарилиш {nf(pc, 1)}% — режа факт олдида жуда кичик қолган, сон
          қисқартириб кўрсатилди.
        </p>
      )}
    </Card>
  );
}
