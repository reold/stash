<script lang="ts">
  import { progress } from "$lib/state/progress.svelte";
</script>

<div
  class="z-20 fixed top-0 left-0 h-[2px] bg-cyan-600"
  style="width: {progress.value}vw;"
></div>
