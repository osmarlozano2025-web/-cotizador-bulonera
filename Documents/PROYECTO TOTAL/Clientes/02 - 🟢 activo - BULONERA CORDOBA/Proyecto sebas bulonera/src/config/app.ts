export interface AppConfig { name: string; apiBaseUrl: string | null; }

export const appConfig: Readonly<AppConfig> = Object.freeze({
  name: import.meta.env.VITE_APP_NAME ?? "Córdoba Bulones ERP",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || null,
});
