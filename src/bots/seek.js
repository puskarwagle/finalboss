/*
 * SEEK BOT - Automated job application assistant
 * 
 * This script connects to Seek.com.au and helps manage job applications.
 * It can connect to your existing browser or launch a new one with session persistence.
 *
 * USAGE EXAMPLES:
 * 
 * Basic usage (connects to existing browser, falls back to new):
 *   bun seek.js chrome
 *   bun seek.js firefox
 *   bun seek.js chromium
 * 
 * Force new browser with persistent session:
 *   bun seek.js chrome --new-context
 *   bun seek.js firefox --new-context
 * 
 * Use Playwright bundled browsers (no session persistence):
 *   bun seek.js chrome --playwright
 *   bun seek.js firefox --playwright
 * 
 * REQUIREMENTS:
 * - For existing browser connection: Start Chrome/Firefox with remote debugging
 *   Chrome: chrome --remote-debugging-port=9222
 *   Firefox: firefox --remote-debugging-port=6000
 * 
 * FEATURES:
 * - Automatic login detection
 * - Session persistence (except with --playwright flag)
 * - Fallback browser selection
 * - Multiple browser support
 */

const { chromium, firefox } = require('playwright');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const browserType = args.find(arg => ['chrome', 'firefox', 'chromium'].includes(arg));
const useExisting = !args.includes('--new-context');
const forceNew = args.includes('--new-context');
const usePlaywright = args.includes('--playwright');
const useFullscreen = args.includes('--fullscreen');
const customSize = args.find(arg => arg.startsWith('--size='));

// Parse custom size if provided (format: --size=1920x1080)
let windowSize = null;
if (customSize) {
  const [width, height] = customSize.split('=')[1].split('x').map(Number);
  if (width && height) {
    windowSize = { width, height };
  }
}

if (!browserType) {
  console.error('Usage: bun seek.js <chrome|firefox|chromium> [FLAGS]');
  console.error('');
  console.error('BROWSER OPTIONS:');
  console.error('  chrome     - Use system Chrome browser');
  console.error('  firefox    - Use system Firefox browser'); 
  console.error('  chromium   - Use system Chromium browser');
  console.error('');
  console.error('FLAGS:');
  console.error('  --new-context  Force new browser instead of connecting to existing');
  console.error('  --playwright   Use Playwright bundled browser (no session persistence)');
  console.error('  --fullscreen   Launch browser in kiosk mode (true fullscreen)');
  console.error('  --size=WxH     Launch browser with custom window size (e.g., --size=1920x1080)');
  console.error('');
  console.error('WINDOW MODES:');
  console.error('  Default: Maximized window (recommended)');
  console.error('  --fullscreen: Kiosk mode with no browser UI');
  console.error('  --size=WxH: Custom window dimensions');
  console.error('');
  console.error('EXAMPLES:');
  console.error('  bun seek.js chrome                    # Maximized Chrome window');
  console.error('  bun seek.js firefox --fullscreen     # Firefox in kiosk mode');
  console.error('  bun seek.js chrome --size=1366x768   # Chrome with custom size');
  console.error('  bun seek.js chrome --playwright      # Use Playwright bundled browser');
  process.exit(1);
}

// Build launch options based on window preferences
function getBrowserLaunchOptions() {
  const options = {
    headless: false,
    args: ['--remote-debugging-port=9222']
  };

  if (useFullscreen) {
    // Kiosk mode - true fullscreen with no browser UI
    options.args.push('--kiosk');
    console.log('🖥️  Using kiosk mode (fullscreen with no browser UI)');
  } else if (windowSize) {
    // Custom window size
    options.args.push(`--window-size=${windowSize.width},${windowSize.height}`);
    options.args.push(`--window-position=0,0`);
    console.log(`🖥️  Using custom window size: ${windowSize.width}x${windowSize.height}`);
  } else {
    // Default: maximized window - use multiple flags for better compatibility
    options.args.push('--start-maximized');
    options.args.push('--window-size=1920,1080');
    options.args.push('--window-position=0,0');
    console.log('🖥️  Using maximized window (default)');
  }

  return options;
}

function getContextLaunchOptions(sessionDir) {
  const options = {
    headless: false,
    args: ['--remote-debugging-port=9222']
  };

  if (useFullscreen) {
    options.args.push('--kiosk');
    console.log('🖥️  Using kiosk mode (fullscreen with no browser UI)');
  } else if (windowSize) {
    options.args.push(`--window-size=${windowSize.width},${windowSize.height}`);
    options.args.push(`--window-position=0,0`);
    options.viewport = { width: windowSize.width, height: windowSize.height };
    console.log(`🖥️  Using custom window size: ${windowSize.width}x${windowSize.height}`);
  } else {
    // Default: maximized window
    options.args.push('--start-maximized');
    options.args.push('--window-size=1920,1080');
    options.args.push('--window-position=0,0');
    options.viewport = null; // Let browser determine viewport
    console.log('🖥️  Using maximized window (default)');
  }

  return options;
}

(async () => {
  let browser, page;
  
  /*
   * STEP 1: Try to connect to existing browser
   * This attempts to connect to an already running browser instance
   * Only if user hasn't forced new context and isn't using playwright
   */
  if (useExisting && !forceNew && !usePlaywright) {
    try {
      console.log(`🔍 Looking for existing ${browserType} browser...`);
      
      if (browserType === 'chrome' || browserType === 'chromium') {
        /*
         * Connect to Chrome/Chromium via Chrome DevTools Protocol
         * Requires browser to be started with: --remote-debugging-port=9222
         */
        browser = await chromium.connectOverCDP('http://localhost:9222');
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();
        page = pages[0] || await context.newPage();
        console.log(`✅ Connected to existing ${browserType} browser`);
      } else if (browserType === 'firefox') {
        /*
         * Connect to Firefox via remote debugging
         * Requires browser to be started with: --remote-debugging-port=6000
         * Note: Firefox CDP support is limited compared to Chrome
         */
        browser = await firefox.connectOverCDP('http://localhost:6000');
        const contexts = browser.contexts();
        const context = contexts[0] || await browser.newContext();
        const pages = context.pages();
        page = pages[0] || await context.newPage();
        console.log('✅ Connected to existing Firefox browser');
      }
    } catch (error) {
      console.log(`⚠️  Could not connect to existing ${browserType} browser`);
      console.log('💡 Tip: Start browser with remote debugging enabled:');
      if (browserType === 'chrome' || browserType === 'chromium') {
        console.log(`   ${browserType} --remote-debugging-port=9222`);
      } else if (browserType === 'firefox') {
        console.log('   firefox --remote-debugging-port=6000');
      }
      console.log('🚀 Launching new browser with persistent session...');
    }
  }
  
  /*
   * STEP 2: Launch new browser if existing connection failed
   * Two modes: Playwright bundled browser vs System browser with persistence
   */
  if (!browser) {
    if (usePlaywright) {
      /*
       * PLAYWRIGHT MODE: Use bundled browser
       * - No session persistence
       * - Isolated from system browser
       * - Always works regardless of system browser installation
       */
      console.log(`🚀 Launching Playwright ${browserType} browser...`);
      
      if (browserType === 'chrome' || browserType === 'chromium') {
        const launchOptions = getBrowserLaunchOptions();
        browser = await chromium.launch(launchOptions);
      } else if (browserType === 'firefox') {
        const launchOptions = getBrowserLaunchOptions();
        // Firefox doesn't use remote debugging port in the same way
        launchOptions.args = launchOptions.args.filter(arg => !arg.includes('remote-debugging-port'));
        browser = await firefox.launch(launchOptions);
      }
      
      const context = await browser.newContext();
      page = await context.newPage();
      
      // For Playwright mode, programmatically maximize if not fullscreen or custom size
      if (!useFullscreen && !windowSize) {
        try {
          await page.setViewportSize({ width: 1920, height: 1080 });
        } catch (e) {
          // Ignore viewport errors in Playwright mode
        }
      }
      
      console.log(`✅ Launched Playwright ${browserType} browser`);
    } else {
      /*
       * PERSISTENT SESSION MODE: Use system browser with data persistence
       * - Sessions saved to ./sessions/seek/ directory
       * - Login state preserved between runs
       * - Uses system-installed browser
       */
      const sessionDir = path.join(process.cwd(), 'sessions', 'seek');
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      let context;
      
      if (browserType === 'chrome' || browserType === 'chromium') {
        const contextOptions = getContextLaunchOptions(sessionDir);
        contextOptions.channel = browserType === 'chrome' ? 'chrome' : undefined;
        context = await chromium.launchPersistentContext(sessionDir, contextOptions);
      } else if (browserType === 'firefox') {
        const contextOptions = getContextLaunchOptions(sessionDir);
        // Firefox doesn't use remote debugging port in persistent context
        contextOptions.args = contextOptions.args.filter(arg => !arg.includes('remote-debugging-port'));
        context = await firefox.launchPersistentContext(sessionDir, contextOptions);
      }
      
      page = context.pages()[0] || await context.newPage();
      console.log(`✅ Launched new ${browserType} browser with persistent session`);
      console.log(`📁 Session data saved to: ${sessionDir}`);
    }
  }
  /*
   * STEP 3: Navigate to Seek and handle authentication
   * Check login status and wait for user login if needed
   */
  await page.goto('https://seek.com.au');
  
  // Check if user is logged in by looking for the sign-in button
  const signInButton = await page.$('a[data-automation="sign in"][title="Sign in"]');
  const hasSession = !usePlaywright; // Only persistent contexts have sessions
  const isLoggedIn = !signInButton && hasSession;
  
  if (!isLoggedIn) {
    console.log('🚨 LOGIN REQUIRED: Please log in to Seek in the browser window');
    console.log('✋ The bot will wait for you to complete login...');
    
    /*
     * Wait for login completion (sign-in button disappears)
     * Timeout after 5 minutes to prevent hanging indefinitely
     */
    try {
      await page.waitForSelector('a[data-automation="sign in"][title="Sign in"]', { 
        state: 'hidden', 
        timeout: 300000 // 5 minutes
      });
      console.log('✅ Login detected! Session has been saved.');
    } catch (error) {
      console.log('⏰ Login timeout reached. Please try again.');
      if (browser && browser.close) {
        await browser.close();
      }
      return;
    }
  } else {
    console.log('✅ Already logged in! Session restored.');
  }
  
  /*
   * STEP 4: Bot ready for interaction
   * Browser remains open for manual interaction or automation
   * Set up graceful shutdown when browser is closed
   */
  console.log('🤖 Bot ready! Browser will remain open for you to use.');
  console.log('💡 You can now manually browse or add automation scripts here.');
  console.log('🔴 Close the browser manually when done.');
  
  // Set up event listeners for graceful shutdown
  if (browser) {
    // For regular browser instances (playwright mode)
    browser.on('disconnected', () => {
      console.log('👋 Browser closed. Script shutting down gracefully...');
      process.exit(0);
    });
  } else if (page.context()) {
    // For persistent context instances
    const context = page.context();
    context.on('close', () => {
      console.log('👋 Browser closed. Script shutting down gracefully...');
      process.exit(0);
    });
  }

  // Also handle page close events
  page.on('close', () => {
    console.log('👋 Page closed. Script shutting down gracefully...');
    process.exit(0);
  });

  // Keep the script running - browser stays open for user interaction
  // Script will exit automatically when browser is closed
})();
