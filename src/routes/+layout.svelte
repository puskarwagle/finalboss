<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.js';
  import '../app.css';
  
  onMount(() => {
    auth.checkAuth();
  });
</script>

<nav class="nav">
  <div class="nav__logo">
    <a href="/">Quest Bot</a>
  </div>
  <div class="nav__links">
    <a href="/">Home</a>
    <a href="/choose-bot">Choose Bot</a>
    {#if $auth.isLoggedIn}
      <span class="nav__user-info">Welcome, {$auth.user?.name || $auth.user?.email}</span>
      <button class="btn btn--danger" on:click={() => auth.logout()}>Logout</button>
    {:else}
      <a href="/login">Login</a>
    {/if}
    <a href="/control-bar">Control Bar</a>
    <a href="/frontend-form">Configuration</a>
    <a href="/backend-analytics">Analytics</a>
    <a href="/testfunctions">Test Functions</a>
  </div>
</nav>

<main>
  <slot></slot>
</main>

<style>
  .nav__user-info {
    color: var(--color-primary);
    padding: var(--space-sm) var(--space-md);
    margin: 0 var(--space-sm);
    font-size: var(--font-size-sm);
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }
  
  .nav__links {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }
  
  @media (max-width: 768px) {
    .nav__links {
      flex-direction: column;
      gap: var(--space-xs);
    }
    
    .nav {
      flex-direction: column;
      padding: var(--space-md);
    }
  }
</style>