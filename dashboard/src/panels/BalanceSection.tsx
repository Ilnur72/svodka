import { useId, useMemo, useState } from "react";
import type { Period } from "../lib/period";
import { getBalance } from "../api/endpoints";
import { useQuery } from "../lib/useQuery";
import { balanceMonth, balanceView } from "../lib/adapters/balance";
import { monthLabel } from "../lib/format";
import { Section } from "../components/Card";
import { BalanceChainGroup } from "../components/BalanceChain";
import { Loader } from "../components/states";

/**
 * «Металлар баланси» — технологик йўл: хомашёдан тайёр маҳсулотгача, ҳар
 * босқич алоҳида карточка, карточкалар стрелка билан боғланган. Ҳар босқичда
 * режа, факт ва бажарилиш фоизи ўша карточканинг ичида кўринади.
 *
 * Занжир **битта ойни** кўрсатади (босқичлар турли бирликда ва ойлар бўйича
 * қўшилмайди), шунинг учун бўлим ичида кичик ой танлагич бор. Ой танлови
 * панел даражасидаги даврни **алмаштирмайди**: давр қайси ойлар серверга
 * сўралишини белгилайди, бу танлагич эса шу ойлардан қайси бири чизилишини.
 */
export function BalanceSection({ period }: { period: Period }) {
  const uid = useId();
  const key = `${period.from}_${period.to}`;
  const q = useQuery(`balance_${key}`, (s) => getBalance(period, s));
  const [picked, setPicked] = useState<string | null>(null);

  // Танлов даврдан ташқарида қолса ўзи охирги ойга қайтади — эффект керак эмас.
  const month = q.data ? balanceMonth(q.data, picked) : null;
  const vm = useMemo(
    () => (q.data && month ? balanceView(q.data, month) : null),
    [q.data, month],
  );

  const refInRange = q.data ? q.data.months.includes(q.data.reference) : false;

  return (
    <Section
      title="Металлар баланси — металл оқими"
      note={
        vm
          ? `${monthLabel(vm.month)} · босқичлар орасида қиймат қўшилмайди, ҳар бири ўз бирлигида`
          : "хомашёдан тайёр маҳсулотгача"
      }
    >
      {vm && vm.months.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <label
            htmlFor={`${uid}-month`}
            className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
          >
            Занжир ойи
          </label>
          <select
            id={`${uid}-month`}
            value={vm.month}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Занжир кўрсатиладиган ой"
          >
            {vm.months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
                {m === vm.reference ? " · эталон" : ""}
              </option>
            ))}
          </select>
          {refInRange && (
            <button
              type="button"
              disabled={vm.month === vm.reference}
              onClick={() => setPicked(vm.reference)}
              className={
                "rounded-[5px] border border-hair bg-surface-2 px-[11px] py-[5px] text-[11.5px] font-semibold " +
                (vm.month === vm.reference
                  ? "cursor-not-allowed text-ink-3 opacity-55"
                  : "cursor-pointer text-ink-2 hover:text-ink")
              }
            >
              Эталон ой: {monthLabel(vm.reference)}
            </button>
          )}
          <span className="text-[11.5px] text-ink-3">
            эталон ой — босқич номлари шу варақдан олинган
          </span>
        </div>
      )}

      <Loader
        q={q}
        height={260}
        notAvailableWhat="/balance"
        isEmpty={() => !vm || vm.groups.length === 0 || !vm.hasValues}
        emptyTitle={
          vm && vm.groups.length > 0
            ? `${monthLabel(vm.month)} учун баланс маълумоти йўқ`
            : "Ушбу давр учун баланс маълумоти йўқ"
        }
        emptyText="Юқоридаги «Занжир ойи» рўйхатидан бошқа ойни танланг."
      >
        {() =>
          vm && (
            <div className="flex flex-col gap-3">
              {vm.groups.map((g) => (
                <BalanceChainGroup key={g.key} group={g} reference={vm.reference} />
              ))}
            </div>
          )
        }
      </Loader>
    </Section>
  );
}
