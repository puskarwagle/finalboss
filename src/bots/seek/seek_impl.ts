import { WebDriver, By, until } from 'selenium-webdriver';
import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';

interface BotConfig {
  formData: {
    keywords: string;
    locations: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface SeekSelectors {
  keywords: string[];
  location: string[];
  job_cards: string[];
  job_details_panel: string;
  sign_in_link: string[];
  [key: string]: any;
}

const BASE_URL = "https://www.seek.com.au";

const printLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
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
  printLog("Initializing context...");

  // Load selectors
  const selectorsPath = path.join(__dirname, 'seek_selectors.json');
  const selectors: SeekSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));
  ctx.selectors = selectors;

  // Load config
  const configPath = path.join(__dirname, '../user-bots-config.json');
  const config: BotConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  ctx.config = config;

  // Create search URL
  const keyword = config.formData.keywords || "";
  const location = config.formData.locations || "";

  ctx.seek_url = build_search_url(BASE_URL, keyword, location);

  printLog(`Search URL: ${ctx.seek_url}`);
  yield "ctx_ready";
}

// Step 1: Open Homepage
export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Opening Seek homepage...");

  try {
    const { driver, sessionExists, sessionsDir } = await setupChromeDriver('seek');
    ctx.driver = driver;
    ctx.sessionExists = sessionExists;
    ctx.sessionsDir = sessionsDir;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
    ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.seek);

    // Apply stealth features (after page loads)
    try {
      await StealthFeatures.hideWebDriver(driver);
      await StealthFeatures.randomizeUserAgent(driver);
    } catch (error) {
      printLog(`Warning: Could not apply stealth features: ${error}`);
    }

    const url = ctx.seek_url || `${BASE_URL}/jobs`;
    await driver.get(url);

    // Human-like delay after page load
    await ctx.humanBehavior.randomDelay(1000, 2000);

    printLog(`Navigated to: ${url}`);
    yield "homepage_opened";
  } catch (error) {
    printLog(`Failed to open homepage: ${error}`);
    yield "page_navigation_failed";
  }
}

// Step 2: Wait For Page Load
export async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Waiting for page to load...");

  const driver: WebDriver = ctx.driver;
  if (!driver) {
    yield "page_load_retry";
    return;
  }

  try {
    // Check if window is still available
    const handles = await driver.getAllWindowHandles();
    if (handles.length === 0) {
      printLog("No browser windows available");
      yield "page_load_retry";
      return;
    }

    // Wait for page to be ready
    await driver.sleep(2000);

    // Check if page title contains "SEEK"
    const title = await driver.getTitle();
    if (title.toLowerCase().includes('seek')) {
      printLog("Page loaded successfully");
      yield "page_loaded";
    } else {
      printLog(`Page title: ${title}`);
      yield "page_load_retry";
    }
  } catch (error) {
    printLog(`Page load error: ${error}`);
    yield "page_load_retry";
  }
}

// Step 2.5: Refresh Page
export async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Refreshing page...");

  const driver: WebDriver = ctx.driver;
  if (!driver) {
    yield "no_page_to_refresh";
    return;
  }

  try {
    await driver.navigate().refresh();
    await driver.sleep(2000);
    printLog("Page refreshed");
    yield "page_refreshed";
  } catch (error) {
    printLog(`Failed to refresh page: ${error}`);
    yield "page_reload_failed";
  }
}

// Step 3: Detect Page State
export async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Detecting page state...");

  const driver: WebDriver = ctx.driver;
  const selectors: SeekSelectors = ctx.selectors;
  const sessionManager: UniversalSessionManager = ctx.sessionManager;

  if (!driver || !sessionManager) {
    yield "no_cards_found";
    return;
  }

  try {
    // First check login status using session manager
    const isLoggedIn = await sessionManager.checkLoginStatus(ctx.sessionExists || false);

    if (!isLoggedIn) {
      printLog("Login required - redirecting to sign-in flow");
      yield "sign_in_required";
      return;
    }

    // If logged in, check for job cards
    for (const selector of selectors.job_cards || []) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          printLog(`Found ${elements.length} job cards - user is logged in`);
          yield "cards_present";
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    printLog("No job cards found");
    yield "no_cards_found";
  } catch (error) {
    printLog(`Error detecting page state: ${error}`);
    yield "no_cards_found";
  }
}

// Step 4: Show Sign In Banner and Wait for Login
export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Sign-in required - starting login process...");

  const sessionManager: UniversalSessionManager = ctx.sessionManager;
  if (!sessionManager) {
    yield "signin_banner_retry";
    return;
  }

  try {
    // Show login banner
    await sessionManager.showLoginBanner('Seek');

    // Wait for user to complete login
    await sessionManager.waitForLogin();

    // Remove banner after successful login
    await sessionManager.removeLoginBanner();

    printLog("Login completed successfully!");
    yield "signin_banner_shown";
  } catch (error) {
    printLog(`Login error: ${error}`);
    yield "signin_banner_retry";
  }
}

// Basic search functionality
export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Performing basic search...");

  const driver: WebDriver = ctx.driver;
  const config: BotConfig = ctx.config;
  const selectors: SeekSelectors = ctx.selectors;
  const humanBehavior: HumanBehavior = ctx.humanBehavior;

  if (!driver || !humanBehavior) {
    yield "search_failed";
    return;
  }

  try {
    // Human-like pause before starting search
    await humanBehavior.thinkingPause();

    // Fill keywords with human-like behavior
    const keywordSelectors = selectors.keywords || ["#keywords-input", "input[placeholder*='What']"];
    for (const selector of keywordSelectors) {
      try {
        const keywordField = await driver.wait(until.elementLocated(By.css(selector)), 10000);
        await humanBehavior.fillFormField(driver, keywordField, config.formData.keywords || "", "Keywords");
        printLog(`Filled keywords: ${config.formData.keywords}`);
        break;
      } catch (error) {
        continue;
      }
    }

    // Small pause between fields
    await humanBehavior.randomDelay(500, 1200);

    // Fill location with human-like behavior
    const locationSelectors = selectors.location || ["input[name='where']", "input[placeholder*='Where']"];
    for (const selector of locationSelectors) {
      try {
        const locationField = await driver.wait(until.elementLocated(By.css(selector)), 10000);
        await humanBehavior.fillFormField(driver, locationField, config.formData.locations || "", "Location");
        printLog(`Filled location: ${config.formData.locations}`);
        break;
      } catch (error) {
        continue;
      }
    }

    // Thinking pause before clicking search
    await humanBehavior.thinkingPause();

    // Click search button with human behavior
    const searchButton = await driver.wait(until.elementLocated(By.css('button[type="submit"], button[data-automation="searchButton"]')), 10000);
    await humanBehavior.humanClick(driver, searchButton);
    printLog("Clicked search button");

    // Random delay while results load
    await humanBehavior.randomDelay(2000, 4000);
    yield "search_completed";

  } catch (error) {
    printLog(`Search error: ${error}`);
    yield "search_failed";
  }
}

// Export all step functions for the workflow engine
export const seekStepFunctions = {
  step0,
  openHomepage,
  waitForPageLoad,
  refreshPage,
  detectPageState,
  showSignInBanner,
  performBasicSearch
};