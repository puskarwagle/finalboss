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

      const filename = `job_${Date.now()}.json`;
      const filepath = path.join(jobsDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(jobData, null, 2));

      printLog(`Quick Apply job saved: ${jobData.title} at ${jobData.company}`);
    } else {
      printLog("Quick Apply job found but failed to extract data");
    }

    yield "job_parsed";
  } catch (error) {
    printLog(`Job parsing error: ${error}`);
    yield "parse_failed";
  }
}

// Skip to Next Card
export async function* skipToNextCard(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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
  skipToNextCard
};



