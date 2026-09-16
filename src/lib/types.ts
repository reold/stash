/** Shape of the game state the server hands us. */

export type OppState = { username: string; nocards: number };

export type GameConfig = {
  max_players: number;
  card_count: number;
  cred_count: number;
};

/**
 * The full table state. The server answers different subsets depending on the
 * polling depth, so it is always merged onto {@link initialGameState} — every
 * field below is present, nothing is optional, and the UI never reads
 * `undefined` just because a shallower poll answered first.
 */
export type GameState = {
  cards: number[];
  debt: number;
  cred: number;
  current: string;
  filled: boolean;
  ref_card: number;
  config: GameConfig;
  oppstate: OppState[];
};

/** What a single response may contain. */
export type GameStatePatch = Partial<GameState>;

export const initialGameState: GameState = {
  cards: [],
  debt: 0,
  cred: 0,
  current: "",
  filled: false,
  ref_card: 0,
  config: { max_players: 0, card_count: 0, cred_count: 0 },
  oppstate: [],
};

export type MachineState = { ready: boolean };

export type GameCreation = { max_players?: number; card_count?: number };

/** A dialog field, rendered by $lib/components/Dialog.svelte. */
export type DialogField = {
  name: string;
  value?: any;
  type?: "text" | "range" | "colorselect";
  min?: number;
  max?: number;
  options?: { name: string; color: string; value: number }[];
};
