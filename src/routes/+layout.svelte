<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import favicon from "$lib/assets/stash.svg";

  let { children } = $props();

  const fallbackTitle = $derived.by(() => {
    const path = page.url.pathname;
    if (path.startsWith("/game")) return "Game - Stash";
    return "Stash";
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="theme-color" content="#1e1b4b" />
  <title>{fallbackTitle}</title>
</svelte:head>

{@render children()}
