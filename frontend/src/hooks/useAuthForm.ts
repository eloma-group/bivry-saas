import { useCallback, useState } from "react";
import { ApiRequestError } from "@/services/api";

interface AuthFormState {
  isSubmitting: boolean;
  formError: string | null;
  fieldErrors: Record<string, string>;
  successMessage: string | null;
}

/**
 * Shared submit handling for the auth forms: one place that turns an
 * ApiRequestError into a banner message plus per field messages.
 */
export function useAuthForm() {
  const [state, setState] = useState<AuthFormState>({
    isSubmitting: false,
    formError: null,
    fieldErrors: {},
    successMessage: null,
  });

  const reset = useCallback(() => {
    setState({ isSubmitting: false, formError: null, fieldErrors: {}, successMessage: null });
  }, []);

  const submit = useCallback(
    async (action: () => Promise<string | void>): Promise<boolean> => {
      setState({ isSubmitting: true, formError: null, fieldErrors: {}, successMessage: null });

      try {
        const message = await action();
        setState({
          isSubmitting: false,
          formError: null,
          fieldErrors: {},
          successMessage: typeof message === "string" ? message : null,
        });
        return true;
      } catch (error) {
        const apiError =
          error instanceof ApiRequestError
            ? error
            : new ApiRequestError("Something went wrong. Please try again.", "UNKNOWN", 0);

        setState({
          isSubmitting: false,
          formError: apiError.message,
          fieldErrors: apiError.fieldMap,
          successMessage: null,
        });
        return false;
      }
    },
    [],
  );

  return { ...state, submit, reset };
}
