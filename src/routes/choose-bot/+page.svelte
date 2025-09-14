<script>
  import { bots } from '../../bots/botsinit.json';
  import { invoke } from '@tauri-apps/api/core';

  let isRunning = false;
  let runningBot = '';
  let statusMessage = '';
  let selectedBot = '';
  let showBrowserSelection = false;
  let showAdvancedOptions = false;
  
  // Advanced options state
  let useNewContext = false;
  let usePlaywright = false;
  let useFullscreen = false;
  let customSize = '';
  let selectedBrowser = 'chrome';
  
  // Get screen dimensions
  let screenWidth = 1920;
  let screenHeight = 1080;
  
  // Detect screen size on mount
  import { onMount } from 'svelte';
  
  onMount(() => {
    if (typeof window !== 'undefined') {
      screenWidth = window.screen.width;
      screenHeight = window.screen.height;
    }
  });

  function closeStatusMessage() {
    statusMessage = '';
    isRunning = false;
    runningBot = '';
    selectedBot = '';
  }

  function handleBotClick(botName) {
    if (isRunning) return; // Prevent multiple clicks while running
    
    // Show browser selection for this bot
    selectedBot = botName;
    showBrowserSelection = true;
  }

  function buildArgs(botName, browser) {
    // Convert bot names: seek_bot -> seek, linkedin_bot -> linkedin, indeed_bot -> indeed
    const cleanBotName = botName.replace('_bot', '');
    const args = [cleanBotName, browser];
    
    if (useNewContext) args.push('--new-context');
    if (usePlaywright) args.push('--playwright');
    if (useFullscreen) args.push('--fullscreen');
    if (customSize && customSize.includes('x')) {
      args.push(`--size=${customSize}`);
    } else {
      // Use detected screen size if no custom size specified
      args.push(`--size=${screenWidth}x${screenHeight}`);
    }
    
    return args;
  }

  async function runBotWithBrowser(botName, browser) {
    try {
      isRunning = true;
      runningBot = botName;
      showBrowserSelection = false;
      statusMessage = `Starting ${botName.replace('_', ' ')} with ${browser}... Please wait while we open your browser.`;
      console.log(`Running ${botName} with ${browser}...`);
      
      // Build arguments for botrunner.ts
      const args = buildArgs(botName, browser);
      console.log(`Built args:`, args);
      
      // Execute the botrunner.ts script
      const result = await invoke('run_javascript_script', { 
        scriptPath: 'src/bots/botrunner.ts',
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

  function cancelBrowserSelection() {
    selectedBot = '';
    showBrowserSelection = false;
    showAdvancedOptions = false;
    // Reset advanced options
    useNewContext = false;
    usePlaywright = false;
    useFullscreen = false;
    customSize = '';
  }

  function toggleAdvancedOptions() {
    showAdvancedOptions = !showAdvancedOptions;
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
    padding: var(--space-lg);
    z-index: 10;
    animation: fadeIn 0.3s ease-in-out;
    overflow-y: auto;
    max-height: 100%;
  }

  .browser-selection h3 {
    color: var(--color-primary);
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-md);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
    text-align: center;
  }

  .browser-section {
    margin-bottom: var(--space-md);
  }

  .browser-section h4 {
    color: var(--color-primary-dark);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-sm);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }

  .browser-buttons {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
  }

  .browser-btn {
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

  .browser-btn:hover,
  .browser-btn.active {
    background: var(--color-primary);
    color: var(--bg-primary);
    border-color: var(--color-primary);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  .advanced-toggle {
    padding: var(--space-xs) var(--space-sm);
    background: transparent;
    color: var(--color-primary-dark);
    border: 1px dashed var(--color-primary-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: var(--transition-normal);
    margin: var(--space-sm) 0;
    width: 100%;
  }

  .advanced-toggle:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
    border-style: solid;
  }

  .advanced-options {
    background: rgba(0, 255, 255, 0.05);
    border: 1px solid var(--color-primary-dark);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    animation: slideDown 0.3s ease-in-out;
  }

  .option-group {
    margin-bottom: var(--space-md);
  }

  .option-group:last-child {
    margin-bottom: 0;
  }

  .option-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
    cursor: pointer;
    font-size: var(--font-size-xs);
    color: var(--color-primary-dark);
    position: relative;
    padding-left: var(--space-lg);
  }

  .option-item input[type="checkbox"] {
    position: absolute;
    left: 0;
    top: 2px;
    width: 14px;
    height: 14px;
    cursor: pointer;
    opacity: 0;
  }

  .checkmark {
    position: absolute;
    left: 0;
    top: 2px;
    width: 14px;
    height: 14px;
    border: 1px solid var(--color-primary-dark);
    border-radius: 2px;
    transition: var(--transition-normal);
  }

  .option-item input[type="checkbox"]:checked + .checkmark {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .option-item input[type="checkbox"]:checked + .checkmark::after {
    content: '✓';
    position: absolute;
    left: 2px;
    top: -2px;
    color: var(--bg-primary);
    font-size: 10px;
    line-height: 1;
  }

  .option-item small {
    display: block;
    color: var(--color-primary-dark);
    font-size: 10px;
    margin-top: 2px;
    opacity: 0.7;
  }

  .size-option {
    margin-top: var(--space-sm);
  }

  .size-option label {
    display: block;
    color: var(--color-primary-dark);
    font-size: var(--font-size-xs);
    margin-bottom: var(--space-xs);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-normal);
  }

  .size-input {
    width: 100%;
    padding: var(--space-xs);
    background: var(--bg-primary);
    border: 1px solid var(--color-primary-dark);
    border-radius: var(--radius-sm);
    color: var(--color-primary);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
  }

  .size-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }

  .size-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-buttons {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
    margin-top: auto;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-primary-dark);
  }

  .launch-btn {
    padding: var(--space-sm) var(--space-lg);
    background: var(--color-primary);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-family);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition-normal);
    flex: 1;
    max-width: 120px;
  }

  .launch-btn:hover {
    background: var(--color-primary-bright);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .cancel-btn {
    padding: var(--space-sm) var(--space-lg);
    background: transparent;
    color: var(--color-primary-dark);
    border: 1px solid var(--color-primary-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition-normal);
    flex: 1;
    max-width: 100px;
  }

  .cancel-btn:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
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
              <h3>Launch Configuration</h3>
              
              <!-- Browser Selection -->
              <div class="browser-section">
                <h4>Browser</h4>
                <div class="browser-buttons">
                  <button 
                    class="browser-btn"
                    class:active={selectedBrowser === 'chrome'}
                    on:click|stopPropagation={() => selectedBrowser = 'chrome'}
                  >
                    Chrome
                  </button>
                  <button 
                    class="browser-btn"
                    class:active={selectedBrowser === 'firefox'}
                    on:click|stopPropagation={() => selectedBrowser = 'firefox'}
                  >
                    Firefox
                  </button>
                </div>
              </div>

              <!-- Advanced Options Toggle -->
              <button 
                class="advanced-toggle"
                on:click|stopPropagation={toggleAdvancedOptions}
              >
                ⚙️ Advanced Options {showAdvancedOptions ? '▼' : '▶'}
              </button>

              {#if showAdvancedOptions}
                <div class="advanced-options">
                  <!-- Session Options -->
                  <div class="option-group">
                    <label class="option-item">
                      <input type="checkbox" bind:checked={useNewContext}>
                      <span class="checkmark"></span>
                      Force New Session
                      <small>Start fresh (ignore saved login)</small>
                    </label>
                    
                    <label class="option-item">
                      <input type="checkbox" bind:checked={usePlaywright}>
                      <span class="checkmark"></span>
                      Playwright Mode  
                      <small>No session persistence</small>
                    </label>
                  </div>

                  <!-- Display Options -->
                  <div class="option-group">
                    <label class="option-item">
                      <input type="checkbox" bind:checked={useFullscreen}>
                      <span class="checkmark"></span>
                      Fullscreen (Kiosk)
                      <small>No browser UI, pure fullscreen</small>
                    </label>
                    
                    <div class="size-option">
                      <label>Custom Size:</label>
                      <input 
                        type="text" 
                        placeholder="1920x1080"
                        bind:value={customSize}
                        class="size-input"
                        disabled={useFullscreen}
                      >
                    </div>
                  </div>
                </div>
              {/if}

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button 
                  class="launch-btn"
                  on:click|stopPropagation={() => runBotWithBrowser(bot.name, selectedBrowser)}
                >
                  🚀 Launch Bot
                </button>
                <button 
                  class="cancel-btn"
                  on:click|stopPropagation={cancelBrowserSelection}
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
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