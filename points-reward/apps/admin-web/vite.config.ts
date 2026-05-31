import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:4100",
      "/admin": "http://localhost:4100"
    }
  }
});
