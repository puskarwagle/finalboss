<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let name = $state("");
  let greetMsg = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }
</script>

<div class="container">
  <h1 class="title">Welcome to Tauri + Svelte</h1>

  <div class="logo-grid">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="logo svelte-kit" alt="SvelteKit Logo" />
    </a>
  </div>
  <p>Click on the Tauri, Vite, and SvelteKit logos to learn more.</p>

  <div class="greet-card">
    <form onsubmit={greet}>
      <div class="form-group">
        <label for="greet-input">Enter a name</label>
        <input id="greet-input" placeholder="Enter a name..." bind:value={name} />
      </div>
      <button type="submit" class="btn-primary">Greet</button>
    </form>
    {#if greetMsg}
      <p class="greet-msg">{greetMsg}</p>
    {/if}
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
        padding-top: 10rem; /* Increased padding to avoid nav overlap */
        max-width: 1200px;
        margin: 0 auto;
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .title {
        text-align: center;
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 900;
        margin-bottom: 2rem;
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

    .logo-grid {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    .logo {
        height: 4em;
        will-change: filter;
        transition: filter 0.3s ease;
    }
    .logo:hover {
        filter: drop-shadow(0 0 2em #24c8db);
    }

    p {
        color: #00cc00;
        margin-bottom: 2rem;
    }

    .greet-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 12px;
        padding: 2rem;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #00ff00;
        text-align: left;
    }

    input {
        width: 100%;
        background: rgba(0, 20, 0, 0.8);
        border: 1px solid #00ff00;
        border-radius: 6px;
        padding: 0.8rem 1rem;
        color: #00ff00;
        font-family: 'Orbitron', monospace;
        font-size: 1rem;
        transition: all 0.3s ease;
    }

    input:focus {
        outline: none;
        border-color: #00ffff;
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    }

    .btn-primary {
        width: 100%;
        background: linear-gradient(45deg, #00ff00, #00ffff);
        border: none;
        border-radius: 6px;
        padding: 1rem;
        font-family: 'Orbitron', monospace;
        font-size: 1.2rem;
        font-weight: 700;
        color: #000;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 20px rgba(0, 255, 255, 0.4);
    }

    .greet-msg {
        margin-top: 1.5rem;
        font-size: 1.2rem;
        color: #00ffff;
        text-shadow: 0 0 10px #00ffff;
    }
</style>