/// <reference types="webpack/module" />

interface ImportMetaEnv {
  readonly LINEAGE_REMOTE_URL: string;
  readonly TABLE_DETAIL_REMOTE_URL: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
