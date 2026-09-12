/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_EPHEMERAL_STORAGE_NOTICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
