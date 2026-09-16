import { writable } from "svelte/store";

export type Notification = {
  id: number;
  msg: string;
  dur: number;
};

export const notifications = writable<Notification[]>([]);

let nextId = 0;

export function appendNotification(msg: string, dur: number = 5) {
  const id = nextId++;
  notifications.update((state) => [...state, { id, msg, dur: dur * 1000 }]);
}
