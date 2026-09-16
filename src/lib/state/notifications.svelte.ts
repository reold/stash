/**
 * Notifications are structured, not html strings: a notification is a list of
 * plain-text nodes, and `bold()` marks the ones that should be emphasised. The
 * component renders them with `{#each}`, so every interpolated value (a game
 * id, a username from the server, an error message) is escaped by Svelte.
 */
export type NotificationNode = string | { bold: string };

export type Notification = {
  id: number;
  nodes: NotificationNode[];
  dur: number;
};

export const bold = (text: string | number): NotificationNode => ({
  bold: String(text),
});

let nextNotificationId = 0;

export const notifications = $state<{ queue: Notification[] }>({ queue: [] });

/** Push a notification onto the queue. `dur` is in seconds. */
export const appendNotification = (
  nodes: NotificationNode[] | string,
  dur: number = 5
) => {
  notifications.queue.push({
    id: ++nextNotificationId,
    nodes: typeof nodes === "string" ? [nodes] : nodes,
    dur: dur * 1000,
  });
};

export const dismissNotification = (id: number) => {
  const index = notifications.queue.findIndex((entry) => entry.id === id);
  if (index != -1) notifications.queue.splice(index, 1);
};
