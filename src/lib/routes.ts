import { base } from "$app/paths";

/** `/game/<id>/` — always trailing-slashed, so the static host serves the page directly. */
export const gamePath = (gameId: string) =>
  `${base}/game/${encodeURIComponent(gameId)}/`;

/** Absolute, shareable link to a game. Client-only: needs `location`. */
export const gameUrl = (gameId: string) => `${location.origin}${gamePath(gameId)}`;
