import { useMemo } from "react";
import type { PanelProps } from "../types";
import { getSalesProducts } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { dateLabel, periodLabel, exact } from "../lib/format";
import {
  materialLabel,
  salesByProduct,
  type SalesProduct,
  type SalesUnitGroup,
} from "../lib/adapters/sales";
import { sgpSuspectKind, sgpSuspectReason } from "../lib/dataQuality";
import { Card, Section } from "../components/Card";
import { Pill } from "../components/Pill";
import { Banner } from "../components/Banner";
import { BarsH } from "../components/BarsH";
import { DataTable } from "../components/DataTable";
import { Loader } from "../components/states";

/**
 * Сони ишончсиз маҳсулот — **қиймат кўрсатилади**, ёнида огоҳлантириш белгиси.
 *
 * Аввал сон бутунлай яширилар эди. Энди базадаги қиймат қандай бўлса шундай
 * чиқади: раҳбар рақамни кўриши керак, лекин унинг ишончсизлигини ҳам билиши
 * керак. Белги устига келтирилса сабаби кўринади.
 */
function SuspectValue({
  value,
  reason,
  kind,
}: {
  value: number;
  reason: string;
  kind: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${kind}: ${reason}`}>
      <span className="font-mono tabular-nums text-warn-ink">{exact(value)}</span>
      <span aria-label="ўлчов бирлиги шубҳали" className="text-[11px] text-warn-ink">
        ⚠
      </span>
    </span>
  );
}

function UnitGroup({ g, isStock }: { g: SalesUnitGroup; isStock: boolean }) {
  // Диаграммага фақат сони ишончли маҳсулотлар тушади: шубҳали қаторнинг
  // устуни қолганларини кўринмас қилиб юборарди.
  const clean = g.products.filter((p) => !p.suspect && (p.value ?? 0) > 0);

  return (
    <Card
      title={`${g.label}`}
      sub={`${g.products.length} маҳсулот${g.suspectCount ? ` · ${g.suspectCount} таси текширилмоқда` : ""}`}
    >
      {clean.length > 0 ? (
        <BarsH
          ariaLabel={`СГП — ${g.label} кесимида маҳсулотлар`}
          rows={clean.map((p) => ({
            label: p.name,
            v: p.value ?? 0,
            extra: ["Металл", materialLabel(p.material)],
          }))}
          rowH={26}
          padR={92}
          vName={isStock ? "Қолдиқ" : "Реализация"}
          vFmt={(v) => exact(v) + " " + g.label}
        />
      ) : (
        <p className="rounded-md border border-hair bg-sunken px-3 py-4 text-center text-[12px] leading-normal text-ink-3">
          Бу бирликда сони ишончли маҳсулот йўқ.
        </p>
      )}

      <div className="mt-3">
        <DataTable
          caption={`СГП — ${g.label}`}
          cols={[
            { t: "Маҳсулот", wrap: true },
            { t: "Металл" },
            { t: isStock ? "Қолдиқ" : "Ҳажм", num: true },
          ]}
          rows={g.products.map((p: SalesProduct) => {
            const reason = sgpSuspectReason(p);
            return {
              key: String(p.id),
              cells: [
                p.name,
                <span className="text-ink-3">{materialLabel(p.material)}</span>,
                reason ? (
                  <SuspectValue
                    value={p.value ?? 0}
                    reason={reason}
                    kind={sgpSuspectKind(p)}
                  />
                ) : (
                  exact(p.value ?? 0)
                ),
              ],
            };
          })}
        />
      </div>
    </Card>
  );
}

/**
 * СГП — сотиш ва қолдиқлар, маҳсулот кесимида.
 *
 * Икки муҳим қоида:
 *  1. **Категориялар ўзаро таққосланмайди** ва умумий йиғинди йўқ — реализация
 *     оқим, қолдиқ эса ҳолат.
 *  2. **Ўлчов бирликлари аралаштирилмайди** — ҳар бир бирлик ўз картасида,
 *     ўз шкаласида (тн, кг, дона, п/м бир диаграммага тушмайди).
 */
export function SgpPanel({ period, months }: PanelProps) {
  const key = `${period.from}_${period.to}`;
  const q = useQuery(`sales-products_${key}`, (s) => getSalesProducts(period, s));

  const cats = useMemo(() => (q.data ? salesByProduct(q.data) : []), [q.data]);
  const totalSuspect = cats.reduce((a, c) => a + c.suspectCount, 0);

  return (
    <>
      <Banner tone="info">
        <b>Категориялар ўзаро таққосланмайди.</b> «Реализация» — давр ичидаги оқим (йиғилади),
        «Остатки» эса давр охиридаги ҳолат (йиғилмайди). Шунинг учун умумий йиғинди
        ҳисобланмайди. Ўлчов бирликлари ҳам аралаштирилмайди — тонна, килограмм ва дона
        алоҳида кўрсатилади.
      </Banner>

      {totalSuspect > 0 && (
        <Banner tone="warn">
          <b>{totalSuspect} та маҳсулотнинг ўлчов бирлиги шубҳали</b> — қиймат жадвалда
          базадаги ҳолича кўрсатилади, ёнида <span className="text-warn-ink">⚠</span> белгиси
          туради. Бэкенд буни <code>unitSuspect</code> байроғи билан белгилайди:{" "}
          <b>давр ичида сакраш</b> — қийматлар кескин фарқ қилган (тоннадан килограммга
          ўтилганга ўхшайди); <b>бирлик ёрлиғи</b> — қиймат барқарор, лекин ишлаб чиқариш
          суръатига мос келмайди. Белги устига келтирилса аниқ сабаби кўринади.
          Диаграммада улар йўқ: битта ўта катта устун қолган маҳсулотларни
          кўринмас қилиб қўяди — тўлиқ рўйхат жадвалда.
        </Banner>
      )}

      <Loader
        q={q}
        height={260}
        notAvailableWhat="/sales/products"
        isEmpty={() => cats.length === 0}
        emptyTitle="Ушбу давр учун СГП маълумоти йўқ"
        emptyText="Танланган ойларда «Реализация» ва «Остатки» сатрлари киритилмаган."
      >
        {() => (
          <>
            {cats.map((c, ci) => (
              <Section
                key={c.category}
                className={ci === 0 ? undefined : "mt-1"}
                title={c.label}
                note={
                  c.isStock
                    ? `${c.lastDay ? dateLabel(c.lastDay) : periodLabel(months)} ҳолатига · ${c.productCount} маҳсулот`
                    : `${periodLabel(months)} · ${c.productCount} маҳсулот`
                }
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  <Pill>{c.isStock ? "ҳолат — йиғилмайди" : "оқим — давр бўйича йиғинди"}</Pill>
                  {c.units.map((u) => (
                    <Pill key={u.unit}>{u.label}: {u.products.length} та</Pill>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 wide:grid-cols-2">
                  {c.units.map((u) => (
                    <UnitGroup key={u.unit} g={u} isStock={c.isStock} />
                  ))}
                </div>
              </Section>
            ))}
          </>
        )}
      </Loader>
    </>
  );
}
