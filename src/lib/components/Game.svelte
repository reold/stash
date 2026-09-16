<script lang="ts">
  import { untrack } from "svelte";
  import { blur } from "svelte/transition";

  import Card from "./Card.svelte";
  import FlyingCard from "./FlyingCard.svelte";
  import {
    ActionType,
    cardDisplayColor,
    encodeWildWithColor,
    isWild,
  } from "$lib/card";
  import { gameServer } from "$lib/requests";
  import { gameUrl } from "$lib/routes";
  import { selectColor } from "$lib/state/dialog.svelte";
  import { appendNotification, bold } from "$lib/state/notifications.svelte";
  import { progressBar } from "$lib/state/progress.svelte";
  import { initialGameState, type GameState, type MachineState } from "$lib/types";
  import { UnoMachine } from "$lib/utils/machine";
  import { playInteractivePing } from "$lib/utils/sound";

  import CardFace from "$lib/assets/CardFace.png";

  let { game_id, username }: { game_id: string; username: string } = $props();

  let preference = $state({ isFastClient: false, fullscreen: false });

  let machineState = $state<MachineState>({ ready: false });
  let gameState = $state<GameState>({ ...initialGameState });

  /** indexes into gameState.cards that the player just played, hidden until the server agrees */
  let pending = $state<number[]>([]);
  let flying = $state<{
    card: number;
    from: DOMRect;
    to: DOMRect;
  } | null>(null);

  let playground = $state<HTMLDivElement>();
  let dropzone = $state<HTMLDivElement>();

  const playerState = $derived({
    cards: gameState.cards,
    debt: gameState.debt,
    cred: gameState.cred,
  });

  const visibleHand = $derived(
    gameState.cards
      .map((card, index) => ({ card, index }))
      .filter(({ index }) => !pending.includes(index))
  );

  const pullable = $derived(gameState.config.cred_count - playerState.cred);

  /* ------------------------------------------------------------ server sync */

  const applyPatch = (patch: Partial<GameState>) => {
    Object.assign(gameState, patch);
  };

  // the seat talks to the server through one controller, aborted on teardown
  let seat: AbortController | undefined;
  let stopped = true;
  let failures = 0;

  // note: not named `state` — that identifier belongs to svelte's internals
  const fetchState = (depth: number) =>
    gameServer.state(game_id, depth, username, { signal: seat?.signal });

  const play = (card: number) =>
    gameServer.action(game_id, username, ActionType.Play, card, {
      signal: seat?.signal,
    });

  /** pulls the cards this player owes, exactly once per poll */
  const settleDebt = async () => {
    if (playerState.debt <= 0) return;

    appendNotification([
      `pulling `,
      bold(playerState.debt),
      ` cards from stash`,
    ]);

    try {
      applyPatch(
        await gameServer.action(game_id, username, ActionType.Settle, 0, {
          signal: seat?.signal,
        })
      );
    } catch (error) {
      appendNotification(`failed to neutralize debt (${(error as Error).message})`);
    }
  };

  const pollOnce = async () => {
    if (!machineState.ready) return;
    if (gameState.current === username) return;
    // a hidden tab does not need fresh state every few seconds
    if (document.hidden) return;

    progressBar.zero();
    progressBar.set(25);

    try {
      if (!gameState.filled) {
        // waiting for players: the shallow poll is enough
        applyPatch(await fetchState(0));
      } else {
        applyPatch(await fetchState(2));
        await settleDebt();
      }

      if (failures > 0) {
        failures = 0;
        appendNotification("connection restored", 2);
      }
    } catch (error) {
      if ((error as Error).name === "ApiError" && (error as any).status === 0) return;

      const first = failures === 0;
      failures++;

      // one notification per outage instead of one per tick
      if (first) {
        appendNotification(`can't reach the game server (${(error as Error).message})`);
      }
    } finally {
      progressBar.complete();
    }
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisible);
        resolve();
      };
      const onVisible = () => {
        if (!document.hidden) finish();
      };

      const timer = setTimeout(finish, ms);
      document.addEventListener("visibilitychange", onVisible);
    });

  const backoff = () => Math.min(2 ** failures, 8);

  const pollLoop = async () => {
    while (!stopped) {
      // awaited: a tick never overlaps the previous one, so the debt-settling
      // action cannot be posted twice for the same turn
      await pollOnce();
      if (stopped) return;

      await wait((preference.isFastClient ? 3 : 5) * 1000 * backoff());
    }
  };

  $effect(() => {
    // re-runs (and re-seats) when the route id or the player changes
    const id = game_id;
    const player = username;

    untrack(() => {
      seat = new AbortController();
      stopped = false;
      failures = 0;
      pending = [];
      flying = null;
      gameState = { ...initialGameState };
      machineState = { ready: false };

      const machine = new UnoMachine(id, gameState, machineState, seat.signal);
      machine.initialize(player);
      pollLoop();
    });

    return () => {
      stopped = true;
      seat?.abort();
    };
  });

  /* ------------------------------------------------------------ playing cards */

  const refreshHand = async (depth: number) => {
    applyPatch(await fetchState(depth));
    pending = [];
  };

  const handleDropCard = async (index: number, element?: HTMLElement) => {
    if (!gameState.filled) {
      appendNotification("wait for players to join", 1);
      return;
    }
    if (gameState.current != username) {
      appendNotification("it's not your turn!", 1);
      return;
    }

    const card = gameState.cards[index];
    if (card === undefined) return;

    let played = card;
    if (isWild(played)) {
      try {
        played = encodeWildWithColor(played, await selectColor());
      } catch {
        return; // dialog dismissed, nothing is played
      }
    }

    // optimistic: the card leaves the hand now, and comes back if the server
    // refuses it
    pending = [...pending, index];

    const from = element?.getBoundingClientRect();
    const to = dropzone?.getBoundingClientRect();
    if (from && to) flying = { card: played, from, to };

    try {
      await play(played);
      await refreshHand(1);
    } catch (error) {
      pending = pending.filter((entry) => entry !== index);
      appendNotification(`error, ${(error as Error).message}`);
    } finally {
      flying = null;
    }
  };

  const handleTakeCard = async () => {
    appendNotification("pulling card from stash", 1);

    try {
      applyPatch(
        await gameServer.action(game_id, username, ActionType.Take, 0, {
          signal: seat?.signal,
        })
      );
    } catch (error) {
      appendNotification((error as Error).message, 1);
    }
  };

  const handleShareGame = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gameUrl(game_id)).then(() => {
        appendNotification("game url copied to clipboard");
      });
    } else {
      appendNotification(["send ", bold(game_id), " to your friend"], 10);
    }
  };

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

  // ping once per turn change, not on every state refresh
  let lastTurn = "";
  $effect(() => {
    if (gameState.current && gameState.current !== lastTurn) {
      lastTurn = gameState.current;
      if (gameState.current === username) playInteractivePing();
    }
  });
</script>

<div
  id="playground"
  class="relative {gameState.current == username
    ? ''
    : 'bg-gray-950'} h-[95vh] py-[5vh] flex flex-col justify-center items-center space-y-5 select-none transition-colors duration-1000"
  bind:this={playground}
>
  {#if machineState.ready}
    <div
      class="select-text grid grid-cols-3 gap-1 p-1 text-xs backdrop-brightness-75 rounded-md ring-0 ring-gray-500"
      style="text-shadow: 1px 1px black"
    >
      <button onclick={handleShareGame} class="p-0.5 rounded-md"
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
        class="p-1 {preference.isFastClient ? 'text-orange-600 font-black' : ''}"
        onclick={() => {
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
      <button onclick={toggleFullscreen}>
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
          {#if !gameState.filled}
            waiting for players to join
          {:else}
            {gameState.current == username
              ? "your turn to make a move!"
              : `${gameState.current} is making a move`}
          {/if}
        </p>
      </div>
    </div>
    <div class="w-full flex flex-row justify-evenly items-center">
      <div bind:this={dropzone}>
        <Card
          id="dropcard"
          card={gameState.ref_card}
          class="ring-gray-800 ring-4 rounded-md"
        />
      </div>

      <button
        class="relative w-[15vh] h-[22vh] bg-gray-900 ring-gray-800 ring-4 rounded-md p-1"
        id="stash"
        onclick={handleTakeCard}
      >
        <img src={CardFace} alt="" />
        {#if playerState.cred >= 0}
          <p class="absolute bottom-2 text-center bg-gray-800 rounded-md p-[1px]">
            {pullable == 0 ? `no pulls left` : `${pullable} pullable!`}
          </p>
        {/if}
      </button>
    </div>
    <div
      class="grid grid-cols-2 sm:grid-cols-1 justify-around items-center space-x-2 my-[2vh]"
    >
      {#each gameState.oppstate as opp}
        <div
          class="flex flex-col justify-center items-center text-xs {opp.username ==
          gameState.current
            ? 'animate-pulse'
            : ''}"
        >
          {#if opp.nocards > 0}
            <p>{opp.username}({opp.nocards})</p>
            <div
              class="flex flex-row justify-center items-center -space-x-[1vh] duration-1000"
            >
              {#each [...Array(Math.min(opp.nocards, 10)).keys()] as _}
                <div
                  in:blur={{ amount: 25, duration: 2 * 1000 }}
                  out:blur={{ amount: 25, duration: 2 * 1000 }}
                  class="w-[5vh] h-[7vh] bg-gray-900 duration-1000 {gameState.current ==
                  opp.username
                    ? 'ring-cyan-400'
                    : 'ring-gray-800'} ring-2 rounded-md p-1"
                >
                  <img src={CardFace} alt="" />
                </div>
              {/each}

              {#if opp.nocards > 10}(+{opp.nocards - 10}){/if}
            </div>
          {:else}
            <p><b>{opp.username}</b> is in!</p>
          {/if}
        </div>
      {/each}
    </div>
    <div
      class="flex flex-row max-w-[100vw] h-[30vh] items-center -space-x-[2.5vh] overflow-x-scroll px-[10vw] no-scrollbar snap-x"
      role="group"
      aria-label="your hand"
    >
      {#if visibleHand.length}
        {#each visibleHand as { card, index } (index)}
          <Card
            id="hand-{index}"
            {card}
            index={index}
            handleDropCard={handleDropCard}
            class="transition-all"
            style="transform: rotate({(index / gameState.cards.length - 0.5) *
              45}deg)"
          />
        {/each}
      {:else}
        <p>you have no cards left to play</p>
      {/if}
    </div>

    {#if flying && playground}
      <FlyingCard
        card={flying.card}
        from={flying.from}
        to={flying.to}
        origin={playground.getBoundingClientRect()}
      />
    {/if}
  {:else}
    <p>loading game</p>
  {/if}
</div>
