<script lang="ts">
  import { onMount } from 'svelte';
  
  let selectedProvider = 'seek';
  let linkedinUsername = '';
  let linkedinPassword = '';
  let botStatus = 'stopped'; // 'stopped', 'running', 'loading'
  let currentTask = 'Idle';
  let isFlipped = false;
  
  const providers = [
    { value: 'seek', label: 'Seek' },
    { value: 'deknil', label: 'LinkedIn' }
  ];

  function handleProviderChange() {
    // Reset credentials when provider changes
    if (selectedProvider !== 'deknil') {
      linkedinUsername = '';
      linkedinPassword = '';
    }
  }

  function toggleBot() {
    if (botStatus === 'stopped') {
      botStatus = 'loading';
      currentTask = 'Starting up...';
      
      // Simulate startup process
      setTimeout(() => {
        botStatus = 'running';
        currentTask = 'Scraping job listings...';
      }, 2000);
    } else if (botStatus === 'running') {
      botStatus = 'loading';
      currentTask = 'Shutting down...';
      
      // Simulate shutdown process
      setTimeout(() => {
        botStatus = 'stopped';
        currentTask = 'Idle';
      }, 1000);
    }
  }

  function flipToJobsTracker() {
    isFlipped = !isFlipped;
    // In a real app, this would navigate to the jobs tracker page
    window.location.href = '/backend-analytics';
  }

  function getBotStatusClass() {
    switch (botStatus) {
      case 'running': return 'status-running';
      case 'loading': return 'status-loading';
      case 'stopped': 
      default: return 'status-stopped';
    }
  }

  function getButtonText() {
    switch (botStatus) {
      case 'running': return 'STOP';
      case 'loading': return 'Loading...';
      case 'stopped': 
      default: return 'START';
    }
  }

  onMount(() => {
    // Simulate periodic task updates when running
    const interval = setInterval(() => {
      if (botStatus === 'running') {
        const tasks = [
          'Scraping job listings...',
          'Analyzing job descriptions...',
          'Filtering by preferences...',
          'Preparing applications...',
          'Checking application status...'
        ];
        currentTask = tasks[Math.floor(Math.random() * tasks.length)];
      }
    }, 5000);

    return () => clearInterval(interval);
  });
</script>

<div class="control-bar">
  <div class="control-container">
    <div class="main-controls">
      <!-- Provider Selection and Controls -->
      <div class="provider-section">
        <div class="provider-controls">
          <div class="provider-group">
            <label class="provider-label">
              <span class="label-text">Provider</span>
            </label>
            <select bind:value={selectedProvider} onchange={handleProviderChange} class="provider-select">
              {#each providers as provider}
                <option value={provider.value}>{provider.label}</option>
              {/each}
            </select>
            
            {#if selectedProvider === 'deknil'}
              <div class="credentials-group">
                <input 
                  type="text" 
                  placeholder="LinkedIn username" 
                  bind:value={linkedinUsername}
                  class="credential-input"
                />
                <input 
                  type="password" 
                  placeholder="LinkedIn password" 
                  bind:value={linkedinPassword}
                  class="credential-input"
                />
              </div>
            {/if}
          </div>

          <!-- Main Start/Stop Button -->
          <button class="btn btn--primary btn--large main-action-btn {getBotStatusClass()}" onclick={toggleBot} disabled={botStatus === 'loading'}>
            {getButtonText()}
          </button>
        </div>
      </div>

      <!-- Flip Toggle Button -->
      <div class="flip-section">
        <button class="btn btn--outline flip-btn" onclick={flipToJobsTracker}>
          🔍 Jobs Tracker
        </button>
      </div>

      <!-- Bot State & Current Task -->
      <div class="status-section">
        <div class="bot-status">
          <div class="status-indicator {getBotStatusClass()}"></div>
          <span class="status-text">
            {#if botStatus === 'running'}
              Running
            {:else if botStatus === 'loading'}
              Loading
            {:else}
              Stopped
            {/if}
          </span>
        </div>
        <div class="current-task">
          <span class="task-label">Current Task:</span>
          <span class="task-text">{currentTask}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-content">
  <div class="content-container">
    <div class="control-panel-info">
      <h2>🤖 Bot Control Center</h2>
      <p>Configure and control your job application bot from this central dashboard.</p>
      
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Real-time Control</h3>
          <p>Start and stop the bot instantly with live status updates</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🔄</div>
          <h3>Provider Switching</h3>
          <p>Switch between different job platforms seamlessly</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Live Monitoring</h3>
          <p>Track current tasks and bot performance in real-time</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Secure Credentials</h3>
          <p>Safely store and manage platform login credentials</p>
        </div>
      </div>

      <div class="status-details">
        <h3>Current Status Overview</h3>
        <div class="status-info">
          <div class="info-item">
            <span class="info-label">Active Provider:</span>
            <span class="info-value">{providers.find(p => p.value === selectedProvider)?.label || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Bot State:</span>
            <span class="info-value status-{botStatus}">
              {botStatus.charAt(0).toUpperCase() + botStatus.slice(1)}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Current Activity:</span>
            <span class="info-value">{currentTask}</span>
          </div>
          {#if selectedProvider === 'deknil'}
            <div class="info-item">
              <span class="info-label">LinkedIn Account:</span>
              <span class="info-value">{linkedinUsername || 'Not configured'}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  :global(body) {
    background: #000;
    font-family: 'Orbitron', monospace;
    color: #00ff00;
    margin: 0;
    padding: 0;
  }

  .control-bar {
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #001100, #003300);
    border-bottom: 2px solid #00ff00;
    z-index: 100;
    box-shadow: 0 2px 20px rgba(0, 255, 0, 0.3);
  }

  .control-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 2rem;
  }

  .main-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .provider-section {
    flex: 1;
    min-width: 300px;
  }

  .provider-controls {
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .provider-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
  }

  .provider-label {
    display: flex;
    align-items: center;
  }

  .label-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .provider-select {
    background: rgba(0, 20, 0, 0.8);
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 0.75rem;
    color: #00ff00;
    font-family: 'Orbitron', monospace;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .provider-select:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .credentials-group {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .credential-input {
    background: rgba(0, 20, 0, 0.8);
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 0.5rem;
    color: #00ff00;
    font-family: 'Orbitron', monospace;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    flex: 1;
    min-width: 150px;
  }

  .credential-input:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  }

  .credential-input::placeholder {
    color: rgba(0, 255, 0, 0.6);
  }

  .main-action-btn {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    border: none;
    border-radius: 8px;
    padding: 1rem 2rem;
    font-family: 'Orbitron', monospace;
    font-size: 1.2rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 140px;
    position: relative;
    overflow: hidden;
  }

  .main-action-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 255, 255, 0.4);
  }

  .main-action-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .main-action-btn.status-running {
    background: linear-gradient(45deg, #ff4500, #ff6600);
    animation: pulse 2s ease-in-out infinite alternate;
  }

  .main-action-btn.status-loading {
    background: linear-gradient(45deg, #ffff00, #ffa500);
    animation: loading 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    from { box-shadow: 0 0 10px rgba(255, 69, 0, 0.5); }
    to { box-shadow: 0 0 20px rgba(255, 69, 0, 0.8); }
  }

  @keyframes loading {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .flip-section {
    display: flex;
    align-items: center;
  }

  .flip-btn {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .flip-btn:hover {
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }

  .status-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
    text-align: right;
  }

  .bot-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid;
  }

  .status-indicator.status-running {
    background: #00ff00;
    border-color: #00ff00;
    box-shadow: 0 0 10px #00ff00;
    animation: glow 2s ease-in-out infinite alternate;
  }

  .status-indicator.status-loading {
    background: #ffff00;
    border-color: #ffff00;
    animation: blink 1s ease-in-out infinite;
  }

  .status-indicator.status-stopped {
    background: transparent;
    border-color: #666;
  }

  @keyframes glow {
    from { box-shadow: 0 0 5px #00ff00; }
    to { box-shadow: 0 0 15px #00ff00; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .status-text {
    font-weight: 700;
    color: #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .current-task {
    font-size: 0.9rem;
  }

  .task-label {
    color: #00cc00;
    font-weight: 700;
  }

  .task-text {
    color: #00ffff;
    font-style: italic;
  }

  .page-content {
    padding-top: 200px;
    min-height: 100vh;
  }

  .content-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .control-panel-info {
    text-align: center;
  }

  .control-panel-info h2 {
    font-size: 2.5rem;
    font-weight: 900;
    color: #00ff00;
    text-shadow: 0 0 20px #00ff0050;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .control-panel-info p {
    font-size: 1.2rem;
    color: #00cc00;
    margin-bottom: 3rem;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .feature-card {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.3rem;
    font-weight: 700;
    color: #00ffff;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .feature-card p {
    color: #00cc00;
    line-height: 1.5;
  }

  .status-details {
    background: linear-gradient(135deg, #001100, #003300);
    border: 1px solid #00ff00;
    border-radius: 12px;
    padding: 2rem;
    text-align: left;
  }

  .status-details h3 {
    font-size: 1.5rem;
    color: #00ff00;
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-align: center;
  }

  .status-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    border: 1px solid rgba(0, 255, 0, 0.2);
  }

  .info-label {
    font-weight: 700;
    color: #00cc00;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .info-value {
    color: #00ffff;
    font-weight: 700;
  }

  .info-value.status-running {
    color: #00ff00;
  }

  .info-value.status-loading {
    color: #ffff00;
  }

  .info-value.status-stopped {
    color: #666;
  }

  @media (max-width: 768px) {
    .control-container {
      padding: 1rem;
    }

    .main-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .provider-section {
      min-width: auto;
    }

    .provider-controls {
      flex-direction: column;
      gap: 1rem;
    }

    .provider-group {
      min-width: auto;
    }

    .credentials-group {
      flex-direction: column;
    }

    .credential-input {
      min-width: auto;
    }

    .status-section {
      align-items: flex-start;
      text-align: left;
    }

    .page-content {
      padding-top: 260px;
    }

    .content-container {
      padding: 1rem;
    }

    .control-panel-info h2 {
      font-size: 2rem;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .status-info {
      grid-template-columns: 1fr;
    }

    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>