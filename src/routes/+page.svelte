<script>
  import { goto } from '$app/navigation';

  function navigateTo(path) {
    goto(path);
  }
</script>

<main>
  <h1>Quest Bot</h1>
  <p>Welcome to your automation platform</p>
  
  <div class="actions">
    <button on:click={() => navigateTo('/choose-bot')}>Choose Bot</button>
    <button on:click={() => navigateTo('/welcome')}>Login</button>
    <button on:click={() => navigateTo('/control-bar')}>Control Bar</button>
    <button on:click={() => navigateTo('/frontend-form')}>Configuration</button>
    <button on:click={() => navigateTo('/backend-analytics')}>Analytics</button>
  </div>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(45deg, #000, #001100);
    font-family: 'Orbitron', monospace;
    color: #00ff00;
    text-align: center;
    padding-top: 80px;
  }

  h1 {
    font-size: 3rem;
    font-weight: 900;
    margin-bottom: 1rem;
    text-shadow: 0 0 20px #00ff00;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.8;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    max-width: 800px;
  }

  button {
    background: transparent;
    color: #00ff00;
    border: 1px solid #00ff00;
    padding: 1rem 2rem;
    font-family: 'Orbitron', monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  button:hover {
    background: #00ff0020;
    box-shadow: 0 0 20px #00ff0080;
    color: #00ffff;
    border-color: #00ffff;
  }
</style>