/**
 * jsdom is missing a few browser APIs that Svelte (transitions) and the app
 * (requestAnimationFrame tweens) rely on.
 */
import { vi } from "vitest";

// Svelte transitions use the Web Animations API
Element.prototype.animate ??= function () {
  const animation = {
    playState: "running" as const,
    currentTime: 0,
    effect: null,
    onfinish: null as null | (() => void),
    cancel() {},
    finish() {},
  };

  setTimeout(() => animation.onfinish?.(), 0);
  return animation as unknown as Animation;
} as Element["animate"];

// one clock for animation frames and performance.now()
let nextFrame = 0;
globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
  setTimeout(() => callback(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = ((handle: number) =>
  clearTimeout(handle)) as typeof cancelAnimationFrame;

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
})) as typeof matchMedia;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// not implemented by jsdom
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: vi.fn(() => Promise.resolve()) },
});

vi.stubGlobal("scrollTo", () => {});
