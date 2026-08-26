import { useCallback, useEffect, useState } from "react";
import { vendorService, type VendorOnboardingData } from "@/services/vendorService";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

interface VendorOnboardingState {
  data: VendorOnboardingData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Everything saved for the signed in vendor, shared by the onboarding wizard
 * and the profile page.
 *
 * With no session (the development auth bypass) there is nothing to load and no
 * error either: both screens simply fall back to an empty state.
 */
export function useVendorOnboarding() {
  const { user } = useAuth();
  const vendorId = user?.id ?? null;

  const [state, setState] = useState<VendorOnboardingState>({
    data: null,
    loading: vendorId !== null,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!vendorId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await vendorService.getOnboarding();
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
  }, [vendorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
