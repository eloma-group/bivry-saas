import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { OptionListsProvider } from "@/context/OptionListsContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
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
  );
}
