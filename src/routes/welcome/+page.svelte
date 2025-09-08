<script lang="ts">
  import { onMount } from 'svelte';

  let stats = {
    totalJobs: 0,
    applicationsToday: 0,
    responseRate: 0,
    averageSalary: 0
  };

  let isAnimating = false;

  function animateCounter(element: HTMLElement, start: number, end: number, duration: number = 2000) {
    const startTime = performance.now();
    
    function updateNumber(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = Math.floor(start + (end - start) * progress);
      element.textContent = current.toString();
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }
    
    requestAnimationFrame(updateNumber);
  }

  onMount(() => {
    // Simulate loading stats
    setTimeout(() => {
      stats = {
        totalJobs: 256,
        applicationsToday: 12,
        responseRate: 34,
        averageSalary: 97000
      };
      
      // Animate counters
      const counters = document.querySelectorAll('.stat-number');
      counters.forEach((counter, index) => {
        const values = [256, 12, 34, 97];
        animateCounter(counter as HTMLElement, 0, values[index], 1500 + index * 200);
      });
    }, 500);
  });


</script>

<div class="container">
  <div class="hero-section">
    <h1 class="title">🤖 Quest Bot</h1>
    <h2 class="subtitle">Automated Job Application Assistant</h2>
    <p class="description">
      Advanced AI-powered job hunting automation for the Australian market. 
      Configure once, apply everywhere, track everything.
    </p>
  </div>


  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">🔍</div>
      <div class="stat-number">0</div>
      <div class="stat-label">Jobs Discovered</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">📨</div>
      <div class="stat-number">0</div>
      <div class="stat-label">Applied Today</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">📈</div>
      <div class="stat-number">0</div>
      <div class="stat-label">Response Rate %</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-number">0</div>
      <div class="stat-label">Avg Salary (K)</div>
    </div>
  </div>

  <div class="features-section">
    <h3 class="features-title">🚀 Core Features</h3>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h4>Lightning Fast</h4>
        <p>Automated job scraping and application submission across multiple platforms</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🧠</div>
        <h4>Smart Matching</h4>
        <p>AI-powered job matching based on your skills, preferences, and career goals</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h4>Real-time Analytics</h4>
        <p>Track applications, response rates, and optimize your job search strategy</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h4>Secure & Private</h4>
        <p>Your data stays on your machine. Enterprise-grade security and privacy</p>
      </div>
    </div>
  </div>

  <div class="cta-section">
    <h3 class="cta-title">Ready to Supercharge Your Job Hunt?</h3>
    <div class="cta-buttons">
      <a href="/frontend-form" class="btn-primary">
        ⚙️ Configure Bot
      </a>
      <a href="/control-bar" class="btn-secondary">
        🎮 Control Panel
      </a>
      <a href="/backend-analytics" class="btn-secondary">
        📊 View Analytics
      </a>
    </div>
  </div>

  <div class="platforms-section">
    <h4 class="platforms-title">Supported Job Platforms</h4>
    <div class="platforms-grid">
      <div class="platform-card">
        <img src="/finalseek.png" alt="Seek" class="platform-logo" />
        <span class="platform-name">Seek</span>
      </div>
      <div class="platform-card">
        <img src="/finallinkedin.png" alt="LinkedIn" class="platform-logo" />
        <span class="platform-name">LinkedIn</span>
      </div>
      <div class="platform-card">
        <img src="/finalindeed.png" alt="Indeed" class="platform-logo" />
        <span class="platform-name">Indeed</span>
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
        overflow-x: hidden;
        min-height: 100vh;
    }

    .container {
        padding: 2rem;
        padding-top: 10rem;
        max-width: 1400px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
    }

    .hero-section {
        text-align: center;
        margin-bottom: 4rem;
    }

    .title {
        font-size: clamp(3rem, 8vw, 5rem);
        font-weight: 900;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        background: linear-gradient(45deg, #00ff00, #00ffff, #ff00ff);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 20px #00ff0050;
        animation: glow 2s ease-in-out infinite alternate;
    }

    .subtitle {
        font-size: clamp(1.2rem, 3vw, 2rem);
        font-weight: 700;
        color: #00ffff;
        margin-bottom: 2rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        text-shadow: 0 0 15px #00ffff50;
    }

    .description {
        font-size: 1.2rem;
        color: #00cc00;
        line-height: 1.6;
        max-width: 600px;
        margin: 0 auto 3rem;
    }

    @keyframes glow {
        from { filter: drop-shadow(0 0 5px #00ff00); }
        to { filter: drop-shadow(0 0 20px #00ff00); }
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin-bottom: 4rem;
    }

    .stat-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 12px;
        padding: 2rem;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
        border-color: #00ffff;
    }

    .stat-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
    }

    .stat-number {
        font-size: 3rem;
        font-weight: 900;
        color: #00ffff;
        text-shadow: 0 0 15px #00ffff;
        margin-bottom: 0.5rem;
        display: block;
    }

    .stat-label {
        font-size: 1rem;
        color: #00cc00;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
    }

    .features-section {
        margin-bottom: 4rem;
    }

    .features-title {
        font-size: 2.5rem;
        font-weight: 900;
        color: #00ff00;
        text-align: center;
        margin-bottom: 3rem;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        text-shadow: 0 0 20px #00ff0050;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
        border-color: #00ffff;
    }

    .feature-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
        display: block;
    }

    .feature-card h4 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #00ffff;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .feature-card p {
        color: #00cc00;
        line-height: 1.5;
        font-size: 1rem;
    }

    .cta-section {
        text-align: center;
        margin-bottom: 4rem;
        padding: 3rem;
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(0, 255, 0, 0.2);
    }

    .cta-title {
        font-size: 2rem;
        font-weight: 900;
        color: #00ff00;
        margin-bottom: 2rem;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        text-shadow: 0 0 15px #00ff0050;
    }

    .cta-buttons {
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        flex-wrap: wrap;
    }

    .btn-primary,
    .btn-secondary {
        background: linear-gradient(45deg, #00ff00, #00ffff);
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 1.2rem 2rem;
        font-family: 'Orbitron', monospace;
        font-size: 1.1rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 180px;
        justify-content: center;
    }

    .btn-secondary {
        background: linear-gradient(45deg, #003300, #006600);
        color: #00ff00;
        border: 2px solid #00ff00;
    }

    .btn-primary:hover,
    .btn-secondary:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(0, 255, 255, 0.4);
    }

    .btn-secondary:hover {
        background: linear-gradient(45deg, #00ff00, #00ffff);
        color: #000;
    }

    .platforms-section {
        text-align: center;
        margin-bottom: 2rem;
    }

    .platforms-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #00ff00;
        margin-bottom: 2rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .platforms-grid {
        display: flex;
        justify-content: center;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .platform-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 1px solid #00ff00;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        transition: all 0.3s ease;
        min-width: 150px;
    }

    .platform-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 20px rgba(0, 255, 0, 0.3);
        border-color: #00ffff;
    }

    .platform-logo {
        width: 60px;
        height: 60px;
        object-fit: contain;
        filter: brightness(0) invert(1);
        transition: filter 0.3s ease;
    }

    .platform-card:hover .platform-logo {
        filter: brightness(0) saturate(100%) invert(64%) sepia(96%) saturate(459%) hue-rotate(79deg) brightness(119%) contrast(119%);
    }

    .platform-name {
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        color: #00ff00;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    @media (max-width: 768px) {
        .container {
            padding: 1rem;
            padding-top: 8rem;
        }

        .title {
            font-size: 2.5rem;
        }

        .subtitle {
            font-size: 1.2rem;
        }

        .description {
            font-size: 1rem;
        }

        .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .features-grid {
            grid-template-columns: 1fr;
        }

        .cta-buttons {
            flex-direction: column;
            align-items: center;
        }

        .btn-primary,
        .btn-secondary {
            width: 100%;
            max-width: 300px;
        }

        .platforms-grid {
            flex-direction: column;
            align-items: center;
        }
    }
</style>