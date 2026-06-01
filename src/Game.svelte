<script context="module" lang="ts">
  import { writable, derived, get } from "svelte/store";
  import type { Writable } from "svelte/store";

  export class StateMachine {
    state: Writable<object>;
    machine: Writable<object>;

    constructor(state: Writable<object>, machine: Writable<object>) {
      this.state = state;
      this.machine = machine;
    }
  }

  export class UnoMachine extends StateMachine {
    game_id: string;
    username: string;

    constructor(
      game_id: string,
      state: Writable<object>,
      machine: Writable<object>
    ) {
      super(state, machine);

      this.game_id = game_id;
    }

    load(data) {
      this.state.update((state) => {
        state = data;
        return state;
      });
    }

    initialize(username) {
      this.username = username;

      this.machine.update((machineState) => {
        machineState["ready"] = false;
        return machineState;
      });

      gameServer
        .state(this.game_id, 3, this.username)
        .then((data) => {
          this.load(data);
          this.machine.update((machineState) => {
            machineState["ready"] = true;
            return machineState;
          });
          console.debug("initialized state", get(this.state));
        })
        .catch((error: Error) => {
          appendNotification(`error during initialization,  ${error.message}`);
        });
    }
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { gameServer } from "./requests";

  import { appendNotification } from "./App.svelte";

  import Card from "./Card.svelte";
  import CardFace from "./assets/CardFace.png";

  import { sounds } from "./utils/sound";

  import { blur } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";

  export let game_id: string = "3370.6-dumbell";
  export let username: string = "dumbell";
  export let handleColorSelect;
  export let progress;

  let preference = { isFastClient: false, fullscreen: false };

  let machineState = writable({ ready: false });
  let gameState = writable({});
  let playerState = derived(gameState, (state) => {
    return { cards: state["cards"], debt: state["debt"], cred: state["cred"] };
  });

  const dept1StateUpdate = async () => {
    try {
      let data = await gameServer.state(game_id, 1, username);
      $gameState = { ...$gameState, ...data };

      console.debug("dept-1 state update");
      console.log($playerState);
    } catch (error) {
      appendNotification(`state update failed (${error.message})(dept-1)`);
    }
  };

  const dept2StateUpdate = async () => {
    try {
      let data = await gameServer.state(game_id, 2, username);
      $gameState = { ...$gameState, ...data };

      console.debug("dept-2 state update");
      console.log($playerState);

      // neutralize user debt
      if ($playerState.debt > 0) {
        appendNotification(`pulling ${$playerState.debt} cards from stash`);
        try {
          let data = await gameServer.action(game_id, username, 0b10);
          $gameState = { ...$gameState, ...data };
        } catch {
          appendNotification("failed to neutralize debt");
        }
      }
    } catch (error) {
      appendNotification(`state update failed (${error.message})(dept-2)`);
    }
  };

  let game: UnoMachine;
  onMount(() => {
    game = new UnoMachine(game_id, gameState, machineState);
    game.initialize(username);

    const stateUpdateLoop = async () => {
      if ($machineState.ready && $gameState["current"] !== username) {
        progress.zero();
        progress.set(25);

        // dept-0 state update
        if (!$gameState["filled"]) {
          try {
            let data = await gameServer.state(game_id, 0, username);
            $gameState = { ...$gameState, ...data };
            console.debug("dept-0 state update");
          } catch (error) {
            appendNotification(
              `state update failed (${error.message})(dept-0)`
            );
          }
        } else {
          // dept-2 state update
          dept2StateUpdate();
        }
        progress.complete();
      }

      setTimeout(stateUpdateLoop, (preference.isFastClient ? 3 : 5) * 1000);
    };
    stateUpdateLoop();
  });

  const toggleFullscreen = () => {
    if (preference.fullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        preference.fullscreen = false;
      } else {
        appendNotification("couldn't minimize", 2);
      }
    } else {
      if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
        preference.fullscreen = true;
      } else {
        appendNotification("couldn't maximize", 2);
      }
    }
  };

  const handleShareGame = () => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(`https://reold.github.io/#${game_id}`)
        .then(() => {
          appendNotification("game url copied to clipboard");
        });
    } else {
      appendNotification(`send <b>${game_id}</b> to your friend`, 10);
    }
  };

  const handleTakeCard = () => {
    gameServer
      .action(game_id, username, 1)
      .then((data) => {
        $gameState["cards"] = data;
        dept1StateUpdate();
      })
      .catch((error) => {
        appendNotification(error.message, 1);
      });
  };

  const handleDropCard = async (index) => {
    if (!$gameState["filled"]) {
      appendNotification("wait for players to join", 1);
      return;
    } else if ($gameState["current"] != username) {
      appendNotification("it's not your turn!", 1);
      return;
    }

    let card = $playerState["cards"][index];
    const card_id = `${card}-${index}`;

    if ((card & 11_00_0000) >> 6 == 0b10) {
      try {
        const selectColor = await handleColorSelect();
        card += selectColor << 4;
        card += 0b1111;
      } catch {
        return;
      }
    }

    gameServer
      .action(game_id, username, 0, card)
      .then(() => {
        const dropElement = document.getElementById("dropcard");
        let cardEle = document.getElementById(card_id);

        const playgroundElm = document.getElementById("playground");
        let fakeCard: HTMLButtonElement = cardEle.cloneNode(
          true
        ) as HTMLButtonElement;

        fakeCard.id = `${fakeCard.id}-fake`;
        fakeCard.style.position = "absolute";

        const parentElement = cardEle.parentElement;
        const twnFakeCard = tweened(
          [
            cardEle.offsetLeft - parentElement.scrollLeft,
            cardEle.offsetTop,
            parseFloat(cardEle.style.transform.split("(")[1].split("d")[0]),
          ],
          {
            duration: 1500,
            easing: cubicInOut,
          }
        );

        twnFakeCard.subscribe(([x, y, rot]) => {
          fakeCard.style.left = `${x}px`;
          fakeCard.style.top = `${y}px`;
          fakeCard.style.transform = `rotate(${Math.round(rot)}deg)`;
        });

        playgroundElm.appendChild(fakeCard);
        gameState.update((state) => {
          state["cards"].splice(index, 1);

          return state;
        });

        twnFakeCard
          .set([dropElement.offsetLeft, dropElement.offsetTop, 0])
          .then(async () => {
            fakeCard.remove();
            $gameState["ref_card"] = card;
            await dept1StateUpdate();
          });
      })
      .catch((error) => {
        appendNotification(`error, ${error.message}`);
      });
  };

  $: {
    if ($gameState["current"] == username) {
      sounds.interactive.ping.play();
    }
  }
</script>

<div
  id="playground"
  class="relative {$gameState['current'] == username
    ? ''
    : 'bg-gray-950'} h-[95vh] py-[5vh] flex flex-col justify-center items-center space-y-5 select-none transition-colors duration-1000"
>
  {#if $machineState["ready"]}
    <div
      class="select-text grid grid-cols-3 gap-1 p-1 text-xs backdrop-brightness-75 rounded-md ring-0 ring-gray-500"
      style="text-shadow: 1px 1px black"
    >
      <button on:click={handleShareGame} class="p-0.5 rounded-md"
        ><svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-[1em] inline"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
        share</button
      >

      <button
        class="p-1 {preference.isFastClient
          ? 'text-orange-600 font-black'
          : ''}"
        on:click={() => {
          preference.isFastClient = !preference.isFastClient;
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-[1em] inline text-orange-600"
        >
          <path
            fill-rule="evenodd"
            d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
            clip-rule="evenodd"
          />
        </svg>
        fast client
      </button>
      <button on:click={toggleFullscreen}>
        {#if preference.fullscreen}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-[1em] inline"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
          minimize
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-[1em] inline"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
          maximize
        {/if}
      </button>
      <div class="col-span-3 text-center rounded-md">
        <p class="font-pop font-semibold p-1">
          {#if !$gameState["filled"]}
            waiting for players to join
          {:else}
            {$gameState["current"] == username
              ? "your turn to make a move!"
              : `${$gameState["current"]} is making a move`}
          {/if}
        </p>
      </div>
    </div>
    <div class="w-full flex flex-row justify-evenly items-center">
      <Card
        id="dropcard"
        card={$gameState["ref_card"]}
        class="ring-gray-800 ring-4 rounded-md"
      />

      <button
        class="relative w-[15vh] h-[22vh] bg-gray-900 ring-gray-800 ring-4 rounded-md p-1"
        id="stash"
        on:click={() => {
          appendNotification("pulling card from stash", 1);
          handleTakeCard();
        }}
      >
        <img src={CardFace} alt="card face" />
        {#if $playerState["cred"] >= 0}
          <p
            class="absolute bottom-2 text-center bg-gray-800 rounded-md p-[1px]"
          >
            {$gameState["config"]["cred_count"] - $playerState["cred"] == 0
              ? `no pulls left`
              : `${
                  $gameState["config"]["cred_count"] - $playerState["cred"]
                } pullable!`}
          </p>
        {/if}
      </button>
    </div>
    <div
      class="grid grid-cols-2 sm:grid-cols-1 justify-around items-center space-x-2 my-[2vh]"
    >
      {#each $gameState["oppstate"] as opp}
        <div
          class="flex flex-col justify-center items-center text-xs {opp[
            'username'
          ] == $gameState['current']
            ? 'animate-pulse'
            : ''}"
        >
          {#if opp["nocards"] > 0}
            <p>{opp["username"]}({opp["nocards"]})</p>
            <div
              class="flex flex-row justify-center items-center -space-x-[1vh] duration-1000"
            >
              {#each [...Array(Math.min(opp["nocards"], 10)).keys()] as _}
                <div
                  in:blur={{
                    amount: 25,
                    duration: 2 * 1000,
                  }}
                  out:blur={{
                    amount: 25,
                    duration: 2 * 1000,
                  }}
                  class="w-[5vh] h-[7vh] bg-gray-900 duration-1000 {$gameState[
                    'current'
                  ] == opp['username']
                    ? 'ring-cyan-400'
                    : 'ring-gray-800'} ring-2 rounded-md p-1"
                >
                  <img src={CardFace} alt="card face" />
                </div>
              {/each}

              {#if opp["nocards"] > 10}(+{opp["nocards"] - 10}){/if}
            </div>
          {:else}
            <p>
              <b>{opp["username"]}</b> is in!
            </p>
          {/if}
        </div>
      {/each}
    </div>
    <div
      class="flex flex-row max-w-[100vw] h-[30vh] items-center -space-x-[2.5vh] overflow-x-scroll px-[10vw] no-scrollbar snap-x"
    >
      {#if $playerState["cards"]}
        {#each $playerState["cards"] as card, i}
          <Card
            id="{card}-{i}"
            index={i}
            {card}
            {handleDropCard}
            class="transition-all"
            style="transform: rotate({(i / $playerState['cards'].length - 0.5) *
              45}deg)"
          />
        {/each}
      {:else}
        <p>you have no cards left to play</p>
      {/if}
    </div>
  {:else}
    <p>loading game</p>
  {/if}
</div>
