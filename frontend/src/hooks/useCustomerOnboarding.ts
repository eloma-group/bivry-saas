import { useCallback, useEffect, useState } from "react";
import { customerService, type CustomerOnboardingData } from "@/services/customerService";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

interface CustomerOnboardingState {
  data: CustomerOnboardingData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Everything saved for the signed in customer, shared by the onboarding wizard
 * and the profile page.
 *
 * With no session (the development auth bypass) there is nothing to load and no
 * error either: both screens simply fall back to an empty state.
 */
export function useCustomerOnboarding() {
  const { user } = useAuth();
  const customerId = user?.id ?? null;

  const [state, setState] = useState<CustomerOnboardingState>({
    data: null,
    loading: customerId !== null,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!customerId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const data = await customerService.getOnboarding();
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
  }, [customerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
