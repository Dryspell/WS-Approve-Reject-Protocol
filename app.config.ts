import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    preset: "static",
  },
  ssr: false,
  vite: {
    ssr: {
      external: ["spacetimedb"],
      noExternal: [],
    },
  },
});