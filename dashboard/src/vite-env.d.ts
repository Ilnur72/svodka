/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API манзили — `.env` да мажбурий. */
  readonly VITE_API_BASE: string;
  /**
   * Фақат локал ишлаб чиқиш учун токен (`.env.local`).
   * Prod build'да ўқилмайди — `auth.ts` даги `devToken()` га қаранг.
   */
  readonly VITE_DEV_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
