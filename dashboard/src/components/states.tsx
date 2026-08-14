import type { ReactNode } from "react";
import type { QueryResult } from "../lib/useQuery";

/**
 * Маълумот юкланадиган ҳар бир жойда тўртта ҳолат қаралади:
 * юкланиш · хато · бўш · муваффақият, устига **«серверда мавжуд эмас» (404)**.
 *
 * Охиргиси мажбурий: продакшн серверда 12 endpoint'дан 9 таси йўқ, шунда ҳам
 * қолган бўлимлар ишлашда давом этиши керак.
 */

export function Skeleton({ height = 180 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-card border border-hair bg-surface px-4 py-4 shadow-card"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Маълумот юкланмоқда…</span>
      <div className="h-3 w-40 rounded bg-sunken" />
      <div className="mt-3 rounded bg-sunken" style={{ height }} />
    </div>
  );
}

export interface StateBoxProps {
  title: string;
  text?: ReactNode;
  /** Ёнида турадиган ҳаракат тугмаси. */
  action?: ReactNode;
  tone?: "mute" | "crit" | "info";
  icon?: string;
}

function StateBox({ title, text, action, tone = "mute", icon }: StateBoxProps) {
  const accent =
    tone === "crit" ? "var(--crit)" : tone === "info" ? "var(--s1)" : "var(--rule)";
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-card border border-dashed border-rule bg-surface px-5 py-8 text-center shadow-card"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {icon && (
        <span aria-hidden="true" className="font-mono text-[15px] font-bold" style={{ color: accent }}>
          {icon}
        </span>
      )}
      <p className="text-[13.5px] [font-weight:650] text-ink">{title}</p>
      {text && <p className="max-w-[62ch] text-[12.5px] leading-[1.5] text-ink-2">{text}</p>}
      {action}
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-[13px] py-[6px] text-[12px] font-semibold text-ink-2 hover:text-ink"
    >
      Қайта уриниш
    </button>
  );
}

export function NotAvailableState({ what }: { what?: string }) {
  return (
    <StateBox
      icon="—"
      title="Бу бўлим серверда ҳали мавжуд эмас"
      text={
        <>
          Сервер ушбу сўровга <b className="font-semibold">404</b> қайтарди
          {what ? ` (${what})` : ""}. Маълумот киритилгач бўлим ўзи пайдо бўлади;
          бошқа бўлимлар ишлашда давом этади.
        </>
      }
    />
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateBox
        icon="!"
        tone="crit"
        title="Маълумотни юклаб бўлмади"
        text={error.message}
        action={<RetryButton onClick={onRetry} />}
      />
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: ReactNode }) {
  return <StateBox icon="i" tone="info" title={title} text={text} />;
}

export interface LoaderProps<T> {
  q: QueryResult<T>;
  children: (data: T) => ReactNode;
  /** Скелет баландлиги — саҳифа «сакрамаслиги» учун контентга яқин олинади. */
  height?: number;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyText?: ReactNode;
  notAvailableWhat?: string;
}

export function Loader<T>({
  q,
  children,
  height = 180,
  isEmpty,
  emptyTitle = "Ушбу давр учун маълумот йўқ",
  emptyText,
  notAvailableWhat,
}: LoaderProps<T>) {
  if (q.notAvailable) return <NotAvailableState what={notAvailableWhat} />;
  if (q.error && q.data === null) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (q.data === null) return q.loading ? <Skeleton height={height} /> : <Skeleton height={height} />;
  if (isEmpty?.(q.data)) return <EmptyState title={emptyTitle} text={emptyText} />;

  return (
    // Қайта юклашда скелет миллтилламайди: эски натижа жойида қолади,
    // фақат шаффофлик пасаяди.
    <div
      aria-busy={q.refreshing || undefined}
      className={q.refreshing ? "opacity-55 transition-opacity duration-150" : undefined}
    >
      {children(q.data)}
    </div>
  );
}
