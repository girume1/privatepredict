/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK_ID: string;
  readonly VITE_PREDICTION_BOARD_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
