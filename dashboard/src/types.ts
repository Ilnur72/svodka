/**
 * Интерфейс даражасидаги умумий типлар.
 *
 * API жавоб шакллари `src/api/types.ts` да, панел учун тайёрланган
 * view-model'лар `src/lib/adapters/*` да. Бу файлда фақат иккисига ҳам
 * боғлиқ бўлмаган умумий тушунчалар қолади.
 */

import type { Period } from "./lib/period";

export type TabId = "obzor" | "prod" | "sgp" | "energy" | "h2" | "cist" | "ogarok" | "ing";

export type Status = "good" | "warn" | "crit" | "mute";

/**
 * Ҳар бир панел бир хил киришни олади: танланган давр ва унга тушган ойлар.
 * Маълумотни панелнинг ўзи `useQuery` орқали юклайди — шунда битта бўлимнинг
 * 404 бўлиши бошқаларига таъсир қилмайди.
 */
export interface PanelProps {
  period: Period;
  months: string[];
}
