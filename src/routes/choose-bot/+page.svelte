<script>
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';

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

  let isRunning = false;
  let runningBot = '';
  let statusMessage = '';
  let selectedBot = '';
  let showBrowserSelection = false;

  function closeStatusMessage() {
    statusMessage = '';
    isRunning = false;
    runningBot = '';
    selectedBot = '';
  }

  function handleBotClick(botName) {
    if (isRunning) return; // Prevent multiple clicks while running

    // Directly run the bot - no browser selection needed
    runBot(botName);
  }

  function buildArgs(botName) {
    // Convert bot names: seek_bot -> seek, linkedin_bot -> linkedin, indeed_bot -> indeed
    const cleanBotName = botName.replace('_bot', '');

    // New bot_starter.ts only needs the bot name
    return [cleanBotName];
  }

  async function runBot(botName) {
    try {
      isRunning = true;
      runningBot = botName;
      statusMessage = `Starting ${botName.replace('_', ' ')}... Please wait while we open your browser.`;
      console.log(`Running ${botName}...`);
      
      // Build arguments for bot_starter.ts
      const args = buildArgs(botName);
      console.log(`Built args:`, args);
      
      // Execute the bot_starter.ts script
      const result = await invoke('run_javascript_script', {
        scriptPath: 'src/bots/bot_starter.ts',
        args: args
      });
      
      console.log(`${botName} result:`, result);
      
      // Check if browser was closed manually
      if (result.includes('Browser window was closed manually')) {
        statusMessage = `${botName.replace('_', ' ')} stopped - Browser window was closed manually.`;
      } else {
        statusMessage = `${botName.replace('_', ' ')} completed successfully! Browser is ready to use.`;
      }
      
      // Clear status after 8 seconds
      setTimeout(() => {
        closeStatusMessage();
      }, 8000);
      
    } catch (error) {
      console.error(`Error running ${botName}:`, error);
      
      // Check if this is a browser close event
      if (error.toString().includes('Browser window was closed manually') || 
          error.toString().includes('Browser was closed')) {
        statusMessage = `${botName.replace('_', ' ')} stopped - Browser window was closed manually.`;
      } else {
        statusMessage = `Error: ${error}`;
      }
      
      // Clear error after 12 seconds
      setTimeout(() => {
        closeStatusMessage();
        showBrowserSelection = false;
      }, 12000);
    }
  }

</script>


<div class="container mx-auto p-8">
  <h1 class="text-4xl font-bold text-center mb-8">Choose a Bot</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each bots as bot}
      <div
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
        class:ring-4={runningBot === bot.name}
        class:ring-orange-500={runningBot === bot.name}
        role="button"
        tabindex="0"
        on:click={() => handleBotClick(bot.name)}
        on:keydown={(e) => e.key === 'Enter' && handleBotClick(bot.name)}
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
          <p class="text-sm">
            {#if runningBot === bot.name}
              <span class="loading loading-spinner loading-sm"></span>
              🤖 Running... Please wait
            {:else}
              {bot.description}
            {/if}
          </p>
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Status message overlay - completely outside document flow -->
{#if statusMessage}
  <div class="status-overlay">
    <div class="status-message" class:error={statusMessage.includes('Error')}>
      <div class="status-content">
        {statusMessage}
      </div>
      <button class="status-close" on:click={closeStatusMessage} title="Close">
        ✕
      </button>
    </div>
  </div>
{/if}