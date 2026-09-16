import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  // component tests run in a browser-like environment, so svelte must resolve
  // its client build (`mount` lives there)
  resolve: { conditions: ["browser"] },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { pretendToBeVisual: true } },
    setupFiles: ["test/setup.ts"],
    include: ["test/**/*.test.ts"],
  },
});
