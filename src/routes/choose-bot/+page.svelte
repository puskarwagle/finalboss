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

<style>
  .bot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(322px, 1fr));
    gap: var(--space-xl);
    justify-items: center;
  }
  
  .bot-card {
    width: 100%;
    max-width: 368px;
    min-height: 300px;
    text-align: center;
    cursor: pointer;
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 3px solid var(--color-primary);
    box-shadow: 
      0 0 20px rgba(0, 255, 255, 0.3),
      inset 0 0 20px rgba(0, 255, 255, 0.1);
    transition: var(--transition-normal);
  }
  
  .bot-card.running {
    border-color: var(--color-secondary);
    box-shadow: 
      0 0 40px rgba(255, 102, 0, 0.8),
      inset 0 0 30px rgba(255, 102, 0, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }

  .bot-card:hover {
    border-color: var(--color-primary-bright);
    box-shadow: 
      0 0 30px rgba(0, 255, 255, 0.6),
      inset 0 0 30px rgba(0, 255, 255, 0.15);
    transform: translateY(-5px);
  }

  .card-content {
    position: relative;
    z-index: 2;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    padding: var(--space-lg);
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-radius: inherit;
  }
  
  .avatar {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    margin: 0 auto var(--space-lg);
    border: 3px solid var(--color-primary);
    transition: var(--transition-normal);
    filter: brightness(0.9) contrast(1.3);
    position: relative;
    z-index: 3;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  }
  
  .bot-card:hover .avatar {
    border-color: var(--color-primary-bright);
    filter: brightness(1.3) contrast(1.5);
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.7);
    transform: scale(1.05);
  }
  
  .bot-name {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-md);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
    color: var(--color-primary);
    transition: var(--transition-normal);
    position: relative;
    z-index: 2;
  }
  
  .bot-card:hover .bot-name {
    color: var(--color-primary-bright);
    text-shadow: 0 0 10px var(--color-primary-bright);
  }
  
  .bot-description {
    font-size: var(--font-size-sm);
    color: var(--color-primary-dark);
    line-height: 1.4;
    font-weight: var(--font-weight-normal);
    transition: var(--transition-normal);
    position: relative;
    z-index: 2;
  }
  
  .bot-card:hover .bot-description {
    color: #00dddd;
  }

  .status-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
  }
  
  .status-message {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--bg-overlay);
    border: 2px solid var(--color-primary);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    color: var(--color-primary);
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
    z-index: 99999;
    max-width: 320px;
    min-width: 250px;
    word-wrap: break-word;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: slideInFromRight 0.3s ease-out;
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    pointer-events: auto;
    /* Ensure it doesn't affect document flow */
    width: auto;
    height: auto;
    transform: translateZ(0);
    will-change: transform;
  }
  
  .status-message.error {
    border-color: var(--color-danger);
    color: var(--color-danger);
    background: rgba(20, 0, 0, 0.95);
  }

  .status-content {
    flex: 1;
    padding-right: var(--space-xs);
  }

  .status-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: var(--font-size-lg);
    line-height: 1;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    transition: var(--transition-normal);
    flex-shrink: 0;
    margin-top: -2px;
  }

  .status-close:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }


  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideDown {
    from { 
      opacity: 0; 
      max-height: 0;
      transform: translateY(-10px);
    }
    to { 
      opacity: 1; 
      max-height: 300px;
      transform: translateY(0);
    }
  }

  @keyframes slideInFromRight {
    from { 
      opacity: 0;
      transform: translateX(100%);
    }
    to { 
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>

<main class="page page--with-nav">
  <div class="section__container">
    <h1 class="section__title mb-2xl">Choose a Bot</h1>
    <div class="bot-grid">
      {#each bots as bot}
        <div 
          class="card bot-card" 
          class:running={runningBot === bot.name}
          role="button" 
          tabindex="0"
          style="background-image: url({bot.image})"
          on:click={() => handleBotClick(bot.name)}
          on:keydown={(e) => e.key === 'Enter' && handleBotClick(bot.name)}
        >
          <div class="card-content">
            <img src={bot.image} alt={bot.name} class="avatar" />
            <h2 class="bot-name">{bot.name}</h2>
            <p class="bot-description">
              {#if runningBot === bot.name}
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
</main>

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