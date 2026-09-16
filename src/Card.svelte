<script lang="ts">
  import { fade } from "svelte/transition";

  import { cardHelper } from "./card";

  let {
    id = undefined,
    index = 0,
    card,
    isDropping = false,
    handleDropCard = undefined,
    exitAnim = true,
    class: extraClass = "",
    style: extraStyle = "",
  }: {
    id?: string;
    index?: number;
    card: number;
    isDropping?: boolean;
    handleDropCard?: (index: number) => void;
    exitAnim?: boolean;
    class?: string;
    style?: string;
  } = $props();

  const parsed = $derived.by(() => {
    const number = cardHelper.parseNumber(card);
    const type = cardHelper.parseType(card);

    let display = "";

    if (type == "number") {
      display = `${number}`;
    } else if (type == "plus2") {
      display = "+2";
    } else if (type == "plus4") {
      display = "+4";
    } else if (type == "reverse") {
      display = "rev";
    }

    const color =
      number == 15 || type != "plus4" ? cardHelper.parseColor(card) : "nocolor";

    return { number, color, type, display };
  });
</script>

<button
  out:fade={{ duration: exitAnim ? 500 : 0 }}
  id={id ? id : `${card}`}
  class="h-[22vh] min-w-[15vh] max-w-[15vh] hover:scale-125 duration-100 rounded-md shadow-lg shadow-black {extraClass} ring-4 ring-white"
  style="visibility: {isDropping
    ? 'hidden'
    : 'visible'}; text-shadow: 0.05em 0.05em 0em black; background-image: radial-gradient(circle, var(--{parsed.color}) 50%, hsl(var(--{parsed.color}-h), 50%, 50%));{extraStyle}"
  onclick={() => {
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
