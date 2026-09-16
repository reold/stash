<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import GameBoard from "$lib/components/GameBoard.svelte";
  import { appendNotification } from "$lib/stores";

  let gameId = $state("");
  let username = $state("");

  let showUsernamePrompt = $state(false);
  let inputUsername = $state("");

  onMount(() => {
    const params = page.params as { id?: string };
    const idFromParam = params.id || "";
    const url = page.url;
    const userFromQuery = url.searchParams.get("username") || "";

    if (!idFromParam) {
      appendNotification("no game id");
      goto(resolve("/"));
      return;
    }

    gameId = idFromParam;

    if (userFromQuery) {
      username = userFromQuery;
      localStorage.setItem(`stash-username-${gameId}`, userFromQuery);
    } else {
      const stored = localStorage.getItem(`stash-username-${gameId}`);
      if (stored) {
        username = stored;
      } else {
        showUsernamePrompt = true;
      }
    }
  });

  const confirmUsername = () => {
    if (!inputUsername.trim()) {
      appendNotification("username required");
      return;
    }
    username = inputUsername.trim();
    localStorage.setItem(`stash-username-${gameId}`, username);
    showUsernamePrompt = false;
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("username", username);
    window.history.replaceState({}, "", newUrl.toString());
  };
</script>

<svelte:head>
  <title>Game {gameId} - Stash</title>
</svelte:head>

{#if showUsernamePrompt}
  <div
    class="w-full h-[100vh] flex flex-col justify-center items-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 to-slate-900 p-4"
  >
    <div
      class="bg-gray-900 ring-1 rounded-sm ring-gray-500 p-4 flex flex-col space-y-2 max-w-[50vh]"
    >
      <b class="text-lg">Enter username to join {gameId}</b>
      <input
        type="text"
        placeholder="username goes here"
        bind:value={inputUsername}
        class="w-full p-2 outline-none bg-gray-800 ring-1 ring-gray-500 rounded-sm"
      />
      <div class="flex space-x-2">
        <button
          class="bg-green-600 p-2 rounded-sm"
          onclick={confirmUsername}>continue</button
        >
        <button
          class="bg-gray-500 p-2 rounded-sm"
          onclick={() => goto(resolve("/"))}>back to home</button
        >
      </div>
    </div>
  </div>
{:else if gameId && username}
  <GameBoard {gameId} {username} />
{:else}
  <div class="w-full h-[100vh] flex justify-center items-center">
    <p>loading game {gameId || "..."}...</p>
  </div>
{/if}
