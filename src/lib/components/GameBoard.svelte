<script lang="ts">
  import { onMount } from "svelte";
  import { blur } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { gameServer } from "$lib/requests";
  import { appendNotification, notifications } from "$lib/stores";
  import Card from "$lib/components/Card.svelte";
  import CardFace from "$lib/assets/CardFace.png";
  import { sounds } from "$lib/sound";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";

  interface Props {
    gameId: string;
    username: string;
  }

  let { gameId, username }: Props = $props();

  // Game state using runes
  let machineReady = $state(false);
  let gameState = $state<Record<string, any>>({});
  let playerState = $derived({
    cards: gameState["cards"] as number[] | undefined,
    debt: gameState["debt"] as number | undefined,
    cred: gameState["cred"] as number | undefined,
  });

  let preference = $state({ isFastClient: false, fullscreen: false });

  // Dialog for color select
  type ColorOption = { name: string; color: string; value: number };
  let colorDialog = $state<{
    open: boolean;
    promise: { resolve: (v: number) => void; reject: () => void } | null;
    options: ColorOption[];
  }>({
    open: false,
    promise: null,
    options: [
      { name: "red", color: "red", value: 0b00 },
      { name: "green", color: "green", value: 0b01 },
      { name: "blue", color: "blue", value: 0b10 },
      { name: "yellow", color: "yellow", value: 0b11 },
    ],
  });

  // Notifications visible
  let visibleNotifications = $state<{ id: number; msg: string }[]>([]);
  let notifCounter = $state(0);

  notifications.subscribe((state) => {
    if (state.length === 0) return;
    for (const n of state) {
      const id = notifCounter++;
      visibleNotifications = [...visibleNotifications, { id, msg: n.msg }];
      setTimeout(() => {
        visibleNotifications = visibleNotifications.filter((x) => x.id !== id);
      }, n.dur);
    }
    notifications.set([]);
  });

  // Progress
  const progressTwn = tweened(0, { duration: 100, easing: cubicInOut });
  const progress = {
    zero: () => progressTwn.set(0, { duration: 0 }),
    complete: () => {
      progressTwn.set(100, { duration: 100 }).then(progress.zero);
    },
    set: (v: number) => progressTwn.set(Math.min(Math.max(v, 0), 100)),
  };

  const dept1StateUpdate = async () => {
    try {
      let data = await gameServer.state(gameId, 1, username);
      gameState = { ...gameState, ...data };
      console.debug("dept-1 state update");
    } catch (error: any) {
      appendNotification(`state update failed (${error.message})(dept-1)`);
    }
  };

  const dept2StateUpdate = async () => {
    try {
      let data = await gameServer.state(gameId, 2, username);
      gameState = { ...gameState, ...data };
      console.debug("dept-2 state update");
      console.log(playerState);

      if ((playerState.debt ?? 0) > 0) {
        appendNotification(`pulling ${playerState.debt} cards from stash`);
        try {
          let d = await gameServer.action(gameId, username, 0b10);
          gameState = { ...gameState, ...d };
        } catch {
          appendNotification("failed to neutralize debt");
        }
      }
    } catch (error: any) {
      appendNotification(`state update failed (${error.message})(dept-2)`);
    }
  };

  let stateUpdateLoopTimeout: number | undefined;

  const initializeGame = async () => {
    machineReady = false;
    try {
      const data = await gameServer.state(gameId, 3, username);
      gameState = data;
      machineReady = true;
      console.debug("initialized state", data);
    } catch (error: any) {
      appendNotification(`error during initialization, ${error.message}`);
    }
  };

  onMount(() => {
    initializeGame();

    const loop = async () => {
      if (machineReady && gameState["current"] !== username) {
        progress.zero();
        progress.set(25);

        if (!gameState["filled"]) {
          try {
            let data = await gameServer.state(gameId, 0, username);
            gameState = { ...gameState, ...data };
            console.debug("dept-0 state update");
          } catch (error: any) {
            appendNotification(`state update failed (${error.message})(dept-0)`);
          }
        } else {
          await dept2StateUpdate();
        }
        progress.complete();
      }
      stateUpdateLoopTimeout = window.setTimeout(
        loop,
        (preference.isFastClient ? 3 : 5) * 1000,
      );
    };
    loop();

    return () => {
      if (stateUpdateLoopTimeout) clearTimeout(stateUpdateLoopTimeout);
    };
  });

  // Sound when it's user's turn
  $effect(() => {
    if (gameState["current"] == username) {
      try {
        (sounds.interactive.ping as any)?.play?.();
      } catch {}
    }
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
    const shareUrl = `${window.location.origin}${resolve("/game/[id]", { id: gameId })}`;
    const legacyUrl = `https://reold.github.io/#${gameId}`;
    const urlToShare = shareUrl;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlToShare).then(() => {
        appendNotification("game url copied to clipboard");
      });
    } else {
      appendNotification(`send <b>${gameId}</b> to your friend`, 10);
    }
  };

  const handleTakeCard = () => {
    gameServer
      .action(gameId, username, 1)
      .then((data) => {
        if (data) gameState["cards"] = data;
        dept1StateUpdate();
      })
      .catch((error: any) => {
        appendNotification(error.message, 1);
      });
  };

  const handleColorSelect = (): Promise<number> => {
    colorDialog.open = true;
    return new Promise<number>((resolve, reject) => {
      colorDialog.promise = {
        resolve: (c) => {
          colorDialog.open = false;
          resolve(c);
        },
        reject: () => {
          colorDialog.open = false;
          reject();
        },
      };
    });
  };

  const dismissColorDialog = () => {
    colorDialog.open = false;
    colorDialog.promise?.reject();
    colorDialog.promise = null;
  };

  const handleDropCard = async (index: number) => {
    if (!gameState["filled"]) {
      appendNotification("wait for players to join", 1);
      return;
    } else if (gameState["current"] != username) {
      appendNotification("it's not your turn!", 1);
      return;
    }

    let card = playerState.cards?.[index];
    if (card === undefined) return;
    const card_id = `${card}-${index}`;

    if (((card & 0b11_00_0000) >> 6) == 0b10) {
      try {
        const selectColor = await handleColorSelect();
        card += selectColor << 4;
        card += 0b1111;
      } catch {
        return;
      }
    }

    gameServer
      .action(gameId, username, 0, card)
      .then(() => {
        const dropElement = document.getElementById("dropcard");
        let cardEle = document.getElementById(card_id);
        if (!dropElement || !cardEle) {
          // fallback without animation
          gameState = {
            ...gameState,
            cards: gameState["cards"].filter((_: any, i: number) => i !== index),
            ref_card: card,
          };
          dept1StateUpdate();
          return;
        }

        const playgroundElm = document.getElementById("playground");
        let fakeCard = cardEle.cloneNode(true) as HTMLButtonElement;
        fakeCard.id = `${fakeCard.id}-fake`;
        fakeCard.style.position = "absolute";

        const parentElement = cardEle.parentElement as HTMLElement;
        const transformMatch = cardEle.style.transform.match(/-?\d+(\.\d+)?/);
        const rot = transformMatch ? parseFloat(transformMatch[0]) : 0;

        const twnFakeCard = tweened(
          [
            cardEle.offsetLeft - parentElement.scrollLeft,
            cardEle.offsetTop,
            rot,
          ],
          {
            duration: 1500,
            easing: cubicInOut,
          },
        );

        const unsub = twnFakeCard.subscribe(([x, y, r]) => {
          fakeCard.style.left = `${x}px`;
          fakeCard.style.top = `${y}px`;
          fakeCard.style.transform = `rotate(${Math.round(r as number)}deg)`;
        });

        playgroundElm?.appendChild(fakeCard);
        gameState = {
          ...gameState,
          cards: gameState["cards"].filter((_: any, i: number) => i !== index),
        };

        twnFakeCard
          .set([dropElement.offsetLeft, dropElement.offsetTop, 0])
          .then(async () => {
            unsub();
            fakeCard.remove();
            gameState = { ...gameState, ref_card: card };
            await dept1StateUpdate();
          });
      })
      .catch((error: any) => {
        appendNotification(`error, ${error.message}`);
      });
  };
</script>

<div class="w-full h-[100vh] relative overflow-hidden flex flex-col">
  <!-- Notifications -->
  <div
    class="absolute w-full min-h-[5vh] pt-[2vh] flex flex-col-reverse justify-center items-center z-30 pointer-events-none"
  >
    {#each visibleNotifications as n (n.id)}
      <p
        class="animate-pulse opacity-75 min-w-[10vw] max-w-[80vw] bg-gray-950 font-pop text-semibold text-white ring-2 ring-gray-900 mb-2 p-1 text-center rounded-md text-sm pointer-events-auto"
      >
        {@html n.msg}
      </p>
    {/each}
  </div>

  <!-- Progress -->
  <div
    class="z-20 fixed top-0 left-0 h-[2px] bg-cyan-600"
    style="width: {$progressTwn}vw;"
  ></div>

  <!-- Color select dialog -->
  {#if colorDialog.open}
    <div
      class="absolute w-full h-screen p-1 flex flex-col justify-center items-center backdrop-blur-md z-10"
      onclick={(e) => {
        if (e.target === e.currentTarget) dismissColorDialog();
      }}
      onkeydown={(e) => {
        if (e.key === 'Escape') dismissColorDialog();
      }}
      role="button"
      tabindex="-1"
    >
      <div
        class="bg-gray-900 ring-1 text-sm rounded-sm ring-gray-500 flex flex-col justify-center items-center space-y-2 p-2 cursor-text text-md max-w-[50vh] max-sm:max-w-[85vw]"
      >
        <b class="mb-1 text-lg">Select color</b>
        <div class="grid grid-cols-2 gap-2">
          {#each colorDialog.options as option}
            <button
              style="background-color: var(--{option.color})"
              class="aspect-square align-middle p-5 hover:scale-125 duration-75 rounded-sm w-[15ch]"
              onclick={() => colorDialog.promise?.resolve(option.value)}
            >
              {option.name}
            </button>
          {/each}
        </div>
        <button
          class="bg-gray-500 p-2 rounded-sm mt-2"
          onclick={dismissColorDialog}>close</button
        >
      </div>
    </div>
  {/if}

  <!-- Game playground -->
  <div
    id="playground"
    class="relative {gameState['current'] == username
      ? ''
      : 'bg-gray-950'} h-[95vh] py-[5vh] flex flex-col justify-center items-center space-y-5 select-none transition-colors duration-1000"
  >
    {#if machineReady}
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
          class="p-1 {preference.isFastClient
            ? 'text-orange-600 font-black'
            : ''}"
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
            {#if !gameState["filled"]}
              waiting for players to join
            {:else}
              {gameState["current"] == username
                ? "your turn to make a move!"
                : `${gameState["current"]} is making a move`}
            {/if}
          </p>
        </div>
      </div>
      <div class="w-full flex flex-row justify-evenly items-center">
        <Card
          id="dropcard"
          card={gameState["ref_card"]}
          class="ring-gray-800 ring-4 rounded-md"
        />

        <button
          class="relative w-[15vh] h-[22vh] bg-gray-900 ring-gray-800 ring-4 rounded-md p-1"
          id="stash"
          onclick={() => {
            appendNotification("pulling card from stash", 1);
            handleTakeCard();
          }}
        >
          <img src={CardFace} alt="card face" />
          {#if (playerState.cred ?? -1) >= 0}
            <p
              class="absolute bottom-2 text-center bg-gray-800 rounded-md p-[1px]"
            >
              {gameState["config"]["cred_count"] - (playerState.cred ?? 0) == 0
                ? `no pulls left`
                : `${gameState["config"]["cred_count"] - (playerState.cred ?? 0)} pullable!`}
            </p>
          {/if}
        </button>
      </div>
      <div
        class="grid grid-cols-2 sm:grid-cols-1 justify-around items-center space-x-2 my-[2vh]"
      >
        {#each gameState["oppstate"] ?? [] as opp}
          <div
            class="flex flex-col justify-center items-center text-xs {opp[
              'username'
            ] == gameState['current']
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
                    class="w-[5vh] h-[7vh] bg-gray-900 duration-1000 {gameState[
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
        {#if playerState.cards}
          {#each playerState.cards as card, i}
            <Card
              id="{card}-{i}"
              index={i}
              {card}
              {handleDropCard}
              class="transition-all"
              style="transform: rotate({(i / playerState.cards!.length - 0.5) *
                45}deg)"
            />
          {/each}
        {:else}
          <p>you have no cards left to play</p>
        {/if}
      </div>
    {:else}
      <p>loading game {gameId} as {username}...</p>
    {/if}
  </div>

  <div
    class="w-full h-[5vh] flex flex-row justify-center items-center space-x-1 bg-gray-950 text-white text-center text-xs"
  >
    <p class="font-pop font-bold">
      <span class="font-sans">Stash</span>, game {gameId}
    </p>
  </div>
</div>
