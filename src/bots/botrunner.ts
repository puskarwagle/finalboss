// botrunner.ts - Common browser runner for all bots
import { chromium, firefox, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

interface BotModule {
  name: string;
  url: string;
  port: number;
  checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean>;
  waitForLogin(page: Page): Promise<void>;
  runAutomation?(page: Page): Promise<void>;
}

type BotName = 'seek' | 'linkedin' | 'indeed';
type BrowserType = 'chrome' | 'firefox';

// Get bot name and browser type from command line arguments
const botName = process.argv[2] as BotName;
const browserType = process.argv[3] as BrowserType;

if (!botName || !['seek', 'linkedin', 'indeed'].includes(botName)) {
  console.error('Usage: bun botrunner.ts <seek|linkedin|indeed> <chrome|firefox>');
  process.exit(1);
}

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
  console.error('Usage: bun botrunner.ts <seek|linkedin|indeed> <chrome|firefox>');
  process.exit(1);
}

(async (): Promise<void> => {
  try {
    // Import the specific bot module
    const botModule = await import(`./${botName}.ts`);
    const bot: BotModule = botModule.default;

    if (!bot) {
      throw new Error(`Bot module for ${botName} not found or invalid export`);
    }

    // Create persistent session directory
    const sessionDir = path.join(process.cwd(), 'sessions', botName);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    let context: BrowserContext;
    const sessionExists = fs.readdirSync(sessionDir).length > 0;
    
    // Launch browser with persistent session
    if (browserType === 'chrome') {
      context = await chromium.launchPersistentContext(sessionDir, {
        headless: false,
        args: [`--remote-debugging-port=${bot.port}`]
      });
    } else if (browserType === 'firefox') {
      context = await firefox.launchPersistentContext(sessionDir, {
        headless: false
      });
    } else {
      throw new Error(`Unsupported browser type: ${browserType}`);
    }
    
    const page = context.pages()[0] || await context.newPage();
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
        await context.close();
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