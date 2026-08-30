import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerOnboarding } from "@/components/customer/CustomerOnboarding";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { useCustomerOnboarding } from "@/hooks/useCustomerOnboarding";

export function CustomerOnboardingPage() {
  const { data, loading, error, reload } = useCustomerOnboarding();

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your details" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void reload()} />
      ) : (
        // `data` is null only with no session (the development auth bypass),
        // where the wizard opens blank.
        <CustomerOnboarding initial={data} />
      )}
    </DashboardLayout>
  );
}
