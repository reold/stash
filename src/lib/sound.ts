import pingUrl from "$lib/assets/ping.wav";

let audio: HTMLAudioElement | null = null;

function getPing(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(pingUrl);
  }
  return audio;
}

export const sounds = {
  interactive: {
    get ping() {
      return getPing() ?? { play: () => {} };
    },
  },
};
