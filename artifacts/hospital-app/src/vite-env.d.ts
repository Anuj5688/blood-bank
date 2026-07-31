/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the api-server, used when this app is deployed as a
   * separate Render service on its own domain (e.g. https://api.example.com).
   * Leave unset when the API is reachable at a relative /api path on the
   * same origin.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
