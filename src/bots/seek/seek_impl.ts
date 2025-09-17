import { WebDriver, By } from 'selenium-webdriver';
import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import { UniversalOverlay } from '../core/universal_overlay';
import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';


const BASE_URL = "https://www.seek.com.au";

const printLog = (message: string) => {
  console.log(message);
};

function slugify(text: string): string {
  if (!text) return "";
  text = text.trim().toLowerCase();
  text = text.replace(/[^a-z0-9]+/g, "-");
  text = text.replace(/-+/g, "-");
  return text.replace(/^-|-$/g, "");
}

// Build search URL from keywords and location
function build_search_url(base_url: string, keywords: string, location: string): string {
  const keyword_slug = slugify(keywords);
  const location_slug = slugify(location);

  let search_path = keyword_slug ? `/${keyword_slug}-jobs` : "/jobs";
  if (location_slug) {
    search_path += `/in-${location_slug}`;
  }

  return `${base_url}${search_path}`;
}

// Step 0: Initialize Context
export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'seek_selectors.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../core/user-bots-config.json'), 'utf8'));

  ctx.selectors = selectors;
  ctx.config = config;
  ctx.seek_url = build_search_url(BASE_URL, config.formData.keywords || "", config.formData.locations || "");

  printLog(`Search URL: ${ctx.seek_url}`);
  yield "ctx_ready";
}

// Step 1: Open Homepage
export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const { driver, sessionExists, sessionsDir } = await setupChromeDriver('seek');
  ctx.driver = driver;
  ctx.sessionExists = sessionExists;
  ctx.sessionsDir = sessionsDir;
  ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
  ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.seek);

  await StealthFeatures.hideWebDriver(driver);
  await StealthFeatures.randomizeUserAgent(driver);
  await driver.get(ctx.seek_url || `${BASE_URL}/jobs`);

  yield "homepage_opened";
}

// Step 2: Wait For Page Load
export async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const title = await ctx.driver.getTitle();
  yield title.toLowerCase().includes('seek') ? "page_loaded" : "page_load_retry";
}

// Step 2.5: Refresh Page
export async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.navigate().refresh();
  await ctx.driver.sleep(2000);
  yield "page_refreshed";
}

// Step 3: Detect Page State
export async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const pageSource = await ctx.driver.getPageSource();
  const hasSignIn = pageSource.includes('data-automation="sign in"') || pageSource.includes('Sign in');
  yield hasSignIn ? "sign_in_required" : "logged_in";
}

// Step 3.5: Click Search Button
export async function* clickSearchButton(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const searchSelectors = ['button[data-automation="searchSubmit"]', 'button[type="submit"]', 'input[type="submit"]'];

  for (const selector of searchSelectors) {
    try {
      const button = await ctx.driver.findElement(By.css(selector));
      if (await button.isDisplayed()) {
        await button.click();
        yield "search_clicked";
        return;
      }
    } catch { continue; }
  }

  yield "search_clicked"; // Continue anyway
}

// Step 4: Show Sign In Banner and Wait for Login
export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const overlay = new UniversalOverlay(ctx.driver);
  await overlay.showSignInOverlay();
  await ctx.driver.get(ctx.seek_url || 'https://www.seek.com.au');
  await ctx.driver.sleep(2000);
  yield "signin_banner_shown";
}

// Basic search functionality - just click search since we already have URL with keywords/location
export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const currentUrl = await ctx.driver.getCurrentUrl();
  yield currentUrl.includes('jobs') ? "search_completed" : "search_failed";
}

// Export all step functions for the workflow engine
export const seekStepFunctions = {
  step0,
  openHomepage,
  waitForPageLoad,
  refreshPage,
  detectPageState,
  clickSearchButton,
  showSignInBanner,
  performBasicSearch
};