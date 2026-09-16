# Stash

Where Strategy Meets the Shuffle - Play Your Cards Wisely!

An UNO-like multiplayer card game client, built with SvelteKit and prerendered
to static files (SSG). The frontend talks to a small game server
(`src/lib/requests.ts`) which hands out per-player views of the game state.

## Routes

| route          | what it is                                                        |
| -------------- | ----------------------------------------------------------------- |
| `/`            | home: create a game, join one, help                               |
| `/game/<id>/`  | a table. Opening the link directly asks for a username first       |

A game is shared as `<origin>/game/<id>/`. The old hash form
(`<origin>/#<id>`) is gone.

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) on top of [Svelte 5](https://svelte.dev) (runes)
- [Vite 8](https://vite.dev) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) through `@tailwindcss/vite`
- `@sveltejs/adapter-static` — the whole site is prerendered (`prerender = true`)

`/game/<id>/` is the one dynamic route: the id only exists at runtime, so it is
not prerendered. Static hosts serve the generated `404.html` shell for it and
the client router renders the page from the URL (`prerender = false`,
`ssr = false` in `src/routes/game/[id]/+page.ts`).

## Scripts

```bash
npm install
npm run dev      # dev server (backend expected on http://localhost:4200)
npm run build    # SSG build into build/
npm run preview  # preview the built site
npm run check    # svelte-kit sync + svelte-check
npm test         # vitest: unit + component tests against a mock backend
npm run deploy   # publish build/ to the gh-pages branch
```

## Deploying

The site is published at <https://reold.github.io/stash/>, a project page, so
the build needs to know its base path:

```bash
BASE_PATH=/stash npm run build   # writes build/ with /stash/ prefixed links
```

`.github/workflows/deploy.yml` does that on every push to `main` and deploys
through GitHub Pages (set the repo's Pages source to "GitHub Actions" to use it).
`npm run deploy` publishes the same `build/` directory to the `gh-pages` branch
instead, which is how the site was published before.

## Layout

| path                              | what it is                                              |
| --------------------------------- | ------------------------------------------------------- |
| `src/routes/+layout.svelte`       | shell: progress bar, notifications, dialog, footer      |
| `src/routes/+page.svelte`         | home screen (create / join / help)                      |
| `src/routes/game/[id]/`           | table route + the join gate for direct links            |
| `src/lib/components/Game.svelte`  | table: hand, stash, opponents, polling loop             |
| `src/lib/components/Card.svelte`  | a single card                                           |
| `src/lib/card.ts`                 | card encoding (`[7:6]` type, `[5:4]` colour, `[3:0]` number) |
| `src/lib/state/`                  | shared state: session, dialog, notifications, progress   |
| `src/lib/utils/machine.ts`        | game state machine (load / initialise)                  |
| `src/lib/requests.ts`             | backend endpoints (prod backend in prod, localhost in dev) |
| `test/`                           | vitest suite: card encoding, requests, notifications, table |

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).
