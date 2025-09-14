<script lang="ts">
  function navigateTo(path: string): void {
    window.location.href = path;
  }
</script>

<style>
  main {
    background: linear-gradient(45deg, var(--bg-primary), #001100);
  }
</style>


<main class="page page--centered">
  <h1 class="section__title">Quest Bot</h1>
  <p class="text--center mb-xl" style="font-size: var(--font-size-lg); color: var(--color-primary-dark);">Welcome to your automation platform</p>
  
  <div class="grid grid--3" style="max-width: 800px;">
    <button class="btn btn--outline" on:click={() => navigateTo('/choose-bot')}>Choose Bot</button>
    <button class="btn btn--outline" on:click={() => navigateTo('/welcome')}>Login</button>
    <button class="btn btn--outline" on:click={() => navigateTo('/control-bar')}>Control Bar</button>
    <button class="btn btn--outline" on:click={() => navigateTo('/frontend-form')}>Configuration</button>
    <button class="btn btn--outline" on:click={() => navigateTo('/backend-analytics')}>Analytics</button>
  </div>
</main>