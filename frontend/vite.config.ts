import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Static Web Apps serves /assets with a one year immutable cache (see
    // public/staticwebapp.config.json). Splitting the rarely changing vendor
    // code out of the app bundle means an ordinary deploy only invalidates a
    // small chunk instead of the whole 680 kB.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "lucide-react", "sonner"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
    // Maps are emitted but not referenced from the bundle, so browsers never
    // download them while they stay available for reading a production trace.
    sourcemap: "hidden",
    chunkSizeWarningLimit: 700,
  },
});
