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

const BASE_URL = "https://www.linkedin.com";

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

// Build search URL for LinkedIn
function build_search_url(base_url: string, keywords: string): string {
  // For now, just return the base LinkedIn URL
  // Later we can build proper search URLs like /search/results/all/?keywords=...
  return base_url;
}

// Step 0: Initialize Context
export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'deknil_selectors.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../core/user-bots-config.json'), 'utf8'));

  ctx.selectors = selectors;
  ctx.config = config;

  // Basic search parameters
  ctx.keywords = ctx.config?.search?.keywords || "";
  ctx.location = ctx.config?.search?.location || "";

  printLog(`Initializing Deknil context with keywords: "${ctx.keywords}"`);

  yield "ctx_ready";
}

// Step 1: Open Homepage
export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;
    const url = build_search_url(BASE_URL, ctx.keywords);

    printLog(`Opening LinkedIn homepage: ${url}`);
    await driver.get(url);

    yield "homepage_opened";
  } catch (error) {
    printLog(`Failed to open homepage: ${error}`);
    yield "page_navigation_failed";
  }
}

// Step 2: Wait for page load
export async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;

    // Wait for basic page elements to load
    await driver.sleep(2000);

    // Check if page has loaded by looking for common LinkedIn elements
    const bodyElement = await driver.findElement(By.tagName('body'));
    if (bodyElement) {
      printLog("Page loaded successfully");
      yield "page_loaded";
    } else {
      yield "page_load_retry";
    }
  } catch (error) {
    printLog(`Page load check failed: ${error}`);
    yield "page_load_retry";
  }
}

// Step 2.5: Refresh page
export async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;

    printLog("Refreshing page...");
    await driver.navigate().refresh();
    await driver.sleep(3000);

    yield "page_refreshed";
  } catch (error) {
    printLog(`Page refresh failed: ${error}`);
    yield "page_reload_failed";
  }
}

// Step 3: Detect page state
export async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;

    // Check if user is logged in by looking for profile elements
    try {
      const profileElements = await driver.findElements(By.css(ctx.selectors.profile_dropdown.join(', ')));
      if (profileElements.length > 0) {
        printLog("User appears to be logged in");
        yield "logged_in";
        return;
      }
    } catch (e) {
      // Continue to check for sign-in requirements
    }

    // Check if sign-in is required
    try {
      const signInElements = await driver.findElements(By.css(ctx.selectors.sign_in_button.join(', ')));
      if (signInElements.length > 0) {
        printLog("Sign-in required");
        yield "sign_in_required";
        return;
      }
    } catch (e) {
      // Continue
    }

    printLog("No specific page state detected, proceeding with search");
    yield "no_content_found";
  } catch (error) {
    printLog(`Page state detection failed: ${error}`);
    yield "no_content_found";
  }
}

// Step 4: Show sign-in banner
export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn requires sign-in. Please log in manually and restart the bot.");
  yield "signin_banner_shown";
}

// Step 5: Perform basic search
export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;

    printLog("Performing basic search on LinkedIn...");

    // For now, just navigate to the main feed or search page
    // Later we can implement actual search functionality
    const currentUrl = await driver.getCurrentUrl();
    if (!currentUrl.includes('linkedin.com')) {
      await driver.get(BASE_URL);
    }

    await driver.sleep(3000);

    printLog("Basic search/navigation completed");
    yield "search_completed";
  } catch (error) {
    printLog(`Search failed: ${error}`);
    yield "search_failed";
  }
}

// Step 6: Collect content
export async function* collectContent(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver as WebDriver;

    printLog("Collecting content from LinkedIn...");

    // Try to find any content on the page
    const contentSelectors = [
      ...ctx.selectors.content_cards,
      ...ctx.selectors.post_content,
      ...ctx.selectors.job_listings,
      ...ctx.selectors.company_cards,
      ...ctx.selectors.people_cards
    ];

    let foundContent = false;
    for (const selector of contentSelectors) {
      try {
        const elements = await driver.findElements(By.css(selector));
        if (elements.length > 0) {
          printLog(`Found ${elements.length} content items using selector: ${selector}`);
          foundContent = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (foundContent) {
      printLog("Content collection completed");
      yield "content_collected";
    } else {
      printLog("No content found, retrying...");
      yield "content_collect_retry";
    }
  } catch (error) {
    printLog(`Content collection failed: ${error}`);
    yield "content_collect_retry";
  }
}

// Final step: Done
export async function* done(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Deknil workflow completed successfully");
  // No yield needed for final step
}