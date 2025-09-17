import { WebDriver, By } from 'selenium-webdriver';
import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import { UniversalOverlay } from '../core/universal_overlay';
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
  printLog("Initializing context...");

  // Load selectors
  const selectorsPath = path.join(__dirname, 'seek_selectors.json');
  const selectors: SeekSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));
  ctx.selectors = selectors;

  // Load config
  const configPath = path.join(__dirname, '../core/user-bots-config.json');
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

  if (!driver) {
    yield "sign_in_required";
    return;
  }

  try {
    // Wait for page elements to load properly
    await driver.sleep(3000);

    // Debug: Check what's actually on the page
    const currentUrl = await driver.getCurrentUrl();
    printLog(`Current URL: ${currentUrl}`);

    // Check if sign-in button is present (means not logged in)
    const signInSelector = 'a[data-automation="sign in"][title="Sign in"]';
    try {
      const signInButton = await driver.findElement(By.css(signInSelector));
      if (signInButton && await signInButton.isDisplayed()) {
        printLog("🔴 LOGIN REQUIRED: Sign in button found");
        yield "sign_in_required";
        return;
      }
    } catch (e) {
      printLog(`Sign-in button not found: ${e}`);
    }

    // Check page source for sign-in indicators
    const pageSource = await driver.getPageSource();
    if (pageSource.includes('data-automation="sign in"') || pageSource.includes('Sign in')) {
      printLog("🔴 LOGIN REQUIRED: Sign in text found in page source");
      yield "sign_in_required";
      return;
    }

    // No sign-in button found, user is logged in
    printLog("✅ LOGGED IN: No sign-in indicators found");
    yield "logged_in";
  } catch (error) {
    printLog(`Error detecting page state: ${error}`);
    yield "sign_in_required";
  }
}

// Step 3.5: Click Search Button
export async function* clickSearchButton(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🔍 Clicking search button...");

  const driver: WebDriver = ctx.driver;
  if (!driver) {
    yield "search_failed";
    return;
  }

  try {
    // Look for search button - common selectors
    const searchSelectors = [
      'button[data-automation="searchSubmit"]',
      'button[type="submit"]',
      'input[type="submit"]',
      '.search-button',
      '[data-testid="search-button"]'
    ];

    for (const selector of searchSelectors) {
      try {
        const searchButton = await driver.findElement(By.css(selector));
        if (searchButton && await searchButton.isDisplayed()) {
          await searchButton.click();
          printLog("✅ Search button clicked");
          await driver.sleep(1000);
          yield "search_clicked";
          return;
        }
      } catch {
        // Continue to next selector
      }
    }

    printLog("⚠️ No search button found, continuing anyway");
    yield "search_clicked";
  } catch (error) {
    printLog(`❌ Error clicking search button: ${error}`);
    yield "search_failed";
  }
}

// Step 4: Show Sign In Banner and Wait for Login
export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🔐 Sign-in required - showing overlay...");

  const driver: WebDriver = ctx.driver;
  if (!driver) {
    yield "signin_banner_retry";
    return;
  }

  try {
    // Use universal overlay for sign-in
    const overlay = new UniversalOverlay(driver);
    await overlay.showSignInOverlay();

    // Navigate back to the search URL after login
    const searchUrl = ctx.seek_url || 'https://www.seek.com.au';
    printLog(`🔄 Navigating back to search URL: ${searchUrl}`);
    await driver.get(searchUrl);

    // Wait for page to load
    await driver.sleep(2000);

    printLog("✅ Sign-in completed and returned to search!");
    yield "signin_banner_shown";
  } catch (error) {
    printLog(`❌ Sign-in error: ${error}`);
    yield "signin_banner_retry";
  }
}

// Basic search functionality - just click search since we already have URL with keywords/location
export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🎯 Search completed - we already navigated to search URL");

  const driver: WebDriver = ctx.driver;

  if (!driver) {
    yield "search_failed";
    return;
  }

  try {
    // Just wait for results to load since we already have the search URL
    await driver.sleep(2000);

    // Check if we're on a results page
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('jobs')) {
      printLog("✅ On search results page");
      yield "search_completed";
    } else {
      printLog("❌ Not on expected results page");
      yield "search_failed";
    }

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
  clickSearchButton,
  showSignInBanner,
  performBasicSearch
};