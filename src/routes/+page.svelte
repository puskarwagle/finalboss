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

<main class="page page--centered">
  <h1 class="section__title">Redirecting...</h1>
  <p class="text--center">Please wait while we redirect you.</p>
</main>