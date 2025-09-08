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
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
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

    .login-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 12px;
        padding: 3rem;
        width: 100%;
        max-width: 450px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    }
    
    .login-card::before {
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

    .login-card:hover::before {
        opacity: 1;
        animation: scan 1.5s ease-in-out infinite;
    }

    @keyframes scan {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
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
        position: relative;
        z-index: 1;
    }

    .btn-primary:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 20px rgba(0, 255, 255, 0.4);
    }
    
    .get-started-link {
        display: inline-block;
        margin-top: 2rem;
        font-size: 1rem;
        font-weight: 700;
        color: #00ff00;
        text-decoration: none;
        border: 2px solid #00ff00;
        padding: 0.8rem 1.5rem;
        border-radius: 6px;
        transition: all 0.3s ease;
    }

    .get-started-link:hover {
        background: #00ff00;
        color: #000;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
    }

</style>

<main class="container">
  <h1 class="title">Welcome to Quest Bot</h1>
  
  <div class="login-card">
    <form>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" placeholder="Enter your username">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Enter your password">
      </div>
      <button type="submit" class="btn-primary">Login</button>
    </form>
  </div>

  <a href="/choose-bot" class="get-started-link">Or Get Started</a>
</main>