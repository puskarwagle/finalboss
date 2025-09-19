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
  try {
    const { driver, sessionExists, sessionsDir } = await setupChromeDriver('seek');
    ctx.driver = driver;
    ctx.sessionExists = sessionExists;
    ctx.sessionsDir = sessionsDir;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
    ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.seek);

    await StealthFeatures.hideWebDriver(driver);
    await StealthFeatures.randomizeUserAgent(driver);

    printLog(`Opening URL: ${ctx.seek_url || `${BASE_URL}/jobs`}`);
    await driver.get(ctx.seek_url || `${BASE_URL}/jobs`);

    // Show overlay immediately after opening
    const overlay = new UniversalOverlay(driver);
    await overlay.showOverlay({
      title: '🤖 Seek Bot Active',
      html: '<p style="text-align: center;">Bot is running...</p>',
      position: { x: 20, y: 20 },
      draggable: true,
      collapsible: true
    });

    // Wait for page to load
    printLog("Waiting for page to load...");
    await driver.sleep(5000);

    // Check if page loaded successfully
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
  // Wait for page to be fully loaded (document.readyState === 'complete')
  await ctx.driver.wait(async () => {
    const readyState = await ctx.driver.executeScript('return document.readyState');
    return readyState === 'complete';
  }, 10000);

  const title = await ctx.driver.getTitle();
  yield title.toLowerCase().includes('seek') ? "page_loaded" : "page_load_retry";
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

    // Wait longer for slow networks
    printLog("Waiting after refresh...");
    await ctx.driver.sleep(5000);

    // Check if refresh worked
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
  // Try multiple sign-in selectors - Seek changes them
  const signInSelectors = [
    'a[data-automation="sign in"]',
    'a[href*="login"]',
    'a[href*="sign-in"]',
    '.sign-in',
    '[data-testid="sign-in"]',
    'button:contains("Sign in")',
    'a:contains("Sign in")'
  ];

  printLog("🔍 Checking for sign-in button...");

  for (const selector of signInSelectors) {
    try {
      const elements = await ctx.driver.findElements(By.css(selector));
      for (const element of elements) {
        if (await element.isDisplayed()) {
          const text = await element.getText();
          printLog(`🔴 Sign in element found: "${text}" with selector: ${selector}`);
          yield "sign_in_required";
          return;
        }
      }
    } catch {
      continue;
    }
  }

  // Also check page source for login indicators
  const pageSource = await ctx.driver.getPageSource();
  if (pageSource.includes('login.seek.com') || pageSource.includes('Sign in')) {
    printLog("🔴 Login page detected in source");
    yield "sign_in_required";
    return;
  }

  printLog("✅ No sign in indicators found - already logged in");
  yield "logged_in";
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

  printLog("🔴 PLEASE SIGN IN TO SEEK MANUALLY");

  await overlay.showOverlay({
    title: '🔴 SIGN IN REQUIRED',
    html: `
      <div style="text-align: center; line-height: 1.6;">
        <p style="font-size: 18px; margin: 15px 0;"><strong>Please Sign In to Seek</strong></p>
        <p style="color: #e74c3c; font-size: 14px;">Bot is waiting for you to sign in manually</p>
        <p style="font-size: 12px; color: #666; margin: 15px 0;">1. Click on "Sign in" button on the page</p>
        <p style="font-size: 12px; color: #666; margin: 15px 0;">2. Complete login process</p>
        <p style="font-size: 12px; color: #666; margin: 15px 0;">3. Click "Done" below when finished</p>
        <button id="done-signin" style="
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
        ">Done</button>
      </div>
    `,
    position: { x: 50, y: 50 },
    draggable: true,
    collapsible: false,
    style: {
      backgroundColor: '#2c3e50',
      borderColor: '#e74c3c',
      textColor: '#ffffff'
    }
  });

  // Wait for user to click Done button with overlay persistence
  await ctx.driver.executeScript(`
    return new Promise((resolve) => {
      const doneButton = document.getElementById('done-signin');
      if (doneButton) {
        doneButton.onclick = () => resolve('done');
      }

      // Re-inject overlay if page changes (sign-in navigation)
      const observer = new MutationObserver(() => {
        const overlay = document.getElementById('universal-overlay');
        if (!overlay && document.readyState === 'complete') {
          // Page changed, re-create overlay
          setTimeout(() => {
            const newOverlay = document.createElement('div');
            newOverlay.id = 'universal-overlay';
            newOverlay.className = 'universal-dynamic-overlay';
            newOverlay.innerHTML = \`
              <div style="
                position: fixed;
                top: 50px;
                left: 50px;
                width: 400px;
                height: auto;
                background: #2c3e50;
                border: 2px solid #e74c3c;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
                color: #ffffff;
                padding: 16px;
                text-align: center;
                line-height: 1.6;
              ">
                <p style="font-size: 18px; margin: 15px 0;"><strong>🔴 SIGN IN REQUIRED</strong></p>
                <p style="color: #e74c3c; font-size: 14px;">Bot is waiting for you to sign in manually</p>
                <p style="font-size: 12px; color: #666; margin: 15px 0;">1. Complete login process on this page</p>
                <p style="font-size: 12px; color: #666; margin: 15px 0;">2. Click "Done" below when finished</p>
                <button id="done-signin-new" style="
                  background: #e74c3c;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 5px;
                  cursor: pointer;
                  font-size: 16px;
                  margin-top: 10px;
                ">Done</button>
              </div>
            \`;

            document.body.appendChild(newOverlay);

            // Attach new click handler
            const newDoneButton = document.getElementById('done-signin-new');
            if (newDoneButton) {
              newDoneButton.onclick = () => resolve('done');
            }
          }, 1000);
        }
      });

      observer.observe(document, { childList: true, subtree: true });
    });
  `);

  printLog("✅ User clicked Done - continuing automation");
  yield "signin_banner_shown";
}

// Step 5: Basic search functionality - just click search since we already have URL with keywords/location
export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  await ctx.driver.sleep(2000);
  const currentUrl = await ctx.driver.getCurrentUrl();
  yield currentUrl.includes('jobs') ? "search_completed" : "search_failed";
}

// Step 6: Collect Job Cards
export async function* collectJobCards(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const selectors = ctx.selectors?.job_cards || ['article[data-testid="job-card"]'];

  for (const selector of selectors) {
    try {
      const cards = await ctx.driver.findElements(By.css(selector));
      if (cards.length > 0) {
        ctx.job_cards = cards;
        ctx.job_index = 0;
        ctx.total_jobs = cards.length;
        ctx.applied_jobs = 0;

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
    await ctx.driver.sleep(2000); // Wait for details panel to load
    ctx.job_index = index + 1;
    yield "job_card_clicked";
  } catch {
    ctx.job_index = index + 1;
    yield "job_card_skipped";
  }
}

// Detect Apply Button Type
export async function* detectApplyType(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const result = await ctx.driver.executeScript(`
      const container = document.querySelector('[data-automation="jobDetailsPage"]') || document.body;
      const hasText = (el, txt) => (el.textContent || '').toLowerCase().includes(String(txt).toLowerCase());

      const quickApplyElements = Array.from(container.querySelectorAll('*')).filter(el => hasText(el, 'quick apply'));
      const quickApplyAttr = Array.from(container.querySelectorAll('[data-automation="job-detail-apply"]'));
      const regularApplyElements = Array.from(container.querySelectorAll('*')).filter(el => {
        const txt = (el.textContent || '').trim();
        if (!txt) return false;
        const lower = txt.toLowerCase();
        return lower === 'apply' || (lower.includes('apply') && !lower.includes('quick'));
      });

      const hasQuick = quickApplyElements.length > 0 || quickApplyAttr.length > 0;
      const hasRegular = regularApplyElements.length > 0;

      return { hasQuickApply: hasQuick, hasRegularApply: hasRegular };
    `);

    if (result.hasQuickApply) {
      yield "quick_apply_found";
    } else if (result.hasRegularApply) {
      yield "regular_apply_found";
    } else {
      yield "no_apply_found";
    }
  } catch {
    yield "detect_apply_failed";
  }
}

// Parse Job Details
export async function* parseJobDetails(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const jobData = await ctx.driver.executeScript(`
      // Extract job content with improved Seek structure handling
      function extractJobContent() {
        const container = document.querySelector('[data-automation="jobDetailsPage"]');
        if (!container) return null;

        // Try to extract title using specific selectors first
        let titleText = '';
        const titleSelectors = [
          '[data-automation="job-detail-title"]',
          'h1[data-automation="jobTitle"]',
          'h1',
          '.job-title'
        ];

        for (const selector of titleSelectors) {
          const titleEl = container.querySelector(selector);
          if (titleEl && titleEl.textContent.trim()) {
            titleText = titleEl.textContent.trim();
            break;
          }
        }

        // Try to extract company using specific selectors
        let companyText = '';
        const companySelectors = [
          '[data-automation="advertiser-name"]',
          '[data-automation="jobCompany"]',
          '.advertiser-name'
        ];

        for (const selector of companySelectors) {
          const companyEl = container.querySelector(selector);
          if (companyEl && companyEl.textContent.trim()) {
            companyText = companyEl.textContent.trim();
            break;
          }
        }

        // Extract job header section (title, company, location, etc.)
        let headerText = '';
        const headerEl = container.querySelector('[data-automation="jobHeader"]') ||
                        container.querySelector('.job-header') ||
                        container.querySelector('header');

        if (headerEl) {
          headerText = headerEl.textContent.trim();
        } else {
          // Fallback: construct header from individual elements
          const locationEl = container.querySelector('[data-automation="job-detail-location"]');
          const workTypeEl = container.querySelector('[data-automation="job-detail-work-type"]');
          const salaryEl = container.querySelector('[data-automation="job-detail-salary"]');

          headerText = [titleText, companyText,
                       locationEl?.textContent?.trim(),
                       workTypeEl?.textContent?.trim(),
                       salaryEl?.textContent?.trim()].filter(Boolean).join('\\n');
        }

        // Extract full content using DOM walker for details
        const texts = [];
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              let parent = node.parentElement;
              while (parent && parent !== container) {
                const tagName = parent.tagName.toLowerCase();
                const style = window.getComputedStyle(parent);

                if (tagName === 'style' || tagName === 'script' || tagName === 'noscript' ||
                    style.display === 'none' || style.visibility === 'hidden') {
                  return NodeFilter.FILTER_REJECT;
                }
                parent = parent.parentElement;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          },
          false
        );

        while (walker.nextNode()) {
          const text = walker.currentNode.textContent.trim();
          if (text !== '') texts.push(text);
        }

        const allText = [...new Set(texts)].join('\\n');

        const unwantedLines = [
          'View all jobs', 'Quick apply', 'Apply', 'Save', 'Report this job advert',
          'Be careful', "Don't provide your bank or credit card details when applying for jobs.",
          'Learn how to protect yourself', 'Report this job ad', 'Career Advice'
        ];

        const ratingPatterns = [/^\\d+\\.\\d+$/, /^\\d+\\s+reviews?$/, /^·$/];

        let cleanedLines = allText.split('\\n').filter(line => {
          const trimmed = line.trim();
          if (trimmed === '' || unwantedLines.includes(trimmed)) return false;
          return !ratingPatterns.some(pattern => pattern.test(trimmed));
        });

        const cleanedText = cleanedLines.join('\\n');

        return {
          raw_title: headerText || titleText,
          details: cleanedText,
          extracted_title: titleText,
          extracted_company: companyText
        };
      }

      // Parse job title with structured fields
      function parseJobTitle(titleText) {
        const lines = titleText ? titleText.split('\\n').map(l => l.trim()).filter(l => l) : [];

        const parsed = {
          title: '', company: '', location: '', work_type: '', category: '',
          salary_note: '', posted: '', application_volume: ''
        };

        if (!lines.length) return parsed;

        parsed.title = lines[0];
        if (lines.length >= 2) parsed.company = lines[1];

        let postedIndex = -1;
        for (let i = 2; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('posted') || lines[i].includes('ago')) {
            postedIndex = i;
            parsed.posted = lines[i].replace(/posted\\s+/i, '');
            break;
          }
        }

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('application volume')) {
            parsed.application_volume = lines[i];
            break;
          }
        }

        const structuredEndIndex = postedIndex > 0 ? postedIndex : lines.length;
        const structuredData = lines.slice(2, structuredEndIndex).filter(line => {
          return !/^\\d+\\.\\d+$/.test(line) && !/^\\d+\\s+reviews?$/.test(line) && line !== '·';
        });

        if (structuredData.length >= 1) parsed.location = structuredData[0];
        if (structuredData.length >= 2) parsed.work_type = structuredData[1];
        if (structuredData.length >= 3) parsed.category = structuredData[2];

        for (const item of structuredData) {
          if (item.includes('$') && !parsed.salary_note) {
            parsed.salary_note = item;
            break;
          }
        }

        return parsed;
      }

      const extracted = extractJobContent();
      if (!extracted) return null;

      const parsedTitle = parseJobTitle(extracted.raw_title);

      // Extract job ID from URL
      const jobId = new URL(window.location.href).searchParams.get('jobId') || '';

      // Use directly extracted values if parsing failed
      const finalData = {
        ...parsedTitle,
        details: extracted.details,
        raw_title: extracted.raw_title,
        url: window.location.href,
        jobId: jobId,
        scrapedAt: new Date().toISOString(),
        debug: {
          title_length: extracted.raw_title ? extracted.raw_title.length : 0,
          details_length: extracted.details ? extracted.details.length : 0,
          extracted_title: extracted.extracted_title,
          extracted_company: extracted.extracted_company
        }
      };

      // Override with directly extracted values if available and parsed values are empty
      if (!finalData.title && extracted.extracted_title) {
        finalData.title = extracted.extracted_title;
      }
      if (!finalData.company && extracted.extracted_company) {
        finalData.company = extracted.extracted_company;
      }

      return finalData;
    `);

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

      printLog(`Quick Apply job saved: ${jobData.title} at ${jobData.company} (${filename})`);

      // Update progress counter and overlay
      if (ctx.overlay && ctx.total_jobs) {
        ctx.applied_jobs = (ctx.applied_jobs || 0) + 1;
        await ctx.overlay.updateJobProgress(
          ctx.applied_jobs,
          ctx.total_jobs,
          "Quick Apply job saved",
          9
        );
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

// Click Quick Apply Button
export async function* clickQuickApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Clicking Quick Apply button...");

    const clicked = await ctx.driver.executeScript(`
      const container = document.querySelector('[data-automation="jobDetailsPage"]') || document.body;

      // Try multiple selectors for Quick Apply button
      const quickApplySelectors = [
        '[data-automation="job-detail-apply"]',
        'button',
        'a'
      ];

      for (const selector of quickApplySelectors) {
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
    `);

    if (clicked) {
      // Wait for potential new tab/window to open
      await ctx.driver.sleep(2000);

      // Check if a new window/tab opened
      const handles = await ctx.driver.getAllWindowHandles();
      if (handles.length > 1) {
        // Switch to the new tab (last one opened)
        await ctx.driver.switchTo().window(handles[handles.length - 1]);
        printLog("Switched to Quick Apply tab");
      }

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
export async function* waitForQuickApplyPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Waiting for Quick Apply page to load...");

    // Wait for page navigation and new elements to appear
    await ctx.driver.sleep(3000);

    // Check current URL to see if we're on a Quick Apply page
    const currentUrl = await ctx.driver.getCurrentUrl();
    printLog(`Current URL: ${currentUrl}`);

    // Try multiple checks with retries
    let pageReady = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      pageReady = await ctx.driver.executeScript(`
        // Check multiple indicators for Quick Apply page
        const progressBar = document.querySelector('nav[aria-label="Progress bar"]');
        const resumeSelect = document.querySelector('select[data-testid="select-input"]');
        const continueBtn = document.querySelector('button[data-testid="continue-button"]');
        const seekLogo = document.querySelector('[data-testid="seek-logo"]');
        const formElements = document.querySelectorAll('form, fieldset');

        // Check if URL contains Quick Apply indicators
        const urlHasQuickApply = window.location.href.includes('quick-apply') ||
                                 window.location.href.includes('apply') ||
                                 window.location.pathname.includes('/apply');

        const hasQuickApplyElements = !!(progressBar || resumeSelect || continueBtn);
        const hasFormElements = formElements.length > 0;
        const hasSeekBranding = !!seekLogo;

        console.log('Page check attempt ${attempt + 1}:', {
          progressBar: !!progressBar,
          resumeSelect: !!resumeSelect,
          continueBtn: !!continueBtn,
          urlHasQuickApply,
          hasFormElements,
          hasSeekBranding
        });

        return hasQuickApplyElements || (urlHasQuickApply && (hasFormElements || hasSeekBranding));
      `);

      if (pageReady) break;

      if (attempt < 2) {
        printLog(`Page not ready, attempt ${attempt + 1}/3, waiting...`);
        await ctx.driver.sleep(2000);
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
export async function* getCurrentStep(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const currentStep = await ctx.driver.executeScript(`
      const nav = document.querySelector('nav[aria-label="Progress bar"]');
      if (!nav) return 'progress_bar_not_found';

      const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
      if (!currentStepBtn) return 'progress_bar_not_found';

      const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
      return stepText;
    `);

    printLog(`📊 Current step: "${currentStep}"`);

    if (currentStep === 'progress_bar_not_found') {
      yield "progress_bar_not_found";
    } else if (currentStep === "Choose documents") {
      yield "current_step_choose_documents";
    } else if (currentStep === "Answer employer questions") {
      yield "current_step_employer_questions";
    } else if (currentStep === "Update SEEK Profile") {
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

// Handle Resume Selection (Choose Documents step)
export async function* handleResumeSelection(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Handling resume selection...");

    const resumeHandled = await ctx.driver.executeScript(`
      // Try to find and select the first available resume
      const resumeSelectors = [
        'select[data-testid="select-input"]',
        'select[placeholder*="resumé"]',
        'select[placeholder*="resume"]',
        'select'
      ];

      for (const selector of resumeSelectors) {
        const select = document.querySelector(selector);
        if (select && select.options && select.options.length > 1) {
          // Find first non-empty option
          for (let i = 1; i < select.options.length; i++) {
            if (select.options[i].value && select.options[i].value !== '') {
              select.value = select.options[i].value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Selected resume:', select.options[i].text);
              return true;
            }
          }
        }
      }

      // Try to click resume method change radio button if select not found
      const methodChange = document.querySelector('input[data-testid="resume-method-change"][value="change"]');
      if (methodChange && !methodChange.checked) {
        methodChange.click();

        // Wait a bit and try select again
        setTimeout(() => {
          const select = document.querySelector('select[data-testid="select-input"]');
          if (select && select.options && select.options.length > 1) {
            for (let i = 1; i < select.options.length; i++) {
              if (select.options[i].value && select.options[i].value !== '') {
                select.value = select.options[i].value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Selected resume after method change:', select.options[i].text);
                return true;
              }
            }
          }
        }, 1000);

        return true;
      }

      return false;
    `);

    if (resumeHandled) {
      await ctx.driver.sleep(1000); // Give time for any UI updates
      printLog("Resume selection handled");
      yield "resume_selected";
    } else {
      printLog("No resume options found or already selected");
      yield "resume_not_required";
    }

  } catch (error) {
    printLog(`Resume selection error: ${error}`);
    yield "resume_selection_error";
  }
}

// Handle Cover Letter (part of Choose Documents step)
export async function* handleCoverLetter(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Handling cover letter...");

    const coverLetterHandled = await ctx.driver.executeScript(`
      // First, try to find "Don't include a cover letter" option
      const dontIncludeSpan = Array.from(document.querySelectorAll('span')).find(span =>
        span.textContent && span.textContent.trim() === "Don't include a cover letter"
      );

      if (dontIncludeSpan) {
        // Find the parent label or radio input
        const label = dontIncludeSpan.closest('label');
        const radioInput = label ? label.querySelector('input[type="radio"]') : null;

        if (radioInput) {
          radioInput.click();
          console.log('Clicked "Don\\'t include a cover letter" option');
          return 'no_cover_letter';
        } else if (label) {
          label.click();
          console.log('Clicked "Don\\'t include a cover letter" label');
          return 'no_cover_letter';
        }
      }

      // Fallback: Try to find cover letter radio button to enable it
      const coverLetterRadio = document.querySelector('input[data-testid="coverLetter-method-change"]');
      if (coverLetterRadio && !coverLetterRadio.checked) {
        coverLetterRadio.click();
        console.log('Cover letter radio clicked as fallback');

        // Wait for textarea to appear and fill it
        return new Promise((resolve) => {
          setTimeout(() => {
            const textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]') ||
                            document.querySelector('textarea[placeholder*="cover"]') ||
                            document.querySelector('textarea[placeholder*="Cover"]') ||
                            document.querySelector('textarea');
            if (textarea) {
              const defaultText = "Dear Hiring Manager,\\n\\nI am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.\\n\\nI am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.\\n\\nThank you for your consideration.\\n\\nBest regards";

              textarea.value = '';
              textarea.focus();
              textarea.value = defaultText;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              textarea.dispatchEvent(new Event('blur', { bubbles: true }));

              console.log('Cover letter filled as fallback');
              resolve('filled');
            } else {
              console.log('Cover letter textarea not found');
              resolve('failed');
            }
          }, 1000);
        });
      }

      return 'not_found';
    `);

    await ctx.driver.sleep(1000);

    if (coverLetterHandled === 'no_cover_letter') {
      printLog("✅ Selected 'Don't include a cover letter' option");
      yield "cover_letter_not_required";
    } else if (coverLetterHandled === 'filled') {
      printLog("✅ Cover letter filled as fallback");
      yield "cover_letter_filled";
    } else {
      printLog("Cover letter handling completed");
      yield "cover_letter_not_required";
    }

  } catch (error) {
    printLog(`Cover letter error: ${error}`);
    yield "cover_letter_error";
  }
}

// Retry Cover Letter (when validation fails)
export async function* retryCoverLetter(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔄 Retrying cover letter - trying 'Don't include' option...");

    const retryResult = await ctx.driver.executeScript(`
      // First priority: Try "Don't include a cover letter" option
      const dontIncludeSpan = Array.from(document.querySelectorAll('span')).find(span =>
        span.textContent && span.textContent.trim() === "Don't include a cover letter"
      );

      if (dontIncludeSpan) {
        const label = dontIncludeSpan.closest('label');
        const radioInput = label ? label.querySelector('input[type="radio"]') : null;

        if (radioInput && !radioInput.checked) {
          radioInput.click();
          console.log('Retry: Clicked "Don\\'t include a cover letter" option');
          return 'no_cover_letter';
        } else if (label) {
          label.click();
          console.log('Retry: Clicked "Don\\'t include a cover letter" label');
          return 'no_cover_letter';
        }
      }

      // Fallback: Try to fill cover letter aggressively
      let textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]') ||
                    document.querySelector('textarea[placeholder*="cover"]') ||
                    document.querySelector('textarea[placeholder*="Cover"]') ||
                    document.querySelector('textarea');

      if (!textarea) {
        const coverLetterRadio = document.querySelector('input[data-testid="coverLetter-method-change"]');
        if (coverLetterRadio) {
          coverLetterRadio.click();
          setTimeout(() => {
            textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]') ||
                      document.querySelector('textarea[placeholder*="cover"]') ||
                      document.querySelector('textarea[placeholder*="Cover"]') ||
                      document.querySelector('textarea');
          }, 1000);
        }
      }

      if (textarea) {
        const defaultText = "Dear Hiring Manager,\\n\\nI am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.\\n\\nI am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.\\n\\nThank you for your consideration.\\n\\nBest regards";

        textarea.value = '';
        textarea.focus();
        textarea.click();

        setTimeout(() => {
          textarea.value = defaultText;
          textarea.dispatchEvent(new Event('focus', { bubbles: true }));
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
          textarea.dispatchEvent(new Event('blur', { bubbles: true }));
          console.log('Retry: Cover letter filled aggressively');
        }, 500);

        return 'filled';
      }

      return 'failed';
    `);

    await ctx.driver.sleep(2000);

    if (retryResult === 'no_cover_letter') {
      printLog("✅ Retry: Selected 'Don't include a cover letter'");
      yield "cover_letter_retried";
    } else if (retryResult === 'filled') {
      printLog("✅ Retry: Cover letter filled aggressively");
      yield "cover_letter_retried";
    } else {
      printLog("❌ Cover letter retry failed");
      yield "retry_failed";
    }

  } catch (error) {
    printLog(`Cover letter retry error: ${error}`);
    yield "retry_failed";
  }
}

// Click Continue Button
export async function* clickContinueButton(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Clicking continue button...");

    const continueClicked = await ctx.driver.executeScript(`
      const continueSelectors = [
        'button[data-testid="continue-button"]',
        'button:contains("Continue")',
        'button:contains("Next")'
      ];

      for (const selector of continueSelectors) {
        let button;
        if (selector.includes(':contains')) {
          const text = selector.match(/contains\\("([^"]+)"\\)/)[1];
          const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
            btn.textContent.toLowerCase().includes(text.toLowerCase())
          );
          button = buttons.find(btn => btn.offsetParent !== null && !btn.disabled);
        } else {
          button = document.querySelector(selector);
        }

        if (button && button.offsetParent !== null && !button.disabled) {
          button.scrollIntoView({ behavior: 'smooth', block: 'center' });
          button.click();
          console.log('Continue button clicked');
          return true;
        }
      }

      return false;
    `);

    if (continueClicked) {
      await ctx.driver.sleep(3000); // Wait for validation/page change

      // Check for errors after clicking continue
      const errorFound = await ctx.driver.executeScript(`
        const errorPanel = document.querySelector('#errorPanel') ||
                          document.querySelector('[role="alert"]') ||
                          document.querySelector('[id*="error"]');

        if (errorPanel && errorPanel.offsetParent !== null) {
          const errorText = errorPanel.textContent || '';
          if (errorText.toLowerCase().includes('cover letter') && errorText.toLowerCase().includes('required')) {
            return 'cover_letter_required';
          } else if (errorText.toLowerCase().includes('required')) {
            return 'field_required';
          }
          return 'other_error';
        }
        return 'no_error';
      `);

      if (errorFound === 'cover_letter_required') {
        printLog("❌ Cover letter validation failed - field required error");
        yield "continue_validation_failed";
      } else if (errorFound === 'field_required' || errorFound === 'other_error') {
        printLog(`❌ Form validation failed: ${errorFound}`);
        yield "continue_validation_failed";
      } else {
        printLog("✅ Continue button clicked successfully - no errors");
        yield "continue_clicked";
      }
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
export async function* closeQuickApplyAndContinueSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Closing Quick Apply page and continuing search...");

    const handles = await ctx.driver.getAllWindowHandles();
    printLog(`Found ${handles.length} window handles`);

    if (handles.length > 1) {
      // Close current tab/window
      await ctx.driver.close();

      // Switch back to main window (first handle)
      await ctx.driver.switchTo().window(handles[0]);
      await ctx.driver.sleep(1000);

      // Verify we're back on the job search page
      const currentUrl = await ctx.driver.getCurrentUrl();
      printLog(`Switched back to main window: ${currentUrl}`);
    } else {
      printLog("Only one window found, staying on current page");
    }

    printLog("Returned to job search page");
    yield "hunting_next_job";

  } catch (error) {
    printLog(`Close and continue error: ${error}`);
    // Try to continue anyway
    yield "hunting_next_job";
  }
}

// Skip to Next Card
export async function* skipToNextCard(_ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Regular Apply job found - skipping to next card...");
  yield "card_skipped";
}

// Handle Review and Submit Step (for development - goes to next job instead of submitting)
export async function* handleReviewAndSubmit(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("📋 On Review and Submit page - development mode");

    // Check if submit button exists
    const submitButtonInfo = await ctx.driver.executeScript(`
      const submitSelectors = [
        'button[type="submit"][data-testid="review-submit-application"]',
        'button[data-testid="review-submit-application"]',
        'button[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          const text = button.textContent || '';
          if (text.toLowerCase().includes('submit') && text.toLowerCase().includes('application')) {
            return {
              found: true,
              text: text.trim(),
              selector: selector
            };
          }
        }
      }
      return { found: false };
    `);

    if (submitButtonInfo.found) {
      printLog(`✅ Found submit button: "${submitButtonInfo.text}"`);
      printLog(`🔧 Development mode: Skipping submission and going to next job`);

      // Show overlay indicating we found the submit button but won't click it
      if (ctx.driver) {
        const overlay = new UniversalOverlay(ctx.driver);
        await overlay.showOverlay({
          title: '📋 Review and Submit Page',
          html: `
            <div style="text-align: center; line-height: 1.6;">
              <p style="font-size: 18px; margin: 15px 0;"><strong>Submit Button Found!</strong></p>
              <p style="color: #00ff88; font-size: 14px;">✅ "${submitButtonInfo.text}"</p>
              <p style="color: #ffaa00; font-size: 12px; margin: 15px 0;">Development Mode: Not submitting</p>
              <p style="font-size: 12px; color: #ccc;">Going to next job card...</p>
              <div style="margin: 15px 0;">
                <div style="
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: #00ff88;
                  animation: pulse 2s ease-in-out infinite;
                  margin: 0 auto;
                "></div>
              </div>
            </div>
            <style>
              @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
              }
            </style>
          `,
          position: { x: 20, y: 20 },
          draggable: true,
          collapsible: false,
          style: {
            backgroundColor: '#1a2a1a',
            borderColor: '#00ff88',
            textColor: '#ffffff'
          }
        });

        // Show overlay for 3 seconds
        await ctx.driver.sleep(3000);
      }

      // Close Quick Apply tab and go to next job
      printLog("🔄 Closing Quick Apply tab and returning to job search...");

      const handles = await ctx.driver.getAllWindowHandles();
      if (handles.length > 1) {
        await ctx.driver.close();
        await ctx.driver.switchTo().window(handles[0]);
        await ctx.driver.sleep(1000);

        const currentUrl = await ctx.driver.getCurrentUrl();
        printLog(`🔙 Returned to job search: ${currentUrl}`);

        yield "application_completed_dev_mode";
      } else {
        printLog("❌ Only one window found");
        yield "submit_error";
      }
    } else {
      printLog("❌ Submit button not found on review page");
      yield "submit_button_not_found";
    }

  } catch (error) {
    printLog(`Review and submit error: ${error}`);
    yield "submit_error";
  }
}

// Stay Put (for development - don't close page, don't move)
export async function* stayPut(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🛑 STAYING PUT - Bot will remain on current page for inspection");
  printLog("📋 Page URL: " + await ctx.driver.getCurrentUrl());

  // Check if we're on Update SEEK Profile step
  const currentStep = await ctx.driver.executeScript(`
    const nav = document.querySelector('nav[aria-label="Progress bar"]');
    if (!nav) return 'not_found';

    const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
    if (!currentStepBtn) return 'not_found';

    const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
    return stepText;
  `);

  if (currentStep === "Update SEEK Profile") {
    printLog("👤 Detected Update SEEK Profile step - showing profile update overlay");

    // Show profile update overlay with timer
    if (ctx.driver) {
      const overlay = new UniversalOverlay(ctx.driver);
      await overlay.showOverlay({
        title: '👤 Update Your SEEK Profile',
        html: `
          <div style="text-align: center; line-height: 1.6;">
            <p style="font-size: 18px; margin: 15px 0;"><strong>Please Update Your SEEK Profile</strong></p>
            <p style="color: #ffaa00; font-size: 14px;">Complete any required profile fields on this page</p>
            <div style="margin: 20px 0;">
              <div id="timer-display" style="
                font-size: 32px;
                font-weight: bold;
                color: #00ff88;
                background: rgba(0, 255, 136, 0.1);
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #00ff88;
                margin: 10px 0;
              ">5:00</div>
              <p style="font-size: 12px; color: #ccc;">Time remaining</p>
            </div>
            <button id="profile-done-btn" style="
              background: #00ff88;
              color: #1a1a1a;
              border: none;
              border-radius: 8px;
              padding: 15px 25px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
              margin-top: 10px;
            ">
              ✅ Done - Profile Updated
            </button>
          </div>
        `,
        position: { x: 20, y: 20 },
        draggable: true,
        collapsible: true,
        style: {
          backgroundColor: '#1a2a1a',
          borderColor: '#00ff88',
          textColor: '#ffffff'
        }
      });

      // Add timer and button functionality
      await ctx.driver.executeScript(`
        let timeLeft = 300; // 5 minutes in seconds
        const timerDisplay = document.getElementById('timer-display');
        const doneButton = document.getElementById('profile-done-btn');

        // Button hover effects
        if (doneButton) {
          doneButton.onmouseover = () => doneButton.style.background = '#00dd77';
          doneButton.onmouseout = () => doneButton.style.background = '#00ff88';
          doneButton.onclick = () => {
            window.profileDoneClicked = true;
            localStorage.setItem('profileDoneClicked', 'true');
          };
        }

        // Timer countdown
        const timerInterval = setInterval(() => {
          const minutes = Math.floor(timeLeft / 60);
          const seconds = timeLeft % 60;
          timerDisplay.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = 'Time Up!';
            timerDisplay.style.color = '#ff4444';
            timerDisplay.style.borderColor = '#ff4444';
          }

          timeLeft--;
        }, 1000);

        // Store timer interval for cleanup
        window.profileTimerInterval = timerInterval;
      `);

      printLog("👤 Waiting for user to update profile and click Done...");

      // Wait for done button to be clicked or timeout
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const buttonClicked = await ctx.driver.executeScript('return window.profileDoneClicked;');
            if (buttonClicked) {
              await ctx.driver.executeScript(`
                delete window.profileDoneClicked;
                if (window.profileTimerInterval) {
                  clearInterval(window.profileTimerInterval);
                  delete window.profileTimerInterval;
                }
              `);
              clearInterval(checkInterval);
              printLog("✅ Profile Done clicked - now clicking continue button...");
              resolve();
            }
          } catch (error) {
            // Continue checking
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          printLog("⏰ Profile update timer expired");
          resolve();
        }, 5 * 60 * 1000);
      });

      // Now click the continue button on the page
      printLog("🔄 Clicking continue button after profile update...");
      const continueClicked = await ctx.driver.executeScript(`
        const continueSelectors = [
          'button[data-testid="continue-button"]',
          'button:contains("Continue")',
          'button:contains("Next")'
        ];

        for (const selector of continueSelectors) {
          let button;
          if (selector.includes(':contains')) {
            const text = selector.match(/contains\\("([^"]+)"\\)/)[1];
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
              btn.textContent.toLowerCase().includes(text.toLowerCase())
            );
            button = buttons.find(btn => btn.offsetParent !== null && !btn.disabled);
          } else {
            button = document.querySelector(selector);
          }

          if (button && button.offsetParent !== null && !button.disabled) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.click();
            console.log('Continue button clicked after profile update');
            return true;
          }
        }
        return false;
      `);

      if (continueClicked) {
        await ctx.driver.sleep(3000); // Wait for navigation

        // Check the new step after continue
        const newStep = await ctx.driver.executeScript(`
          const nav = document.querySelector('nav[aria-label="Progress bar"]');
          if (!nav) return 'not_found';

          const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
          if (!currentStepBtn) return 'not_found';

          const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
          return stepText;
        `);

        printLog(`📊 Progress bar after continue: "${newStep}"`);

        if (newStep === "Review and submit") {
          printLog("🎯 Reached final step - Review and submit");
          yield "reached_review_and_submit";
          return;
        } else if (newStep === "Answer employer questions") {
          printLog("❓ Next step is employer questions");
          yield "reached_employer_questions";
          return;
        } else if (newStep === "" || newStep === "not_found") {
          printLog("📊 Progress bar empty or not found - checking if we reached review step");

          // Check if submit button exists (indicates review and submit page)
          const hasSubmitButton = await ctx.driver.executeScript(`
            const submitSelectors = [
              'button[type="submit"][data-testid="review-submit-application"]',
              'button[data-testid="review-submit-application"]',
              'button[type="submit"]'
            ];

            for (const selector of submitSelectors) {
              const button = document.querySelector(selector);
              if (button) {
                const text = button.textContent || '';
                if (text.toLowerCase().includes('submit') && text.toLowerCase().includes('application')) {
                  console.log('Found submit application button:', text);
                  return true;
                }
              }
            }
            return false;
          `);

          if (hasSubmitButton) {
            printLog("🎯 Submit button found - we're on Review and Submit page");
            yield "reached_review_and_submit";
            return;
          } else {
            printLog(`➡️ Progress bar empty but no submit button found`);
            yield "step_progressed";
            return;
          }
        } else {
          printLog(`➡️ Moved to step: "${newStep}"`);
          yield "step_progressed";
          return;
        }
      } else {
        printLog("❌ Continue button not found after profile update");
        yield "continue_not_found";
        return;
      }
    }
  } else {
    printLog("🔧 General inspection mode");

    // Show general stay put overlay
    if (ctx.driver) {
      const overlay = new UniversalOverlay(ctx.driver);
      await overlay.showOverlay({
        title: '🛑 Bot Staying Put',
        html: `
          <div style="text-align: center; line-height: 1.6;">
            <p style="font-size: 18px; margin: 15px 0;"><strong>Page Inspection Mode</strong></p>
            <p style="color: #ffaa00; font-size: 14px;">Bot is staying on current page</p>
            <p style="color: #00ff88; font-size: 12px;">Current step: "${currentStep}"</p>
            <p style="font-size: 12px; color: #ccc; margin-top: 20px;">Will stay here for 10 minutes...</p>
            <div style="margin-top: 15px;">
              <div style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #ffaa00;
                animation: pulse 3s ease-in-out infinite;
                margin: 0 auto;
              "></div>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 0.2; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.1); }
            }
          </style>
        `,
        position: { x: 20, y: 20 },
        draggable: true,
        collapsible: true,
        style: {
          backgroundColor: '#1a1a2a',
          borderColor: '#ffaa00',
          textColor: '#ffffff'
        }
      });
    }

    // Stay here for 10 minutes to allow inspection
    printLog("⏰ Staying put for 10 minutes to allow page inspection...");
    printLog("💡 Press Ctrl+C to stop the bot when you're done inspecting");

    await ctx.driver.sleep(600000); // 10 minutes
  }

  yield "stay_put_complete";
}

// Check Progress After Continue Button (for development visibility)
export async function* checkProgressAfterContinue(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔍 Checking progress after continue...");

    // Wait a moment for page to update
    await ctx.driver.sleep(2000);

    const currentStep = await ctx.driver.executeScript(`
      const nav = document.querySelector('nav[aria-label="Progress bar"]');
      if (!nav) return 'not_found';

      const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
      if (!currentStepBtn) return 'not_found';

      const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
      return stepText;
    `);

    if (currentStep !== 'not_found') {
      printLog(`📊 After continue - Current step: "${currentStep}"`);

      if (currentStep === "Update SEEK Profile") {
        yield "current_step_update_profile";
      } else if (currentStep === "Review and submit") {
        yield "current_step_review_submit";
      } else {
        yield "progress_checked";
      }
    } else {
      printLog("❌ Progress bar not found after continue");
      yield "progress_check_failed";
    }

  } catch (error) {
    printLog(`❌ Error checking progress: ${error}`);
    yield "progress_check_failed";
  }
}

// Handle Update SEEK Profile Step
export async function* handleUpdateProfile(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("👤 Handling Update SEEK Profile step...");

    // Show interactive overlay asking user to update profile
    if (ctx.driver) {
      const overlay = new UniversalOverlay(ctx.driver);
      await overlay.showOverlay({
        title: '👤 Update SEEK Profile Required',
        html: `
          <div style="text-align: center; line-height: 1.6;">
            <p style="font-size: 18px; margin: 15px 0;"><strong>Please Update Your SEEK Profile</strong></p>
            <p style="color: #ffaa00; font-size: 14px;">Complete your profile information on this page</p>
            <p style="font-size: 12px; color: #ccc; margin: 15px 0;">Fill in any required fields, then click continue below</p>
            <button id="profile-continue-btn" style="
              background: #00ff88;
              color: #1a1a1a;
              border: none;
              border-radius: 8px;
              padding: 12px 20px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
              margin-top: 10px;
            ">
              ✅ Profile Updated - Continue
            </button>
          </div>
        `,
        position: { x: 20, y: 20 },
        draggable: true,
        collapsible: true,
        style: {
          backgroundColor: '#1a2a1a',
          borderColor: '#00ff88',
          textColor: '#ffffff'
        }
      });

      // Add button functionality
      await ctx.driver.executeScript(`
        const button = document.getElementById('profile-continue-btn');
        if (button) {
          button.onmouseover = () => button.style.background = '#00dd77';
          button.onmouseout = () => button.style.background = '#00ff88';
          button.onclick = () => {
            window.profileContinueClicked = true;
            localStorage.setItem('profileContinueClicked', 'true');
          };
        }
      `);

      printLog("👤 Waiting for user to update profile and click continue...");

      // Wait for continue button to be clicked
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const buttonClicked = await ctx.driver.executeScript('return window.profileContinueClicked;');
            if (buttonClicked) {
              await ctx.driver.executeScript('delete window.profileContinueClicked;');
              clearInterval(checkInterval);
              printLog("✅ Profile continue clicked - proceeding...");
              resolve();
            }
          } catch (error) {
            // Continue checking
          }
        }, 500);

        // Timeout after 10 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          printLog("⏰ Profile update timeout reached");
          resolve();
        }, 10 * 60 * 1000);
      });
    }

    yield "profile_updated";

  } catch (error) {
    printLog(`Profile update error: ${error}`);
    yield "profile_update_error";
  }
}

// Click Continue After Profile Update
export async function* clickContinueAfterProfile(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔄 Checking current step and clicking continue if still on Update Profile...");

    // First check current step
    const currentStep = await ctx.driver.executeScript(`
      const nav = document.querySelector('nav[aria-label="Progress bar"]');
      if (!nav) return 'not_found';

      const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
      if (!currentStepBtn) return 'not_found';

      const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
      return stepText;
    `);

    printLog(`📊 Current step before continue: "${currentStep}"`);

    if (currentStep === "Update SEEK Profile") {
      // Still on Update Profile, click continue button
      const continueClicked = await ctx.driver.executeScript(`
        const continueSelectors = [
          'button[data-testid="continue-button"]',
          'button:contains("Continue")',
          'button:contains("Next")'
        ];

        for (const selector of continueSelectors) {
          let button;
          if (selector.includes(':contains')) {
            const text = selector.match(/contains\\("([^"]+)"\\)/)[1];
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn =>
              btn.textContent.toLowerCase().includes(text.toLowerCase())
            );
            button = buttons.find(btn => btn.offsetParent !== null && !btn.disabled);
          } else {
            button = document.querySelector(selector);
          }

          if (button && button.offsetParent !== null && !button.disabled) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.click();
            console.log('Continue button clicked after profile update');
            return true;
          }
        }
        return false;
      `);

      if (continueClicked) {
        await ctx.driver.sleep(3000); // Wait for navigation

        // Check final step
        const finalStep = await ctx.driver.executeScript(`
          const nav = document.querySelector('nav[aria-label="Progress bar"]');
          if (!nav) return 'not_found';

          const currentStepBtn = nav.querySelector('li button[aria-current="step"]');
          if (!currentStepBtn) return 'not_found';

          const stepText = currentStepBtn.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
          return stepText;
        `);

        printLog(`📊 Final step after continue: "${finalStep}"`);

        if (finalStep === "Review and submit") {
          yield "reached_review_submit";
        } else {
          yield "continue_successful";
        }
      } else {
        printLog("❌ Continue button not found");
        yield "continue_not_found";
      }
    } else {
      printLog(`✅ Already moved past Update Profile to: "${currentStep}"`);
      if (currentStep === "Review and submit") {
        yield "reached_review_submit";
      } else {
        yield "step_changed";
      }
    }

  } catch (error) {
    printLog(`Continue after profile error: ${error}`);
    yield "continue_error";
  }
}

// Pause for Development (keeps bot running for inspection)
export async function* pauseForDevelopment(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("🛑 DEVELOPMENT PAUSE - Bot will stay here for inspection");
  printLog("📋 You can now inspect the Quick Apply page state");
  printLog("🔧 Add your new functions and continue development");

  // Show development pause overlay
  if (ctx.driver) {
    const overlay = new UniversalOverlay(ctx.driver);
    await overlay.showOverlay({
      title: '🛑 Development Pause',
      html: `
        <div style="text-align: center; line-height: 1.6;">
          <p style="font-size: 18px; margin: 15px 0;"><strong>Bot Paused for Development</strong></p>
          <p style="color: #00ff88; font-size: 14px;">✅ Resume and cover letter handled</p>
          <p style="color: #00ff88; font-size: 14px;">✅ Continue button clicked</p>
          <p style="color: #00ff88; font-size: 14px;">✅ Progress bar checked</p>
          <p style="font-size: 12px; color: #ffaa00; margin-top: 20px;">Ready for next development step...</p>
          <div style="margin-top: 15px;">
            <div style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #ffaa00;
              animation: pulse 2s ease-in-out infinite;
              margin: 0 auto;
            "></div>
          </div>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        </style>
      `,
      position: { x: 20, y: 20 },
      draggable: true,
      collapsible: true,
      style: {
        backgroundColor: '#1a2a1a',
        borderColor: '#ffaa00',
        textColor: '#ffffff'
      }
    });
  }

  // In development mode, we'll wait for a long time (10 minutes) to inspect
  printLog("⏰ Pausing for 10 minutes to allow development inspection...");
  printLog("💡 Press Ctrl+C to stop the bot when you're done inspecting");

  await ctx.driver.sleep(600000); // 10 minutes

  yield "development_pause_complete";
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
  performBasicSearch,
  collectJobCards,
  clickJobCard,
  detectApplyType,
  parseJobDetails,
  clickQuickApply,
  waitForQuickApplyPage,
  getCurrentStep,
  handleResumeSelection,
  handleCoverLetter,
  retryCoverLetter,
  clickContinueButton,
  checkProgressAfterContinue,
  handleUpdateProfile,
  clickContinueAfterProfile,
  handleReviewAndSubmit,
  pauseForDevelopment,
  closeQuickApplyAndContinueSearch,
  skipToNextCard,
  stayPut
};



