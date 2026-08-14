import type { Client } from "@/domain/client/client";
import type { ClientId } from "@/domain/shared";
import type { ClientFormValues } from "../types";
import { MockClientRepository } from "../repositories/mock-client-repository";
import type { ClientRepository } from "../repositories/client-repository";
export { getClientReferenceData } from "../data/mock-clients";

const repository: ClientRepository = new MockClientRepository();

export const getClients = repository.getClients.bind(repository);
export const getClientById = repository.getClientById.bind(repository);
export const getClientDetailData = repository.getClientDetailData.bind(repository);
export const createClient = repository.createClient.bind(repository);
export const updateClient = repository.updateClient.bind(repository);
export const changeClientStatus = repository.changeClientStatus.bind(repository);
export const getClientAccountSummary = repository.getClientAccountSummary.bind(repository);
export const getClientOrderHistory = repository.getClientOrderHistory.bind(repository);
export const getClientActivity = repository.getClientActivity.bind(repository);

export async function submitClientForm(values: ClientFormValues, clientId?: ClientId): Promise<Client> {
  if (clientId === undefined) {
    return repository.createClient(values);
  }

  return repository.updateClient(clientId, values);
}
