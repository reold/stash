import type { PageLoad } from "./$types";

/**
 * `/game/<id>/` — the id is part of the URL now instead of the hash, so a game
 * link is a real page.
 *
 * The page is not prerendered: the id comes from the game server at runtime and
 * is unknown at build time. Static hosts serve the `404.html` fallback shell
 * (see vite.config.ts) and the client router renders this route from the URL.
 * `ssr` is off for the same reason — there is no server at runtime.
 */
export const prerender = false;
export const ssr = false;

export const load: PageLoad = ({ params }) => {
  return { id: params.id };
};
