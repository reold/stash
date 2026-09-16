import pingInteractive from "$lib/assets/sound/ping.wav";

/**
 * The audio element used to be created at module scope, which meant merely
 * importing this module on the server (SSR / prerender) blew up because there
 * is no `Audio` in node. It is created on first use instead.
 */
let ping: HTMLAudioElement | undefined;

export const playInteractivePing = () => {
  if (typeof Audio === "undefined") return;

  ping ??= new Audio(pingInteractive);

  // browsers may reject autoplay (not an error worth surfacing) and some
  // implementations do not return a promise from play() at all
  const started = ping.play() as Promise<void> | undefined;
  started?.catch(() => {});
};
