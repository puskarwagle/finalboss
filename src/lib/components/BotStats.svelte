<script>
  export let botName = '';
  export let currentStep = 'Initializing...';
  export let totalJobs = 0;
  export let jobsProcessed = 0;
  export let appliedJobs = 0;
  export let skippedJobs = 0;
  export let isExpanded = true;
  export let onStop = () => {};

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  // Format bot name for display
  $: displayName = botName.replace('_bot', '').replace('_', ' ').toUpperCase();

  // Calculate progress percentage
  $: progressPercent = totalJobs > 0 ? Math.round((jobsProcessed / totalJobs) * 100) : 0;
</script>

<div class="card bg-base-200 shadow-lg border-2 border-primary mb-4">
  <!-- Header - Always Visible -->
  <div class="card-body p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 flex-1">
        <div class="avatar placeholder">
          <div class="bg-primary text-primary-content rounded-full w-10">
            <span class="text-xl">🤖</span>
          </div>
        </div>

        <div class="flex-1">
          <h3 class="font-bold text-lg">{displayName}</h3>
          <p class="text-sm text-base-content/70">{currentStep}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Stop Button -->
        <button
          class="btn btn-error btn-sm btn-circle"
          on:click={onStop}
          title="Stop bot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Expand/Collapse Button -->
        <button
          class="btn btn-ghost btn-sm btn-circle"
          on:click={toggleExpand}
          title={isExpanded ? "Minimize" : "Expand"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform duration-200"
            class:rotate-180={!isExpanded}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Expanded Stats Section -->
    {#if isExpanded}
      <div class="divider my-2"></div>

      <!-- Progress Bar -->
      <div class="mb-4">
        <div class="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span class="font-semibold">{jobsProcessed} / {totalJobs} jobs</span>
        </div>
        <progress
          class="progress progress-primary w-full"
          value={jobsProcessed}
          max={totalJobs}
        ></progress>
        <div class="text-right text-xs text-base-content/60 mt-1">{progressPercent}%</div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Total Jobs Found -->
        <div class="stat bg-base-100 rounded-lg p-3 text-center">
          <div class="stat-title text-xs">Found</div>
          <div class="stat-value text-2xl text-info">{totalJobs}</div>
        </div>

        <!-- Applied Jobs -->
        <div class="stat bg-base-100 rounded-lg p-3 text-center">
          <div class="stat-title text-xs">Applied</div>
          <div class="stat-value text-2xl text-success">{appliedJobs}</div>
        </div>

        <!-- Skipped Jobs -->
        <div class="stat bg-base-100 rounded-lg p-3 text-center">
          <div class="stat-title text-xs">Skipped</div>
          <div class="stat-value text-2xl text-warning">{skippedJobs}</div>
        </div>
      </div>

      <!-- Activity Indicator -->
      <div class="flex items-center justify-center gap-2 mt-4 text-sm">
        <span class="loading loading-spinner loading-sm text-primary"></span>
        <span class="text-base-content/70">Bot is running...</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
