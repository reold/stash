import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

function normalizeBasePath(value: string): "" | `/${string}` {
  const basePath = value.trim().replace(/\/+$/, "");
  if (!basePath) return "";
  if (!basePath.startsWith("/")) {
    throw new Error("BASE_PATH must be empty or start with '/'.");
  }
  return basePath as `/${string}`;
}

export default defineConfig(({ mode }) => {
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
          runes: ({ filename }) =>
            filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
        },
        adapter: adapter({
          pages: "build",
          assets: "build",
          fallback: "404.html",
          precompress: false,
          strict: true,
        }),
        paths: {
          base: basePath,
        },
      }),
    ],
  };
});
