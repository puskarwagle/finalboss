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

<main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">Quest Bot</h1>
      <p class="text-base-content/70">Automate your job search journey</p>
    </div>

    <!-- Login Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center mb-6">Welcome Back</h2>

        <form on:submit={handleLogin} class="space-y-4">
          {#if error}
            <div class="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          {/if}

          <!-- Email Field -->
          <div class="form-control">
            <label class="label" for="email">
              <span class="label-text">Email</span>
            </label>
            <input
              type="email"
              id="email"
              class="input input-bordered w-full"
              bind:value={email}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <!-- Password Field -->
          <div class="form-control">
            <label class="label" for="password">
              <span class="label-text">Password</span>
            </label>
            <input
              type="password"
              id="password"
              class="input input-bordered w-full"
              bind:value={password}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            class="btn btn-primary w-full"
            class:loading={loading}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <!-- Divider -->
          <div class="divider">OR</div>

          <!-- Google Login Button -->
          <button
            type="button"
            class="btn btn-outline w-full"
            class:loading={loading}
            on:click={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" class="mr-2">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </form>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center mt-6">
      <div class="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>New user? Contact your administrator for access.</span>
      </div>
    </div>
  </div>
</main>