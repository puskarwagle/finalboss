import { Builder, WebDriver } from 'selenium-webdriver';
import { Options, ServiceBuilder } from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BotConfig {
  formData: {
    enableDeepSeek: boolean;
    deepSeekApiKey: string;
    acceptTerms: boolean;
  };
}

const makeDirectories = (dirs: string[]) => {
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const findDefaultProfileDirectory = (): string | null => {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) return null;

  const profilePaths = [
    path.join(homeDir, '.config/google-chrome/Default'),
    path.join(homeDir, 'Library/Application Support/Google/Chrome/Default'),
    path.join(homeDir, 'AppData/Local/Google/Chrome/User Data/Default')
  ];

  for (const profilePath of profilePaths) {
    if (fs.existsSync(profilePath)) {
      return path.dirname(profilePath);
    }
  }
  return null;
};

const printLog = (message: string) => {
  console.log(message);
};

// Monitor browser windows and detect manual closure
export const monitorBrowserClose = (driver: WebDriver, onBrowserClosed?: () => void): (() => void) => {
  const checkInterval = setInterval(async () => {
    try {
      const handles = await driver.getAllWindowHandles();
      if (handles.length === 0) {
        printLog("Browser manually closed by user - shutting down bot");
        clearInterval(checkInterval);
        if (onBrowserClosed) {
          onBrowserClosed();
        } else {
          process.exit(0);
        }
      }
    } catch (error) {
      // Browser is no longer accessible
      printLog("Browser connection lost - shutting down bot");
      clearInterval(checkInterval);
      if (onBrowserClosed) {
        onBrowserClosed();
      } else {
        process.exit(0);
      }
    }
  }, 2000); // Check every 2 seconds

  // Return function to stop monitoring
  return () => {
    clearInterval(checkInterval);
  };
};

export const setupChromeDriver = async (botName: string = 'seek'): Promise<{ driver: WebDriver; actions: any; sessionExists: boolean; sessionsDir: string }> => {
  try {
    const configPath = path.join(__dirname, 'user-bots-config.json');
    const config: BotConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Create session management like botrunner.ts
    const sessionsDir = path.join(process.cwd(), 'sessions', botName);
    const screenshotsDir = path.join(sessionsDir, 'screenshots');
    const logsDir = path.join(sessionsDir, 'logs');
    const resumeDir = path.join(sessionsDir, 'resume');
    const tempDir = path.join(sessionsDir, 'temp');

    makeDirectories([sessionsDir, screenshotsDir, logsDir, resumeDir, tempDir]);

    // Check if session exists (has saved data)
    const sessionExists = fs.readdirSync(sessionsDir).filter(file =>
      !['screenshots', 'logs', 'resume', 'temp'].includes(file)
    ).length > 0;

    const options = new Options();

    const runInBackground = process.env.HEADLESS === 'true';
    const disableExtensions = process.env.DISABLE_EXTENSIONS === 'true';
    const safeMode = process.env.SAFE_MODE === 'true';

    if (runInBackground) options.addArguments('--headless');
    if (disableExtensions) options.addArguments('--disable-extensions');

    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--remote-debugging-port=0'); // Use random available port
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');


    if (safeMode) {
      printLog('SAFE MODE: Will login with a guest profile, browsing history will not be saved in the browser!');
    } else {
      // Use the session directory for Chrome profile (like botrunner.ts)
      options.addArguments(`--user-data-dir=${sessionsDir}`);
      if (sessionExists) {
        printLog(`Using existing session: ${sessionsDir}`);
      } else {
        printLog(`Creating new session: ${sessionsDir}`);
      }
    }

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(new ServiceBuilder())
      .build();

    await driver.manage().window().maximize();

    const actions = driver.actions();

    // Start monitoring for manual browser closure
    const stopMonitoring = monitorBrowserClose(driver);

    return { driver, actions, sessionExists, sessionsDir, stopMonitoring };

  } catch (error) {
    const errorMessage = 'Seems like either... \n\n1. Chrome is already running. \nA. Close all Chrome windows and try again. \n\n2. Google Chrome or Chromedriver is out dated. \nA. Update browser and Chromedriver! \n\n3. Chrome not installed or not in PATH. \nA. Install Chrome and ensure chromedriver is in PATH. \n\nPlease check GitHub discussions/support for solutions';

    printLog(errorMessage);
    console.error('Error in opening Chrome:', error);

    throw error;
  }
};

