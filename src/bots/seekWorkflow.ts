import { WebDriver, By, until } from 'selenium-webdriver';
import { setupChromeDriver } from './runchrome';
import { WorkflowEngine, type WorkflowContext } from './workflowEngine';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from './humanization';
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

// Step 0: Initialize Context
async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Initializing context...");

  // Load selectors
  const selectorsPath = path.join(__dirname, 'seek_selectors.json');
  const selectors: SeekSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));
  ctx.selectors = selectors;

  // Load config
  const configPath = path.join(__dirname, 'user-bots-config.json');
  const config: BotConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  ctx.config = config;

  // Create search URL
  const keyword = config.formData.keywords || "";
  const location = config.formData.locations || "";
  const kwSlug = slugify(keyword);
  const locSlug = slugify(location);

  let searchPath = kwSlug ? `/${kwSlug}-jobs` : "/jobs";
  if (locSlug) {
    searchPath += `/in-${locSlug}`;
  }

  ctx.seek_url = `${BASE_URL}${searchPath}`;

  printLog(`Search URL: ${ctx.seek_url}`);
  yield "ctx_ready";
}

// Step 1: Open Homepage
async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Opening Seek homepage...");

  try {
    const { driver } = await setupChromeDriver();
    ctx.driver = driver;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);

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
async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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
async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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
async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Detecting page state...");

  const driver: WebDriver = ctx.driver;
  const selectors: SeekSelectors = ctx.selectors;

  if (!driver) {
    yield "no_cards_found";
    return;
  }

  try {
    // Check for job cards first
    for (const selector of selectors.job_cards || []) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          printLog(`Found ${elements.length} job cards`);
          yield "cards_present";
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Check for sign-in requirement
    for (const selector of selectors.sign_in_link || []) {
      try {
        const element = await driver.findElement(By.css(selector));
        if (element) {
          printLog("Sign-in required");
          yield "sign_in_required";
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

// Step 4: Show Sign In Banner
async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Sign-in required - please log in manually");

  // In a real implementation, you would show a banner or prompt
  // For now, we'll just log and continue
  console.log("=== MANUAL ACTION REQUIRED ===");
  console.log("Please log in to Seek manually in the browser window");
  console.log("Press Ctrl+C to stop or wait for timeout");
  console.log("=============================");

  // Wait for user action (in real implementation, you'd check login status)
  await new Promise(resolve => setTimeout(resolve, 5000));

  yield "signin_banner_shown";
}

// Basic search functionality (simplified version for testing)
async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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

export async function runSeekWorkflow(): Promise<void> {
  try {
    // Create workflow engine
    const workflowPath = path.join(__dirname, 'seek_steps.yaml');
    const engine = new WorkflowEngine(workflowPath);

    // Register step functions
    engine.registerStepFunction('step0', step0);
    engine.registerStepFunction('openHomepage', openHomepage);
    engine.registerStepFunction('waitForPageLoad', waitForPageLoad);
    engine.registerStepFunction('refreshPage', refreshPage);
    engine.registerStepFunction('detectPageState', detectPageState);
    engine.registerStepFunction('showSignInBanner', showSignInBanner);

    // Run workflow
    await engine.run();

    // Cleanup
    const ctx = engine.getContext();
    if (ctx.driver) {
      await ctx.driver.quit();
    }

  } catch (error) {
    console.error('Workflow error:', error);
  }
}

// Simple test runner for basic search
export async function testBasicSearch(): Promise<void> {
  try {
    printLog("Starting basic search test...");

    const ctx: WorkflowContext = {};

    // Initialize context
    const step0Gen = step0(ctx);
    await step0Gen.next();

    // Open homepage
    const homepageGen = openHomepage(ctx);
    await homepageGen.next();

    // Wait for load
    const loadGen = waitForPageLoad(ctx);
    await loadGen.next();

    // Perform search
    const searchGen = performBasicSearch(ctx);
    const result = await searchGen.next();

    printLog(`Search test result: ${result.value}`);

    // Cleanup
    if (ctx.driver) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Keep browser open for 5 seconds
      await ctx.driver.quit();
    }

  } catch (error) {
    console.error('Basic search test error:', error);
  }
}

if (require.main === module) {
  // Run basic search test for now
  testBasicSearch();
}