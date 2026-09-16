<script lang="ts">
  import "../app.css";

  import Dialog from "$lib/components/Dialog.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Notifications from "$lib/components/Notifications.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <title>Stash</title>
  <meta
    name="description"
    content="Where Strategy Meets the Shuffle - Play Your Cards Wisely!"
  />
</svelte:head>

<div class="w-full h-[100vh] relative overflow-hidden">
  <Notifications />
  <ProgressBar />
  <Dialog />
  {@render children()}
  <Footer />
</div>
