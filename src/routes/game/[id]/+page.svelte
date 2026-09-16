<script lang="ts">
  import Game from "$lib/components/Game.svelte";
  import { session } from "$lib/state/session.svelte";
  import JoinGate from "./JoinGate.svelte";

  let { data }: { data: { id: string } } = $props();

  // the seat is only valid for the game it was taken in
  const seated = $derived(session.gameId === data.id && !!session.username);
</script>

<div class="w-full h-[95vh]">
  {#if seated}
    <Game game_id={data.id} username={session.username as string} />
  {:else}
    <JoinGate game_id={data.id} />
  {/if}
</div>
