<script>
  import { bots } from '../../bots/botsinit.json';
  import { invoke } from '@tauri-apps/api/core';

  let isRunning = false;
  let runningBot = '';
  let statusMessage = '';
  let selectedBot = '';
  let showBrowserSelection = false;

  function handleBotClick(botName) {
    if (isRunning) return; // Prevent multiple clicks while running
    
    // Show browser selection for this bot
    selectedBot = botName;
    showBrowserSelection = true;
  }

  async function runBotWithBrowser(botName, browser) {
    try {
      isRunning = true;
      runningBot = botName;
      showBrowserSelection = false;
      statusMessage = `Starting ${botName.replace('_', ' ')} with ${browser}... Please wait while we open your browser.`;
      console.log(`Running ${botName} with ${browser}...`);
      
      // Execute the bot script with browser parameter
      const result = await invoke('run_javascript_script', { 
        scriptPath: `src/bots/${botName.replace('_bot', '.js')}`,
        args: [browser]
      });
      
      console.log(`${botName} result:`, result);
      statusMessage = `${botName.replace('_', ' ')} completed successfully! Browser is ready to use.`;
      
      // Clear status after 5 seconds
      setTimeout(() => {
        statusMessage = '';
        isRunning = false;
        runningBot = '';
        selectedBot = '';
      }, 5000);
      
    } catch (error) {
      console.error(`Error running ${botName}:`, error);
      statusMessage = `Error: ${error}`;
      
      // Clear error after 10 seconds
      setTimeout(() => {
        statusMessage = '';
        isRunning = false;
        runningBot = '';
        selectedBot = '';
        showBrowserSelection = false;
      }, 10000);
    }
  }

  function cancelBrowserSelection() {
    selectedBot = '';
    showBrowserSelection = false;
  }
</script>



<style>
  .bot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-xl);
    justify-items: center;
  }
  
  .bot-card {
    width: 100%;
    max-width: 320px;
    text-align: center;
    cursor: pointer;
    position: relative;
  }
  
  .bot-card.running {
    border-color: var(--color-secondary);
    box-shadow: 0 0 30px rgba(255, 102, 0, 0.6);
    animation: pulse 2s ease-in-out infinite;
  }
  
  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto var(--space-lg);
    border: 3px solid var(--color-primary);
    transition: var(--transition-normal);
    filter: brightness(0.8) contrast(1.2);
    position: relative;
    z-index: 2;
  }
  
  .bot-card:hover .avatar {
    border-color: var(--color-primary-bright);
    filter: brightness(1.2) contrast(1.4);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
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
  
  .status-message {
    position: fixed;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-overlay);
    border: 2px solid var(--color-primary);
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-md);
    color: var(--color-primary);
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
    z-index: var(--z-toast);
    text-align: center;
    max-width: 90vw;
    word-wrap: break-word;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }
  
  .status-message.error {
    border-color: var(--color-danger);
    color: var(--color-danger);
    background: rgba(20, 0, 0, 0.9);
  }

  .browser-selection {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-overlay);
    border-radius: inherit;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10;
    animation: fadeIn 0.3s ease-in-out;
  }

  .browser-selection h3 {
    color: var(--color-primary);
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-lg);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }

  .browser-buttons {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .browser-btn {
    padding: var(--space-sm) var(--space-lg);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
    cursor: pointer;
    transition: var(--transition-normal);
  }

  .browser-btn:hover {
    background: var(--color-primary-bright);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .cancel-btn {
    padding: var(--space-xs) var(--space-md);
    background: transparent;
    color: var(--color-primary-dark);
    border: 1px solid var(--color-primary-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition-normal);
  }

  .cancel-btn:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>

{#if statusMessage}
  <div class="status-message" class:error={statusMessage.includes('Error')}>
    {statusMessage}
  </div>
{/if}

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
          on:click={() => handleBotClick(bot.name)}
          on:keydown={(e) => e.key === 'Enter' && handleBotClick(bot.name)}
        >
          <img src={bot.image} alt={bot.name} class="avatar" />
          <h2 class="bot-name">{bot.name}</h2>
          <p class="bot-description">
            {#if runningBot === bot.name}
              🤖 Running... Please wait
            {:else}
              {bot.description}
            {/if}
          </p>
          
          {#if showBrowserSelection && selectedBot === bot.name}
            <div class="browser-selection">
              <h3>Choose Browser</h3>
              <div class="browser-buttons">
                <button 
                  class="browser-btn"
                  on:click|stopPropagation={() => runBotWithBrowser(bot.name, 'chrome')}
                >
                  Chrome
                </button>
                <button 
                  class="browser-btn"
                  on:click|stopPropagation={() => runBotWithBrowser(bot.name, 'firefox')}
                >
                  Firefox
                </button>
              </div>
              <button 
                class="cancel-btn"
                on:click|stopPropagation={cancelBrowserSelection}
              >
                Cancel
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</main>