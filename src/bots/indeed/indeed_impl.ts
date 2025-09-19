import { WebDriver, By } from 'selenium-webdriver';
import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import { UniversalOverlay } from '../core/universal_overlay';
import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.indeed.com";

const printLog = (message: string) => {
  console.log(message);
};

// Step 0: Initialize Context
export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'indeed_selectors.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../core/user-bots-config.json'), 'utf8'));

  ctx.selectors = selectors;
  ctx.config = config;
  ctx.indeed_url = `${BASE_URL}/jobs?q=${encodeURIComponent(config.formData.keywords || '')}&l=${encodeURIComponent(config.formData.locations || '')}`;

  printLog(`Indeed Search URL: ${ctx.indeed_url}`);
  yield "ctx_ready";
}

// Step 1: Open Homepage
export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const { driver, sessionExists, sessionsDir } = await setupChromeDriver('indeed');
    ctx.driver = driver;
    ctx.sessionExists = sessionExists;
    ctx.sessionsDir = sessionsDir;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
    ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.indeed);

    await StealthFeatures.hideWebDriver(driver);
    await StealthFeatures.randomizeUserAgent(driver);

    printLog(`Opening Indeed: ${ctx.indeed_url}`);
    await driver.get(ctx.indeed_url);

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

// Step 2: Wait For Page Load
export async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const title = await ctx.driver.getTitle();
  yield title.toLowerCase().includes('indeed') ? "page_loaded" : "page_load_retry";
}

// Step 2.5: Refresh Page
export async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    if (!ctx.driver) {
      printLog("No driver available for refresh");
      yield "no_page_to_refresh";
      return;
    }

    printLog("Refreshing page...");
    await ctx.driver.navigate().refresh();
    await ctx.driver.sleep(5000);

    const currentUrl = await ctx.driver.getCurrentUrl();
    const title = await ctx.driver.getTitle();

    printLog(`After refresh - URL: ${currentUrl}, Title: ${title}`);

    if (currentUrl && title && !title.includes('error')) {
      yield "page_refreshed";
    } else {
      printLog("Refresh failed - will retry opening homepage");
      yield "page_reload_failed";
    }
  } catch (error) {
    printLog(`Refresh failed: ${error}`);
    yield "page_reload_failed";
  }
}

// Step 3: Detect Page State
export async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const pageSource = await ctx.driver.getPageSource();
  const hasSignIn = pageSource.includes('Sign in') || pageSource.includes('Create account');
  yield hasSignIn ? "sign_in_required" : "logged_in";
}

// Step 4: Show Sign In Banner
export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const overlay = new UniversalOverlay(ctx.driver);
  await overlay.showSignInOverlay();
  await ctx.driver.get(ctx.indeed_url);
  await ctx.driver.sleep(2000);
  yield "signin_banner_shown";
}

// Step 5: Perform Job Search
export async function* performJobSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const currentUrl = await ctx.driver.getCurrentUrl();
  yield currentUrl.includes('jobs') ? "search_completed" : "search_failed";
}

// Step 6: Collect Job Cards
export async function* collectJobCards(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = ctx.selectors?.job_cards || ['div[data-jk]'];

  for (const selector of selectors) {
    try {
      const cards = await ctx.driver.findElements(By.css(selector));
      if (cards.length > 0) {
        ctx.job_cards = cards;
        ctx.job_index = 0;
        ctx.total_jobs = cards.length;
        ctx.applied_jobs = 0;

        printLog(`Found ${cards.length} Indeed job cards`);
        yield "cards_collected";
        return;
      }
    } catch { continue; }
  }
  yield "cards_collect_retry";
}

// Step 7: Click Job Card
export async function* clickJobCard(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const cards = ctx.job_cards || [];
  const index = ctx.job_index || 0;

  if (!cards.length || index >= cards.length) {
    yield "job_cards_finished";
    return;
  }

  try {
    await ctx.driver.executeScript("arguments[0].scrollIntoView(true);", cards[index]);
    await cards[index].click();
    await ctx.driver.sleep(2000);
    ctx.job_index = index + 1;
    yield "job_card_clicked";
  } catch {
    ctx.job_index = index + 1;
    yield "job_card_skipped";
  }
}

// Step 8: Detect Apply Type
export async function* detectApplyType(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const result = await ctx.driver.executeScript(`
      const indeedApplyButton = document.querySelector('button[id*="indeedApplyButton"]');
      const applyButton = document.querySelector('button[aria-label*="Apply now"]');

      if (indeedApplyButton) {
        return 'indeed_apply';
      } else if (applyButton) {
        return 'external_apply';
      } else {
        return 'no_apply';
      }
    `);

    if (result === 'indeed_apply') {
      yield "indeed_apply_found";
    } else if (result === 'external_apply') {
      yield "external_apply_found";
    } else {
      yield "no_apply_found";
    }
  } catch {
    yield "no_apply_found";
  }
}

// Step 9: Parse Job Details
export async function* parseJobDetails(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const jobData = await ctx.driver.executeScript(`
      const title = document.querySelector('h1[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() || '';
      const company = document.querySelector('span[data-testid="jobsearch-JobInfoHeader-companyName"]')?.textContent?.trim() || '';
      const location = document.querySelector('div[data-testid="jobsearch-JobInfoHeader-companyLocation"]')?.textContent?.trim() || '';
      const description = document.querySelector('#jobDescriptionText')?.textContent?.trim() || '';

      return {
        title,
        company,
        location,
        description,
        url: window.location.href,
        scrapedAt: new Date().toISOString()
      };
    `);

    if (jobData && jobData.title) {
      // Save job data
      const jobsDir = path.join(__dirname, '..', 'jobs');
      if (!fs.existsSync(jobsDir)) {
        fs.mkdirSync(jobsDir, { recursive: true });
      }

      const company = (jobData.company || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `indeed_${company}_${Date.now()}.json`;
      const filepath = path.join(jobsDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(jobData, null, 2));
      printLog(`Indeed job saved: ${jobData.title} at ${jobData.company} (${filename})`);

      yield "job_parsed";
    } else {
      printLog("Failed to extract Indeed job data");
      yield "parse_failed";
    }
  } catch (error) {
    printLog(`Indeed job parsing error: ${error}`);
    yield "parse_failed";
  }
}

// Step 10: Click Apply Now
export async function* clickApplyNow(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Clicking Indeed Apply button...");

    const clicked = await ctx.driver.executeScript(`
      const indeedApplyButton = document.querySelector('button[id*="indeedApplyButton"]');

      if (indeedApplyButton && !indeedApplyButton.disabled) {
        indeedApplyButton.click();
        return true;
      }
      return false;
    `);

    if (clicked) {
      await ctx.driver.sleep(2000);
      printLog("Indeed Apply button clicked successfully");
      yield "apply_clicked";
    } else {
      printLog("Indeed Apply button not found or not clickable");
      yield "apply_failed";
    }
  } catch (error) {
    printLog(`Error clicking Indeed Apply: ${error}`);
    yield "apply_failed";
  }
}

// Step 11: Handle Application Flow
export async function* handleApplicationFlow(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  // Placeholder for Indeed application flow handling
  printLog("🚧 Indeed application flow handling - to be implemented");
  yield "manual_input_required";
}

// Step 12: Close and Continue
export async function* closeAndContinue(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Closing application and continuing to next job");
  yield "ready_for_next";
}

// Step 13: Skip to Next Card
export async function* skipToNextCard(_ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("External apply or no apply button found - skipping to next card");
  yield "card_skipped";
}

// Step 14: Stay Put
export async function* stayPut(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🛑 STAYING PUT - Indeed bot paused for development");
  printLog("📋 Page URL: " + await ctx.driver.getCurrentUrl());

  if (ctx.driver) {
    const overlay = new UniversalOverlay(ctx.driver);
    await overlay.showOverlay({
      title: '🛑 Indeed Bot Paused',
      html: `
        <div style="text-align: center; line-height: 1.6;">
          <p style="font-size: 18px; margin: 15px 0;"><strong>Indeed Development Mode</strong></p>
          <p style="color: #2557a7; font-size: 14px;">Bot paused for manual development</p>
          <p style="font-size: 12px; color: #ccc; margin-top: 20px;">Inspect page and continue development...</p>
        </div>
      `,
      position: { x: 20, y: 20 },
      draggable: true,
      collapsible: true,
      style: {
        backgroundColor: '#1a1a2a',
        borderColor: '#2557a7',
        textColor: '#ffffff'
      }
    });
  }

  await ctx.driver.sleep(600000); // 10 minutes
  yield "stay_put_complete";
}

// Export all step functions
export const indeedStepFunctions = {
  step0,
  openHomepage,
  waitForPageLoad,
  refreshPage,
  detectPageState,
  showSignInBanner,
  performJobSearch,
  collectJobCards,
  clickJobCard,
  detectApplyType,
  parseJobDetails,
  clickApplyNow,
  handleApplicationFlow,
  closeAndContinue,
  skipToNextCard,
  stayPut
};