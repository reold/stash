import { beforeEach, describe, expect, it } from "vitest";

import {
  appendNotification,
  bold,
  dismissNotification,
  notifications,
} from "$lib/state/notifications.svelte";

describe("notifications", () => {
  beforeEach(() => {
    notifications.queue.splice(0, notifications.queue.length);
  });

  it("keeps plain strings as text nodes", () => {
    appendNotification("hello");

    expect(notifications.queue).toHaveLength(1);
    expect(notifications.queue[0].nodes).toEqual(["hello"]);
    expect(notifications.queue[0].dur).toBe(5000);
  });

  it("keeps interpolated values separate from authored markup", () => {
    appendNotification(["enter your ", bold("username"), " and ", bold("<b>id</b>")]);

    expect(notifications.queue[0].nodes).toEqual([
      "enter your ",
      { bold: "username" },
      " and ",
      { bold: "<b>id</b>" },
    ]);
  });

  it("honours a custom duration", () => {
    appendNotification("bye", 2);

    expect(notifications.queue[0].dur).toBe(2000);
  });

  it("gives every notification an id and can dismiss by id", () => {
    appendNotification("one");
    appendNotification("two");

    const [first, second] = notifications.queue;
    expect(second.id).not.toBe(first.id);

    dismissNotification(first.id);
    expect(notifications.queue).toEqual([second]);

    // unknown ids are a no-op
    dismissNotification(999);
    expect(notifications.queue).toEqual([second]);
  });
});
