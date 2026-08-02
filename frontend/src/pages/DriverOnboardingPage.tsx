import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DriverOnboarding } from "@/components/driver/DriverOnboarding";
import { PanelError, PanelLoader } from "@/components/common/PanelState";
import { useDriverOnboarding } from "@/hooks/useDriverOnboarding";

export function DriverOnboardingPage() {
  const { data, loading, error, reload } = useDriverOnboarding();

  return (
    <DashboardLayout>
      {loading ? (
        <PanelLoader label="Loading your details" />
      ) : error ? (
        <PanelError message={error} onRetry={() => void reload()} />
      ) : (
        // `data` is null only with no session (the development auth bypass),
        // where the wizard opens blank.
        <DriverOnboarding initial={data} />
      )}
    </DashboardLayout>
  );
}
