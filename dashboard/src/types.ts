/**
 * Интерфейс даражасидаги умумий типлар.
 *
 * API жавоб шакллари `src/api/types.ts` да, панел учун тайёрланган
 * view-model'лар `src/lib/adapters/*` да. Бу файлда фақат иккисига ҳам
 * боғлиқ бўлмаган умумий тушунчалар қолади.
 */

import type { Period } from "./lib/period";

export type TabId =
  | "company"
  | "obzor"
  | "prod"
  | "metals"
  | "sgp"
  | "energy"
  | "solar"
  | "h2"
  | "cist"
  | "ogarok"
  | "ing"
  | "fin"
  | "invest"
  | "mobplan"
  | "projects";

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
