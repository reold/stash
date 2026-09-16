import { cubicInOut } from "svelte/easing";
import { animate } from "$lib/utils/anim";

/** 0 - 100, rendered by $lib/components/ProgressBar.svelte */
export const progress = $state({ value: 0 });

const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

// every new tween cancels the previous one by bumping this token
let token = 0;

const tweenTo = (value: number, duration: number) => {
  const current = ++token;
  const from = progress.value;

  return animate(
    [from],
    [clamp(value)],
    { duration, easing: cubicInOut },
    ([next]) => {
      if (current === token) progress.value = next;
    }
  );
};

export const progressBar = {
  /** jump to zero without animating */
  zero() {
    token++;
    progress.value = 0;
  },
  set(value: number) {
    tweenTo(value, 100);
  },
  async complete() {
    await tweenTo(100, 100);
    progressBar.zero();
  },
};
