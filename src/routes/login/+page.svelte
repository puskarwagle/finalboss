<script>
  import { onMount } from 'svelte';
  import { authService } from '$lib/authService.js';

  let mode = 'login'; // 'login' or 'signup'
  let email = '';
  let password = '';
  let name = '';
  let error = '';
  let loading = false;

  // Clear any existing auth state when landing on login page
  onMount(() => {
    if ($authService.isLoggedIn) {
      // Clear auth without redirecting (we're already on login page)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('refreshToken');
      // Re-initialize authService to update state
      authService.initialize();
    }
  });

  function switchMode() {
    mode = mode === 'login' ? 'signup' : 'login';
    error = '';
    password = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (!email || !email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    if (!password || password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;

    let result;
    if (mode === 'signup') {
      result = await authService.signup(email, password, name || email.split('@')[0]);
    } else {
      result = await authService.login(email, password);
    }

    if (!result.success) {
      error = result.error || `${mode === 'signup' ? 'Signup' : 'Login'} failed. Please try again.`;
      loading = false;
    }
    // On success, the authService will automatically redirect to '/app'
  }
</script>

<svelte:head>
  <title>{mode === 'signup' ? 'Sign Up' : 'Login'} - Finalboss Job Application Assistant</title>
</svelte:head>

<main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">Finalboss</h1>
      <p class="text-base-content/70">AI-Powered Job Application Assistant</p>
    </div>

    <!-- Auth Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Tabs -->
        <div role="tablist" class="tabs tabs-boxed mb-6">
          <button
            role="tab"
            class="tab"
            class:tab-active={mode === 'login'}
            on:click={() => { mode = 'login'; error = ''; }}
          >
            Login
          </button>
          <button
            role="tab"
            class="tab"
            class:tab-active={mode === 'signup'}
            on:click={() => { mode = 'signup'; error = ''; }}
          >
            Sign Up
          </button>
        </div>

        {#if error}
          <div class="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        {/if}

        <!-- Auth Form -->
        <form on:submit={handleSubmit} class="space-y-4">
          {#if mode === 'signup'}
            <div class="form-control">
              <label class="label" for="name">
                <span class="label-text">Name (optional)</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Your Name"
                class="input input-bordered w-full"
                bind:value={name}
                disabled={loading}
              />
            </div>
          {/if}

          <div class="form-control">
            <label class="label" for="email">
              <span class="label-text">Email Address</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              class="input input-bordered w-full"
              bind:value={email}
              disabled={loading}
              required
            />
          </div>

          <div class="form-control">
            <label class="label" for="password">
              <span class="label-text">Password</span>
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              class="input input-bordered w-full"
              bind:value={password}
              disabled={loading}
              required
              minlength="8"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-sm"></span>
              {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
            {:else}
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            {/if}
          </button>
        </form>

        <!-- Switch mode link -->
        <div class="text-center mt-4">
          <p class="text-sm text-base-content/70">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              class="link link-primary"
              on:click={switchMode}
              disabled={loading}
            >
              {mode === 'login' ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>

        <!-- Info Box -->
        <div class="bg-base-200 rounded-lg p-4 text-sm mt-4">
          <div class="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="font-semibold mb-1">Secure Authentication</p>
              <p class="text-base-content/70">
                {mode === 'signup'
                  ? 'Create an account with your email and password. Your password is securely encrypted.'
                  : 'Sign in with your email and password to access your job applications.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center mt-8 text-sm text-base-content/60">
      <p>Your streamlined job application journey starts here.</p>
    </div>
  </div>
</main>

<style>
  /* You can add component-specific styles here if needed */
</style>
