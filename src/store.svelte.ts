/**
 * Shared application state.
 *
 * This used to be a `svelte/store` module. In runes mode a `$state` object that
 * lives in a `.svelte.ts` (or `.svelte.js`) module is the idiomatic replacement:
 * it is reactive everywhere it is imported and can be mutated in place.
 */

export type Progress = {
  zero: () => void;
  complete: () => void;
  set: (value: number) => void;
};

export type HandleColorSelect = () => Promise<number>;

export type PageProps = {
  game_id: string;
  username: string;
  handleColorSelect: HandleColorSelect;
  progress: Progress;
};

export const page = $state<{ name: string; props: PageProps }>({
  name: "home",
  props: {} as PageProps,
});

export type Notification = {
  id: number;
  msg: string;
  dur: number;
};

let nextNotificationId = 0;

export const notifications = $state<{ queue: Notification[] }>({ queue: [] });

/**
 * Push a notification onto the queue. `msg` may contain html, `dur` is in seconds.
 */
export const appendNotification = (msg: string, dur: number = 5) => {
  notifications.queue.push({ id: ++nextNotificationId, msg, dur: dur * 1000 });
};

/** Shape of the game state the server hands us. Loose on purpose. */
export type OppState = { username: string; nocards: number };

export type GameConfig = {
  max_players: number;
  card_count: number;
  cred_count: number;
};

export type GameState = {
  cards: number[];
  debt: number;
  cred: number;
  current: string;
  filled: boolean;
  ref_card: number;
  config: GameConfig;
  oppstate: OppState[];
  [key: string]: any;
};

export type MachineState = { ready: boolean; [key: string]: any };
