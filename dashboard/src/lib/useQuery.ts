import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NotAvailableError } from "../api/client";

/**
 * Кичик data-fetching hook (янги кутубхонасиз).
 *
 * Талаблар:
 *  - тўртта ҳолат: юкланиш / хато / бўш / муваффақият, устига «серверда йўқ» (404);
 *  - давр ўзгарганда эски сўров `AbortController` билан бекор қилинади, шунда
 *    кечиккан жавоб янгисини босиб кета олмайди (race condition);
 *  - қайта юклашда скелет миллтилламайди: эски натижа `refreshing` байроғи
 *    билан экранда қолади, панел шаффофлиги пасаяди.
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  /** Биринчи юклаш — экранда ҳали ҳеч нарса йўқ. */
  loading: boolean;
  /** Қайта юклаш — эски маълумот кўрсатилиб турибди. */
  refreshing: boolean;
  /** 404: endpoint серверда мавжуд эмас (хато эмас, алоҳида ҳолат). */
  notAvailable: boolean;
  refetch: () => void;
}

interface State<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  notAvailable: boolean;
}

const IDLE: State<never> = {
  data: null,
  error: null,
  loading: false,
  refreshing: false,
  notAvailable: false,
};

export function useQuery<T>(
  /** Сўровни аниқлайдиган калит: ўзгарса — қайта юкланади. */
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  opts: { enabled?: boolean } = {},
): QueryResult<T> {
  const enabled = opts.enabled ?? true;
  const [state, setState] = useState<State<T>>(IDLE as State<T>);
  const [nonce, setNonce] = useState(0);

  // Чақирувчилар `fetcher` ни ҳар рендерда янгидан ясайди, шунинг учун у
  // dependency бўла олмайди — сўров фақат `key` ўзгарганда қайта юборилади.
  // Layout effect passive effect'дан олдин ишлайди, демак қуйидаги эффект
  // ҳар доим энг сўнгги функцияни кўради.
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) {
      setState(IDLE as State<T>);
      return;
    }
    const ac = new AbortController();
    let alive = true;

    setState((s) => ({
      data: s.data,
      error: null,
      loading: s.data === null,
      refreshing: s.data !== null,
      notAvailable: false,
    }));

    fetcherRef
      .current(ac.signal)
      .then((data) => {
        if (!alive) return;
        setState({ data, error: null, loading: false, refreshing: false, notAvailable: false });
      })
      .catch((e: unknown) => {
        if (!alive || ac.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        const error = e instanceof Error ? e : new Error(String(e));
        setState({
          data: null,
          error,
          loading: false,
          refreshing: false,
          notAvailable: error instanceof NotAvailableError,
        });
      });

    return () => {
      alive = false;
      ac.abort();
    };
  }, [key, nonce, enabled]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    refreshing: state.refreshing,
    notAvailable: state.notAvailable,
    refetch,
  };
}
