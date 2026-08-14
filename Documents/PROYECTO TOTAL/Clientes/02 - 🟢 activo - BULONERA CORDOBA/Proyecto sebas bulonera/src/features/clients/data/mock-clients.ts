import type { BranchId, ClientId, CompanyId, PriceListId, SellerId } from "@/domain/shared";
import type { Client, ClientAddress } from "@/domain/client/client";
import type { PriceList } from "@/domain/pricing/pricing";
import { buildClientAccountSummary } from "../utils/client-calculations";
import { CLIENT_PAYMENT_CONDITION_OPTIONS, formatTaxId } from "../utils/client-validation";
import type { ClientAccountMovement, ClientActivityEntry, ClientDetailData, ClientRelatedDocument } from "../types";

const asId = <T extends string>(value: string): T => value as T;

export const MOCK_COMPANY_ID = asId<CompanyId>("company-cba");
export const MOCK_BRANCH_IDS = {
  central: asId<BranchId>("branch-central"),
  north: asId<BranchId>("branch-north"),
  west: asId<BranchId>("branch-west"),
} as const;

export const MOCK_BRANCHES = [
  { id: MOCK_BRANCH_IDS.central, label: "Casa Central" },
  { id: MOCK_BRANCH_IDS.north, label: "Sucursal Norte" },
  { id: MOCK_BRANCH_IDS.west, label: "Sucursal Oeste" },
] as const;

export const MOCK_SELLERS = [
  { id: asId<SellerId>("seller-ana"), label: "Ana López" },
  { id: asId<SellerId>("seller-matias"), label: "Matías Roldán" },
  { id: asId<SellerId>("seller-sofia"), label: "Sofía Pérez" },
  { id: asId<SellerId>("seller-lucas"), label: "Lucas Medina" },
] as const;

export const MOCK_PRICE_LISTS: readonly PriceList[] = [
  { id: asId<PriceListId>("price-general"), companyId: MOCK_COMPANY_ID, name: "Lista General", code: "GEN", currency: "ARS", status: "active" },
  { id: asId<PriceListId>("price-mayorista"), companyId: MOCK_COMPANY_ID, name: "Mayorista", code: "MAY", currency: "ARS", status: "active" },
  { id: asId<PriceListId>("price-premium"), companyId: MOCK_COMPANY_ID, name: "Premium", code: "PRE", currency: "ARS", status: "active" },
] as const;

export const MOCK_PAYMENT_CONDITIONS = CLIENT_PAYMENT_CONDITION_OPTIONS;

const REQUIRED_PRICE_LISTS = {
  general: MOCK_PRICE_LISTS[0],
  mayorista: MOCK_PRICE_LISTS[1],
  premium: MOCK_PRICE_LISTS[2],
} as const;

if (
  REQUIRED_PRICE_LISTS.general === undefined
  || REQUIRED_PRICE_LISTS.mayorista === undefined
  || REQUIRED_PRICE_LISTS.premium === undefined
) {
  throw new Error("No se pudieron cargar las listas de precios simuladas.");
}

const createAddress = (clientId: ClientId, street: string, city: string, province: string): ClientAddress => ({
  id: asId(`address-${clientId}`),
  clientId,
  type: "commercial",
  street,
  city,
  province,
  country: "Argentina",
  isDefault: true,
});

const clients: readonly Client[] = [
  {
    id: asId<ClientId>("client-norte-metal"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.central,
    code: "CLI-001",
    legalName: "Norte Metal SRL",
    tradeName: "Norte Metal",
    contactName: "Mariana Torres",
    taxId: formatTaxId("30-71234567-8"),
    email: "compras@nortemetal.com",
    phone: "+54 351 555 1200",
    assignedSellerId: MOCK_SELLERS[0].id,
    priceListId: REQUIRED_PRICE_LISTS.general.id,
    generalDiscountPercentage: 5,
    creditLimit: { amount: 850000, currency: "ARS" },
    currentDebt: { amount: 220000, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "active",
    paymentCondition: "30 días",
    notes: "Cliente estable con alta frecuencia de compra.",
    status: "active",
    addresses: [createAddress(asId<ClientId>("client-norte-metal"), "Ruta 9 Km 12", "Córdoba", "Córdoba")],
    createdAt: "2025-05-10T09:00:00.000Z",
    updatedAt: "2025-07-01T10:30:00.000Z",
  },
  {
    id: asId<ClientId>("client-sur-construccion"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.north,
    code: "CLI-002",
    legalName: "Sur Construcción SA",
    tradeName: "Sur Construcción",
    contactName: "Luis Romero",
    taxId: formatTaxId("30-70987654-3"),
    email: "lromero@surconstruccion.ar",
    phone: "+54 351 555 2200",
    assignedSellerId: MOCK_SELLERS[1].id,
    priceListId: REQUIRED_PRICE_LISTS.mayorista.id,
    generalDiscountPercentage: 10,
    creditLimit: { amount: 1200000, currency: "ARS" },
    currentDebt: { amount: 780000, currency: "ARS" },
    overdueDebt: { amount: 120000, currency: "ARS" },
    accountStatus: "overdue",
    commercialStatus: "active",
    paymentCondition: "Cuenta corriente",
    notes: "Presenta mora recurrente.",
    status: "active",
    addresses: [createAddress(asId<ClientId>("client-sur-construccion"), "Av. Vélez Sarsfield 1440", "Córdoba", "Córdoba")],
    createdAt: "2025-04-12T09:00:00.000Z",
    updatedAt: "2025-07-04T13:15:00.000Z",
  },
  {
    id: asId<ClientId>("client-este-ferreteria"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.central,
    code: "CLI-003",
    legalName: "Ferretería del Este SA",
    tradeName: "Ferretería del Este",
    contactName: "Sofía Molina",
    taxId: formatTaxId("30-71220000-1"),
    email: "sofia@ferreteriaeste.com",
    phone: "+54 351 555 3300",
    assignedSellerId: MOCK_SELLERS[2].id,
    priceListId: REQUIRED_PRICE_LISTS.premium.id,
    generalDiscountPercentage: 15,
    creditLimit: { amount: 500000, currency: "ARS" },
    currentDebt: { amount: 540000, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "exceededCreditLimit",
    commercialStatus: "underReview",
    paymentCondition: "Contado",
    notes: "Próxima a exceder límite de crédito.",
    status: "pendingApproval",
    addresses: [createAddress(asId<ClientId>("client-este-ferreteria"), "Belgrano 550", "Río Cuarto", "Córdoba")],
    createdAt: "2025-02-20T09:00:00.000Z",
    updatedAt: "2025-07-06T17:45:00.000Z",
  },
  {
    id: asId<ClientId>("client-centro-industrial"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.west,
    code: "CLI-004",
    legalName: "Centro Industrial SRL",
    tradeName: "Centro Industrial",
    contactName: "Esteban Díaz",
    taxId: formatTaxId("30-70123456-9"),
    email: "compras@centroindustrial.com",
    phone: "+54 351 555 4400",
    assignedSellerId: MOCK_SELLERS[0].id,
    priceListId: REQUIRED_PRICE_LISTS.mayorista.id,
    generalDiscountPercentage: 0,
    creditLimit: { amount: 400000, currency: "ARS" },
    currentDebt: { amount: 0, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "active",
    paymentCondition: "Anticipado",
    notes: "Sin deuda y con compras estacionales.",
    status: "active",
    addresses: [createAddress(asId<ClientId>("client-centro-industrial"), "Parque Industrial M3", "Villa María", "Córdoba")],
    createdAt: "2025-01-15T09:00:00.000Z",
    updatedAt: "2025-07-08T08:20:00.000Z",
  },
  {
    id: asId<ClientId>("client-sierra-suministros"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.north,
    code: "CLI-005",
    legalName: "Sierra Suministros SAS",
    tradeName: "Sierra Suministros",
    contactName: "Paula Benítez",
    taxId: formatTaxId("30-73456789-2"),
    email: "ventas@sierrasuministros.com",
    phone: "+54 351 555 5500",
    priceListId: REQUIRED_PRICE_LISTS.general.id,
    generalDiscountPercentage: 5,
    creditLimit: { amount: 300000, currency: "ARS" },
    currentDebt: { amount: 235000, currency: "ARS" },
    overdueDebt: { amount: 45000, currency: "ARS" },
    accountStatus: "underReview",
    commercialStatus: "pendingApproval",
    paymentCondition: "15 días",
    notes: "Pendiente de aprobación comercial.",
    status: "pendingApproval",
    addresses: [createAddress(asId<ClientId>("client-sierra-suministros"), "San Martín 90", "Jesús María", "Córdoba")],
    createdAt: "2025-03-18T09:00:00.000Z",
    updatedAt: "2025-07-07T15:50:00.000Z",
  },
  {
    id: asId<ClientId>("client-campos-del-sur"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.central,
    code: "CLI-006",
    legalName: "Campos del Sur Cooperativa",
    tradeName: "Campos del Sur",
    contactName: "Germán Ibarra",
    taxId: formatTaxId("33-78123456-0"),
    phone: "+54 351 555 6600",
    assignedSellerId: MOCK_SELLERS[3].id,
    priceListId: REQUIRED_PRICE_LISTS.mayorista.id,
    generalDiscountPercentage: 20,
    creditLimit: { amount: 950000, currency: "ARS" },
    currentDebt: { amount: 150000, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "active",
    paymentCondition: "30 días",
    notes: "Sin correo registrado aún.",
    status: "active",
    addresses: [createAddress(asId<ClientId>("client-campos-del-sur"), "Acceso Sur 123", "Villa del Rosario", "Córdoba")],
    createdAt: "2025-03-01T09:00:00.000Z",
    updatedAt: "2025-07-02T11:10:00.000Z",
  },
  {
    id: asId<ClientId>("client-rio-seco"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.west,
    code: "CLI-007",
    legalName: "Río Seco Ferreterías",
    tradeName: "Río Seco",
    contactName: "Valentina Castro",
    taxId: formatTaxId("30-75555555-1"),
    email: "hola@rioseco.com",
    phone: "+54 351 555 7700",
    priceListId: REQUIRED_PRICE_LISTS.general.id,
    generalDiscountPercentage: 0,
    creditLimit: { amount: 200000, currency: "ARS" },
    currentDebt: { amount: 0, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "inactive",
    paymentCondition: "Contado",
    notes: "Sin vendedor asignado.",
    status: "inactive",
    addresses: [createAddress(asId<ClientId>("client-rio-seco"), "Los Inmigrantes 45", "Villa Dolores", "Córdoba")],
    createdAt: "2025-05-20T09:00:00.000Z",
    updatedAt: "2025-07-01T18:05:00.000Z",
  },
  {
    id: asId<ClientId>("client-piedra-libre"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.central,
    code: "CLI-008",
    legalName: "Piedra Libre Materiales",
    tradeName: "Piedra Libre",
    contactName: "Hugo Leiva",
    taxId: formatTaxId("30-79876543-7"),
    email: "contacto@piedralibre.com",
    phone: "+54 351 555 8800",
    assignedSellerId: MOCK_SELLERS[1].id,
    priceListId: REQUIRED_PRICE_LISTS.premium.id,
    generalDiscountPercentage: 10,
    creditLimit: { amount: 650000, currency: "ARS" },
    currentDebt: { amount: 300000, currency: "ARS" },
    overdueDebt: { amount: 60000, currency: "ARS" },
    accountStatus: "overdue",
    commercialStatus: "blocked",
    paymentCondition: "Cuenta corriente",
    notes: "Bloqueado por mora.",
    status: "blocked",
    addresses: [createAddress(asId<ClientId>("client-piedra-libre"), "Ruta 20 Km 4", "La Calera", "Córdoba")],
    createdAt: "2025-02-28T09:00:00.000Z",
    updatedAt: "2025-07-09T12:00:00.000Z",
  },
  {
    id: asId<ClientId>("client-rio-oeste"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.north,
    code: "CLI-009",
    legalName: "Río Oeste Proveeduría",
    tradeName: "Río Oeste",
    contactName: "Milagros Vega",
    taxId: formatTaxId("27-71234567-4"),
    email: "compras@riooeste.com",
    phone: "+54 351 555 9900",
    assignedSellerId: MOCK_SELLERS[2].id,
    priceListId: REQUIRED_PRICE_LISTS.mayorista.id,
    generalDiscountPercentage: 5,
    creditLimit: { amount: 700000, currency: "ARS" },
    currentDebt: { amount: 0, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "suspended",
    paymentCondition: "15 días",
    notes: "Suspendido temporalmente por revisión comercial.",
    status: "suspended",
    addresses: [createAddress(asId<ClientId>("client-rio-oeste"), "Pueyrredón 330", "Alta Gracia", "Córdoba")],
    createdAt: "2025-06-01T09:00:00.000Z",
    updatedAt: "2025-07-05T09:30:00.000Z",
  },
  {
    id: asId<ClientId>("client-bosque-norte"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.west,
    code: "CLI-010",
    legalName: "Bosque Norte SRL",
    tradeName: "Bosque Norte",
    contactName: "Agustina Ríos",
    taxId: formatTaxId("30-73333333-6"),
    email: "agustina@bosquenorte.com",
    phone: "+54 351 555 1010",
    assignedSellerId: MOCK_SELLERS[3].id,
    priceListId: REQUIRED_PRICE_LISTS.general.id,
    generalDiscountPercentage: 15,
    creditLimit: { amount: 450000, currency: "ARS" },
    currentDebt: { amount: 470000, currency: "ARS" },
    overdueDebt: { amount: 80000, currency: "ARS" },
    accountStatus: "blocked",
    commercialStatus: "blocked",
    paymentCondition: "Cuenta corriente",
    notes: "Operación bloqueada por límite excedido.",
    status: "blocked",
    addresses: [createAddress(asId<ClientId>("client-bosque-norte"), "Alem 1212", "Río Tercero", "Córdoba")],
    createdAt: "2025-04-22T09:00:00.000Z",
    updatedAt: "2025-07-06T18:30:00.000Z",
  },
  {
    id: asId<ClientId>("client-los-pinos"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.central,
    code: "CLI-011",
    legalName: "Los Pinos Ferretería Mayorista",
    tradeName: "Los Pinos",
    contactName: "Natalia Figueroa",
    taxId: formatTaxId("30-74444444-2"),
    email: "natalia@lospinos.com",
    phone: "+54 351 555 1111",
    assignedSellerId: MOCK_SELLERS[0].id,
    priceListId: REQUIRED_PRICE_LISTS.mayorista.id,
    generalDiscountPercentage: 10,
    creditLimit: { amount: 1100000, currency: "ARS" },
    currentDebt: { amount: 960000, currency: "ARS" },
    overdueDebt: { amount: 200000, currency: "ARS" },
    accountStatus: "underReview",
    commercialStatus: "underReview",
    paymentCondition: "30 días",
    notes: "Próximo a revisión de límite.",
    status: "pendingApproval",
    addresses: [createAddress(asId<ClientId>("client-los-pinos"), "Italia 75", "Córdoba", "Córdoba")],
    createdAt: "2025-04-08T09:00:00.000Z",
    updatedAt: "2025-07-09T09:45:00.000Z",
  },
  {
    id: asId<ClientId>("client-nuevo-horizonte"),
    companyId: MOCK_COMPANY_ID,
    branchId: MOCK_BRANCH_IDS.north,
    code: "CLI-012",
    legalName: "Nuevo Horizonte Materiales",
    tradeName: "Nuevo Horizonte",
    contactName: "Fabián Navarro",
    taxId: formatTaxId("30-76666666-8"),
    email: "ventas@nuevahorizonte.com",
    phone: "+54 351 555 1212",
    priceListId: REQUIRED_PRICE_LISTS.premium.id,
    generalDiscountPercentage: 0,
    creditLimit: { amount: 250000, currency: "ARS" },
    currentDebt: { amount: 100000, currency: "ARS" },
    overdueDebt: { amount: 0, currency: "ARS" },
    accountStatus: "current",
    commercialStatus: "active",
    paymentCondition: "Contado",
    notes: "Cliente nuevo sin vendedor asignado.",
    status: "active",
    addresses: [createAddress(asId<ClientId>("client-nuevo-horizonte"), "Sarmiento 200", "Oncativo", "Córdoba")],
    createdAt: "2025-06-20T09:00:00.000Z",
    updatedAt: "2025-07-10T09:00:00.000Z",
  },
] as const;

const histories: Record<string, { detail: Omit<ClientDetailData, "client" | "accountSummary"> }> = {
  [clients[0]!.id]: {
    detail: {
      addresses: clients[0]!.addresses,
      accountMovements: [
        { id: "mov-1", date: "2025-07-01T00:00:00.000Z", type: "invoice", reference: "FAC-001122", amount: 150000, balance: 220000 },
        { id: "mov-2", date: "2025-07-05T00:00:00.000Z", type: "payment", reference: "REC-0091", amount: -50000, balance: 170000 },
        { id: "mov-3", date: "2025-07-08T00:00:00.000Z", type: "pendingBalance", reference: "Saldo pendiente", amount: 50000, balance: 220000 },
      ],
      quotes: [{ id: "q-1", number: "COT-2025-0144", status: "accepted", amount: 185000, date: "2025-07-01T00:00:00.000Z" }],
      orders: [{ id: "o-1", number: "PED-2025-0220", status: "dispatched", amount: 220000, date: "2025-07-03T00:00:00.000Z" }],
      activity: [
        { id: "act-1", date: "2025-07-08T12:00:00.000Z", title: "Cotización actualizada", description: "Se ajustó el descuento general al 5%." },
        { id: "act-2", date: "2025-07-01T14:00:00.000Z", title: "Pedido despachado", description: "Se despachó el pedido PED-2025-0220." },
      ],
    },
  },
};

function getDefaultHistory(client: Client): Omit<ClientDetailData, "client" | "accountSummary"> {
  return {
    addresses: client.addresses,
    accountMovements: [
      { id: "mov-1", date: client.updatedAt, type: "invoice", reference: "FAC-0001", amount: client.currentDebt.amount, balance: client.currentDebt.amount },
      { id: "mov-2", date: client.updatedAt, type: "payment", reference: "REC-0001", amount: 0, balance: client.currentDebt.amount },
    ],
    quotes: [],
    orders: [],
    activity: [
      { id: "act-1", date: client.updatedAt, title: "Ficha actualizada", description: "Se actualizó la información comercial del cliente." },
    ],
  };
}

export const MOCK_CLIENTS = clients;

export function getMockClientDetail(client: Client): ClientDetailData {
  const detail = histories[client.id]?.detail ?? getDefaultHistory(client);
  const sellerName = MOCK_SELLERS.find((seller) => seller.id === client.assignedSellerId)?.label;
  const priceListName = MOCK_PRICE_LISTS.find((priceList) => priceList.id === client.priceListId)?.name;
  const accountSummary = buildClientAccountSummary(
    client,
    client.accountStatus,
    detail.orders.length,
    detail.orders[0]?.date,
    client.accountStatus !== "current",
    client.updatedAt,
  );

  return {
    client,
    accountSummary,
    ...detail,
    ...(sellerName !== undefined ? { assignedSellerName: sellerName } : {}),
    ...(priceListName !== undefined ? { priceListName } : {}),
  };
}

export function getClientReferenceData() {
  return {
    branchOptions: MOCK_BRANCHES,
    sellerOptions: MOCK_SELLERS,
    priceListOptions: MOCK_PRICE_LISTS.map((priceList) => ({ id: priceList.id, label: priceList.name })),
    paymentConditionOptions: MOCK_PAYMENT_CONDITIONS,
  };
}

export function getClientSeedList(): readonly Client[] {
  return MOCK_CLIENTS;
}

export function getClientAccountMovements(clientId: ClientId): readonly ClientAccountMovement[] {
  return histories[clientId]?.detail.accountMovements ?? [];
}

export function getClientActivity(clientId: ClientId): readonly ClientActivityEntry[] {
  return histories[clientId]?.detail.activity ?? [];
}

export function getClientRelatedDocuments(clientId: ClientId): { quotes: readonly ClientRelatedDocument[]; orders: readonly ClientRelatedDocument[] } {
  const detail = histories[clientId]?.detail;
  if (detail === undefined) {
    return { quotes: [], orders: [] };
  }

  return { quotes: detail.quotes, orders: detail.orders };
}
