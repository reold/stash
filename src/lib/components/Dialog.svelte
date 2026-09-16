<script lang="ts">
  import { dialog, dismissDialog } from "$lib/state/dialog.svelte";

  const isColorSelect = $derived(
    dialog.form.some((entry) => entry.type == "colorselect")
  );
</script>

<div
  style="visibility: {dialog.open ? 'visible' : 'hidden'}"
  class="absolute w-full h-screen p-1 flex flex-col justify-center items-center z-10"
>
  <button
    class="absolute inset-0 backdrop-blur-md cursor-default"
    aria-label="close dialog"
    onclick={dismissDialog}
  ></button>

  <div
    role="dialog"
    aria-modal="true"
    aria-label="Complete to continue"
    class="relative bg-gray-900 ring-1 text-sm rounded-sm ring-gray-500 flex flex-col justify-center items-center space-y-2 p-2 cursor-text text-md max-w-[50vh] max-sm:max-w-[85vw]"
  >
    <b class="mb-1 text-lg">Complete to continue</b>
    {#if dialog.form}
      {#each dialog.form as entry}
        {#if entry.type == "range"}
          <div class="rounded-md p-1 bg-gray-800 w-full grid grid-cols-3 items-center space-x-2">
            <p>
              {entry.name}
              <span
                class="px-0.5 h-min {entry.value == entry.max ? 'bg-orange-600' : 'bg-blue-600'} rounded-md font-black transition-colors duration-1000"
                >{entry.value}{entry.value == entry.max ? " max" : ""}</span
              >
            </p>
            <input type="range" name={entry.name} bind:value={entry.value} min={entry.min} max={entry.max} class="col-span-2 p-1" />
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
        {#if dialog.promise && !isColorSelect}
          <button class="bg-green-600 p-2 rounded-sm mt-2" onclick={() => dialog.promise?.resolve()}>continue</button>
        {/if}
        <button class="bg-gray-500 p-2 rounded-sm mt-2" onclick={dismissDialog}>close</button>
      </div>
    {/if}
  </div>
</div>
