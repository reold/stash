import { cubicInOut } from "svelte/easing";

/**
 * Minimal requestAnimationFrame tween for plain numeric arrays.
 *
 * Svelte 5's `Tween` class is not a store anymore (no `.subscribe`), and effects
 * cannot be created from inside an async callback, so the fake-card drop
 * animation is driven by hand. Semantics match the old `svelte/motion` tween:
 * linearly interpolated values passed through `easing(t)` once per frame.
 */
export const animate = (
  from: number[],
  to: number[],
  options: { duration?: number; easing?: (t: number) => number },
  onUpdate: (value: number[]) => void
): Promise<void> => {
  const { duration = 400, easing = cubicInOut } = options;

  return new Promise((resolve) => {
    const start = performance.now();

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = easing(t);

      onUpdate(from.map((value, index) => value + (to[index] - value) * eased));

      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };

    requestAnimationFrame(tick);
  });
};
