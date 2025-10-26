/**
 * Indeed Bot Implementation Following BOT_STANDARDS.md
 * Node.js version using the working Camoufox approach from run_indeed_node.js
 * Structured exactly like seek_impl.ts with proper workflow engine integration
 */

import { Camoufox } from 'camoufox-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { handleResumeSelection } from './handlers/resume_handler.js';
import { handleCoverLetter } from './handlers/cover_letter_handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://au.indeed.com";

const printLog = (message) => {
  console.log(message);
};

function slugify(text) {
  if (!text) return "";
  text = text.trim().toLowerCase();
  text = text.replace(/[^a-z0-9]+/g, "-");
  text = text.replace(/-+/g, "-");
  return text.replace(/^-|-$/g, "");
}

// Build search URL from keywords and location
function build_search_url(base_url, keywords, location) {
  const keyword_slug = slugify(keywords);
  const location_slug = slugify(location);

  let search_path = "/jobs";
  const params = new URLSearchParams();
  
  if (keyword_slug) {
    params.append('q', keywords);
  }
  if (location_slug) {
    params.append('l', location);
  }
  
  const queryString = params.toString();
  return queryString ? `${base_url}${search_path}?${queryString}` : `${base_url}${search_path}`;
}

// Mock WorkflowContext for Node.js compatibility
class WorkflowContext {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionsDir = null;
    this.selectors = null;
    this.config = null;
    this.indeed_url = null;
    this.job_cards = [];
    this.job_index = 0;
    this.total_jobs = 0;
    this.applied_jobs = 0;
    this.skipped_jobs = 0;
    this.current_job = null;
  }
}

// Step 0: Initialize Context (REQUIRED per BOT_STANDARDS.md)
export async function* step0(ctx) {
  try {
    printLog("Step 0: Initializing Context");

    // Load selectors
    const selectorsPath = path.join(__dirname, 'config/indeed_selectors.json');
    const selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf8'));

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Set context
    ctx.selectors = selectors;
    ctx.config = config;
    ctx.indeed_url = build_search_url(BASE_URL, config.formData.keywords || "", config.formData.locations || "");

    printLog(`Search URL: ${ctx.indeed_url}`);
    printLog("Context initialized with Indeed selectors and config");
    yield "ctx_ready";
  } catch (error) {
    printLog(`Context initialization failed: ${error}`);
    yield "ctx_failed";
  }
}

// Step 1: Open Homepage (REQUIRED per BOT_STANDARDS.md)
export async function* openHomepage(ctx) {
  try {
    printLog("Step 1: Opening Homepage");

    // Setup session directory
    ctx.sessionsDir = path.join(process.cwd(), 'sessions', 'indeed');
    if (!fs.existsSync(ctx.sessionsDir)) {
      fs.mkdirSync(ctx.sessionsDir, { recursive: true });
    }

    // Initialize Camoufox (working approach from run_indeed_node.js)
    ctx.browser = await Camoufox({
      user_data_dir: ctx.sessionsDir,
      headless: false,
      persistent_context: true
    });

    printLog('✅ Camoufox browser initialized');

    // Create page
    ctx.page = await ctx.browser.newPage();
    printLog('✅ New page created');

    printLog(`Opening URL: ${ctx.indeed_url || BASE_URL}`);
    await ctx.page.goto(ctx.indeed_url || BASE_URL);
    await ctx.page.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = await ctx.page.url();
    printLog(`Current URL: ${currentUrl}`);

    if (currentUrl && !currentUrl.includes('error')) {
      yield "homepage_opened";
    } else {
      printLog("Page load failed - will retry");
      yield "page_navigation_failed";
    }

  } catch (error) {
    printLog(`Browser setup failed: ${error}`);
    yield "page_navigation_failed";
  }
}

// Step 2: Wait For Page Load
export async function* waitForPageLoad(ctx) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const title = await ctx.page.title();
  yield title.toLowerCase().includes('indeed') ? "page_loaded" : "page_load_retry";
}

// Step 2.5: Refresh Page
export async function* refreshPage(ctx) {
  try {
    if (!ctx.page) {
      printLog("No page available for refresh");
      yield "no_page_to_refresh";
      return;
    }

    printLog("Refreshing page...");
    await ctx.page.reload();

    // Wait longer for slow networks
    printLog("Waiting after refresh...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if refresh worked
    const currentUrl = await ctx.page.url();
    const title = await ctx.page.title();

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
export async function* detectPageState(ctx) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const pageContent = await ctx.page.content();
  const hasSignIn = pageContent.includes('Sign in') || pageContent.includes('sign in');
  yield hasSignIn ? "sign_in_required" : "logged_in";
}

// Step 3.5: Click Search Button
export async function* clickSearchButton(ctx) {
  // Get search button selectors from context, with fallbacks
  const searchSelectors = ctx.selectors?.search?.search_button ? 
    [ctx.selectors.search.search_button] : 
    ['button[type="submit"]', 'input[type="submit"]'];

  for (const selector of searchSelectors) {
    try {
      const button = await ctx.page.locator(selector).first();
      if (await button.isVisible()) {
        await button.click();
        yield "search_clicked";
        return;
      }
    } catch { continue; }
  }

  yield "search_clicked"; // Continue anyway
}

// Step 4: Show Sign In Banner and Wait for Login
export async function* showSignInBanner(ctx) {
  printLog("Manual login required - please log in manually in the browser window");
  printLog("Waiting for user to log in...");
  
  await ctx.page.goto(ctx.indeed_url || BASE_URL);
  await new Promise(resolve => setTimeout(resolve, 2000));
  yield "signin_banner_shown";
}

// Step 5: Basic search functionality - just click search since we already have URL with keywords/location
export async function* performBasicSearch(ctx) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const currentUrl = await ctx.page.url();
  yield currentUrl.includes('jobs') ? "search_completed" : "search_failed";
}

// Step 6: Collect Job Cards
export async function* collectJobCards(ctx) {
  const selectors = ctx.selectors?.jobs?.job_card_selectors || ['div[data-testid="slider_item"]'];

  printLog("Collecting job cards...");
  printLog(`Available selectors: ${selectors.join(', ')}`);

  for (const selector of selectors) {
    try {
      printLog(`Trying selector: ${selector}`);
      const cards = await ctx.page.locator(selector).all();
      printLog(`Found ${cards.length} cards with selector: ${selector}`);
      
      if (cards.length > 0) {
        // Verify cards are actually visible and clickable
        let validCards = 0;
        for (let i = 0; i < Math.min(cards.length, 5); i++) { // Check first 5 cards
          try {
            const isVisible = await cards[i].isVisible();
            const isEnabled = await cards[i].isEnabled();
            if (isVisible && isEnabled) {
              validCards++;
            }
          } catch (e) {
            printLog(`Card ${i + 1} validation failed: ${e.message}`);
          }
        }
        
        printLog(`Valid cards found: ${validCards}/${Math.min(cards.length, 5)}`);
        
        if (validCards > 0) {
          ctx.job_cards = cards;
          ctx.job_index = 0;
          ctx.total_jobs = cards.length;
          ctx.applied_jobs = 0;

          printLog(`Successfully collected ${cards.length} job cards`);
          yield "cards_collected";
          return;
        } else {
          printLog(`No valid cards found with selector: ${selector}`);
        }
      }
    } catch (error) {
      printLog(`Selector ${selector} failed: ${error.message}`);
      continue;
    }
  }
  
  printLog("No job cards found with any selector");
  yield "cards_collect_retry";
}

// Step 7: Click Job Card
export async function* clickJobCard(ctx) {
  const cards = ctx.job_cards || [];
  const index = ctx.job_index || 0;

  printLog(`Attempting to click job card ${index + 1}/${cards.length}`);

  if (!cards.length || index >= cards.length) {
    printLog("No more job cards to click");
    yield "job_cards_finished";
    return;
  }

  try {
    // Check if the card is still visible and enabled
    const card = cards[index];
    const isVisible = await card.isVisible();
    const isEnabled = await card.isEnabled();
    
    printLog(`Card ${index + 1} - Visible: ${isVisible}, Enabled: ${isEnabled}`);
    
    if (!isVisible || !isEnabled) {
      printLog(`Card ${index + 1} is no longer attached to DOM, refreshing job cards...`);
      // Try to refresh job cards
      const selectors = ctx.selectors?.jobs?.job_card_selectors || ['div[data-testid="slider_item"]'];
      let refreshed = false;
      
      for (const selector of selectors) {
        try {
          const newCards = await ctx.page.locator(selector).all();
          if (newCards.length > 0) {
            ctx.job_cards = newCards;
            ctx.total_jobs = newCards.length;
            refreshed = true;
            printLog(`Refreshed job cards: found ${newCards.length} cards`);
            break;
          }
        } catch (e) {
          printLog(`Failed to refresh with selector ${selector}: ${e.message}`);
          continue;
        }
      }
      
      if (!refreshed) {
        printLog("Failed to refresh job cards");
        ctx.job_index = index + 1;
        yield "job_cards_finished";
        return;
      }
      
      // Try again with refreshed cards
      const newCard = ctx.job_cards[index];
      if (newCard && await newCard.isVisible()) {
        await newCard.scrollIntoViewIfNeeded();
        await newCard.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        ctx.job_index = index + 1;
        yield "job_card_clicked";
        return;
      }
    }
    
    if (!isVisible) {
      printLog(`Card ${index + 1} is not visible, scrolling into view...`);
      await card.scrollIntoViewIfNeeded();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for scroll
    }
    
    // Try to click the card
    await card.click();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for details panel to load
    
    printLog(`Successfully clicked job card ${index + 1}`);
    ctx.job_index = index + 1;
    yield "job_card_clicked";
    
  } catch (error) {
    printLog(`Error clicking job card ${index + 1}: ${error.message}`);
    
    // Try alternative clicking methods
    try {
      const card = cards[index];
      printLog(`Trying alternative click method for card ${index + 1}...`);
      
      // Try clicking with force
      await card.click({ force: true });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      printLog(`Successfully clicked job card ${index + 1} with force`);
      ctx.job_index = index + 1;
      yield "job_card_clicked";
      
    } catch (forceError) {
      printLog(`Force click also failed: ${forceError.message}`);
      
      // Try using page.evaluate to click
      try {
        const clicked = await ctx.page.evaluate((cardIndex) => {
          const selectors = [
            'div[data-testid="slider_item"]',
            '.job_seen_beacon',
            'div[class*="slider_container"]',
            'div[class*="result"]',
            'div[class*="item"]',
            'div[class*="card"]',
            'div[class*="job"]',
            'div[class*="list"]'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > cardIndex) {
              const element = elements[cardIndex];
              if (element && element.offsetParent !== null) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                  element.click();
                }, 500);
                return true;
              }
            }
          }
          return false;
        }, index);
        
        if (clicked) {
          printLog(`Successfully clicked job card ${index + 1} using page.evaluate`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          ctx.job_index = index + 1;
          yield "job_card_clicked";
        } else {
          printLog(`Failed to click job card ${index + 1} using page.evaluate`);
          ctx.job_index = index + 1;
          yield "job_card_skipped";
        }
        
      } catch (evalError) {
        printLog(`Page.evaluate click failed: ${evalError.message}`);
        ctx.job_index = index + 1;
        yield "job_card_skipped";
      }
    }
  }
}

// Detect Apply Button Type
export async function* detectApplyType(ctx) {
  try {
    // Get selectors from context
    const selectors = ctx.selectors?.jobs?.apply_button_candidates || [];
    
    const result = await ctx.page.evaluate((selectors) => {
      const container = document.querySelector('[data-testid="jobDetailsPage"]') || document.body;

      let foundQuickApply = false;
      let foundRegularApply = false;

      // First, try to find apply buttons using the validated selectors
      for (const selector of selectors) {
        try {
          const elements = container.querySelectorAll(selector);
          for (const element of elements) {
            if (element.offsetParent !== null && !element.disabled) {
              const text = (element.textContent || '').trim();
              const lowerText = text.toLowerCase();

              // Check aria-label for additional context
              const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
              
              // ONLY Quick Apply if it contains the word "quick"
              if (lowerText.includes('quick') && lowerText.includes('apply')) {
                foundQuickApply = true;
                break;
              }
              // Check if it's a regular apply button (opens in new tab or external)
              else if ((lowerText === 'apply' || lowerText === 'apply now') && 
                       (ariaLabel.includes('new tab') || ariaLabel.includes('external') || ariaLabel.includes('company site'))) {
                foundRegularApply = true;
              }
              // Default to regular apply for any apply button without "quick"
              else if (lowerText.includes('apply') && !lowerText.includes('quick')) {
                foundRegularApply = true;
              }
            }
          }
          if (foundQuickApply) break;
        } catch (e) {
          // Continue with next selector if this one fails
          continue;
        }
      }

      // Fallback: Look for any buttons/links with apply text if selectors didn't work
      if (!foundQuickApply && !foundRegularApply) {
        const applyButtons = Array.from(container.querySelectorAll('button, a, [role="button"]')).filter(el => {
          return el.offsetParent !== null && !el.disabled;
        });

        for (const button of applyButtons) {
          const text = (button.textContent || '').trim();
          const lowerText = text.toLowerCase();

          // ONLY Quick Apply if it contains the word "quick"
          if (lowerText.includes('quick') && lowerText.includes('apply')) {
            foundQuickApply = true;
            break; // Stop at first Quick Apply
          }
          // Regular Apply if it's exactly "Apply" or "Apply Now" but NO "quick"
          else if ((lowerText === 'apply' || lowerText === 'apply now') && !lowerText.includes('quick')) {
            foundRegularApply = true;
          }
        }
      }

      return { hasQuickApply: foundQuickApply, hasRegularApply: foundRegularApply };
    }, selectors);

    printLog(`Apply detection result: Quick=${result.hasQuickApply}, Regular=${result.hasRegularApply}`);

    if (result.hasQuickApply) {
      printLog("🚀 QUICK APPLY detected - proceeding with application");
      yield "quick_apply_found";
    } else if (result.hasRegularApply) {
      printLog("⏭️ REGULAR APPLY detected - skipping to next job card");
      yield "regular_apply_found";
    } else {
      printLog("❌ NO APPLY BUTTON detected - skipping to next job card");
      yield "no_apply_found";
    }
  } catch (error) {
    printLog(`Apply detection error: ${error}`);
    yield "detect_apply_failed";
  }
}

// Parse Job Details
export async function* parseJobDetails(ctx) {
  try {
    // Get selectors from context
    const titleSelectors = ctx.selectors?.jobs?.title_selectors || [
      'h1[data-testid="job-title"]',
      'h1',
      '.job-title'
    ];
    const companySelectors = ctx.selectors?.jobs?.company_selectors || [
      '[data-testid="company-name"]',
      '.company-name',
      '[class*="company"]',
      'span[class*="company"]'
    ];

    const jobData = await ctx.page.evaluate((titleSelectors, companySelectors) => {
      // Extract job content with Indeed structure handling
      function extractJobContent() {
        const container = document.querySelector('[data-testid="jobDetailsPage"]') || document.body;

        // Try to extract title using specific selectors first
        let titleText = '';
        for (const selector of titleSelectors) {
          const titleEl = container.querySelector(selector);
          if (titleEl && titleEl.textContent.trim()) {
            titleText = titleEl.textContent.trim();
            break;
          }
        }

        // Try to extract company using specific selectors
        let companyText = '';
        for (const selector of companySelectors) {
          const companyEl = container.querySelector(selector);
          if (companyEl && companyEl.textContent.trim()) {
            companyText = companyEl.textContent.trim();
            break;
          }
        }

        // Extract full content
        const allText = container.textContent || '';

        return {
          raw_title: titleText,
          details: allText,
          extracted_title: titleText,
          extracted_company: companyText
        };
      }

      const extracted = extractJobContent();
      if (!extracted) return null;

      // Extract job ID from URL
      const jobId = new URL(window.location.href).searchParams.get('jk') || '';

      const finalData = {
        title: extracted.extracted_title,
        company: extracted.extracted_company,
        details: extracted.details,
        raw_title: extracted.raw_title,
        url: window.location.href,
        jobId: jobId,
        scrapedAt: new Date().toISOString()
      };

      return finalData;
    }, titleSelectors, companySelectors);

    if (jobData) {
      // Save job data to file in src/bots/jobs/
      const jobsDir = path.join(__dirname, '..', 'jobs');
      if (!fs.existsSync(jobsDir)) {
        fs.mkdirSync(jobsDir, { recursive: true });
      }

      // Create filename using company and jobId
      const company = (jobData.company || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const jobId = jobData.jobId || Date.now().toString();
      const filename = `${company}_${jobId}.json`;
      const filepath = path.join(jobsDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(jobData, null, 2));

      // Store current job file path in context for employer questions step
      ctx.currentJobFile = filepath;

      printLog(`Quick Apply job saved: ${jobData.title} at ${jobData.company} (${filename})`);

      // Update progress counter and overlay
      if (ctx.total_jobs) {
        ctx.applied_jobs = (ctx.applied_jobs || 0) + 1;
      }
    } else {
      printLog("Quick Apply job found but failed to extract data");
    }

    yield "job_parsed";
  } catch (error) {
    printLog(`Job parsing error: ${error}`);
    yield "parse_failed";
  }
}

// Click Apply Button (Generic - works for both Quick Apply and Regular Apply)
export async function* clickApplyButton(ctx) {
  try {
    printLog("Clicking apply button...");

    // Get selectors from context
    const selectors = ctx.selectors?.jobs?.apply_button_candidates || [];

    const result = await ctx.page.evaluate((selectors) => {
      const container = document.querySelector('[data-testid="jobDetailsPage"]') || document.body;

      // Try validated selectors first
      for (const selector of selectors) {
        try {
          const elements = Array.from(container.querySelectorAll(selector));

          for (const element of elements) {
            const text = (element.textContent || '').toLowerCase();
            const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

            // Check if it's an apply button
            if (text.includes('apply') && !text.includes('applied')) {
              if (element.offsetParent !== null && !element.disabled) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Small delay before clicking
                setTimeout(() => {
                  element.click();
                  console.log('Apply button clicked successfully');
                }, 500);

                return { 
                  success: true, 
                  buttonType: text.includes('quick') ? 'quick_apply' : 'regular_apply',
                  text: text,
                  ariaLabel: ariaLabel
                };
              }
            }
          }
        } catch (e) {
          // Continue with next selector if this one fails
          continue;
        }
      }

      // Fallback: Try generic selectors
      const fallbackSelectors = ['button', 'a'];
      for (const selector of fallbackSelectors) {
        const elements = Array.from(container.querySelectorAll(selector));

        for (const element of elements) {
          const text = (element.textContent || '').toLowerCase();

          if (text.includes('apply') && !text.includes('applied')) {
            if (element.offsetParent !== null && !element.disabled) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Small delay before clicking
              setTimeout(() => {
                element.click();
                console.log('Apply button clicked successfully');
              }, 500);

              return { 
                success: true, 
                buttonType: text.includes('Apply now') ? 'quick_apply' : 'regular_apply',
                text: text,
                ariaLabel: (element.getAttribute('aria-label') || '').toLowerCase()
              };
            }
          }
        }
      }

      console.log('Apply button not found or not clickable');
      return { success: false, error: 'No apply button found' };
    }, selectors);

    if (result.success) {
      // Wait for potential navigation or new tab/window to open
      await new Promise(resolve => setTimeout(resolve, 3000));

      printLog(`Apply button clicked successfully - Type: ${result.buttonType}`);
      printLog(`Button text: "${result.text}", Aria-label: "${result.ariaLabel}"`);
      
      // Check if we're still on the same page (might be external application)
      const currentUrl = await ctx.page.url();
      printLog(`Current URL after click: ${currentUrl}`);
      
      yield "apply_button_clicked";
    } else {
      printLog(`Apply button not found: ${result.error}`);
      yield "apply_button_failed";
    }

  } catch (error) {
    printLog(`Error clicking apply button: ${error}`);
    yield "apply_button_failed";
  }
}

// Click Quick Apply Button
export async function* clickQuickApply(ctx) {
  try {
    printLog("Clicking Quick Apply button...");

    // Get selectors from context
    const selectors = ctx.selectors?.jobs?.apply_button_candidates || [];

    const clicked = await ctx.page.evaluate((selectors) => {
      const container = document.querySelector('[data-testid="jobDetailsPage"]') || document.body;

      // Try validated selectors first
      for (const selector of selectors) {
        try {
          const elements = Array.from(container.querySelectorAll(selector));

          for (const element of elements) {
            const text = (element.textContent || '').toLowerCase();

            if (text.includes('quick apply') ||
                (text.includes('apply') && !text.includes('applied'))) {

              if (element.offsetParent !== null && !element.disabled) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Small delay before clicking
                setTimeout(() => {
                  element.click();
                  console.log('Quick Apply button clicked successfully');
                }, 500);

                return true;
              }
            }
          }
        } catch (e) {
          // Continue with next selector if this one fails
          continue;
        }
      }

      // Fallback: Try generic selectors
      const fallbackSelectors = ['button', 'a'];
      for (const selector of fallbackSelectors) {
        const elements = Array.from(container.querySelectorAll(selector));

        for (const element of elements) {
          const text = (element.textContent || '').toLowerCase();

          if (text.includes('quick apply') ||
              (text.includes('apply') && !text.includes('applied'))) {

            if (element.offsetParent !== null && !element.disabled) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Small delay before clicking
              setTimeout(() => {
                element.click();
                console.log('Quick Apply button clicked successfully');
              }, 500);

              return true;
            }
          }
        }
      }

      console.log('Quick Apply button not found or not clickable');
      return false;
    }, selectors);

    if (clicked) {
      // Wait for potential new tab/window to open
      await new Promise(resolve => setTimeout(resolve, 2000));

      printLog("Quick Apply button clicked successfully");
      yield "quick_apply_clicked";
    } else {
      printLog("Quick Apply button not found or not clickable");
      yield "quick_apply_failed";
    }

  } catch (error) {
    printLog(`Error clicking Quick Apply: ${error}`);
    yield "quick_apply_failed";
  }
}

// Wait for Quick Apply Page to Load
export async function* waitForQuickApplyPage(ctx) {
  try {
    printLog("Waiting for Quick Apply page to load...");

    // Wait for page navigation and new elements to appear
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check current URL to see if we're on a Quick Apply page
    const currentUrl = await ctx.page.url();
    printLog(`Current URL: ${currentUrl}`);

    // Try multiple checks with retries
    let pageReady = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      pageReady = await ctx.page.evaluate(`
        // Check multiple indicators for Quick Apply page
        const progressBar = document.querySelector('nav[aria-label="Progress bar"]');
        const resumeSelect = document.querySelector('select[data-testid="select-input"]');
        const continueBtn = document.querySelector('button[data-testid="continue-button"]');
        const indeedLogo = document.querySelector('[data-testid="indeed-logo"]');
        const formElements = document.querySelectorAll('form, fieldset');

        // Check if URL contains Quick Apply indicators
        const urlHasQuickApply = window.location.href.includes('quick-apply') ||
                                 window.location.href.includes('apply') ||
                                 window.location.pathname.includes('/apply');

        const hasQuickApplyElements = !!(progressBar || resumeSelect || continueBtn);
        const hasFormElements = formElements.length > 0;
        const hasIndeedBranding = !!indeedLogo;

        return hasQuickApplyElements || (urlHasQuickApply && (hasFormElements || hasIndeedBranding));
      `);

      if (pageReady) break;

      if (attempt < 2) {
        printLog(`Page not ready, attempt ${attempt + 1}/3, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (pageReady) {
      printLog("Quick Apply page loaded successfully");
      yield "quick_apply_page_ready";
    } else {
      printLog("Quick Apply page not ready after retries");
      yield "page_load_timeout";
    }

  } catch (error) {
    printLog(`Quick Apply page load error: ${error}`);
    yield "page_load_timeout";
  }
}

// Get Current Step in Quick Apply Flow
export async function* getCurrentStep(ctx) {
  try {
    const currentStep = await ctx.page.evaluate(`
      const nav = document.querySelector('nav[aria-label="Progress bar"]');
      if (!nav) return 'progress_bar_not_found';

      const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
      if (!currentStepBtn) return 'progress_bar_not_found';

      const stepText = currentStepBtn.textContent?.trim() || '';
      return stepText;
    `);

    printLog(`Current Quick Apply step: ${currentStep}`);

    if (currentStep === 'progress_bar_not_found') {
      yield "progress_bar_not_found";
    } else if (currentStep === "Choose documents") {
      yield "current_step_choose_documents";
    } else if (currentStep === "Answer employer questions") {
      yield "current_step_employer_questions";
    } else if (currentStep === "Update Indeed Profile") {
      yield "current_step_update_profile";
    } else if (currentStep === "Review and submit") {
      yield "current_step_review_submit";
    } else {
      printLog(`Unknown step: ${currentStep}`);
      yield "current_step_unknown";
    }

  } catch (error) {
    printLog(`Error getting current step: ${error}`);
    yield "progress_bar_evaluation_error";
  }
}

// Click Continue Button
export async function* clickContinueButton(ctx) {
  try {
    printLog("Clicking continue button...");

    // Get continue button selectors from context, with fallbacks
    const continueSelectors = ctx.selectors?.application?.continue_button_selectors || [
      'button[data-testid="continue-button"]',
      'button:has-text("Continue")',
      'button:has-text("Next")'
    ];

    const continueClicked = await ctx.page.evaluate((selectors) => {
      for (const selector of selectors) {
        let button;
        if (selector.includes(':has-text')) {
          const text = selector.match(/has-text\\(\"([^\"]+)\"\\)/)[1];
          const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
            btn.textContent.toLowerCase().includes(text.toLowerCase())
          );
          button = buttons.find(btn => btn.offsetParent !== null && !btn.disabled);
        } else {
          button = document.querySelector(selector);
        }

        if (button && button.offsetParent !== null && !button.disabled) {
          button.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            button.click();
            console.log('Continue button clicked');
          }, 300);
          return true;
        }
      }

      return false;
    }, continueSelectors);

    if (continueClicked) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for navigation/page change
      printLog("Continue button clicked successfully");
      yield "continue_clicked";
    } else {
      printLog("Continue button not found");
      yield "continue_button_not_found";
    }

  } catch (error) {
    printLog(`Continue button error: ${error}`);
    yield "continue_button_error";
  }
}

// Close Quick Apply and Continue Search
export async function* closeQuickApplyAndContinueSearch(ctx) {
  try {
    printLog("Closing Quick Apply page and continuing search...");

    // Navigate back to search results
    await ctx.page.goBack();
    await new Promise(resolve => setTimeout(resolve, 1000));

    printLog("Returned to job search page");
    yield "hunting_next_job";

  } catch (error) {
    printLog(`Close and continue error: ${error}`);
    // Try to continue anyway
    yield "hunting_next_job";
  }
}

// Stay Put for Manual Inspection
export async function* stayPutForInspection(ctx) {
  printLog("🔍 STAYING PUT FOR MANUAL INSPECTION");
  printLog("📋 Check the form manually to see what validation errors are present");
  printLog("⏳ Waiting 5 minutes for inspection, then will continue...");

  // Wait 5 minutes (300 seconds) for manual inspection
  await new Promise(resolve => setTimeout(resolve, 300000));

  printLog("⏰ Inspection timeout reached, continuing workflow...");
  yield "inspection_complete";
}

// Skip to Next Card
export async function* skipToNextCard(ctx) {
  printLog("Regular Apply job found - skipping job details parsing and moving to next card...");

  // Update progress counter
  if (ctx.total_jobs) {
    const skippedJobs = (ctx.skipped_jobs || 0) + 1;
    ctx.skipped_jobs = skippedJobs;
  }

  yield "card_skipped";
}

// Click Next Page
export async function* clickNextPage(ctx) {
  try {
    printLog("Checking for next page button...");

    // Get pagination selectors from context, with fallbacks
    const paginationSelectors = ctx.selectors?.search?.pagination_next ? 
      [ctx.selectors.search.pagination_next] : 
      ['a[aria-label="Next Page"]'];

    const nextButton = await ctx.page.evaluate((selectors) => {
      for (const selector of selectors) {
        const nextButton = document.querySelector(selector);
        if (nextButton && !nextButton.hasAttribute('disabled')) {
          nextButton.click();
          return true;
        }
      }
      return false;
    }, paginationSelectors);

    if (nextButton) {
      printLog("Next page button clicked.");
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load
      yield "next_page_clicked";
    } else {
      printLog("No more pages found.");
      yield "no_more_pages";
    }
  } catch (error) {
    printLog(`Error clicking next page: ${error}`);
    yield "no_more_pages";
  }
}

// Simplified employer question handlers for Indeed
export async function* extractEmployerQuestions(ctx) {
  try {
    printLog("Extracting employer questions...");
    // Stub implementation - to be enhanced
    yield "employer_questions_saved";
  } catch (error) {
    printLog(`Employer questions extraction error: ${error}`);
    yield "employer_questions_error";
  }
}

export async function* handleEmployerQuestions(ctx) {
  try {
    printLog("Handling employer questions...");
    // Stub implementation - to be enhanced
    yield "employer_questions_saved";
  } catch (error) {
    printLog(`Employer questions handling error: ${error}`);
    yield "employer_questions_error";
  }
}

// Export step functions (REQUIRED per BOT_STANDARDS.md)
export const indeedStepFunctions = {
  step0,
  openHomepage,
  waitForPageLoad,
  refreshPage,
  detectPageState,
  clickSearchButton,
  showSignInBanner,
  performBasicSearch,
  collectJobCards,
  clickJobCard,
  detectApplyType,
  parseJobDetails,
  clickApplyButton,
  clickQuickApply,
  waitForQuickApplyPage,
  getCurrentStep,
  handleResumeSelection,
  handleCoverLetter,
  extractEmployerQuestions,
  handleEmployerQuestions,
  clickContinueButton,
  closeQuickApplyAndContinueSearch,
  stayPutForInspection,
  skipToNextCard,
  clickNextPage
};

// Workflow Engine for Node.js (following seek_impl.ts structure)
class WorkflowEngine {
  constructor() {
    this.stepFunctions = indeedStepFunctions;
    this.workflowConfig = null;
    this.currentStep = null;
    this.ctx = new WorkflowContext();
  }

  async loadWorkflowConfig() {
    try {
      const yamlPath = path.join(__dirname, 'indeed_steps.yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      this.workflowConfig = yaml.load(yamlContent);
      printLog('✅ Workflow configuration loaded');
      return true;
    } catch (error) {
      printLog(`❌ Failed to load workflow config: ${error.message}`);
      return false;
    }
  }

  async executeStep(stepName) {
    try {
      const stepConfig = this.workflowConfig.steps_config[stepName];
      if (!stepConfig) {
        printLog(`❌ Step configuration not found: ${stepName}`);
        return false;
      }

      printLog(`\n=== Executing Step ${stepConfig.step}: ${stepName} ===`);
      
      const stepFunction = this.stepFunctions[stepConfig.func];
      if (!stepFunction) {
        printLog(`❌ Step function not found: ${stepConfig.func}`);
        return false;
      }

      // Execute step with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Step timeout')), stepConfig.timeout * 1000);
      });

      const stepPromise = this.executeStepFunction(stepFunction, stepConfig);
      const result = await Promise.race([stepPromise, timeoutPromise]);

      if (result.success) {
        printLog(`✅ Step ${stepName} completed with event: ${result.event}`);
        return await this.handleStepTransition(stepName, result.event, stepConfig);
      } else {
        printLog(`❌ Step ${stepName} failed: ${result.event}`);
        return await this.handleStepTransition(stepName, result.event, stepConfig);
      }

    } catch (error) {
      printLog(`❌ Step ${stepName} error: ${error.message}`);
      const stepConfig = this.workflowConfig.steps_config[stepName];
      const timeoutEvent = stepConfig?.on_timeout_event || 'error';
      return await this.handleStepTransition(stepName, timeoutEvent, stepConfig);
    }
  }

  async executeStepFunction(stepFunction, stepConfig) {
    try {
      const generator = stepFunction(this.ctx);
      let result = await generator.next();
      
      while (!result.done) {
        const event = result.value;
        printLog(`Event: ${event}`);
        
        // Check if this event has a transition
        if (stepConfig.transitions[event]) {
          return { success: true, event: event };
        }
        
        result = await generator.next();
      }
      
      return { success: false, event: 'step_completed_without_event' };
    } catch (error) {
      return { success: false, event: 'step_function_error' };
    }
  }

  async handleStepTransition(stepName, event, stepConfig) {
    const nextStep = stepConfig.transitions[event];
    
    printLog(`🔄 Transition: ${stepName} -> ${event} -> ${nextStep}`);
    
    if (nextStep === 'done') {
      printLog('🎉 Workflow completed!');
      await this.cleanup();
      return false; // Stop execution
    }
    
    if (nextStep) {
      this.currentStep = nextStep;
      printLog(`➡️ Next step: ${nextStep}`);
      return true; // Continue with next step
    } else {
      printLog(`❌ No transition defined for event: ${event} in step: ${stepName}`);
      await this.cleanup();
      return false; // Stop execution
    }
  }

  async run() {
    try {
      // Load workflow configuration
      if (!await this.loadWorkflowConfig()) {
        return;
      }

      // Start with initial step
      this.currentStep = this.workflowConfig.workflow_meta.start_step;
      printLog(`🚀 Starting workflow: ${this.workflowConfig.workflow_meta.title}`);
      printLog(`📋 Description: ${this.workflowConfig.workflow_meta.description}`);
      
      // Execute workflow steps
      while (this.currentStep && this.currentStep !== 'done') {
        printLog(`\n🔄 Current step: ${this.currentStep}`);
        const continueExecution = await this.executeStep(this.currentStep);
        printLog(`🔄 Continue execution: ${continueExecution}`);
        if (!continueExecution) {
          printLog('🛑 Stopping workflow execution');
          break;
        }
      }

    } catch (error) {
      printLog(`❌ Workflow execution failed: ${error.message}`);
      await this.cleanup();
    }
  }

  async cleanup() {
    try {
      if (this.ctx.page) {
        await this.ctx.page.close();
        printLog('✅ Page closed');
      }
      
      if (this.ctx.browser) {
        await this.ctx.browser.close();
        printLog('✅ Browser closed');
      }
    } catch (error) {
      printLog(`❌ Cleanup error: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  printLog('🎯 Starting Indeed Bot with BOT_STANDARDS.md Structure (Node.js)');
  
  const workflowEngine = new WorkflowEngine();
  await workflowEngine.run();
}

// Handle process termination
process.on('SIGINT', () => {
  printLog('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  printLog('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the bot
main().catch(error => {
  printLog(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
