// botrunner.ts - Common browser runner for all bots
import { chromium, firefox } from 'playwright';
import type { Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

interface ConfigData {
  formData: {
    keywords: string;
    locations: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface BotModule {
  name: string;
  url: string;
  port: number;
  checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean>;
  waitForLogin(page: Page): Promise<void>;
  runAutomation?(page: Page, config: ConfigData): Promise<void>;
}

type BotName = 'seek' | 'linkedin' | 'indeed';
type BrowserType = 'chrome' | 'firefox';


async function loadConfig(): Promise<ConfigData> {
  const configPath = path.resolve(process.cwd(), 'user-bots-config.json');

  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log('✅ Config loaded:', {
    keywords: configData.formData?.keywords,
    locations: configData.formData?.locations
  });
  return configData;
}

// Parse command line arguments
const args = process.argv.slice(2);
const botName = args[0] as BotName;
const browserType = args[1] as BrowserType;

// Parse flags
const usePlaywright = args.includes('--playwright');
const useSelenium = args.includes('--selenium');
const useFullscreen = args.includes('--fullscreen');
const sizeArg = args.find(arg => arg.startsWith('--size='));

let windowSize = { width: 1900, height: 1080 };
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
    // Special handling for Selenium workflows
    if (useSelenium && botName === 'seek') {
      console.log('🔧 Running Selenium-based Seek workflow...');

      try {
        // Import and run the seekWorkflow
        const { runSeekWorkflow } = await import('../bots/seekWorkflow.ts');
        await runSeekWorkflow();
        console.log('✅ Selenium workflow completed successfully!');
        return;
      } catch (error) {
        console.error('❌ Selenium workflow error:', error);
        throw error;
      }
    }

    // For non-Selenium bots, use the original Playwright approach
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

    let context: BrowserContext | null = null;
    const sessionExists = fs.readdirSync(sessionDir).length > 0;
    
    if (usePlaywright) {
      // Use Playwright's bundled browser
      let chromeArgs = [`--remote-debugging-port=${bot.port}`];

      if (useFullscreen) {
        chromeArgs.push('--kiosk');
        chromeArgs.push('--start-fullscreen');
      } else {
        chromeArgs.push(`--window-size=${windowSize.width},${windowSize.height}`);
        chromeArgs.push('--window-position=0,0');
      }

      if (browserType === 'chrome') {
        context = await chromium.launchPersistentContext(sessionDir, {
          headless: false,
          args: chromeArgs,
          viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 },
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
    } else {
      // Just launch Chrome and connect - simple and reliable
      if (browserType === 'chrome') {
        const { spawn } = await import('child_process');

        console.log(`🚀 Launching Chrome on port ${bot.port} with ${bot.url}...`);

        const chromeProcess = spawn('google-chrome', [
          `--remote-debugging-port=${bot.port}`,
          '--no-first-run',
          '--no-default-browser-check',
          `--user-data-dir=${sessionDir}`,
          bot.url
        ], {
          detached: true,
          stdio: 'ignore'
        });

        chromeProcess.unref();

        // Give Chrome a moment to start
        console.log('⏳ Waiting for Chrome to start...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔗 Connecting to Chrome...');
        const browser = await chromium.connectOverCDP(`http://localhost:${bot.port}`);
        context = browser.contexts()[0] || await browser.newContext();
        console.log('✅ Connected to Chrome!');
      } else {
        // For Firefox, use Playwright's bundled version
        context = await firefox.launchPersistentContext(sessionDir, {
          headless: false,
          viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 },
          screen: { width: windowSize.width, height: windowSize.height }
        });
      }
    }

    if (!context) {
      throw new Error('Failed to initialize browser context');
    }

    console.log(`📄 Getting page from context (${context.pages().length} pages available)...`);
    const page = context.pages()[0] || await context.newPage();
    console.log(`✅ Got page: ${page.url()}`);
    
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

    // Don't close Chrome when script ends - let user continue using it
    process.on('exit', () => {
      console.log('🎯 Bot script finished. Chrome will remain open for you to use.');
    });
    
    // Check current URL and navigate if needed
    console.log(`📍 Current page URL: ${page.url()}`);

    if (!page.url().includes(new URL(bot.url).hostname)) {
      console.log(`🌐 Navigating to ${bot.url}...`);
      try {
        await page.goto(bot.url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        console.log(`✅ Successfully navigated to ${bot.url}`);
      } catch (error) {
        if (browserClosed) {
          console.log('🔴 Browser was closed during navigation. Bot stopped.');
          process.exit(0);
        }
        console.error(`❌ Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      console.log(`✅ Already on ${bot.url}`);
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
        if (browserClosed || (error instanceof Error && error.message === 'Browser closed')) {
          console.log('🔴 Browser was closed during login. Bot stopped.');
          process.exit(0);
        }
        console.log('⏰ Login timeout reached. Please try again.');
        await context?.close();
        return;
      }
    } else {
      console.log('✅ Already logged in! Session restored.');
    }
    
    console.log(`🤖 ${bot.name} bot ready! Browser will remain open for you to use.`);
    console.log('Close the browser manually when done.');

    // Load configuration for automation
    const config = await loadConfig();

    // Run bot-specific automation logic
    if (bot.runAutomation) {
      console.log(`🔄 Starting automation for ${bot.name}...`);
      try {
        await bot.runAutomation(page, config);
        console.log(`✅ Automation completed for ${bot.name}`);
      } catch (error) {
        if (browserClosed) {
          console.log('🔴 Browser was closed during automation. Bot stopped.');
          process.exit(0);
        }
        console.error(`❌ Automation error for ${bot.name}:`, error);
        throw error;
      }
    } else {
      console.log(`⚠️ No automation function found for ${bot.name}`);
    }

    console.log('🎯 Automation completed! Chrome will remain open for you to continue using.');
    console.log('🔴 PRESS CTRL+C TO CLOSE BROWSER AND EXIT');

    // Keep script alive to prevent browser from closing
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {}); // Minimal memory usage
  } catch (error) {
    console.error(`Error running ${botName} bot:`, error);
    process.exit(1);
  }
})();