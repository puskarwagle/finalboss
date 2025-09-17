// botrunner.js - Common browser runner for all bots
const { chromium, firefox } = require('playwright');
const path = require('path');
const fs = require('fs');

// Get bot name and browser type from command line arguments
const botName = process.argv[2];
const browserType = process.argv[3];

if (!botName || !['seek', 'linkedin', 'indeed'].includes(botName)) {
  console.error('Usage: bun botrunner.js <seek|linkedin|indeed> <chrome|firefox>');
  process.exit(1);
}

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
  console.error('Usage: bun botrunner.js <seek|linkedin|indeed> <chrome|firefox>');
  process.exit(1);
}

(async () => {
  try {
    // Import the specific bot module
    const botModule = await import(`./${botName}.js`);
    const bot = botModule.default;

    // Create persistent session directory
    const sessionDir = path.join(process.cwd(), 'sessions', botName);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    let browser;
    const sessionExists = fs.readdirSync(sessionDir).length > 0;
    
    // Launch browser with persistent session
    if (browserType === 'chrome') {
      browser = await chromium.launch({
        headless: false,
        args: [`--remote-debugging-port=${bot.port}`],
        userDataDir: sessionDir
      });
    } else if (browserType === 'firefox') {
      browser = await firefox.launch({
        headless: false,
        args: ['-profile', sessionDir]
      });
    }
    
    const page = await browser.newPage();
    await page.goto(bot.url);
    
    // Check if user is logged in using bot-specific logic
    const isLoggedIn = await bot.checkLoginStatus(page, sessionExists);
    
    if (!isLoggedIn) {
      console.log(`🚨 LOGIN REQUIRED: Please log in to ${bot.name} in the browser window`);
      console.log('✋ The bot will wait for you to complete login...');
      
      // Wait for login completion using bot-specific logic
      try {
        await bot.waitForLogin(page);
        console.log('✅ Login detected! Session has been saved.');
      } catch (error) {
        console.log('⏰ Login timeout reached. Please try again.');
        await browser.close();
        return;
      }
    } else {
      console.log('✅ Already logged in! Session restored.');
    }
    
    console.log(`🤖 ${bot.name} bot ready! Browser will remain open for you to use.`);
    console.log('Close the browser manually when done.');
    
    // Run bot-specific automation logic
    if (bot.runAutomation) {
      await bot.runAutomation(page);
    }
    
    // Don't close the browser automatically - let user interact
  } catch (error) {
    console.error(`Error running ${botName} bot:`, error);
    process.exit(1);
  }
})();