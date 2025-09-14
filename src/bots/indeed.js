// indeed.js
const { chromium, firefox } = require('playwright');
const path = require('path');
const fs = require('fs');

// Get browser type from command line argument
const browserType = process.argv[2];

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
  console.error('Usage: bun indeed.js <chrome|firefox>');
  process.exit(1);
}

(async () => {
  // Create persistent session directory
  const sessionDir = path.join(process.cwd(), 'sessions', 'indeed');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  let browser;
  const sessionExists = fs.readdirSync(sessionDir).length > 0;
  
  if (browserType === 'chrome') {
    browser = await chromium.launch({
      headless: false,
      args: ['--remote-debugging-port=9224'],
      userDataDir: sessionDir
    });
  } else if (browserType === 'firefox') {
    browser = await firefox.launch({
      headless: false,
      args: ['-profile', sessionDir]
    });
  }
  
  const page = await browser.newPage();
  await page.goto('https://indeed.com');
  
  // Check if user is logged in by looking for sign-in link
  const signInLink = await page.$('a[href*="/account/login"]');
  const isLoggedIn = !signInLink && sessionExists;
  
  if (!isLoggedIn) {
    console.log('🚨 LOGIN REQUIRED: Please log in to Indeed in the browser window');
    console.log('✋ The bot will wait for you to complete login...');
    
    // Wait for login completion (sign-in link disappears or profile menu appears)
    try {
      await page.waitForFunction(() => {
        return !document.querySelector('a[href*="/account/login"]') ||
               document.querySelector('[data-testid="AccountMenu"]') ||
               document.querySelector('[data-testid="account-menu-button"]');
      }, { timeout: 300000 }); // 5 minutes
      console.log('✅ Login detected! Session has been saved.');
    } catch (error) {
      console.log('⏰ Login timeout reached. Please try again.');
      await browser.close();
      return;
    }
  } else {
    console.log('✅ Already logged in! Session restored.');
  }
  
  console.log('🤖 Bot ready! Browser will remain open for you to use.');
  console.log('Close the browser manually when done.');
  
  // Don't close the browser automatically - let user interact
})();