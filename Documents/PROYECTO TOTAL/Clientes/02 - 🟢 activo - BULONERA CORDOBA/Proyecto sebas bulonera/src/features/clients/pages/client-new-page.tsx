import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/page-header";
import { ClientForm } from "../components/client-form";
import { mapClientToFormDefaults } from "../schemas/client-schema";
import { getClientReferenceData, submitClientForm } from "../services/client-service";

export function ClientNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const referenceData = getClientReferenceData();
  const handleCancel = (): void => {
    if (globalThis.history.length > 1) {
      void navigate(-1);
      return;
    }

    void navigate("/clients");
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Nuevo cliente"
        description="Alta comercial sobre datos simulados, preparada para reemplazarse más adelante por un repositorio real."
      />
      <ClientForm
        title="Formulario de cliente"
        description="Completá la información general, comercial y la dirección principal."
        referenceData={referenceData}
        initialValues={mapClientToFormDefaults()}
        submitLabel="Crear cliente"
        onCancel={handleCancel}
        onSubmit={async (values) => {
          const created = await submitClientForm(values);
          void navigate(`/clients/${created.id}`, { state: { flashMessage: "Cliente creado correctamente." } });
        }}
      />
    </div>
  );
}
