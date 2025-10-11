<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { CorpusRagAuth } from '$lib/corpus-rag-auth.js';

  let error = '';
  let loading = false;
  let isAuthenticated = false;

  onMount(async () => {
    // Check if already logged in
    const user = await CorpusRagAuth.verifySession();
    if (user) {
      isAuthenticated = true;
      goto('/app');
    }

    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
      error = getErrorMessage(params.get('error'));
    }
  });

  function getErrorMessage(code) {
    const messages = {
      'oauth_failed': 'Google authentication failed. Please try again.',
      'auth_failed': 'Authentication failed. Please try again.',
      'missing_params': 'Invalid authentication response.',
      'access_denied': 'Access denied. Your email is not authorized. Contact an administrator.',
      'token_exchange_failed': 'Failed to exchange authorization code. Please try again.',
      'userinfo_failed': 'Failed to get user information from Google.',
      'login_failed': 'Login to system failed. Please try again.'
    };
    return messages[code] || 'An error occurred. Please try again.';
  }

  function handleGoogleLogin() {
    error = '';
    loading = true;
    
    try {
      // Initiate OAuth flow
      CorpusRagAuth.initiateLogin();
    } catch (err) {
      loading = false;
      error = 'Failed to start login process. Please try again.';
      console.error('Login error:', err);
    }
  }
</script>

<svelte:head>
  <title>Login - Finalboss Job Application Assistant</title>
</svelte:head>

<main class="min-h-screen bg-base-200 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">Finalboss</h1>
      <p class="text-base-content/70">AI-Powered Job Application Assistant</p>
    </div>

    <!-- Login Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center mb-6">Welcome</h2>

        {#if error}
          <div class="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        {/if}

        <div class="space-y-4">
          <!-- Google Login Button -->
          <button
            type="button"
            class="btn btn-primary w-full text-white"
            class:loading={loading}
            on:click={handleGoogleLogin}
            disabled={loading}
          >
            {#if !loading}
              <svg width="20" height="20" viewBox="0 0 24 24" class="mr-2">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            {/if}
            {loading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <!-- Info Box -->
          <div class="bg-base-200 rounded-lg p-4 text-sm">
            <div class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-semibold mb-1">Secure Login via Google</p>
                <p class="text-base-content/70">
                  Your Google account is used to securely access AI-powered job application tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="mt-8 grid grid-cols-1 gap-4">
      <div class="bg-base-100 rounded-lg p-4 shadow">
        <div class="flex items-center gap-3">
          <div class="text-primary text-2xl">📝</div>
          <div>
            <h3 class="font-semibold">AI Cover Letters</h3>
            <p class="text-sm text-base-content/70">Tailored to each job</p>
          </div>
        </div>
      </div>

      <div class="bg-base-100 rounded-lg p-4 shadow">
        <div class="flex items-center gap-3">
          <div class="text-primary text-2xl">📄</div>
          <div>
            <h3 class="font-semibold">Optimized Resumes</h3>
            <p class="text-sm text-base-content/70">Match job requirements</p>
          </div>
        </div>
      </div>

      <div class="bg-base-100 rounded-lg p-4 shadow">
        <div class="flex items-center gap-3">
          <div class="text-primary text-2xl">🤖</div>
          <div>
            <h3 class="font-semibold">Auto-Application</h3>
            <p class="text-sm text-base-content/70">LinkedIn, Seek, Indeed bots</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center mt-8 text-sm text-base-content/60">
      <p>Powered by Corpus-RAG AI</p>
    </div>
  </div>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>
