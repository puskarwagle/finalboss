// linkedin.js
const { chromium, firefox } = require('playwright');
const path = require('path');
const fs = require('fs');

// Get browser type from command line argument
const browserType = process.argv[2];

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
  console.error('Usage: bun linkedin.js <chrome|firefox>');
  process.exit(1);
}

(async () => {
  // Create persistent session directory
  const sessionDir = path.join(process.cwd(), 'sessions', 'linkedin');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  let browser;
  const sessionExists = fs.readdirSync(sessionDir).length > 0;
  
  if (browserType === 'chrome') {
    browser = await chromium.launch({
      headless: false,
      args: ['--remote-debugging-port=9223'],
      userDataDir: sessionDir
    });
  } else if (browserType === 'firefox') {
    browser = await firefox.launch({
      headless: false,
      args: ['-profile', sessionDir]
    });
  }
  
  const page = await browser.newPage();
  await page.goto('https://linkedin.com/jobs');
  
  // Check if user is logged in by looking for sign-in button or login form
  const signInButton = await page.$('a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]');
  const isLoggedIn = !signInButton && sessionExists;
  
  if (!isLoggedIn) {
    console.log('🚨 LOGIN REQUIRED: Please log in to LinkedIn in the browser window');
    console.log('✋ The bot will wait for you to complete login...');
    
    // Wait for login completion (sign-in button disappears or redirect to feed)
    try {
      await page.waitForFunction(() => {
        return !document.querySelector('a[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]') ||
               window.location.href.includes('/feed/') ||
               window.location.href.includes('/mynetwork/');
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