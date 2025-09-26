<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.js';
  import { page } from '$app/stores';

  let email = '';
  let password = '';
  let error = '';

  $: loading = $auth.loading;

  // Update auth session from page data
  $: if ($page.data?.session) {
    auth.updateSession($page.data.session);
    if ($page.data.session?.user) {
      goto('/app');
    }
  }

  // Check for authentication on mount
  import { onMount } from 'svelte';
  onMount(() => {
    // Check if user is already logged in via Auth.js
    if ($page.data?.session?.user) {
      goto('/app');
    }
  });

  async function handleLogin(event) {
    event.preventDefault();
    error = '';

    const result = await auth.login(email, password);

    if (result.success) {
      goto('/app');
    } else {
      error = result.error;
    }
  }

  async function handleGoogleLogin() {
    error = '';

    // Proceed with Google login
    const result = await auth.loginWithGoogle();
    if (result && !result.success) {
      error = result.error;
    }
  }
</script>

<style>
  .login-container {
    min-height: 80vh;
  }
  
  .form-group {
    margin-bottom: var(--space-lg);
  }
  
  .get-started-link {
    display: inline-block;
    margin-top: var(--space-xl);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    text-decoration: none;
    border: 2px solid var(--color-primary);
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-sm);
    transition: var(--transition-normal);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }
  
  .get-started-link:hover {
    background: var(--color-primary);
    color: var(--color-black);
    box-shadow: var(--shadow-glow);
  }

  .google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: white !important;
    color: #757575 !important;
    border: 2px solid #dadce0 !important;
    font-weight: 500;
  }

  .google-btn:hover {
    background: #f8f9fa !important;
    border-color: #c4c7c5 !important;
    box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  }

  .google-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

<main class="page page--centered section__container login-container">
  <h1 class="section__title">Welcome to Quest Bot</h1>
  
  <div class="card" style="width: 100%; max-width: 450px;">
    <form on:submit={handleLogin}>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      
      <div class="form-group">
        <label class="form-label" for="email">
          <span class="form-label__text">Email</span>
          <input 
            type="email" 
            id="email" 
            class="form-input"
            bind:value={email}
            placeholder="Enter your email"
            required
            disabled={loading}
          >
        </label>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="password">
          <span class="form-label__text">Password</span>
          <input 
            type="password" 
            id="password" 
            class="form-input"
            bind:value={password}
            placeholder="Enter your password"
            required
            disabled={loading}
          >
        </label>
      </div>
      
      <button type="submit" class="btn btn--primary btn--large" style="width: 100%;" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div style="margin: var(--space-lg) 0; text-align: center; color: var(--color-text-secondary);">
        or
      </div>

      <button
        type="button"
        class="btn btn--secondary btn--large google-btn"
        style="width: 100%;"
        on:click={handleGoogleLogin}
        disabled={loading}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" style="margin-right: 8px;">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>
    </form>
  </div>

  <a href="/login" class="get-started-link">New User? Contact Admin</a>
</main>