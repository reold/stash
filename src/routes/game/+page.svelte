<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import GameBoard from "$lib/components/GameBoard.svelte";
  import { appendNotification } from "$lib/stores";

  let gameId = $state("");
  let username = $state("");

  // dialog for missing username
  let showUsernamePrompt = $state(false);
  let inputUsername = $state("");

  onMount(() => {
    const url = page.url;
    const idFromQuery = url.searchParams.get("id") || url.searchParams.get("gameId") || "";
    const userFromQuery = url.searchParams.get("username") || "";
    // also support hash legacy
    const hash = window.location.hash.slice(1);
    const effectiveId = idFromQuery || hash;

    if (!effectiveId) {
      appendNotification("no game id provided, redirecting to home");
      goto(resolve("/"));
      return;
    }

    gameId = effectiveId;

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
    // update url
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
  <GameBoard gameId={gameId} username={username} />
{:else}
  <div class="w-full h-[100vh] flex justify-center items-center">
    <p>loading...</p>
  </div>
{/if}
