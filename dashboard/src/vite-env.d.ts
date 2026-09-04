/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API манзили — `.env` да мажбурий. */
  readonly VITE_API_BASE: string;
  /**
   * Захира токен (`.env` ёки `.env.local`) — фақат хост/URL/localStorage
   * ҳеч бирида топилмаса ишлатилади. Қаранг: `auth.ts` → `devToken()`.
   */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
