import { vi } from "vitest";

import { ActionType, CardColor, CardType, cardType } from "$lib/card";

/** card layout: [7:6] type, [5:4] colour, [3:0] number */
export const RED_5 = 5;
export const GREEN_3 = 0b00_01_0011; // 19
export const BLUE_PLUS2 = 0b01_10_0000; // 96
export const YELLOW_REVERSE = 0b11_11_0000; // 240
export const WILD_PLUS4 = 0b10_00_1111; // 143

export type RecordedRequest = {
  method: string;
  url: string;
  body: any;
  signal: AbortSignal | null | undefined;
};

export type MockServerOptions = {
  filled?: boolean;
  /** whose turn it is when the table loads (defaults to the player) */
  current?: string;
  /** ms to hold back /action answers, to expose the optimistic window */
  actionDelay?: number;
  /** whether the shallow poll should report hanging debt once */
  debt?: boolean;
  /** make every request fail with `status` */
  failWith?: number;
  /** answer the next /action with this error status instead */
  failNextAction?: number;
};

/**
 * A tiny stand-in for the game server, stateful enough to play through:
 * it answers the depth polls, removes played cards, hands the turn over and
 * hands out debt.
 */
export const createMockServer = (options: MockServerOptions = {}) => {
  const requests: RecordedRequest[] = [];

  const server = {
    key: "TEST1",
    cards: [RED_5, GREEN_3, BLUE_PLUS2, YELLOW_REVERSE, WILD_PLUS4],
    debt: 0,
    cred: 0,
    current: options.current ?? "alice",
    filled: options.filled ?? true,
    ref_card: RED_5,
    config: { max_players: 2, card_count: 5, cred_count: 5 },
    oppstate: [{ username: "bob", nocards: 3 }],
    debtHandoutPending: options.debt ?? true,
    plays: 0,
  };

  const state = () => ({ ...server, cards: [...server.cards] });

  const json = (data: unknown) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(data === undefined ? "" : JSON.stringify(data)),
    } as Response);

  const error = (status: number, message: string) =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ detail: message }),
      text: () => Promise.resolve(JSON.stringify({ detail: message })),
    } as Response);

  const fetchMock = vi.fn(async (input: any, init: RequestInit = {}) => {
    const url = String(input);
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    requests.push({ method: init.method ?? "GET", url, body, signal: init.signal });

    if (options.actionDelay && url.includes("/action")) {
      await new Promise((resolve) => setTimeout(resolve, options.actionDelay));
    }

    if (options.failWith) return error(options.failWith, "backend is down");

    if (url.includes("/api/create")) return json({ key: server.key, state: state() });
    if (url.includes("/api/join/")) return json({ ok: true });

    if (url.includes("/action")) {
      if (options.failNextAction) {
        const status = options.failNextAction;
        options.failNextAction = undefined;
        return error(status, "card refused");
      }

      if (body.type === ActionType.Take) {
        server.cards = [...server.cards, RED_5];
        return json([...server.cards]);
      }

      if (body.type === ActionType.Settle) {
        server.debt = 0;
        return json({ debt: 0 });
      }

      // play: drop the card from the server hand
      let index = server.cards.indexOf(body.card);
      if (index === -1) index = server.cards.findIndex((card) => cardType(card) === CardType.Plus4);
      if (index === -1) index = 0;
      server.cards.splice(index, 1);
      server.ref_card = body.card;
      server.plays += 1;
      if (server.plays >= 2) server.current = "bob";

      return json(undefined);
    }

    if (url.includes("/state")) {
      const depth = Number(new URL(url).searchParams.get("depth"));

      if (depth === 3) return json(state());
      if (depth === 1) {
        return json({ current: server.current, ref_card: server.ref_card, cards: [...server.cards] });
      }
      if (depth === 2) {
        const debt = server.debtHandoutPending ? 1 : 0;
        server.debtHandoutPending = false;
        return json({ current: server.current, debt, cred: server.cred });
      }
      return json({
        current: server.current,
        filled: server.filled,
        config: server.config,
        oppstate: server.oppstate,
      });
    }

    return json({});
  });

  return {
    server,
    requests,
    fetchMock,
    state,
    /** wire the mock into globalThis and return it (call `vi.unstubAllGlobals()` after) */
    install() {
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    },
    calls: (needle: string) => requests.filter((request) => request.url.includes(needle)),
  };
};

export { CardColor };
