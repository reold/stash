<script lang="ts">
  import { cardDisplayColor, cardLabel } from "$lib/card";

  let {
    id = undefined,
    index = 0,
    card,
    handleDropCard = undefined,
    class: extraClass = "",
    style: extraStyle = "",
  }: {
    id?: string;
    index?: number;
    card: number;
    handleDropCard?: (index: number, element?: HTMLElement) => void;
    class?: string;
    style?: string;
  } = $props();

  const label = $derived(cardLabel(card));
  const color = $derived(cardDisplayColor(card));
</script>

<button
  id={id ? id : `${card}`}
  aria-label="card {label}"
  class="h-[22vh] min-w-[15vh] max-w-[15vh] hover:scale-125 duration-100 rounded-md shadow-lg shadow-black {extraClass} ring-4 ring-white"
  style="text-shadow: 0.05em 0.05em 0em black; background-image: radial-gradient(circle, var(--{color}) 50%, hsl(var(--{color}-h), 50%, 50%));{extraStyle}"
  onclick={(event) => {
    if (handleDropCard) handleDropCard(index, event.currentTarget as HTMLElement);
  }}
>
  <svg
    class="h-max w-max"
    viewBox="0 0 101 147"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="0" width="100" height="150" rx="10" fill="--var({color})" />
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
      ><tspan text-anchor="middle" x="50" y="85">{label}</tspan></text
    >
    <text
      fill="white"
      xml:space="preserve"
      style="white-space: pre"
      font-family="Poppins"
      font-size="20"
      font-weight="900"
      letter-spacing="0em"
      ><tspan text-anchor="start" x="5" y="20">{label}</tspan></text
    >
    <text
      fill="white"
      xml:space="preserve"
      style="white-space: pre"
      font-family="Poppins"
      font-size="20"
      font-weight="900"
      letter-spacing="0em"
      ><tspan text-anchor="end" x="95" y="140">{label}</tspan></text
    >
  </svg></button
>
