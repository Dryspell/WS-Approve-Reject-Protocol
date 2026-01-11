import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  vite: {
    ssr: {
      // Externalize SpacetimeDB SDK to prevent SSR issues with WebSocket/browser APIs
      external: ["@clockworklabs/spacetimedb-sdk"],
      noExternal: [],
    },
  },
});