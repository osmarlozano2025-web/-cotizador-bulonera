import { z } from "zod";
import type { TangoProvider } from "../types";

const tangoEnv = import.meta.env as Record<string, string | undefined>;

const tangoConfigSchema = z.object({
  VITE_TANGO_INTEGRATION_ENABLED: z.string().optional().default("false"),
  VITE_TANGO_PROVIDER: z.enum(["mock", "api", "webService", "sdk", "file", "localConnector", "disabled"]).default("mock"),
});

const parsed = tangoConfigSchema.parse({
  VITE_TANGO_INTEGRATION_ENABLED: tangoEnv.VITE_TANGO_INTEGRATION_ENABLED,
  VITE_TANGO_PROVIDER: tangoEnv.VITE_TANGO_PROVIDER,
});

export interface TangoConfig {
  readonly enabled: boolean;
  readonly provider: TangoProvider;
  readonly isConfigured: boolean;
}

export const tangoConfig: Readonly<TangoConfig> = Object.freeze({
  enabled: parsed.VITE_TANGO_INTEGRATION_ENABLED === "true",
  provider: parsed.VITE_TANGO_PROVIDER,
  isConfigured: parsed.VITE_TANGO_INTEGRATION_ENABLED === "true" && parsed.VITE_TANGO_PROVIDER !== "disabled",
});
