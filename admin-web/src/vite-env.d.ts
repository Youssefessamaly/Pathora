/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public browser configuration only — never a secret. Empty/unset in development (the
   *  Vite proxy handles relative /api/v1 calls); set to an absolute API base for a deployed
   *  build. See admin-web/.env.example and README. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
