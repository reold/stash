<script lang="ts">
  import { fade } from "svelte/transition";

  import { cardHelper } from "./card";

  export let id: string = undefined;
  export let index: number = 0;
  export let card: number;
  export let isDropping: boolean = false;
  export let handleDropCard = undefined;
  export let exitAnim: boolean = true;

  let extraStyle = "";
  let extraClass = "";
  export { extraStyle as style, extraClass as class };

  let parsed = { number: 404, color: "nocolor", type: "number", display: "" };

  $: {
    parsed.number = cardHelper.parseNumber(card);
    parsed.type = cardHelper.parseType(card);

    if (parsed.type == "number") {
      parsed.display = `${parsed.number}`;
    } else if (parsed.type == "plus2") {
      parsed.display = "+2";
    } else if (parsed.type == "plus4") {
      parsed.display = "+4";
    } else if (parsed.type == "reverse") {
      parsed.display = "rev";
    }

    if (parsed.number == 15 || parsed.type != "plus4")
      parsed.color = cardHelper.parseColor(card);
    else {
      parsed.color = "nocolor";
    }
  }
</script>

<button
  out:fade={{ duration: exitAnim ? 500 : 0 }}
  id={id ? id : `${card}`}
  class="h-[22vh] min-w-[15vh] max-w-[15vh] hover:scale-125 duration-100 rounded-md shadow-lg shadow-black {extraClass} ring-4 ring-white"
  style="visibility: {isDropping
    ? 'hidden'
    : 'visible'}; text-shadow: 0.05em 0.05em 0em black; background-image: radial-gradient(circle, var(--{parsed.color}) 50%, hsl(var(--{parsed.color}-h), 50%, 50%));{extraStyle}"
  on:click={() => {
    if (handleDropCard) handleDropCard(index);
  }}
>
  <svg
    class="h-max w-max"
    viewBox="0 0 101 147"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="0" width="100" height="150" rx="10" fill="--var({parsed.color})" />
    <ellipse
      cx="50"
      cy="75"
      rx="55"
      ry="40"
      transform="rotate(-45 50 73)"
      stroke="white"
      stroke-width="5"
    />
    <text
      fill="white"
      xml:space="preserve"
      style="white-space: pre"
      font-family="Poppins"
      font-size="36"
      font-weight="900"
      letter-spacing="0em"
      ><tspan text-anchor="middle" x="50" y="85">{parsed.display}</tspan></text
    >
    <text
      fill="white"
      xml:space="preserve"
      style="white-space: pre"
      font-family="Poppins"
      font-size="20"
      font-weight="900"
      letter-spacing="0em"
      ><tspan text-anchor="start" x="5" y="20">{parsed.display}</tspan></text
    >
    <text
      fill="white"
      xml:space="preserve"
      style="white-space: pre"
      font-family="Poppins"
      font-size="20"
      font-weight="900"
      letter-spacing="0em"
      ><tspan text-anchor="end" x="95" y="140">{parsed.display}</tspan></text
    >
  </svg></button
>
<!-- 
<button
  out:fade={{ duration: exitAnim ? 500 : 0 }}
  id={id ? id : `${card}`}
  class="h-[22vh] min-w-[15vh] max-w-[15vh] text-5xl text-center flex flex-col justify-center items-center hover:scale-125 duration-100 rounded-md shadow-md shadow-black {extraClass}"
  style="visibility: {isDropping
    ? 'hidden'
    : 'visible'}; text-shadow: 0.05em 0.05em 0.1em black; background-color: var(--{parsed.color});"
  on:click={() => {
    if (handleDropCard) handleDropCard(index);
  }}
>
  {#if parsed.type == "number"}
    <div class="w-full">
      {parsed.number}

      <p class="text-xs">
        {card.toString(2)}
      </p>
    </div>
  {:else if parsed.type == "plus2"}
    <div class="w-full">
      +2
      <p class="text-xs">
        {card.toString(2)}
      </p>
    </div>
  {:else if parsed.type == "plus4"}
    <div class="w-full">
      +4
      <p class="text-xs">
        {card.toString(2)}
      </p>
    </div>
  {:else if parsed.type == "reverse"}
    <div class="w-full">
      rev
      <p class="text-xs">
        {card.toString(2)}
      </p>
    </div>
  {/if}
</button> -->
