<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.js';
  import { page } from '$app/stores';
  import '../app.css';

  let sidebarCollapsed = false;
  let mobileMenuOpen = false;

  onMount(() => {
    auth.checkAuth();
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

{#if $page.data?.session?.user}
  <!-- Authenticated Layout with Sidebar -->
  <div class="app-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="hamburger" on:click={toggleMobileMenu}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="mobile-logo">Quest Bot</div>
      <div class="mobile-user">
        {$page.data.session.user.name?.split(' ')[0] || $page.data.session.user.email.split('@')[0]}
      </div>
    </header>

    <!-- Sidebar -->
    <aside class="sidebar" class:collapsed={sidebarCollapsed} class:mobile-open={mobileMenuOpen}>
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <a href="/app">Quest Bot</a>
        </div>
        <button class="sidebar-toggle" on:click={toggleSidebar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <a href="/app" class="nav-item" class:active={$page.url.pathname === '/app'} on:click={closeMobileMenu}>
          <div class="nav-icon">🏠</div>
          <span class="nav-text">Dashboard</span>
        </a>
        <a href="/choose-bot" class="nav-item" class:active={$page.url.pathname === '/choose-bot'} on:click={closeMobileMenu}>
          <div class="nav-icon">🤖</div>
          <span class="nav-text">Choose Bot</span>
        </a>
        <a href="/frontend-form" class="nav-item" class:active={$page.url.pathname === '/frontend-form'} on:click={closeMobileMenu}>
          <div class="nav-icon">⚙️</div>
          <span class="nav-text">Configuration</span>
        </a>
        <a href="/backend-analytics" class="nav-item" class:active={$page.url.pathname === '/backend-analytics'} on:click={closeMobileMenu}>
          <div class="nav-icon">📊</div>
          <span class="nav-text">Analytics</span>
        </a>
        <a href="/testfunctions" class="nav-item" class:active={$page.url.pathname === '/testfunctions'} on:click={closeMobileMenu}>
          <div class="nav-icon">🧪</div>
          <span class="nav-text">Test Functions</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-section">
          <div class="user-info">
            <div class="user-avatar">
              {($page.data.session.user.name || $page.data.session.user.email).charAt(0).toUpperCase()}
            </div>
            <div class="user-details">
              <div class="user-name">
                {$page.data.session.user.name || $page.data.session.user.email.split('@')[0]}
              </div>
              <div class="user-email">{$page.data.session.user.email}</div>
            </div>
          </div>
          <button class="logout-btn" on:click={() => auth.logout()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span class="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    {#if mobileMenuOpen}
      <div class="mobile-overlay" on:click={closeMobileMenu}></div>
    {/if}

    <!-- Main Content -->
    <main class="main-content" class:sidebar-collapsed={sidebarCollapsed}>
      <slot></slot>
    </main>
  </div>
{:else}
  <!-- Non-authenticated Layout -->
  <nav class="simple-nav">
    <div class="nav-logo">
      <a href="/login">Quest Bot</a>
    </div>
    <div class="nav-links">
      <a href="/login">Login</a>
    </div>
  </nav>

  <main class="simple-main">
    <slot></slot>
  </main>
{/if}

<style>
  /* App Layout */
  .app-layout {
    display: flex;
    height: 100vh;
    background: var(--bg-primary);
  }

  /* Mobile Header */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    z-index: 1001;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
  }

  .hamburger {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hamburger span {
    width: 20px;
    height: 2px;
    background: var(--color-primary);
    transition: all 0.3s ease;
  }

  .mobile-logo {
    font-weight: bold;
    color: var(--color-primary);
    font-size: 1.2rem;
  }

  .mobile-user {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  /* Sidebar */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    z-index: 1000;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 80px;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-logo a {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-primary);
    text-decoration: none;
    text-shadow: 0 0 10px var(--color-primary-bright);
  }

  .sidebar.collapsed .sidebar-logo a {
    font-size: 0;
  }

  .sidebar.collapsed .sidebar-logo a::before {
    content: "QB";
    font-size: 1.2rem;
  }

  .sidebar-toggle {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all 0.3s ease;
  }

  .sidebar-toggle:hover {
    color: var(--color-primary);
    background: var(--color-bg-hover);
  }

  .sidebar.collapsed .sidebar-toggle svg {
    transform: rotate(180deg);
  }

  /* Sidebar Navigation */
  .sidebar-nav {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    margin: 0.25rem 1rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: all 0.3s ease;
    position: relative;
  }

  .nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .nav-item.active {
    background: var(--color-primary);
    color: var(--color-black);
  }

  .nav-item.active::before {
    content: '';
    position: absolute;
    left: -1rem;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--color-primary);
  }

  .nav-icon {
    font-size: 1.2rem;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-text {
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .sidebar.collapsed .nav-text {
    opacity: 0;
    transform: translateX(-10px);
  }

  .sidebar.collapsed .nav-item {
    margin: 0.25rem 0.5rem;
    justify-content: center;
  }

  /* Sidebar Footer */
  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .user-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-black);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
  }

  .user-details {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
  }

  .logout-btn:hover {
    background: var(--color-error);
    color: white;
    border-color: var(--color-error);
  }

  .sidebar.collapsed .user-details,
  .sidebar.collapsed .logout-text {
    display: none;
  }

  .sidebar.collapsed .logout-btn {
    justify-content: center;
  }

  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: 280px;
    transition: all 0.3s ease;
    overflow-y: auto;
  }

  .main-content.sidebar-collapsed {
    margin-left: 80px;
  }

  /* Simple Layout for Non-authenticated */
  .simple-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .nav-logo a {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-primary);
    text-decoration: none;
    text-shadow: 0 0 10px var(--color-primary-bright);
  }

  .nav-links a {
    color: var(--color-primary);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    transition: all 0.3s ease;
  }

  .nav-links a:hover {
    background: var(--color-primary);
    color: var(--color-black);
  }

  .simple-main {
    min-height: calc(100vh - 80px);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }

    .sidebar {
      transform: translateX(-100%);
      width: 280px;
    }

    .sidebar.mobile-open {
      transform: translateX(0);
    }

    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    .main-content {
      margin-left: 0;
      padding-top: 60px;
    }

    .main-content.sidebar-collapsed {
      margin-left: 0;
    }

    .sidebar-toggle {
      display: none;
    }
  }

  @media (min-width: 769px) {
    .mobile-header {
      display: none;
    }
  }
</style>