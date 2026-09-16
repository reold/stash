<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { tweened } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { gameServer } from "$lib/requests";
  import { notifications, appendNotification } from "$lib/stores";
  import CardFace from "$lib/assets/StashLogo.png";
  import { page } from "$app/state";

  // Dialog state using runes
  type DialogEntry = {
    name: string;
    value?: any;
    type?: string;
    min?: number;
    max?: number;
    options?: { name: string; color: string; value: number }[];
  };

  type DialogPromise = {
    resolve: (v?: any) => void;
    reject: () => void;
  };

  let dialog = $state<{
    open: boolean;
    promise: DialogPromise | undefined;
    form: DialogEntry[];
  }>({
    open: false,
    promise: undefined,
    form: [],
  });

  let notificationContainer = $state<HTMLDivElement | null>(null);

  const progressTwn = tweened(0, { duration: 100, easing: cubicInOut });
  const progress = {
    zero: () => {
      progressTwn.set(0, { duration: 0 });
    },
    complete: () => {
      progressTwn.set(100, { duration: 100 }).then(progress.zero);
    },
    set: (value: number) => progressTwn.set(Math.min(Math.max(value, 0), 100)),
  };

  // Notifications handling - declarative rendering instead of direct DOM manipulation
  // Keep compatibility with old store subscription approach by reacting to store changes
  // We'll render notifications via {#each} but also support timeout removal
  let visibleNotifications = $state<{ id: number; msg: string; timeout: number }[]>([]);
  let notifId = 0;

  // Subscribe to notifications store for external calls
  notifications.subscribe((state) => {
    if (state.length === 0) return;
    // drain store
    for (const n of state) {
      const id = notifId++;
      visibleNotifications = [
        ...visibleNotifications,
        { id, msg: n.msg, timeout: n.dur },
      ];
      setTimeout(() => {
        visibleNotifications = visibleNotifications.filter((x) => x.id !== id);
      }, n.dur);
    }
    // clear store
    notifications.set([]);
  });

  // Local append that uses visibleNotifications directly too
  function localAppend(msg: string, dur: number = 5) {
    appendNotification(msg, dur);
  }

  const dismissDialog = () => {
    dialog.open = false;
    if (dialog.promise) dialog.promise.reject();
    dialog.promise = undefined;
  };

  const handleColorSelect = () => {
    dialog.form = [
      {
        name: "select color",
        type: "colorselect",
        options: [
          { name: "red", color: "red", value: 0b00 },
          { name: "green", color: "green", value: 0b01 },
          { name: "blue", color: "blue", value: 0b10 },
          { name: "yellow", color: "yellow", value: 0b11 },
        ],
      },
    ];
    dialog.open = true;

    return new Promise<number>((resolve, reject) => {
      dialog.promise = {
        resolve: (color: number) => {
          resolve(color);
          dismissDialog();
        },
        reject,
      };
    });
  };

  const showCreateGame = () => {
    localAppend("enter your <b>username</b> and <b>game configuration</b>");

    dialog.form = [
      { name: "username", value: "" },
      { name: "configuration", type: "text" },
      { name: "max players", value: 2, type: "range", min: 2, max: 4 },
      { name: "card count", value: 5, type: "range", min: 2, max: 15 },
    ];
    dialog.open = true;

    dialog.promise = {
      resolve: () => {
        handleCreate();
      },
      reject: () => {},
    };
  };

  const showJoinGame = (prefillId = "") => {
    localAppend("enter your <b>username</b> and <b>game id<b/>");
    dialog.form = [
      { name: "username", value: "" },
      { name: "game id", value: prefillId },
    ];

    dialog.open = true;
    dialog.promise = {
      resolve: () => {
        handleJoin();
      },
      reject: () => {},
    };
  };

  const showHelp = () => {
    localAppend(
      "contact <b>@redicrafty on X</b> or <b>@0digt on Instagram</b>",
    );
    handleColorSelect()
      .then((color) => localAppend(`you chose <b>${color}</b> color`))
      .catch(() => {});
  };

  const handleCreate = async () => {
    progress.set(25);

    let fields: Record<string, any> = {};
    dialog.form.forEach((field) => {
      fields[field.name] = field.value;
    });

    dialog.open = false;
    if (fields["username"] && fields["max players"]) {
      localAppend(`creating a <b>${fields["max players"]} player game</b>`);

      try {
        const data = await gameServer.create(fields["username"], {
          max_players: fields["max players"],
          card_count: fields["card count"],
        });
        console.log("game created with state", data);
        localAppend(`<b>successfully created game!</b>`);
        const gameId = data["key"];
        const username = fields["username"];
        // Navigate to split route - use typed resolve for dynamic param
        await goto(
          `${resolve("/game/[id]", { id: gameId })}?username=${encodeURIComponent(username)}`,
        );
      } catch (error: any) {
        localAppend(`unable to create game (${error.message})`);
      }
    } else {
      localAppend("invalid information");
    }
    progress.complete();
  };

  const handleJoin = () => {
    let fields: Record<string, any> = {};
    dialog.form.forEach((field) => {
      fields[field.name] = field.value;
    });

    dialog.open = false;
    if (fields["username"] && fields["game id"]) {
      localAppend(
        `trying to join ${fields["game id"]} as ${fields["username"]} `,
        2,
      );
      gameServer
        .join(fields["username"], fields["game id"])
        .then(async () => {
          localAppend("successfully joined game", 2);
          await goto(
            `${resolve("/game/[id]", { id: fields["game id"] })}?username=${encodeURIComponent(fields["username"])}`,
          );
        })
        .catch((error: any) => {
          localAppend(`unable to join game (${error.message})`);
        });
    } else {
      localAppend(`invalid information`);
    }
  };

  onMount(() => {
    const hash = window.location.hash.slice(1);
    if (hash != "") {
      showJoinGame(hash);
      dialog.form.forEach((entry) => {
        if (entry["name"] == "game id") {
          entry["value"] = hash;
        }
        return entry;
      });
      localAppend(
        `enter <b>username</b> and continue to join <b>${hash}</b>`,
        10,
      );
    }

    // Also handle ?join=gameId query for new share links backwards compat
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get("join");
    if (joinParam) {
      showJoinGame(joinParam);
    }
  });
</script>

<svelte:head>
  <title>Stash - Where Strategy Meets the Shuffle</title>
</svelte:head>

<div class="w-full h-[100vh] relative overflow-hidden">
  <div
    bind:this={notificationContainer}
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
  <div
    class="z-20 fixed top-0 left-0 h-[2px] bg-cyan-600"
    style="width: {$progressTwn}vw;"
  ></div>
  <div
    style="visibility: {dialog.open ? 'visible' : 'hidden'}"
    class="absolute w-full h-screen p-1 flex flex-col justify-center items-center backdrop-blur-md z-10"
    onclick={(e) => {
      if (e.target === e.currentTarget) dismissDialog();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') dismissDialog();
    }}
    role="button"
    tabindex="-1"
  >
    <div
      class="bg-gray-900 ring-1 text-sm rounded-sm ring-gray-500 flex flex-col justify-center items-center space-y-2 p-2 cursor-text text-md max-w-[50vh] max-sm:max-w-[85vw]"
    >
      <b class="mb-1 text-lg">Complete to continue</b>
      {#if dialog.form}
        {#each dialog.form as entry}
          {#if entry.type == "range"}
            <div
              class="rounded-md p-1 bg-gray-800 w-full grid grid-cols-3 items-center space-x-2"
            >
              <p>
                {entry.name}
                <span
                  class="px-0.5 h-min {entry.value == entry.max
                    ? 'bg-orange-600'
                    : 'bg-blue-600'} rounded-md font-black transition-colors duration-1000"
                  >{entry.value}{entry.value == entry.max ? " max" : ""}</span
                >
              </p>
              <input
                type="range"
                name={entry.name}
                bind:value={entry.value}
                min={entry.min}
                max={entry.max}
                class="col-span-2 p-1"
              />
            </div>
          {:else if entry.type == "text"}
            <b>{entry.name}</b>
          {:else if entry.type == "colorselect"}
            <p>{entry.name}</p>
            <div class="grid grid-cols-2 gap-2">
              {#each entry.options ?? [] as option}
                <button
                  style="background-color: var(--{option.color})"
                  class="aspect-square align-middle p-5 hover:scale-125 duration-75 rounded-sm w-[15ch]"
                  onclick={() => dialog.promise?.resolve(option.value)}
                >
                  {option.name}
                </button>
              {/each}
            </div>
          {:else}
            <input
              type="text"
              placeholder={`${entry.name} goes here`}
              name={entry.name}
              autocapitalize="none"
              autocorrect="off"
              autocomplete="off"
              bind:value={entry.value}
              class="w-full p-2 outline-none bg-gray-800 ring-1 ring-gray-500 rounded-sm"
            />
          {/if}
        {/each}

        <div class="flex flex-row justify-center items-center space-x-2">
          {#if dialog.promise && !dialog.form.find((entry) => ["colorselect"].includes(entry.type ?? ""))}
            <button
              class="bg-green-600 p-2 rounded-sm mt-2"
              onclick={() => dialog.promise?.resolve()}>continue</button
            >
          {/if}
          <button class="bg-gray-500 p-2 rounded-sm mt-2" onclick={dismissDialog}
            >close</button
          >
        </div>
      {/if}
    </div>
  </div>

  <div
    class="w-full h-[95vh] p-2 flex flex-col justify-center items-center space-y-10 text-center"
  >
    <div class="flex flex-col justify-center items-center -space-y-20">
      <img src={CardFace} alt="stash logo" class="w-[50vh] sm:h-[50vh]" />
      <p class="text-white" style="text-shadow: 0px 3px 3px rgba(15, 23, 42);">
        Where Strategy Meets the Shuffle - Play Your Cards Wisely!
      </p>
    </div>
    <div class="flex flex-row justify-center items-center space-x-5">
      {#each [{ name: "create", color: "bg-green-600", handle: showCreateGame }, { name: "join", color: "bg-blue-700", handle: () => showJoinGame() }, { name: "help", handle: showHelp }] as action}
        <button
          onclick={() => {
            if (action.handle) action.handle();
          }}
          class="{action.color
            ? action.color
            : 'bg-gray-950'} p-2 text-lg rounded-xl hover:scale-125 duration-150 delay-75"
          >{action.name}</button
        >
      {/each}
    </div>
  </div>

  <div
    class="w-full h-[5vh] flex flex-row justify-center items-center space-x-1 bg-gray-950 text-white text-center text-xs"
  >
    <p class="font-pop font-bold">
      <span class="font-sans">Stash</span>, crafted by reold.
      <a href="https://x.com/redicrafty" target="_blank" class="text-cyan-600"
        >Report an error<svg
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
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
    </p>
    <span class="bg-cyan-600 text-black p-[0.2em] rounded-sm"
      >{import.meta.env.PROD ? "prod" : "dev"}</span
    >
  </div>
</div>
