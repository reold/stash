<script lang="ts">
  import { cubicInOut } from "svelte/easing";

  import Card from "./Card.svelte";
  import { animate } from "$lib/utils/anim";

  /**
   * The card that visually travels from the hand to the drop zone.
   *
   * This used to be a `cloneNode` of the hand card, looked up by id, appended
   * to the playground and driven by numbers parsed out of a `style.transform`
   * string. It is a component now: it is handed the measured rectangles of the
   * two places it travels between and animates itself. No DOM lookups, no
   * string parsing, and it cannot get out of sync with the hand.
   */
  let {
    card,
    from,
    to,
    origin,
  }: { card: number; from: DOMRect; to: DOMRect; origin: DOMRect } = $props();

  // measured rectangles, relative to the playground this card is dropped into
  const start = $derived([from.left - origin.left, from.top - origin.top]);
  const end = $derived([to.left - origin.left, to.top - origin.top]);

  let x = $state(0);
  let y = $state(0);
  let rotation = $state(0);

  $effect(() => {
    const [fx, fy] = start;
    const [tx, ty] = end;

    animate(
      [fx, fy, 0],
      [tx, ty, 0],
      { duration: 1500, easing: cubicInOut },
      ([nextX, nextY, nextRotation]) => {
        x = nextX;
        y = nextY;
        rotation = nextRotation;
      }
    );
  });
</script>

<div
  class="absolute pointer-events-none"
  data-testid="flying-card"
  style="left: {x}px; top: {y}px; transform: rotate({rotation}deg);"
>
  <Card {card} class="ring-white" />
</div>
