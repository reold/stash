import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionType, CardColor, encodeWildWithColor } from "$lib/card";
import { notifications } from "$lib/state/notifications.svelte";
import { session } from "$lib/state/session.svelte";

import { createMockServer, RED_5, WILD_PLUS4 } from "./mock-server";
import Harness from "./Harness.svelte";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate: () => boolean, timeout = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await sleep(25);
  }
  return false;
};

const text = (node: Element | null) => node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>("button")];
const buttonByText = (needle: string) =>
  buttons().find((button) => text(button).toLowerCase().includes(needle));
const tableReady = () => buttonByText("share") !== undefined;
const clickText = (needle: string) => {
  const button = buttonByText(needle);
  if (!button) throw new Error(`no button matching "${needle}"`);
  button.click();
  return button;
};

const hand = () =>
  [...document.querySelectorAll<HTMLButtonElement>('[aria-label="your hand"] button')].filter(
    (button) => !button.closest('[data-testid="flying-card"]')
  );
const faces = () => hand().map((card) => card.querySelectorAll("tspan")[1]?.textContent);

let app: Record<string, any> | undefined;

/** mounts the route the way the app lays it out: layout chrome + table */
const mountTable = (chrome = true) => {
  const target = document.createElement("div");
  document.body.appendChild(target);
  app = mount(Harness, { target, props: { game_id: "TEST1", username: "alice", chrome } });
  flushSync();
  return target;
};

beforeEach(() => {
  notifications.queue.splice(0, notifications.queue.length);
  session.gameId = null;
  session.username = null;
  document.body.innerHTML = "";
});

afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the table", () => {
  it("loads the full state, lays the hand out and names the cards", async () => {
    const mock = createMockServer();
    mock.install();

    mountTable();

    expect(await waitFor(() => document.getElementById("playground") !== null)).toBe(true);
    expect(await waitFor(() => hand().length === 5)).toBe(true);

    expect(mock.calls("/state?depth=3&username=alice")).toHaveLength(1);
    expect(faces()).toEqual(["5", "3", "+2", "rev", "+4"]);
    expect(text(document.getElementById("playground"))).toContain("your turn to make a move");
    expect(text(document.getElementById("playground"))).toContain("bob(3)");
    expect(text(document.getElementById("stash"))).toContain("5 pullable");
    expect(hand()[0].getAttribute("aria-label")).toBe("card 5");
    expect(hand()[0].getAttribute("style")).toContain("radial-gradient(circle, var(--red)");
  });

  it("hides the hand and refuses to play while the game is not filled", async () => {
    const mock = createMockServer({ filled: false });
    mock.install();

    mountTable();

    expect(await waitFor(() => text(document.getElementById("playground")).includes("waiting for players to join"))).toBe(true);

    await hand()[0]?.click();
    await sleep(50);

    expect(mock.calls("/action")).toHaveLength(0);
    expect(notifications.queue.flatMap((n) => n.nodes)).toContain("wait for players to join");
  });

  it("asks for a colour before playing a wild, and sends it with the card", async () => {
    const mock = createMockServer();
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    hand()
      .find((card) => card.textContent?.includes("+4"))
      ?.click();
    await sleep(50);

    // nothing is sent until a colour is picked
    expect(mock.calls("/action")).toHaveLength(0);
    expect(buttons().map(text)).toEqual(expect.arrayContaining(["red", "green", "blue", "yellow"]));

    buttonByText("blue")?.click();
    await sleep(100);

    const played = mock.calls("/action")[0];
    expect(played.body.card).toBe(encodeWildWithColor(WILD_PLUS4, CardColor.Blue));
    expect(played.body.type).toBe(ActionType.Play);
  });

  it("plays the card optimistically, then takes the server's hand", async () => {
    // hold the action answer back: the card must already be gone from the hand
    const mock = createMockServer({ actionDelay: 400 });
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    hand()
      .find((card) => card.textContent?.includes("5"))
      ?.click();

    // the card is gone from the hand immediately (before the server answers)
    await waitFor(() => hand().length === 4);
    expect(faces()).toEqual(["3", "+2", "rev", "+4"]);
    expect(document.querySelector('[data-testid="flying-card"]')).not.toBeNull();
    // the ui is ahead of the server: its hand still holds the played card
    expect(mock.server.cards).toHaveLength(5);

    expect(await waitFor(() => mock.calls("/action").length === 1)).toBe(true);
    expect(mock.calls("/action")[0].body.card).toBe(RED_5);
    expect(await waitFor(() => mock.server.cards.length === 4)).toBe(true);
    expect(await waitFor(() => document.querySelector('[data-testid="flying-card"]') === null)).toBe(true);
    expect(mock.calls("/state?depth=1")).toHaveLength(1);
  });

  it("puts the card back when the server refuses the play", async () => {
    const mock = createMockServer({ failNextAction: 409 });
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    hand()
      .find((card) => card.textContent?.includes("5"))
      ?.click();

    expect(await waitFor(() => notifications.queue.some((n) => n.nodes.join("").includes("card refused")))).toBe(true);
    // rolled back: five cards again, and nothing is left flying
    expect(await waitFor(() => hand().length === 5)).toBe(true);
    expect(document.querySelector('[data-testid="flying-card"]')).toBeNull();
    expect(faces()).toEqual(["5", "3", "+2", "rev", "+4"]);
  });

  it("refuses to play out of turn", async () => {
    const mock = createMockServer();
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    // two plays hand the turn to bob
    hand()
      .find((card) => card.textContent?.includes("5"))
      ?.click();
    await waitFor(() => mock.calls("/action").length === 1);
    await waitFor(() => hand().length === 4);
    hand()
      .find((card) => card.textContent?.includes("3"))
      ?.click();
    await waitFor(() => mock.calls("/action").length === 2);
    await waitFor(() => text(document.getElementById("playground")).includes("bob is making a move"));

    const playsBefore = mock.calls("/action").filter((r) => r.body.type === ActionType.Play).length;
    hand()[0].click();
    await sleep(100);

    expect(mock.calls("/action").filter((r) => r.body.type === ActionType.Play)).toHaveLength(playsBefore);
    expect(notifications.queue.flatMap((n) => n.nodes)).toContain("it's not your turn!");
  });

  it("pulls a card from the stash", async () => {
    const mock = createMockServer();
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    document.getElementById("stash")?.click();

    expect(await waitFor(() => hand().length === 6)).toBe(true);
    expect(mock.calls("/action")[0].body.type).toBe(ActionType.Take);
  });
});

describe("the polling loop", () => {
  it("pulls hanging debt exactly once, and keeps polling after it", async () => {
    // the table is bob's and the server hands alice one card of debt: the poll
    // must post a single settle action for it, then carry on ticking
    const mock = createMockServer({ current: "bob" });
    mock.install();

    mountTable();
    await waitFor(tableReady);
    clickText("fast client");

    expect(await waitFor(() => mock.calls("/action").length >= 1, 12_000)).toBe(true);
    expect(await waitFor(() => mock.calls("/state?depth=2").length >= 2, 12_000)).toBe(true);

    const settles = mock.calls("/action").filter((request) => request.body.type === ActionType.Settle);
    expect(settles).toHaveLength(1);
    expect(settles[0].body.username).toBe("alice");
  }, 20_000);

  it("notifies once per outage, not once per tick", async () => {
    // no <Notifications />: its dismissal timer would erase the messages this
    // test counts (the queue itself is what is being checked)
    const mock = createMockServer({ current: "bob" });
    mock.install();

    mountTable(false);
    await waitFor(tableReady);
    clickText("fast client");

    // the backend goes away
    const attempts: string[] = [];
    mock.fetchMock.mockImplementation((input: any) => {
      attempts.push(String(input));
      return Promise.resolve({
        ok: false,
        status: 503,
        text: () => Promise.resolve("down"),
      } as Response);
    });

    // two failed ticks are enough to prove the message is not repeated
    expect(await waitFor(() => attempts.length >= 2, 12_000)).toBe(true);

    const failureMessages = notifications.queue.filter((notification) =>
      notification.nodes.join("").includes("can't reach the game server")
    );
    expect(failureMessages).toHaveLength(1);
  }, 20_000);

  it("says so when the connection comes back", async () => {
    const mock = createMockServer({ current: "bob" });
    mock.install();

    mountTable(false);
    await waitFor(tableReady);
    clickText("fast client");

    expect(await waitFor(() => mock.calls("/state?depth=2").length >= 1, 9000)).toBe(true);

    const notice = (needle: string) =>
      notifications.queue.some((notification) => notification.nodes.join("").includes(needle));

    expect(notice("connection restored")).toBe(false);

    // drop the connection for one tick, then hand it back
    const original = mock.fetchMock.getMockImplementation()!;
    mock.fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve("down") } as Response)
    );

    expect(await waitFor(() => notice("can't reach the game server"), 12_000)).toBe(true);
    expect(await waitFor(() => notice("connection restored"), 15_000)).toBe(true);

    mock.fetchMock.mockImplementation(original);
  }, 30_000);

  it("stops polling once the table is torn down", async () => {
    const mock = createMockServer({ current: "bob" });
    mock.install();

    mountTable();
    await waitFor(tableReady);
    expect(await waitFor(() => mock.calls("/state?depth=2").length >= 1, 9000)).toBe(true);

    unmount(app!);
    app = undefined;

    const seen = mock.requests.length;
    await sleep(400);

    expect(mock.requests.length).toBe(seen);
  }, 15_000);

  it("cancels an in-flight play silently", async () => {
    const mock = createMockServer({ actionDelay: 500 });
    mock.install();

    mountTable();
    await waitFor(() => hand().length === 5);

    hand()
      .find((card) => card.textContent?.includes("5"))
      ?.click();
    await waitFor(() => mock.calls("/action").length === 1);

    // the player navigates away while the play is still on the wire
    const [play] = mock.calls("/action");
    unmount(app!);
    app = undefined;
    await sleep(700);

    expect(play.signal?.aborted).toBe(true);
    // the cancellation is not a failure the player should hear about
    expect(
      notifications.queue.filter((notification) =>
        notification.nodes.join("").includes("cancel")
      )
    ).toHaveLength(0);
  }, 15_000);
});
