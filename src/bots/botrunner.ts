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

// Parse command line arguments
const args = process.argv.slice(2);
const botName = args[0] as BotName;
const browserType = args[1] as BrowserType;

// Parse flags
const useNewContext = args.includes('--new-context');
const usePlaywright = args.includes('--playwright');
const useFullscreen = args.includes('--fullscreen');
const sizeArg = args.find(arg => arg.startsWith('--size='));

let windowSize = { width: 1920, height: 1080 };
if (sizeArg) {
  const [width, height] = sizeArg.split('=')[1].split('x').map(Number);
  if (width && height) {
    windowSize = { width, height };
  }
}

if (!botName || !['seek', 'linkedin', 'indeed'].includes(botName)) {
  console.error('Usage: bun botrunner.ts <seek|linkedin|indeed> <chrome|firefox> [flags]');
  process.exit(1);
}

if (!browserType || !['chrome', 'firefox'].includes(browserType)) {
  console.error('Usage: bun botrunner.ts <seek|linkedin|indeed> <chrome|firefox> [flags]');
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
    
    // Build browser launch arguments
    let chromeArgs = [`--remote-debugging-port=${bot.port}`];
    
    if (useFullscreen) {
      chromeArgs.push('--kiosk');
      chromeArgs.push('--start-fullscreen');
    } else {
      // Force the exact window size
      chromeArgs.push(`--window-size=${windowSize.width},${windowSize.height}`);
      chromeArgs.push('--window-position=0,0');
      // Remove start-maximized as it conflicts with explicit sizing
    }

    // Launch browser with persistent session and proper viewport
    if (browserType === 'chrome') {
      context = await chromium.launchPersistentContext(sessionDir, {
        headless: false,
        args: chromeArgs,
        viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 }, // Account for browser UI
        screen: { width: windowSize.width, height: windowSize.height }
      });
    } else if (browserType === 'firefox') {
      context = await firefox.launchPersistentContext(sessionDir, {
        headless: false,
        viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 },
        screen: { width: windowSize.width, height: windowSize.height }
      });
    } else {
      throw new Error(`Unsupported browser type: ${browserType}`);
    }
    
    const page = context.pages()[0] || await context.newPage();
    
    // Set viewport size to match window
    if (!useFullscreen) {
      await page.setViewportSize({ 
        width: windowSize.width, 
        height: windowSize.height - 120 // Account for browser chrome
      });
    }
    
    // Set up browser close detection
    let browserClosed = false;
    context.on('close', () => {
      browserClosed = true;
      console.log('🔴 Browser window was closed manually. Bot stopped.');
      process.exit(0);
    });
    
    // Navigate to the site
    try {
      await page.goto(bot.url);
    } catch (error) {
      if (browserClosed) {
        console.log('🔴 Browser was closed during navigation. Bot stopped.');
        process.exit(0);
      }
      throw error;
    }
    
    // Check if user is logged in using bot-specific logic
    const isLoggedIn = await bot.checkLoginStatus(page, sessionExists);
    
    if (!isLoggedIn) {
      console.log(`🚨 LOGIN REQUIRED: Please log in to ${bot.name} in the browser window`);
      console.log('✋ The bot will wait for you to complete login...');
      
      // Wait for login completion using bot-specific logic
      try {
        await Promise.race([
          bot.waitForLogin(page),
          new Promise((_, reject) => {
            context.on('close', () => reject(new Error('Browser closed')));
          })
        ]);
        console.log('✅ Login detected! Session has been saved.');
      } catch (error) {
        if (browserClosed || error.message === 'Browser closed') {
          console.log('🔴 Browser was closed during login. Bot stopped.');
          process.exit(0);
        }
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
      try {
        await bot.runAutomation(page);
      } catch (error) {
        if (browserClosed) {
          console.log('🔴 Browser was closed during automation. Bot stopped.');
          process.exit(0);
        }
        throw error;
      }
    }
    
    // Keep the process alive until browser is closed
    // The browser close event handler will terminate the process
  } catch (error) {
    console.error(`Error running ${botName} bot:`, error);
    process.exit(1);
  }
})();