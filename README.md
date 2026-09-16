# Stash

Where Strategy Meets the Shuffle - Play Your Cards Wisely!

An UNO-like multiplayer card game client. The frontend talks to a small game
server (`src/requests.ts`) which hands out per-player views of the game state.

## Stack

- [Svelte 5](https://svelte.dev) (runes: `$state`, `$derived`, `$effect`, `$props`)
- [Vite 8](https://vite.dev) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) through `@tailwindcss/vite`

## Scripts

```bash
npm install
npm run dev      # dev server (backend expected on http://localhost:4200)
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run check    # svelte-check + tsc
npm run deploy   # publish dist/ to the gh-pages branch
```

## Layout

| path                        | what it is                                                    |
| --------------------------- | ------------------------------------------------------------- |
| `src/App.svelte`            | shell: home screen, dialog (create/join/colour pick), toasts   |
| `src/Game.svelte`           | table: hand, stash, opponents, polling loop                    |
| `src/Card.svelte`           | a single card (colour/type decoded from a bitfield)            |
| `src/card.ts`               | card encoding helpers (`[7:6]` type, `[5:4]` colour, `[3:0]` number) |
| `src/store.svelte.ts`       | shared state (`page`, notifications)                           |
| `src/utils/machine.ts`      | game state machine (load / initialise)                         |
| `src/utils/anim.ts`         | requestAnimationFrame tween used by the card-drop animation     |
| `src/requests.ts`           | backend endpoints (prod backend in prod, localhost in dev)     |

A game id can be shared as `https://reold.github.io/#<game id>`; opening that
link prefills the join dialog.

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).
