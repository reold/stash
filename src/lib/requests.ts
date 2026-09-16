import { PUBLIC_API_URL } from "$env/static/public";

import { ActionType } from "$lib/card";
import {
  initialGameState,
  type GameConfig,
  type GameCreation,
  type GameStatePatch,
} from "$lib/types";

/**
 * The backend is configuration, not code: `PUBLIC_API_URL` comes from the
 * environment (see `.env`, `.env.development`, `.env.example`).
 */
export const serverURL = PUBLIC_API_URL.replace(/\/+$/, "");
export const apiURL = `${serverURL}/api`;

/** Thrown for anything that is not a 2xx (or for a request that never landed). */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type RequestOptions = {
  signal?: AbortSignal;
  /** ms, defaults to 10s */
  timeout?: number;
};

const TIMEOUT = 10_000;

const describe = async (response: Response) => {
  const body = await response.text().catch(() => "");
  if (!body) return `request failed with status ${response.status}`;

  try {
    const data = JSON.parse(body);
    const detail = data?.detail ?? data?.message ?? data?.error;
    if (typeof detail === "string" && detail) return detail;
  } catch {
    // not json, fall through to the raw body
  }

  return body.length > 200 ? `${body.slice(0, 200)}…` : body;
};

/**
 * One place that knows how to talk to the backend: timeout, cancellation,
 * status handling, json parsing. Everything below is typed on top of it.
 */
const request = async <T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {}
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT);

  // caller cancellation (component teardown) aborts ours too
  const caller = options.signal;
  const forwardAbort = () => controller.abort();
  if (caller) {
    if (caller.aborted) controller.abort();
    else caller.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(`${apiURL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) throw new ApiError(response.status, await describe(response));

    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(
        0,
        caller?.aborted ? "request cancelled" : "request timed out"
      );
    }
    throw new ApiError(0, (error as Error).message ?? "network error");
  } finally {
    clearTimeout(timer);
    caller?.removeEventListener("abort", forwardAbort);
  }
};

/* ------------------------------------------------------------------ parsing */

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asCards = (value: unknown): number[] | undefined =>
  Array.isArray(value) && value.every((card) => typeof card === "number")
    ? value
    : undefined;

const parseConfig = (value: unknown): GameConfig | undefined => {
  if (!isRecord(value)) return undefined;

  return {
    max_players: asNumber(value.max_players, 0),
    card_count: asNumber(value.card_count, 0),
    cred_count: asNumber(value.cred_count, 0),
  };
};

/**
 * Turn whatever the server answered into a patch we are willing to apply.
 * Unknown or malformed fields are dropped instead of being spread into the
 * state, so a bad response cannot put `undefined` in front of the UI.
 */
export const parseGameState = (data: unknown): GameStatePatch => {
  if (!isRecord(data)) return {};

  const patch: GameStatePatch = {};

  const cards = asCards(data.cards);
  if (cards) patch.cards = cards;

  if (typeof data.debt === "number") patch.debt = asNumber(data.debt, initialGameState.debt);
  if (typeof data.cred === "number") patch.cred = asNumber(data.cred, initialGameState.cred);
  if (typeof data.current === "string") patch.current = data.current;
  if (typeof data.filled === "boolean") patch.filled = data.filled;
  if (typeof data.ref_card === "number") patch.ref_card = data.ref_card;

  const config = parseConfig(data.config);
  if (config) patch.config = config;

  if (Array.isArray(data.oppstate)) {
    patch.oppstate = data.oppstate
      .filter(isRecord)
      .map((opponent) => ({
        username: asString(opponent.username, "unknown"),
        nocards: asNumber(opponent.nocards, 0),
      }));
  }

  return patch;
};

/* ------------------------------------------------------------------ endpoints */

export const gameServer = {
  create: async (
    creator: string,
    config: GameCreation = {},
    options: RequestOptions = {}
  ) => {
    const data = await request<unknown>(
      "/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator, config }),
      },
      options
    );

    return {
      key: asString(isRecord(data) ? data.key : undefined, ""),
      state: parseGameState(isRecord(data) ? data.state : undefined),
    };
  },

  join: async (username: string, game_id: string, options: RequestOptions = {}) => {
    await request<unknown>(
      `/join/${encodeURIComponent(game_id)}?username=${encodeURIComponent(username)}`,
      {},
      options
    );
  },

  /** `depth` picks how much of the state the server should answer with. */
  state: async (
    game_id: string,
    depth: number,
    username: string = "",
    options: RequestOptions = {}
  ) =>
    parseGameState(
      await request<unknown>(
        `/${encodeURIComponent(game_id)}/state?depth=${depth}&username=${encodeURIComponent(username)}`,
        {},
        options
      )
    ),

  /** Returns the patch the action produced (`Take` answers with the new hand). */
  action: async (
    game_id: string,
    username: string,
    type: number,
    card: number = 0,
    options: RequestOptions = {}
  ): Promise<GameStatePatch> => {
    const data = await request<unknown>(
      `/${encodeURIComponent(game_id)}/action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, type, card }),
      },
      options
    );

    if (type === ActionType.Take) {
      const cards = asCards(data);
      return cards ? { cards } : {};
    }

    return parseGameState(data);
  },
};
