import { gameServer } from "../requests";
import {
  appendNotification,
  type GameState,
  type MachineState,
} from "../store.svelte";

/**
 * The old machine lived in `<script context="module">` and mutated writable
 * stores. It now takes the two `$state` objects directly — mutating a `$state`
 * proxy from anywhere keeps the UI reactive, so no store plumbing is needed.
 */
export class StateMachine {
  state: GameState;
  machine: MachineState;

  constructor(state: GameState, machine: MachineState) {
    this.state = state;
    this.machine = machine;
  }
}

export class UnoMachine extends StateMachine {
  game_id: string;
  username: string;

  constructor(game_id: string, state: GameState, machine: MachineState) {
    super(state, machine);

    this.game_id = game_id;
    this.username = "";
  }

  load(data: object) {
    Object.assign(this.state, data);
  }

  initialize(username: string) {
    this.username = username;

    this.machine.ready = false;

    gameServer
      .state(this.game_id, 3, this.username)
      .then((data) => {
        this.load(data);
        this.machine.ready = true;
        console.debug("initialized state", this.state);
      })
      .catch((error: Error) => {
        appendNotification(`error during initialization,  ${error.message}`);
      });
  }
}
