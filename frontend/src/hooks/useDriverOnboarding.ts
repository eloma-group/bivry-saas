import { useCallback, useEffect, useState } from "react";
import { driverService, type DriverOnboardingData } from "@/services/driverService";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

interface DriverOnboardingState {
  data: DriverOnboardingData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Everything saved for the signed in driver, shared by the onboarding wizard and
 * the profile page.
 *
 * With no session (the development auth bypass) there is nothing to load and no
 * error either: both screens simply fall back to an empty state.
 */
export function useDriverOnboarding() {
  const { user } = useAuth();
  const driverId = user?.id ?? null;

  const [state, setState] = useState<DriverOnboardingState>({
    data: null,
    loading: driverId !== null,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!driverId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await driverService.getOnboarding();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error:
          error instanceof ApiRequestError
            ? error.message
            : "Could not load your details. Please try again.",
      });
    }
  }, [driverId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
