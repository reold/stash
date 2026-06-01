import { writable } from "svelte/store";

export const page = writable({ name: "home", props: {} });
export const notifications = writable([]);
