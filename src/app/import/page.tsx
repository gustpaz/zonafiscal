import DashboardHeader from "@/components/dashboard-header";
import ImportWizard from "@/components/import-wizard";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <DashboardHeader title="Importar Transações" />
      <ImportWizard />
    </div>
  );
}
