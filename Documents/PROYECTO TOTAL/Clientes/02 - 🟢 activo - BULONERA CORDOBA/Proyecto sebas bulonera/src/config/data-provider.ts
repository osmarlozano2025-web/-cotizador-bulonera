import { environment } from "./environment";

export type DataProviderKind = "mock" | "supabase";

export const DATA_PROVIDER: DataProviderKind = environment.dataProvider;

export function isMockDataProvider(): boolean {
  return DATA_PROVIDER === "mock" || !environment.isSupabaseConfigured;
}

export function isSupabaseDataProvider(): boolean {
  return DATA_PROVIDER === "supabase" && environment.isSupabaseConfigured;
}
