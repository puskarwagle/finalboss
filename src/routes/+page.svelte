<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect based on authentication status
    if ($page.data?.session?.user) {
      goto('/app');
    } else {
      goto('/login');
    }
  });
</script>

<main class="hero min-h-screen bg-base-200">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">Redirecting...</h1>
      <p class="py-6">Please wait while we redirect you.</p>
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</main>