<script lang="ts">
  import { gameServer } from "$lib/requests";
  import { appendNotification, bold } from "$lib/state/notifications.svelte";
  import { startSession } from "$lib/state/session.svelte";

  let { game_id }: { game_id: string } = $props();

  let username = $state("");
  let busy = $state(false);

  const join = async () => {
    if (!username.trim()) {
      appendNotification(["enter a ", bold("username"), " first"], 2);
      return;
    }

    busy = true;
    appendNotification(["trying to join ", bold(game_id), " as ", bold(username)], 2);

    try {
      await gameServer.join(username, game_id);
      appendNotification("successfully joined game", 2);
      startSession(game_id, username);
    } catch (error) {
      appendNotification(`unable to join game (${(error as Error).message})`);
    } finally {
      busy = false;
    }
  };
</script>

<div
  class="w-full h-[95vh] p-2 flex flex-col justify-center items-center space-y-6 text-center"
>
  <p class="font-sans text-2xl">Join game</p>
  <p class="font-pop text-sm opacity-75">game id: {game_id}</p>

  <div class="flex flex-col space-y-2">
    <input
      type="text"
      placeholder="username goes here"
      name="username"
      autocapitalize="none"
      autocorrect="off"
      autocomplete="off"
      bind:value={username}
      onkeydown={(event) => {
        if (event.key === "Enter") join();
      }}
      class="w-[30ch] p-2 outline-none bg-gray-800 ring-1 ring-gray-500 rounded-sm"
    />
    <button
      disabled={busy}
      class="bg-blue-700 p-2 rounded-xl hover:scale-105 duration-150 disabled:opacity-50"
      onclick={join}
    >
      {busy ? "joining..." : "continue"}
    </button>
  </div>

  <a href="/" class="text-cyan-600 text-sm">back home</a>
</div>
