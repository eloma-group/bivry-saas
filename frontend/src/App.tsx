import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { OptionListsProvider } from "@/context/OptionListsContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/queryClient";

export default function App() {
  return (
    // Outermost: the cache outlives any one page, which is the point of it -
    // a list already fetched is on screen the moment it is opened again.
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {/* Inside the auth provider: the options are read once a session is
              signed in, and adding to a dropdown is offered only then. */}
          <OptionListsProvider>
            <AppRoutes />
            <Toaster />
          </OptionListsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
