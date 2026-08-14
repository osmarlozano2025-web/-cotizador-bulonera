import type { Client } from "@/domain/client/client";
import type { ClientStatus } from "@/domain/client/types";
import type { ClientId, PriceListId, SellerId } from "@/domain/shared";
import { getClientReferenceData, getClientSeedList, getMockClientDetail, MOCK_BRANCH_IDS, MOCK_COMPANY_ID } from "../data/mock-clients";
import { buildClientAccountSummary, getAccountStatusLabel, getCommercialStatusLabel } from "../utils/client-calculations";
import { ClientFormError } from "../errors";
import { formatTaxId, normalizeTaxId } from "../utils/client-validation";
import type {
  ClientAccountSummary,
  ClientActivityEntry,
  ClientDetailData,
  ClientListQuery,
  ClientListResult,
  ClientRelatedDocument,
  ClientFormValues,
} from "../types";
import type { ClientRepository } from "./client-repository";

const delay = async (milliseconds = 180): Promise<void> => {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

const mapCommercialStatus = (status: ClientStatus): Client["commercialStatus"] => {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
      return "inactive";
    case "blocked":
      return "blocked";
    case "suspended":
      return "suspended";
    case "pendingApproval":
      return "pendingApproval";
  }
};

const mapCommercialStatusToClientStatus = (status: Client["commercialStatus"]): ClientStatus => {
  switch (status) {
    case "active":
      return "active";
    case "inactive":
      return "inactive";
    case "blocked":
      return "blocked";
    case "suspended":
      return "suspended";
    case "pendingApproval":
    case "underReview":
      return "pendingApproval";
  }
};

function cloneClient(client: Client): Client {
  return {
    ...client,
    addresses: client.addresses.map((address) => ({ ...address })),
    creditLimit: { ...client.creditLimit },
    currentDebt: { ...client.currentDebt },
    overdueDebt: { ...client.overdueDebt },
  };
}

function cloneDetail(detail: ClientDetailData): ClientDetailData {
  return {
    ...detail,
    client: cloneClient(detail.client),
    addresses: detail.addresses.map((address) => ({ ...address })),
    accountMovements: detail.accountMovements.map((movement) => ({ ...movement })),
    quotes: detail.quotes.map((quote) => ({ ...quote })),
    orders: detail.orders.map((order) => ({ ...order })),
    activity: detail.activity.map((activity) => ({ ...activity })),
    accountSummary: { ...detail.accountSummary },
  };
}

function toMoney(amount: number): Client["creditLimit"] {
  return { amount, currency: "ARS" };
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function sortDetailRecords(records: readonly ClientDetailData[], sort: ClientListQuery["sort"]): readonly ClientDetailData[] {
  const directionFactor = sort.direction === "asc" ? 1 : -1;
  const sorted = [...records].sort((left, right) => {
    let comparison = 0;

    switch (sort.field) {
      case "code":
        comparison = compareText(left.client.code, right.client.code);
        break;
      case "legalName":
        comparison = compareText(left.client.legalName, right.client.legalName);
        break;
      case "debt":
        comparison = compareNumber(left.client.currentDebt.amount, right.client.currentDebt.amount);
        break;
      case "creditLimit":
        comparison = compareNumber(left.client.creditLimit.amount, right.client.creditLimit.amount);
        break;
      case "commercialStatus":
        comparison = compareText(getCommercialStatusLabel(left.client.commercialStatus), getCommercialStatusLabel(right.client.commercialStatus));
        break;
      case "accountStatus":
        comparison = compareText(getAccountStatusLabel(left.accountSummary.accountStatus), getAccountStatusLabel(right.accountSummary.accountStatus));
        break;
    }

    if (comparison !== 0) {
      return comparison * directionFactor;
    }

    return compareText(left.client.code, right.client.code);
  });

  return sorted;
}

function assertUniqueClient(values: ClientFormValues, records: readonly ClientDetailData[], currentClientId?: ClientId): void {
  const normalizedCode = values.clientCode.trim().toLowerCase();
  const normalizedTaxId = normalizeTaxId(values.taxId);
  const fieldErrors: Partial<Record<"clientCode" | "taxId", string>> = {};

  for (const record of records) {
    if (currentClientId !== undefined && record.client.id === currentClientId) {
      continue;
    }

    if (record.client.code.trim().toLowerCase() === normalizedCode) {
      fieldErrors.clientCode = "Ya existe un cliente con ese código.";
    }

    if (normalizeTaxId(record.client.taxId) === normalizedTaxId) {
      fieldErrors.taxId = "Ya existe un cliente con ese CUIT.";
    }

    if (Object.keys(fieldErrors).length === 2) {
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ClientFormError("No se pudo guardar el cliente.", fieldErrors);
  }
}

function createClientFromForm(values: ClientFormValues, currentClient?: Client): Client {
  const now = new Date().toISOString();
  const baseId = currentClient?.id ?? (`client-${crypto.randomUUID()}` as ClientId);
  const branchId = currentClient?.branchId ?? MOCK_BRANCH_IDS.central;
  const clientCode = values.clientCode.trim();
  const legalName = values.legalName.trim();
  const taxId = formatTaxId(values.taxId);
  const assignedSellerId = values.assignedSellerId.trim();
  const priceListId = values.priceListId.trim();
  const paymentCondition = values.paymentCondition.trim();
  const tradeName = values.tradeName.trim();
  const contactName = values.contactName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const notes = values.notes.trim();
  const streetNumber = values.streetNumber.trim();
  const postalCode = values.postalCode.trim();
  const references = values.references.trim();
  return {
    id: baseId,
    companyId: currentClient?.companyId ?? MOCK_COMPANY_ID,
    branchId,
    code: clientCode,
    legalName,
    ...(tradeName.length > 0 ? { tradeName } : {}),
    ...(contactName.length > 0 ? { contactName } : {}),
    taxId,
    ...(email.length > 0 ? { email } : {}),
    ...(phone.length > 0 ? { phone } : {}),
    ...(assignedSellerId.length > 0 ? { assignedSellerId: assignedSellerId as SellerId } : {}),
    ...(priceListId.length > 0 ? { priceListId: priceListId as PriceListId } : {}),
    generalDiscountPercentage: values.generalDiscountPercentage,
    creditLimit: toMoney(values.creditLimit),
    currentDebt: currentClient?.currentDebt ?? toMoney(0),
    overdueDebt: currentClient?.overdueDebt ?? toMoney(0),
    accountStatus: values.accountStatus,
    commercialStatus: values.commercialStatus,
    paymentCondition,
    ...(notes.length > 0 ? { notes } : {}),
    status: currentClient?.status ?? mapCommercialStatusToClientStatus(values.commercialStatus),
    addresses: [
      {
        id: `address-${baseId}` as Client["addresses"][number]["id"],
        clientId: baseId,
        type: values.addressType,
        street: values.street,
        ...(streetNumber.length > 0 ? { number: streetNumber } : {}),
        city: values.city,
        province: values.province,
        ...(postalCode.length > 0 ? { postalCode } : {}),
        country: values.country,
        ...(references.length > 0 ? { reference: references } : {}),
        isDefault: values.isDefault,
      },
    ],
    createdAt: currentClient?.createdAt ?? now,
    updatedAt: now,
  };
}

function filterClients(clients: readonly ClientDetailData[], query: ClientListQuery): readonly ClientDetailData[] {
  const search = query.filters.search.trim().toLowerCase();
  const references = getClientReferenceData();
  return clients.filter((record) => {
    const sellerName = references.sellerOptions.find((seller) => seller.id === record.client.assignedSellerId)?.label ?? "";
    const priceListName = references.priceListOptions.find((priceList) => priceList.id === record.client.priceListId)?.label ?? "";
    const matchesSearch = search.length === 0 || [
      record.client.code,
      record.client.legalName,
      record.client.tradeName ?? "",
      record.client.taxId,
      sellerName,
      record.client.email ?? "",
      record.client.phone ?? "",
      priceListName,
    ].some((value) => value.toLowerCase().includes(search));

    const commercialStatusMatch = query.filters.commercialStatus === "all" || record.client.commercialStatus === query.filters.commercialStatus;
    const accountStatusMatch = query.filters.accountStatus === "all" || record.accountSummary.accountStatus === query.filters.accountStatus;
    const sellerMatch =
      query.filters.sellerId === "all"
      || (query.filters.sellerId === "unassigned" && record.client.assignedSellerId === undefined)
      || record.client.assignedSellerId === query.filters.sellerId;
    const branchMatch = query.filters.branchId === "all" || record.client.branchId === query.filters.branchId;
    const debtMatch =
      query.filters.debtView === "all"
      || (query.filters.debtView === "withDebt" && record.client.currentDebt.amount > 0)
      || (query.filters.debtView === "blocked" && record.client.status === "blocked")
      || (query.filters.debtView === "pendingApproval" && record.client.status === "pendingApproval");

    return matchesSearch && commercialStatusMatch && accountStatusMatch && sellerMatch && branchMatch && debtMatch;
  });
}

export class MockClientRepository implements ClientRepository {
  private readonly records: ClientDetailData[] = getClientSeedList().map((client) => getMockClientDetail(client));

  async getClients(query: ClientListQuery): Promise<ClientListResult> {
    await delay();
    const filtered = filterClients(this.records, query);
    const sorted = sortDetailRecords(filtered, query.sort);
    const start = (query.page - 1) * query.pageSize;
    const items = sorted.slice(start, start + query.pageSize).map((record) => cloneClient(record.client));

    return {
      items,
      total: sorted.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getClientById(clientId: ClientId): Promise<Client | null> {
    await delay(80);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : cloneClient(record.client);
  }

  async getClientDetailData(clientId: ClientId): Promise<ClientDetailData | null> {
    await delay(120);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : cloneDetail(record);
  }

  async createClient(values: ClientFormValues): Promise<Client> {
    await delay();
    assertUniqueClient(values, this.records);
    const client = createClientFromForm(values);
    const detail = getMockClientDetail(client);
    this.records.unshift(detail);
    return cloneClient(client);
  }

  async updateClient(clientId: ClientId, values: ClientFormValues): Promise<Client> {
    await delay();
    const recordIndex = this.records.findIndex((item) => item.client.id === clientId);
    if (recordIndex === -1) {
      throw new Error("Cliente no encontrado.");
    }

    const currentClient = this.records[recordIndex]?.client;
    if (currentClient === undefined) {
      throw new Error("Cliente no encontrado.");
    }
    assertUniqueClient(values, this.records, clientId);
    const updatedClient = createClientFromForm(values, currentClient);
    const updatedDetail = getMockClientDetail(updatedClient);
    this.records[recordIndex] = {
      ...updatedDetail,
      accountSummary: buildClientAccountSummary(
        updatedClient,
        updatedClient.accountStatus,
        updatedDetail.orders.length,
        updatedDetail.orders[0]?.date,
        updatedClient.accountStatus !== "current",
        updatedClient.updatedAt,
      ),
    };

    return cloneClient(updatedClient);
  }

  async changeClientStatus(clientId: ClientId, status: ClientStatus): Promise<Client> {
    await delay(80);
    const recordIndex = this.records.findIndex((item) => item.client.id === clientId);
    if (recordIndex === -1) {
      throw new Error("Cliente no encontrado.");
    }

    const currentClient = this.records[recordIndex]?.client;
    if (currentClient === undefined) {
      throw new Error("Cliente no encontrado.");
    }
    const updatedClient: Client = {
      ...currentClient,
      status,
      commercialStatus: mapCommercialStatus(status),
      updatedAt: new Date().toISOString(),
    };

    const updatedDetail = getMockClientDetail(updatedClient);
    this.records[recordIndex] = updatedDetail;
    return cloneClient(updatedClient);
  }

  async getClientAccountSummary(clientId: ClientId): Promise<ClientAccountSummary | null> {
    await delay(100);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? null : { ...record.accountSummary };
  }

  async getClientOrderHistory(clientId: ClientId): Promise<readonly ClientRelatedDocument[]> {
    await delay(100);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? [] : record.orders.map((order) => ({ ...order }));
  }

  async getClientActivity(clientId: ClientId): Promise<readonly ClientActivityEntry[]> {
    await delay(100);
    const record = this.records.find((item) => item.client.id === clientId);
    return record === undefined ? [] : record.activity.map((activity) => ({ ...activity }));
  }
}
