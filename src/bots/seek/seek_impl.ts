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

    // Wait longer for slow networks
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
  await ctx.driver.sleep(2000);
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

    printLog(`Current Quick Apply step: ${currentStep}`);

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
      // Try to find cover letter radio button
      const coverLetterRadio = document.querySelector('input[data-testid="coverLetter-method-change"]');
      if (coverLetterRadio && !coverLetterRadio.checked) {
        coverLetterRadio.click();

        // Wait a bit for textarea to appear
        setTimeout(() => {
          const textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]');
          if (textarea) {
            const defaultText = "Dear Hiring Manager,\\n\\nI am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.\\n\\nI am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.\\n\\nThank you for your consideration.\\n\\nBest regards";
            textarea.value = defaultText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('Cover letter filled');
          }
        }, 500);

        return true;
      }

      return false;
    `);

    if (coverLetterHandled) {
      await ctx.driver.sleep(1000);
      printLog("Cover letter handled");
      yield "cover_letter_filled";
    } else {
      printLog("Cover letter not required or already handled");
      yield "cover_letter_not_required";
    }

  } catch (error) {
    printLog(`Cover letter error: ${error}`);
    yield "cover_letter_error";
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
          setTimeout(() => {
            button.click();
            console.log('Continue button clicked');
          }, 300);
          return true;
        }
      }

      return false;
    `);

    if (continueClicked) {
      await ctx.driver.sleep(2000); // Wait for navigation/page change
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
  clickContinueButton,
  closeQuickApplyAndContinueSearch,
  skipToNextCard
};



