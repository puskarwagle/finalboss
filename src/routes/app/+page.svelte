<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Check authentication on mount
  onMount(() => {
    if (!$page.data?.session?.user) {
      goto('/login');
    }
  });

  $: user = $page.data?.session?.user;

  function navigateTo(path) {
    goto(path);
  }
</script>

<style>
  .app-container {
    min-height: 80vh;
  }

  .welcome-section {
    text-align: center;
    margin-bottom: var(--space-xl);
    padding: var(--space-xl) 0;
    background: linear-gradient(45deg, var(--bg-primary), #001100);
    border-radius: var(--radius-lg);
  }

  .user-greeting {
    font-size: var(--font-size-xl);
    color: var(--color-primary);
    margin-bottom: var(--space-md);
    font-weight: var(--font-weight-bold);
  }

  .user-email {
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
  }

  .app-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-lg);
    max-width: 1000px;
    margin: 0 auto;
  }

  .app-card {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    text-align: center;
    transition: var(--transition-normal);
    cursor: pointer;
  }

  .app-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-glow);
    transform: translateY(-2px);
  }

  .app-icon {
    font-size: 3rem;
    margin-bottom: var(--space-md);
    display: block;
  }

  .app-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    margin-bottom: var(--space-sm);
  }

  .app-description {
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
</style>

<main class="page app-container">
  {#if user}
    <div class="app-grid">
      <div class="app-card" on:click={() => navigateTo('/choose-bot')} on:keydown={(e) => e.key === 'Enter' && navigateTo('/choose-bot')} role="button" tabindex="0">
        <div class="app-icon">🤖</div>
        <h2 class="app-title">Choose Bot</h2>
        <p class="app-description">
          Select and configure your automation bot for job searching across different platforms
        </p>
      </div>

      <div class="app-card" on:click={() => navigateTo('/frontend-form')} on:keydown={(e) => e.key === 'Enter' && navigateTo('/frontend-form')} role="button" tabindex="0">
        <div class="app-icon">⚙️</div>
        <h2 class="app-title">Configuration</h2>
        <p class="app-description">
          Set up your preferences, filters, and automation settings for optimal job searching
        </p>
      </div>

      <div class="app-card" on:click={() => navigateTo('/backend-analytics')} on:keydown={(e) => e.key === 'Enter' && navigateTo('/backend-analytics')} role="button" tabindex="0">
        <div class="app-icon">📊</div>
        <h2 class="app-title">Analytics</h2>
        <p class="app-description">
          View detailed reports on your job applications, success rates, and performance metrics
        </p>
      </div>

      <div class="app-card" on:click={() => navigateTo('/testfunctions')} on:keydown={(e) => e.key === 'Enter' && navigateTo('/testfunctions')} role="button" tabindex="0">
        <div class="app-icon">🧪</div>
        <h2 class="app-title">Test Functions</h2>
        <p class="app-description">
          Test and debug your automation settings before running full job search campaigns
        </p>
      </div>
    </div>
  {:else}
    <div style="text-align: center; padding: var(--space-xl);">
      <h2>Please log in to access the application</h2>
      <a href="/login" class="btn btn--primary">Go to Login</a>
    </div>
  {/if}
</main>