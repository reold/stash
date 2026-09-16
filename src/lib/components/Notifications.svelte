<script lang="ts">
  import {
    dismissNotification,
    notifications,
  } from "$lib/state/notifications.svelte";

  /**
   * Notifications used to be appended to the DOM from a store subscription.
   * Now the queue is rendered and every notification schedules its own removal.
   */
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  $effect(() => {
    for (const notification of notifications.queue) {
      if (timers.has(notification.id)) continue;

      timers.set(
        notification.id,
        setTimeout(() => {
          timers.delete(notification.id);
          dismissNotification(notification.id);
        }, notification.dur)
      );
    }
  });
</script>

<div
  class="absolute w-full min-h-[5vh] pt-[2vh] flex flex-col-reverse justify-center items-center z-30"
>
  {#each notifications.queue as notification (notification.id)}
    <p
      class="animate-pulse opacity-75 min-w-[10vw] max-w-[80vw] bg-gray-950 font-pop text-semibold text-white ring-2 ring-gray-900 mb-2 p-1 text-center rounded-md text-sm"
    >
      {#each notification.nodes as node}
        {#if typeof node === "string"}{node}{:else}<b>{node.bold}</b>{/if}
      {/each}
    </p>
  {/each}
</div>
