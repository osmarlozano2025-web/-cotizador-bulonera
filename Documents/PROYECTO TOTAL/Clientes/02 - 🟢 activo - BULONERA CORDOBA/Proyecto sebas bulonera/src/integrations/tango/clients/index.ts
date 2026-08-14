import { tangoConfig } from "../config";
import { MockTangoAdapter, type MockTangoScenario } from "../adapters/mock-tango-adapter";
import { TangoApiAdapter, TangoFileAdapter, TangoLocalConnectorAdapter, TangoSdkAdapter, TangoWebServiceAdapter } from "../adapters/stub-adapters";
import type { TangoConnector } from "../contracts/tango-connector";
import type { TangoProvider } from "../types";

export interface TangoConnectorFactoryOptions {
  readonly provider?: TangoProvider;
  readonly scenario?: MockTangoScenario;
}

export function createTangoConnector(options: TangoConnectorFactoryOptions = {}): TangoConnector {
  const provider = options.provider ?? tangoConfig.provider;

  switch (provider) {
    case "mock":
      return new MockTangoAdapter(options.scenario);
    case "api":
      return new TangoApiAdapter();
    case "webService":
      return new TangoWebServiceAdapter();
    case "sdk":
      return new TangoSdkAdapter();
    case "file":
      return new TangoFileAdapter();
    case "localConnector":
      return new TangoLocalConnectorAdapter();
    case "disabled":
      return new TangoApiAdapter();
  }
}
