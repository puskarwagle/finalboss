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
      // Launch user's regular Chrome with debugging enabled
      if (browserType === 'chrome') {
        const { spawn } = await import('child_process');
        
        // Try to connect first
        try {
          console.log(`🔍 Trying to connect to existing Chrome on port ${bot.port}...`);
          const browser = await chromium.connectOverCDP(`http://localhost:${bot.port}`);
          context = browser.contexts()[0] || await browser.newContext();
          console.log('✅ Connected to existing Chrome browser');
        } catch (error) {
          console.log(`❌ Failed to connect to existing Chrome: ${error.message}`);
          console.log(`🚀 Starting your regular Chrome with debugging enabled...`);
          
          // Launch user's Chrome with debugging
          const chromeProcess = spawn('google-chrome', [
            `--remote-debugging-port=${bot.port}`,
            '--no-first-run',
            '--no-default-browser-check',
            `--user-data-dir=${sessionDir}`
          ], { 
            detached: true,
            stdio: 'ignore'
          });
          
          chromeProcess.unref();
          
          // Wait and retry connection with backoff
          let connected = false;
          for (let attempt = 1; attempt <= 10; attempt++) {
            console.log(`Waiting for Chrome to start... (attempt ${attempt}/10)`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            
            try {
              const browser = await chromium.connectOverCDP(`http://localhost:${bot.port}`);
              context = browser.contexts()[0] || await browser.newContext();
              console.log('✅ Connected to your regular Chrome browser');
              console.log(`📊 Browser contexts: ${browser.contexts().length}`);
              connected = true;
              break;
            } catch (retryError) {
              console.log(`Attempt ${attempt} failed: ${retryError.message}`);
            }
          }
          
          if (!connected) {
            console.log(`❌ Failed to connect to Chrome after 10 attempts.`);
            console.log(`🔄 Falling back to Playwright mode...`);
            
            // Kill any existing Chrome process on this port
            try {
              const { exec } = await import('child_process');
              await new Promise(resolve => exec(`pkill -f "remote-debugging-port=${bot.port}"`, resolve));
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (killError) {
              console.log('Note: Could not kill existing Chrome processes');
            }
            
            // Use Playwright's bundled Chrome instead
            context = await chromium.launchPersistentContext(sessionDir, {
              headless: false,
              args: [`--remote-debugging-port=${bot.port + 1}`], // Use different port
              viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 },
              screen: { width: windowSize.width, height: windowSize.height }
            });
            console.log('✅ Started with Playwright bundled Chrome');
          }
        }
      } else {
        // For Firefox, still use Playwright's bundled version
        context = await firefox.launchPersistentContext(sessionDir, {
          headless: false,
          viewport: useFullscreen ? null : { width: windowSize.width, height: windowSize.height - 120 },
          screen: { width: windowSize.width, height: windowSize.height }
        });
      }
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
    
    // Navigate to the site
    try {
      console.log(`🌐 Navigating to ${bot.url}...`);
      await page.goto(bot.url);
      console.log(`✅ Successfully navigated to ${bot.url}`);
      console.log(`📍 Current page URL: ${page.url()}`);
    } catch (error) {
      if (browserClosed) {
        console.log('🔴 Browser was closed during navigation. Bot stopped.');
        process.exit(0);
      }
      console.error(`❌ Navigation failed: ${error.message}`);
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
      console.log(`🔄 Starting automation for ${bot.name}...`);
      try {
        await bot.runAutomation(page);
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
    
    // Keep the process alive until browser is closed
    // The browser close event handler will terminate the process
  } catch (error) {
    console.error(`Error running ${botName} bot:`, error);
    process.exit(1);
  }
})();