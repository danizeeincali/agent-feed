/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WEBSOCKET_URL: string;
  readonly VITE_DEBUG: string;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
  // Add environment variable types here
  [key: string]: any;
}

interface ImportMeta {
  readonly hot?: ViteHotContext;
  readonly env: ImportMetaEnv;
}