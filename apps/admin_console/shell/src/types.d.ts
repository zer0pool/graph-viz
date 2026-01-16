/// <reference types="webpack/module" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly LINEAGE_REMOTE_URL: string;
  readonly TABLE_DETAIL_REMOTE_URL: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
