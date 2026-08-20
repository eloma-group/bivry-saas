import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { VendorOnboarding } from "@/components/vendor/VendorOnboarding";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { useVendorOnboarding } from "@/hooks/useVendorOnboarding";

export function VendorOnboardingPage() {
  const { data, loading, error, reload } = useVendorOnboarding();

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your details" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void reload()} />
      ) : (
        // `data` is null only with no session (the development auth bypass),
        // where the wizard opens blank.
        <VendorOnboarding initial={data} />
      )}
    </DashboardLayout>
  );
}
