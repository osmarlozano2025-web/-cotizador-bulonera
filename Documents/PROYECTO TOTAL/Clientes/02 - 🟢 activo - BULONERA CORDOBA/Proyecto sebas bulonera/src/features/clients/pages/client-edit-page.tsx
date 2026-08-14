import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ClientForm } from "../components/client-form";
import { mapClientToFormDefaults } from "../schemas/client-schema";
import { getClientReferenceData, submitClientForm } from "../services/client-service";
import { useClientDetail } from "../hooks/use-clients";
import type { ClientId } from "@/domain/shared";

export function ClientEditPage(): React.JSX.Element {
  const { clientId: clientIdParam } = useParams();
  const clientId = clientIdParam as ClientId | undefined;
  const navigate = useNavigate();
  const { detail, loading, error } = useClientDetail(clientId);
  const referenceData = getClientReferenceData();
  const handleCancel = (): void => {
    if (globalThis.history.length > 1) {
      void navigate(-1);
      return;
    }

    void navigate("/clients");
  };
  const readyValues = detail === null ? null : mapClientToFormDefaults({
    clientCode: detail.client.code,
    legalName: detail.client.legalName,
    tradeName: detail.client.tradeName ?? "",
    taxId: detail.client.taxId,
    email: detail.client.email ?? "",
    phone: detail.client.phone ?? "",
    contactName: detail.client.contactName ?? "",
    commercialStatus: detail.client.commercialStatus,
    assignedSellerId: detail.client.assignedSellerId ?? "",
    priceListId: detail.client.priceListId ?? "",
    generalDiscountPercentage: detail.client.generalDiscountPercentage ?? 0,
    creditLimit: detail.client.creditLimit.amount,
    paymentCondition: detail.client.paymentCondition,
    accountStatus: detail.client.accountStatus,
    notes: detail.client.notes ?? "",
    addressType: detail.addresses[0]?.type ?? "commercial",
    street: detail.addresses[0]?.street ?? "",
    streetNumber: detail.addresses[0]?.number ?? "",
    city: detail.addresses[0]?.city ?? "",
    province: detail.addresses[0]?.province ?? "",
    postalCode: detail.addresses[0]?.postalCode ?? "",
    country: detail.addresses[0]?.country ?? "Argentina",
    references: detail.addresses[0]?.reference ?? "",
    isDefault: detail.addresses[0]?.isDefault ?? true,
  });

  if (loading) {
    return <PageHeader title="Editar cliente" description="Cargando datos del cliente..." />;
  }

  if (error) {
    return <EmptyState title="No se pudo cargar el cliente" description={error} />;
  }

  if (detail === null || readyValues === null) {
    return <EmptyState title="Cliente no encontrado" description="El cliente solicitado no existe en la carga simulada." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Editar ${detail.client.legalName}`}
        description="Actualizá la ficha comercial del cliente sin tocar la estructura visual ni la lógica de negocio."
      />
      <ClientForm
        title="Edición de cliente"
        description="Editá la información general, comercial y la dirección principal."
        referenceData={referenceData}
        initialValues={readyValues}
        submitLabel="Guardar cambios"
        onCancel={handleCancel}
        onSubmit={async (values) => {
          const updated = await submitClientForm(values, detail.client.id);
          void navigate(`/clients/${updated.id}`, { state: { flashMessage: "Cliente actualizado correctamente." } });
        }}
      />
    </div>
  );
}
