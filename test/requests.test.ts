import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionType } from "$lib/card";
import { ApiError, apiURL, gameServer, parseGameState, serverURL } from "$lib/requests";

import { createMockServer, WILD_PLUS4 } from "./mock-server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("backend configuration", () => {
  it("comes from the environment", () => {
    // .env (production) and .env.development (dev) carry the value
    expect(serverURL).toMatch(/^https?:\/\//);
    expect(serverURL.endsWith("/")).toBe(false);
    expect(apiURL).toBe(`${serverURL}/api`);
  });
});

describe("parseGameState", () => {
  it("drops unknown and malformed fields", () => {
    const patch = parseGameState({
      cards: [1, 2, 3],
      current: "alice",
      filled: true,
      somethingElse: 42,
      cred: "not a number",
      config: { max_players: 2, cred_count: 9 },
      oppstate: [{ username: "bob", nocards: 3 }, { junk: true }],
    });

    expect(patch.cards).toEqual([1, 2, 3]);
    expect(patch.current).toBe("alice");
    expect(patch.filled).toBe(true);
    expect(patch.cred).toBeUndefined();
    expect("somethingElse" in patch).toBe(false);
    expect(patch.config).toEqual({ max_players: 2, card_count: 0, cred_count: 9 });
    expect(patch.oppstate).toEqual([
      { username: "bob", nocards: 3 },
      { username: "unknown", nocards: 0 },
    ]);
  });

  it("survives a response that is not an object", () => {
    expect(parseGameState(null)).toEqual({});
    expect(parseGameState("nope")).toEqual({});
    expect(parseGameState({ cards: ["x"] })).toEqual({});
  });
});

describe("gameServer", () => {
  it("posts a created game and parses the state it answers with", async () => {
    const mock = createMockServer();
    mock.install();

    const created = await gameServer.create("alice", { max_players: 2, card_count: 5 });

    expect(created.key).toBe("TEST1");
    expect(created.state.cards).toHaveLength(5);

    const [request] = mock.calls("/api/create");
    expect(request.method).toBe("POST");
    expect(request.body).toEqual({ creator: "alice", config: { max_players: 2, card_count: 5 } });
  });

  it("turns a non-2xx answer into an ApiError carrying the status", async () => {
    const mock = createMockServer({ failWith: 503 });
    mock.install();

    await expect(gameServer.join("alice", "TEST1")).rejects.toBeInstanceOf(ApiError);
    await expect(gameServer.join("alice", "TEST1")).rejects.toMatchObject({
      status: 503,
      message: "backend is down",
    });
  });

  it("times out instead of hanging forever", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (input: any, init: RequestInit = {}) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      })
    );

    const pending = gameServer.state("TEST1", 0, "alice");
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, message: "request timed out" });

    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
  });

  it("forwards caller cancellation", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", (input: any, init: RequestInit = {}) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      })
    );

    const pending = gameServer.state("TEST1", 0, "alice", { signal: controller.signal });
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, message: "request cancelled" });

    controller.abort();
    await assertion;
  });

  it("answers a stash pull with the new hand", async () => {
    const mock = createMockServer();
    mock.install();

    const patch = await gameServer.action("TEST1", "alice", ActionType.Take);

    expect(patch.cards).toHaveLength(6);
  });

  it("answers a played card with the server's view of it", async () => {
    const mock = createMockServer();
    mock.install();

    await gameServer.action("TEST1", "alice", ActionType.Play, WILD_PLUS4);

    expect(mock.server.ref_card).toBe(WILD_PLUS4);
    expect(mock.calls("/api/TEST1/action")[0].body).toEqual({
      username: "alice",
      type: ActionType.Play,
      card: WILD_PLUS4,
    });
  });
});
