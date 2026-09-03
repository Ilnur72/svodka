/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API манзили — `.env` да мажбурий. */
  readonly VITE_API_BASE: string;
  /**
   * Кириш токени — ягона манба. `.env` ёки `.env.local` (устун) га
   * қўйилади. Build вақтида bundle ичига ёзилади — қаранг: `auth.ts`.
   */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
