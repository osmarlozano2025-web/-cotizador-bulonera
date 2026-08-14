import { z } from "zod";

const environmentSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default("Córdoba Bulones ERP"),
  VITE_API_BASE_URL: z.string().optional().default(""),
  VITE_DATA_PROVIDER: z.enum(["mock", "supabase"]).default("mock"),
  VITE_AUTH_MODE: z.enum(["mock", "supabase"]).default("mock"),
  VITE_SUPABASE_URL: z.string().optional().default(""),
  VITE_SUPABASE_ANON_KEY: z.string().optional().default(""),
});

const parsedEnvironment = environmentSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_DATA_PROVIDER: import.meta.env.VITE_DATA_PROVIDER,
  VITE_AUTH_MODE: import.meta.env.VITE_AUTH_MODE,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export type DataProviderKind = typeof parsedEnvironment.VITE_DATA_PROVIDER;
export type AuthMode = typeof parsedEnvironment.VITE_AUTH_MODE;

export interface AppEnvironment {
  readonly appName: string;
  readonly apiBaseUrl: string | null;
  readonly dataProvider: DataProviderKind;
  readonly authMode: AuthMode;
  readonly supabaseUrl: string | null;
  readonly supabaseAnonKey: string | null;
  readonly isSupabaseConfigured: boolean;
}

export const environment: Readonly<AppEnvironment> = Object.freeze({
  appName: parsedEnvironment.VITE_APP_NAME,
  apiBaseUrl: parsedEnvironment.VITE_API_BASE_URL.length > 0 ? parsedEnvironment.VITE_API_BASE_URL : null,
  dataProvider: parsedEnvironment.VITE_DATA_PROVIDER,
  authMode: parsedEnvironment.VITE_AUTH_MODE,
  supabaseUrl: parsedEnvironment.VITE_SUPABASE_URL.length > 0 ? parsedEnvironment.VITE_SUPABASE_URL : null,
  supabaseAnonKey: parsedEnvironment.VITE_SUPABASE_ANON_KEY.length > 0 ? parsedEnvironment.VITE_SUPABASE_ANON_KEY : null,
  isSupabaseConfigured: parsedEnvironment.VITE_SUPABASE_URL.length > 0 && parsedEnvironment.VITE_SUPABASE_ANON_KEY.length > 0,
});

if (import.meta.env.DEV && environment.dataProvider === "supabase" && !environment.isSupabaseConfigured) {
  console.warn("[ERP] VITE_DATA_PROVIDER=supabase but Supabase env vars are missing. Falling back to mock mode.");
}

export function isSupabaseMode(): boolean {
  return environment.dataProvider === "supabase" && environment.isSupabaseConfigured;
}
