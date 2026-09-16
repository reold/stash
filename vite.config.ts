import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

function normalizeBasePath(value: string): "" | `/${string}` {
  const basePath = value.trim().replace(/\/+$/, "");
  if (!basePath) return "";
  if (!basePath.startsWith("/")) {
    throw new Error("BASE_PATH must be empty or start with '/'.");
  }
  return basePath as `/${string}`;
}

export default defineConfig(({ mode }) => {
  // Load all prefixes so the deployment-only BASE_PATH environment variable is
  // available to the Vite config without relying on an undeclared Node global.
  const { BASE_PATH = "" } = loadEnv(mode, ".", "");
  const basePath = normalizeBasePath(BASE_PATH);

  return {
    server: {
      allowedHosts: true,
    },
    plugins: [
      tailwindcss(),
      sveltekit({
        compilerOptions: {
          // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
          runes: ({ filename }) =>
            filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        },

        // static adapter: the whole site is prerendered at build time (SSG)
        adapter: adapter({
          pages: "build",
          assets: "build",
          // `/game/<id>/` is a dynamic route, so a shell is needed for ids that
          // were not prerendered (github pages serves 404.html for those)
          fallback: "404.html",
          precompress: false,
          strict: false,
        }),

        paths: {
          base: basePath,
        },
      }),
    ],
  };
});
