import { Builder, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

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
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export const setupChromeDriver = async (): Promise<{ driver: WebDriver; actions: any }> => {
  try {
    const configPath = path.join(__dirname, 'user-bots-config.json');
    const config: BotConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const sessionsDir = path.join(process.cwd(), 'sessions');
    const screenshotsDir = path.join(sessionsDir, 'screenshots');
    const logsDir = path.join(sessionsDir, 'logs');
    const resumeDir = path.join(sessionsDir, 'resume');
    const tempDir = path.join(sessionsDir, 'temp');

    makeDirectories([sessionsDir, screenshotsDir, logsDir, resumeDir, tempDir]);

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

    printLog('IF YOU HAVE MORE THAN 10 TABS OPENED, PLEASE CLOSE OR BOOKMARK THEM! Or it\'s highly likely that application will just open browser and not do anything!');

    if (safeMode) {
      printLog('SAFE MODE: Will login with a guest profile, browsing history will not be saved in the browser!');
    } else {
      const profileDir = findDefaultProfileDirectory();
      if (profileDir) {
        // Create a separate profile directory for Selenium to avoid conflicts
        const seleniumProfileDir = path.join(profileDir, 'selenium-automation');
        options.addArguments(`--user-data-dir=${seleniumProfileDir}`);
        printLog(`Using Chrome profile: ${seleniumProfileDir}`);
      } else {
        printLog('Default profile directory not found. Logging in with a guest profile, Web history will not be saved!');
      }
    }

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(new (require('selenium-webdriver/chrome').ServiceBuilder)())
      .build();

    await driver.manage().window().maximize();

    const actions = driver.actions();

    return { driver, actions };

  } catch (error) {
    const errorMessage = 'Seems like either... \n\n1. Chrome is already running. \nA. Close all Chrome windows and try again. \n\n2. Google Chrome or Chromedriver is out dated. \nA. Update browser and Chromedriver! \n\n3. Chrome not installed or not in PATH. \nA. Install Chrome and ensure chromedriver is in PATH. \n\nPlease check GitHub discussions/support for solutions';

    printLog(errorMessage);
    console.error('Error in opening Chrome:', error);

    throw error;
  }
};

