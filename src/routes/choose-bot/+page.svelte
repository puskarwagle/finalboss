<script>
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';
  import BotStats from '$lib/components/BotStats.svelte';

  // Dynamic bot list
  let bots = [
    {
      name: 'seek_bot',
      description: 'Automate job searching on Seek.com.au with advanced filtering and application features',
      image: '/seek-logo.png'
    }
  ];

  // Load available bots on mount
  onMount(async () => {
    try {
      // Try to get bots dynamically - if this fails, keep the static list
      const availableBots = await invoke('get_available_bots');
      if (availableBots && availableBots.length > 0) {
        bots = availableBots.map(botName => ({
          name: `${botName}_bot`,
          description: `Automate job searching on ${botName}`,
          image: `/${botName}-logo.png`
        }));
      }
    } catch (error) {
      console.log('Using static bot list (dynamic discovery not available)');
      // Keep the static bot list as fallback
    }
  });

  // Running bots tracking - supports multiple concurrent bots
  let runningBots = [];

  function closeStatusMessage() {
    // This function is no longer needed as we use BotStats component
  }

  function handleBotClick(botName) {
    // Check if this bot is already running
    const alreadyRunning = runningBots.some(bot => bot.name === botName);
    if (alreadyRunning) return; // Prevent multiple instances of same bot

    // Directly run the bot - no browser selection needed
    runBot(botName);
  }

  function buildArgs(botName) {
    // Convert bot names: seek_bot -> seek, linkedin_bot -> linkedin, indeed_bot -> indeed
    const cleanBotName = botName.replace('_bot', '');

    // New bot_starter.ts only needs the bot name
    return [cleanBotName];
  }

  function isBotRunning(botName) {
    return runningBots.some(bot => bot.name === botName);
  }

  function stopBot(botName) {
    console.log(`Stopping ${botName}...`);
    // TODO: Implement actual bot stop functionality
    // For now, just remove from running list
    runningBots = runningBots.filter(bot => bot.name !== botName);
  }

  async function runBot(botName) {
    try {
      // Add bot to running list with initial stats
      const botStats = {
        name: botName,
        currentStep: 'Starting...',
        totalJobs: 0,
        jobsProcessed: 0,
        appliedJobs: 0,
        skippedJobs: 0,
        isExpanded: true
      };
      runningBots = [...runningBots, botStats];

      console.log(`Running ${botName}...`);

      // Build arguments for bot_starter.ts
      const args = buildArgs(botName);
      console.log(`Built args:`, args);

      // Simulate stats updates (will be replaced with real-time updates later)
      // Update current step
      setTimeout(() => {
        const bot = runningBots.find(b => b.name === botName);
        if (bot) {
          bot.currentStep = 'Opening browser...';
          runningBots = [...runningBots];
        }
      }, 1000);

      setTimeout(() => {
        const bot = runningBots.find(b => b.name === botName);
        if (bot) {
          bot.currentStep = 'Collecting job cards...';
          bot.totalJobs = 25;
          runningBots = [...runningBots];
        }
      }, 3000);

      setTimeout(() => {
        const bot = runningBots.find(b => b.name === botName);
        if (bot) {
          bot.currentStep = 'Processing job applications...';
          bot.jobsProcessed = 5;
          bot.appliedJobs = 3;
          bot.skippedJobs = 2;
          runningBots = [...runningBots];
        }
      }, 5000);

      // Execute the bot_starter.ts script
      const result = await invoke('run_javascript_script', {
        scriptPath: 'src/bots/bot_starter.ts',
        args: args
      });

      console.log(`${botName} result:`, result);

      // Remove bot from running list when complete
      runningBots = runningBots.filter(bot => bot.name !== botName);

    } catch (error) {
      console.error(`Error running ${botName}:`, error);

      // Remove bot from running list on error
      runningBots = runningBots.filter(bot => bot.name !== botName);
    }
  }

</script>


<div class="container mx-auto p-8">
  <h1 class="text-4xl font-bold text-center mb-8">Choose a Bot</h1>

  <!-- Bot Selection Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {#each bots as bot}
      <div
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300"
        class:opacity-50={isBotRunning(bot.name)}
        class:cursor-not-allowed={isBotRunning(bot.name)}
        class:cursor-pointer={!isBotRunning(bot.name)}
      >
        <figure class="px-10 pt-10">
          <div class="avatar">
            <div class="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={bot.image} alt={bot.name} />
            </div>
          </div>
        </figure>
        <div class="card-body items-center text-center">
          <h2 class="card-title text-primary text-lg">{bot.name}</h2>
          <p class="text-sm">{bot.description}</p>

          <div class="card-actions w-full mt-4">
            {#if isBotRunning(bot.name)}
              <button
                class="btn btn-error btn-sm w-full"
                on:click={() => stopBot(bot.name)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Bot
              </button>
            {:else}
              <button
                class="btn btn-primary btn-sm w-full"
                on:click={() => handleBotClick(bot.name)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Bot
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Running Bots Stats Section -->
  {#if runningBots.length > 0}
    <div class="divider text-lg font-semibold">Running Bots</div>

    <div class="space-y-4">
      {#each runningBots as botStat}
        <BotStats
          botName={botStat.name}
          currentStep={botStat.currentStep}
          totalJobs={botStat.totalJobs}
          jobsProcessed={botStat.jobsProcessed}
          appliedJobs={botStat.appliedJobs}
          skippedJobs={botStat.skippedJobs}
          isExpanded={botStat.isExpanded}
          onStop={() => stopBot(botStat.name)}
        />
      {/each}
    </div>
  {/if}
</div>