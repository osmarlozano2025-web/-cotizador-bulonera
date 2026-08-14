import type { Client } from "@/domain/client/client";
import type { ClientStatus } from "@/domain/client/types";
import type { ClientId } from "@/domain/shared";
import type {
  ClientAccountSummary,
  ClientActivityEntry,
  ClientDetailData,
  ClientListQuery,
  ClientListResult,
  ClientRelatedDocument,
  ClientFormValues,
} from "../types";

export interface ClientRepository {
  getClients(query: ClientListQuery): Promise<ClientListResult>;
  getClientById(clientId: ClientId): Promise<Client | null>;
  getClientDetailData(clientId: ClientId): Promise<ClientDetailData | null>;
  createClient(values: ClientFormValues): Promise<Client>;
  updateClient(clientId: ClientId, values: ClientFormValues): Promise<Client>;
  changeClientStatus(clientId: ClientId, status: ClientStatus): Promise<Client>;
  getClientAccountSummary(clientId: ClientId): Promise<ClientAccountSummary | null>;
  getClientOrderHistory(clientId: ClientId): Promise<readonly ClientRelatedDocument[]>;
  getClientActivity(clientId: ClientId): Promise<readonly ClientActivityEntry[]>;
}
