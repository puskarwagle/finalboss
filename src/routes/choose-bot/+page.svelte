<script>

  import { bots } from '../../bots/botsinit.json';

</script>



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
        max-width: 1200px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
    }

    .title {
        text-align: center;
        font-size: clamp(2rem, 5vw, 4rem);
        font-weight: 900;
        margin-bottom: 3rem;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        background: linear-gradient(45deg, #00ff00, #00ffff, #ff00ff);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 20px #00ff0050;
        animation: glow 2s ease-in-out infinite alternate;
    }

    @keyframes glow {
        from { filter: drop-shadow(0 0 5px #00ff00); }
        to { filter: drop-shadow(0 0 20px #00ff00); }
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        justify-items: center;
    }

    .bot-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 12px;
        padding: 2rem;
        width: 100%;
        max-width: 320px;
        text-align: center;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    }

    .bot-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(0, 255, 0, 0.1), transparent);
        transform: rotate(45deg);
        transition: all 0.5s ease;
        opacity: 0;
    }

    .bot-card:hover {
        transform: translateY(-8px);
        border-color: #00ffff;
        box-shadow: 0 10px 40px rgba(0, 255, 255, 0.4);
        background: linear-gradient(135deg, #001122, #003344);
    }

    .bot-card:hover::before {
        opacity: 1;
        animation: scan 1.5s ease-in-out infinite;
    }

    @keyframes scan {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }

    .avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin: 0 auto 1.5rem;
        border: 3px solid #00ff00;
        transition: all 0.3s ease;
        filter: brightness(0.8) contrast(1.2);
        position: relative;
        z-index: 2;
    }

    .bot-card:hover .avatar {
        border-color: #00ffff;
        filter: brightness(1.2) contrast(1.4);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
    }

    .bot-name {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #00ff00;
        transition: color 0.3s ease;
        position: relative;
        z-index: 2;
    }

    .bot-card:hover .bot-name {
        color: #00ffff;
        text-shadow: 0 0 10px #00ffff;
    }

    .bot-description {
        font-size: 0.9rem;
        color: #00cc00;
        line-height: 1.4;
        font-weight: 400;
        transition: color 0.3s ease;
        position: relative;
        z-index: 2;
    }

    .bot-card:hover .bot-description {
        color: #00dddd;
    }
</style>

<main class="container">
  <h1 class="title">Choose a Bot</h1>
  <div class="grid">
    {#each bots as bot}
      <div class="bot-card" role="button" tabindex="0">
        <img src={bot.avatar} alt={bot.name} class="avatar" />
        <h2 class="bot-name">{bot.name}</h2>
        <p class="bot-description">{bot.description}</p>
      </div>
    {/each}
  </div>
  
</main>