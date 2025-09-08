<nav>
  <div class="logo">
    <a href="/">Quest Bot</a>
  </div>
  <div class="links">
    <a href="/">Home</a>
    <a href="/choose-bot">Choose Bot</a>
    <a href="/welcome">Login</a>
  </div>
</nav>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: transparent;
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    font-family: 'Orbitron', monospace;
  }

  .logo a {
    font-size: 1.8rem;
    font-weight: 900;
    color: #00ff00;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    text-shadow: 0 0 10px #00ff0080;
    transition: all 0.3s ease;
  }

  .logo a:hover {
    color: #00ffff;
    text-shadow: 0 0 20px #00ffff;
  }

  .links a {
    color: #00ff00;
    text-decoration: none;
    padding: 0.5rem 1rem;
    margin: 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }

  .links a:hover {
    color: #00ffff;
    border-color: #00ffff;
    box-shadow: 0 0 10px #00ffff80;
  }
</style>
