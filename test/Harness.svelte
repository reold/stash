<script lang="ts">
  /**
   * The route, as the app composes it: the layout chrome plus the table.
   * Tests mount this instead of `Game` alone so dialogs and notifications
   * behave the way they do in the browser.
   */
  import Dialog from "$lib/components/Dialog.svelte";
  import Game from "$lib/components/Game.svelte";
  import Notifications from "$lib/components/Notifications.svelte";

  let {
    game_id,
    username,
    chrome = true,
  }: { game_id: string; username: string; chrome?: boolean } = $props();
</script>

{#if chrome}
  <Notifications />
  <Dialog />
{/if}
<Game {game_id} {username} />
