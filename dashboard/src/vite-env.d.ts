/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API манзили — `.env` да мажбурий. */
  readonly VITE_API_BASE: string;
  /**
   * Захира токен (`.env` ёки `.env.local`) — **фақат `npm run dev` да** ва
   * фақат хост/URL/localStorage ҳеч бирида топилмаса ишлатилади.
   * `npm run build` натижасига бу қиймат тушмайди.
   * Қаранг: `auth.ts` → `devToken()`.
   */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
