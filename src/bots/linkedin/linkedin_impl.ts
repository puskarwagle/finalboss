import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.linkedin.com";

const printLog = (message: string) => {
  console.log(message);
};

// Step 0: Initialize Context
export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'linkedin_selectors.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../core/user-bots-config.json'), 'utf8'));

  ctx.selectors = selectors;
  ctx.config = config;
  ctx.linkedin_url = `${BASE_URL}/jobs/search/?keywords=${encodeURIComponent(config.formData.keywords || '')}&location=${encodeURIComponent(config.formData.locations || '')}`;

  printLog(`LinkedIn Search URL: ${ctx.linkedin_url}`);
  yield "ctx_ready";
}

// Step 1: Open Homepage
export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const { driver, sessionExists, sessionsDir } = await setupChromeDriver('linkedin');
    ctx.driver = driver;
    ctx.sessionExists = sessionExists;
    ctx.sessionsDir = sessionsDir;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
    ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.linkedin);

    await StealthFeatures.hideWebDriver(driver);
    await StealthFeatures.randomizeUserAgent(driver);

    printLog(`Opening LinkedIn: ${ctx.linkedin_url}`);
    await driver.get(ctx.linkedin_url);

    await driver.sleep(5000);

    const currentUrl = await driver.getCurrentUrl();
    const title = await driver.getTitle();

    printLog(`Current URL: ${currentUrl}`);
    printLog(`Page title: ${title}`);

    if (currentUrl && title && !title.includes('error')) {
      yield "homepage_opened";
    } else {
      printLog("Page load failed - will retry");
      yield "page_navigation_failed";
    }
  } catch (error) {
    printLog(`Homepage opening failed: ${error}`);
    yield "page_navigation_failed";
  }
}

// Export all step functions
export const linkedinStepFunctions = {
  step0,
  openHomepage
};