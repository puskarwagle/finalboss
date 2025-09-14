<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.js';
  
  let email = '';
  let password = '';
  let error = '';

  $: loading = $auth.loading;

  async function handleLogin(event) {
    event.preventDefault();
    error = '';

    const result = await auth.login(email, password);
    
    if (result.success) {
      goto('/choose-bot');
    } else {
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
    </form>
  </div>

  <a href="/choose-bot" class="get-started-link">Or Get Started</a>
</main>