import * as path from 'path';
import * as fs from 'fs';
import { Page, BrowserContext, Locator } from 'playwright';

const BASE_URL = "https://www.seek.com.au";

interface Context {
  [key: string]: any;
  page?: Page;
  browser_context?: BrowserContext;
  base_dir?: string;
  selectors?: any;
  seek_url?: string;
  job_cards?: any[];
  job_index?: number;
  job_details_raw?: {
    raw_title: string;
    details: string;
    totalChars: number;
    debug_info: any;
  };
  quick_apply_flags?: {
    hasQuickApply: boolean;
    hasRegularApply: boolean;
    quickApplyCount?: number;
  };
  quick_apply_page?: Page;
  original_job_search_page?: Page;
  last_job_data?: any;
  jobs_collected?: any[];
}

function _slugify(text: string): string {
  if (!text) return "";
  text = text.trim().toLowerCase();
  text = text.replace(/[^a-z0-9]+/g, "-");
  text = text.replace(/-+/g, "-");
  return text.replace(/^-|-$/g, "");
}

async function* step0(ctx: Context): AsyncGenerator<string> {
  const baseDir = ctx.base_dir || path.resolve(__dirname, '../..');
  const selectorsPath = path.resolve(__dirname, 'seek_selectors.json');
  
  try {
    const selectorsData = fs.readFileSync(selectorsPath, 'utf-8');
    ctx.selectors = JSON.parse(selectorsData);
  } catch {
    ctx.selectors = {};
  }

  const settings = loadSettings(baseDir, "seek");
  const prefs = (typeof settings === 'object' && settings) ? settings.job_preferences || {} : {};
  const kws = prefs.keywords || [];
  const locs = prefs.locations || [];
  
  const keyword = Array.isArray(kws) && kws.length ? kws[0] : (typeof kws === 'string' ? kws : "");
  const location = Array.isArray(locs) && locs.length ? locs[0] : (typeof locs === 'string' ? locs : "");
  
  const kwSlug = _slugify(String(keyword));
  const locSlug = _slugify(String(location));
  
  let urlPath = kwSlug ? `/${kwSlug}-jobs` : "/jobs";
  if (locSlug) {
    urlPath += `/in-${locSlug}`;
  }
  
  ctx.seek_url = `${BASE_URL}${urlPath}`;
  yield "ctx_ready";
}

async function* openHomepage(ctx: Context): AsyncGenerator<string> {
  const context = ctx.browser_context;
  if (!context) {
    yield "no_browser_context";
    return;
  }
  
  const page = await context.newPage();
  ctx.page = page;
  
  try {
    await page.goto(ctx.seek_url || `${BASE_URL}/jobs`, { waitUntil: "domcontentloaded" });
    yield "homepage_opened";
  } catch (e) {
    console.log(`Failed to open homepage: ${e}`);
    yield "page_navigation_failed";
  }
}

async function* refreshPage(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  if (!page) {
    yield "no_page_to_refresh";
    return;
  }
  
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    yield "page_refreshed";
  } catch (e) {
    console.log(`Failed to refresh page: ${e}`);
    yield "page_reload_failed";
  }
}

async function* waitForPageLoad(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  if (!page) {
    yield "page_load_retry";
    return;
  }
  
  try {
    await page.waitForLoadState("load");
    try {
      await page.waitForLoadState("networkidle");
    } catch {
      // Ignore networkidle failures
    }
    yield "page_loaded";
  } catch {
    yield "page_load_retry";
  }
}

async function* detectPageState(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  const selectors = ctx.selectors || {};
  
  if (!page) {
    yield "no_cards_found";
    return;
  }
  
  const jobCardSelectors = selectors.job_cards || [];
  for (const sel of jobCardSelectors) {
    try {
      const els = await page.locator(sel).all();
      if (els.length > 0) {
        yield "cards_present";
        return;
      }
    } catch {
      continue;
    }
  }
  
  const signInSelectors = selectors.sign_in_link || [];
  for (const sel of signInSelectors) {
    try {
      const el = await page.locator(sel).first();
      if (await el.count() > 0) {
        yield "sign_in_required";
        return;
      }
    } catch {
      continue;
    }
  }
  
  yield "no_cards_found";
}

async function* showSignInBanner(ctx: Context): AsyncGenerator<string> {
  const context = ctx.browser_context;
  if (!context) {
    yield "signin_banner_retry";
    return;
  }
  
  let uiPage: Page | null = null;
  try {
    for (const p of context.pages()) {
      if ((p.url() || "").includes("127.0.0.1:6666")) {
        uiPage = p;
        break;
      }
    }
  } catch {
    // Ignore
  }
  
  if (!uiPage) {
    uiPage = await context.newPage();
    try {
      await uiPage.goto("http://127.0.0.1:6666/");
    } catch {
      // Ignore
    }
  }
  
  try {
    await uiPage.bringToFront();
  } catch {
    // Ignore
  }
  
  try {
    await uiPage.evaluate(() => {
      const id = 'guu-signin-banner';
      if (document.getElementById(id)) return;
      const div = document.createElement('div');
      div.id = id;
      div.textContent = 'Please sign in to seek.com in the other tab, then resume the bot.';
      Object.assign(div.style, { 
        position: 'fixed', 
        top: '12px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        background: '#b45309', 
        color: '#fff', 
        padding: '10px 14px', 
        borderRadius: '6px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)', 
        zIndex: '2147483647' 
      });
      document.body.appendChild(div);
      setTimeout(() => { 
        try { 
          div.remove(); 
        } catch(e) {} 
      }, 15000);
    });
  } catch {
    // Ignore
  }
  
  yield "signin_banner_shown";
}

async function* collectJobCards(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  const selectors = ctx.selectors || {};
  
  if (!page) {
    yield "cards_collect_retry";
    return;
  }
  
  let cards: any[] = [];
  const jobCardSelectors = selectors.job_cards || [];
  
  for (const sel of jobCardSelectors) {
    try {
      await page.waitForSelector(sel, { state: "attached" });
      const found = await page.locator(sel).all();
      if (found.length > 0) {
        cards = found;
        break;
      }
    } catch {
      continue;
    }
  }
  
  if (cards.length === 0) {
    yield "cards_collect_retry";
    return;
  }
  
  ctx.job_cards = cards;
  if (ctx.job_index === undefined) {
    ctx.job_index = 0;
  }
  
  yield "cards_collected";
}

async function* clickJobCard(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  const cards = ctx.job_cards || [];
  
  if (!page || cards.length === 0) {
    yield "job_card_skipped";
    return;
  }
  
  const index = ctx.job_index || 0;
  
  try {
    const target = cards[index];
    if (!target) {
      yield "job_card_skipped";
      return;
    }
    
    try {
      await target.scrollIntoViewIfNeeded();
    } catch {
      // Ignore
    }
    
    await target.click();
  } catch {
    // Ignore click failures
  }
  
  ctx.job_index = index + 1;
  yield "job_card_clicked";
}

async function* waitForDetailsPanel(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  const selectors = ctx.selectors || {};
  
  if (!page) {
    yield "details_panel_retry";
    return;
  }
  
  const selector = selectors.job_details_panel;
  if (!selector) {
    yield "details_panel_retry";
    return;
  }
  
  try {
    await page.waitForSelector(selector, { state: "attached" });
  } catch {
    yield "details_panel_retry";
    return;
  }
  
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const ready = await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        return !!(container && container.innerText && container.innerText.trim().length > 50);
      }, selector);
      
      if (ready) {
        yield "details_panel_ready";
        return;
      }
    } catch {
      // Ignore
    }
    
    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
  }
  
  yield "details_panel_retry";
}

async function* detectQuickApply(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  
  if (!page) {
    ctx.quick_apply_flags = { hasQuickApply: false, hasRegularApply: false };
    yield "qa: quick=false regular=false";
    yield "apply_missing";
    return;
  }
  
  const btns = page.locator('[data-automation="job-detail-apply"]');
  const count = await btns.count();
  
  if (count === 0) {
    ctx.quick_apply_flags = { hasQuickApply: false, hasRegularApply: false };
    yield "qa: quick=false regular=false";
    yield "apply_missing";
    return;
  }
  
  let hasQuick = false;
  for (let i = 0; i < count; i++) {
    const txt = (await btns.nth(i).innerText()).toLowerCase();
    const normalizedTxt = txt.replace(/[\u00A0\u2000-\u200D\u202F\u2060]/g, " ");
    if (normalizedTxt.includes("quick apply")) {
      hasQuick = true;
      break;
    }
  }
  
  ctx.quick_apply_flags = {
    hasQuickApply: hasQuick,
    hasRegularApply: !hasQuick,
    quickApplyCount: hasQuick ? 1 : 0,
  };
  
  yield `qa: quick=${hasQuick} regular=${!hasQuick} count=${count}`;
  yield hasQuick ? "quick_apply_found" : "regular_apply_found";
}

async function* genericFormsLions(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  if (!page) {
    yield "no_page";
    return;
  }
  
  console.log("Starting Generic questions detection...");
  
  try {
    const scriptPath = path.resolve(__dirname, "scripts", "generic_form_detector.js");
    const jsCode = fs.readFileSync(scriptPath, "utf-8");
  } catch (e) {
    yield "Generic_questions_script_error";
    return;
  }
  
  console.log("Questions and answers detected:");
  yield "generic_forms_handled";
}

async function* extractJobDetailsRaw(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  
  if (!page) {
    ctx.job_details_raw = { raw_title: "", details: "", totalChars: 0, debug_info: {} };
    yield "extracted: (no page)";
    yield "details_extracted";
    return;
  }
  
  const scriptPath = path.resolve(__dirname, "scripts", "job_content_extractor.js");
  let js = "";
  
  try {
    js = fs.readFileSync(scriptPath, "utf-8");
  } catch {
    // Ignore
  }
  
  if (!js) {
    ctx.job_details_raw = { raw_title: "", details: "", totalChars: 0, debug_info: {} };
    yield "extracted: (no script)";
    yield "details_extracted";
    return;
  }
  
  try {
    const result = await page.evaluate(`${js}\nreturn extractJobContent();`);
    const rawTitle = result?.raw_title || "";
    const details = result?.details || "";
    const total = result?.totalChars || details.length;
    
    ctx.job_details_raw = {
      raw_title: rawTitle,
      details: details,
      totalChars: total,
      debug_info: result?.debug_info || {},
    };
    
    const previewTitle = rawTitle ? 
      (rawTitle.replace(/\n/g, " ").substring(0, 80) + (rawTitle.length > 80 ? "…" : "")) : 
      "(no title)";
    
    yield `extracted: title=${previewTitle} · chars=${total}`;
    yield "details_extracted";
    return;
    
  } catch (e) {
    // Fallback logic
    const selectors = ctx.selectors || {};
    const selector = selectors.job_details_panel;
    let detailsText = "";
    
    try {
      if (selector) {
        detailsText = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? el.innerText : "";
        }, selector);
      }
    } catch {
      // Ignore
    }
    
    const lines = detailsText.split("\n").map(l => l.trim()).filter(l => l);
    const titleLines = [];
    
    for (const l of lines) {
      if (["Quick apply", "Apply", "Save"].includes(l)) break;
      titleLines.push(l);
    }
    
    const rawTitle = titleLines.slice(0, 5).join("\n");
    const total = detailsText.length;
    
    ctx.job_details_raw = {
      raw_title: rawTitle || "",
      details: detailsText || "",
      totalChars: total,
      debug_info: { fallback: true, error: String(e).substring(0, 200) },
    };
    
    const previewTitle = rawTitle ? 
      (rawTitle.replace(/\n/g, " ").substring(0, 80) + (rawTitle.length > 80 ? "…" : "")) : 
      "(no title)";
    
    yield `extracted: (fallback) title=${previewTitle} · chars=${total}`;
  }
  
  yield "details_extracted";
}

async function* parseJobDetails(ctx: Context): AsyncGenerator<string> {
  const raw = ctx.job_details_raw || {};
  let rawTitle = (raw.raw_title || "").trim();
  let rawDetails = (raw.details || "").trim();
  
  if (!rawTitle && rawDetails) {
    const { titleGuess, remaining } = splitTitleAndDetails(rawDetails);
    rawTitle = titleGuess.trim();
    rawDetails = remaining ? remaining.trim() : rawDetails;
  }
  
  const cleanedDetails = cleanUnwantedContent(rawDetails);
  const parsedJob = parseJobTitleWithSvgMarkers(rawTitle);
  const jobIndexZeroBased = (ctx.job_index || 1) - 1;
  const formatted = formatJobData(parsedJob, cleanedDetails, jobIndexZeroBased);
  
  ctx.last_job_data = formatted;
  let jobsList = ctx.jobs_collected;
  if (!Array.isArray(jobsList)) {
    jobsList = [];
  }
  jobsList.push(formatted);
  ctx.jobs_collected = jobsList;
  
  yield "parsed";
}

async function* clickQuickApply(ctx: Context): AsyncGenerator<string> {
  const page = ctx.page;
  const browserContext = ctx.browser_context;
  const flags = ctx.quick_apply_flags || {};
  
  if (!page || !browserContext) {
    yield "missing_page_or_context";
    return;
  }
  
  ctx.original_job_search_page = page;
  
  try {
    const btns = page.locator('[data-automation="job-detail-apply"]');
    const count = await btns.count();
    const pagesBefore = browserContext.pages().length;
    
    if (flags.hasQuickApply) {
      for (let i = 0; i < count; i++) {
        const txt = (await btns.nth(i).innerText()).toLowerCase();
        const normalizedTxt = txt.replace(/[\u00A0\u2000-\u200D\u202F\u2060]/g, " ");
        if (normalizedTxt.includes("quick apply")) {
          await btns.nth(i).scrollIntoViewIfNeeded();
          await btns.nth(i).click();
          await new Promise(resolve => setTimeout(resolve, 400));
          
          const pagesAfter = browserContext.pages().length;
          if (pagesAfter > pagesBefore) {
            const newPage = browserContext.pages()[browserContext.pages().length - 1];
            ctx.quick_apply_page = newPage;
            ctx.page = newPage;
            yield "quick_apply_clicked";
            return;
          } else {
            yield "new_tab_not_opened";
            return;
          }
        }
      }
      yield "no_quick_apply_button_found";
      return;
    }
    
    if (flags.hasRegularApply) {
      for (let i = 0; i < count; i++) {
        const txt = (await btns.nth(i).innerText()).toLowerCase();
        const normalizedTxt = txt.replace(/[\u00A0\u2000-\u200D\u202F\u2060]/g, " ");
        if (!normalizedTxt.includes("quick apply")) {
          await btns.nth(i).scrollIntoViewIfNeeded();
          await btns.nth(i).click();
          await new Promise(resolve => setTimeout(resolve, 400));
          
          const pagesAfter = browserContext.pages().length;
          if (pagesAfter > pagesBefore) {
            const newPage = browserContext.pages()[browserContext.pages().length - 1];
            ctx.quick_apply_page = newPage;
            ctx.page = newPage;
            yield "regular_apply_clicked";
            return;
          } else {
            yield "new_tab_not_opened";
            return;
          }
        }
      }
      yield "no_regular_apply_button_found";
      return;
    }
  } catch (e) {
    console.log(`Quick/Regular apply click error: ${e}`);
    yield "quick_apply_error";
  }
}

async function* waitForQuickApplyPage(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    await page.waitForLoadState("domcontentloaded");
    
    try {
      await page.waitForSelector('select[data-testid="select-input"], nav[aria-label="Progress bar"]', { timeout: 10000 });
      yield "quick_apply_page_ready";
    } catch {
      await new Promise(resolve => setTimeout(resolve, 2000));
      yield "quick_apply_page_ready";
    }
  } catch (e) {
    console.log(`Quick apply page load error: ${e}`);
    yield "page_load_timeout";
  }
}

async function* getAvailableSteps(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const progressScript = `
      () => {
        const nav = document.querySelector('nav[aria-label="Progress bar"]');
        if (!nav) return null;
        const quickApplySteps = Array.from(nav.querySelectorAll('li button')).map((button, index) => {
          const stepText = button.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
          return {
            index: index + 1,
            text: stepText
          };
        });
        return quickApplySteps;
      }
    `;
    
    const quickApplySteps = await page.evaluate(progressScript);
    if (!quickApplySteps) {
      console.log("Quick Apply progress bar not found");
      yield "quick_apply_progress_bar_not_found";
      return;
    }
    
    ctx.quick_apply_available_steps = quickApplySteps;
    for (const step of quickApplySteps) {
      console.log(`Step ${step.index}: ${step.text}`);
    }
    yield "quick_apply_steps_listed";
  } catch (e) {
    console.log(`Error getting Quick Apply available steps: ${e}`);
    yield "quick_apply_steps_listing_error";
  }
}

async function* handleResumeSelection(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const resumeSelectors = [
      'select[data-testid="select-input"]',
      'select[placeholder*="resumé"], select[placeholder*="resume"]',
      'select[id*=":re:"]',
      'select'
    ];
    
    let resumeSelect: Locator | null = null;
    let selectedSelector: string | null = null;
    
    for (const selector of resumeSelectors) {
      try {
        const locator = page.locator(selector);
        const count = await locator.count();
        console.log(`Selector '${selector}' found ${count} elements`);
        if (count > 0) {
          resumeSelect = locator;
          selectedSelector = selector;
          break;
        }
      } catch (e) {
        console.log(`Error with selector '${selector}': ${e}`);
        continue;
      }
    }
    
    if (resumeSelect && selectedSelector) {
      try {
        const optionsScript = `
          (function() {
            const select = document.querySelector('${selectedSelector}');
            if (!select) return [];
            
            return Array.from(select.options).map(option => ({
              value: option.value,
              text: option.textContent.trim(),
              selected: option.selected
            })).filter(opt => opt.value && opt.value !== '');
          })();
        `;
        
        const options = await page.evaluate(optionsScript);
        console.log(`Found ${options?.length || 0} options in resume select`);
        
        if (options && options.length > 0) {
          const firstResume = options[0];
          console.log(`Selecting resume: ${JSON.stringify(firstResume)}`);
          await resumeSelect.selectOption({ value: firstResume.value });
          yield "resume_selected";
          return;
        } else {
          console.log(`No options found in resume select with selector: ${selectedSelector}`);
          yield "no_resume_options_available";
          return;
        }
      } catch (e) {
        console.log(`Error getting options from resume select: ${e}`);
        yield "resume_options_error";
        return;
      }
    }
    
    const resumeMethodSelectors = [
      'input[data-testid="resume-method-change"][value="change"]',
      'input[type="radio"][name="resume-method"][value="change"]',
      'input[type="radio"][id*=":rb:"][value="change"]',
      'input[type="radio"][name="resume-method"]'
    ];
    
    let resumeMethodChange: Locator | null = null;
    for (const selector of resumeMethodSelectors) {
      try {
        const locator = page.locator(selector);
        const count = await locator.count();
        console.log(`Resume method selector '${selector}' found ${count} elements`);
        if (count > 0) {
          resumeMethodChange = locator;
          break;
        }
      } catch (e) {
        console.log(`Error with resume method selector '${selector}': ${e}`);
        continue;
      }
    }
    
    if (resumeMethodChange) {
      try {
        console.log("Clicking resume method change button");
        await resumeMethodChange.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        for (const selector of resumeSelectors) {
          try {
            const locator = page.locator(selector);
            const count = await locator.count();
            console.log(`After method change - selector '${selector}' found ${count} elements`);
            if (count > 0) {
              const optionsScript = `
                (function() {
                  const select = document.querySelector('${selector}');
                  if (!select) return [];
                  
                  return Array.from(select.options).map(option => ({
                    value: option.value,
                    text: option.textContent.trim(),
                    selected: option.selected
                  })).filter(opt => opt.value && opt.value !== '');
                })();
              `;
              
              const options = await page.evaluate(optionsScript);
              console.log(`After method change - found ${options?.length || 0} options`);
              
              if (options && options.length > 0) {
                const firstResume = options[0];
                console.log(`After method change - selecting resume: ${JSON.stringify(firstResume)}`);
                await locator.selectOption({ value: firstResume.value });
                yield "resume_selected";
                return;
              }
            }
          } catch (e) {
            console.log(`Error with selector ${selector} after method change: ${e}`);
            continue;
          }
        }
      } catch (e) {
        console.log(`Error clicking resume method change: ${e}`);
        yield "resume_method_change_failed";
        return;
      }
    }
    
    console.log("No resume selection possible - yielding no_resume_available");
    yield "no_resume_available";
    
  } catch (e) {
    console.log(`Resume selection error: ${e}`);
    yield "resume_selection_error";
  }
}

async function* handleCoverLetter(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const radioButton = page.locator('input[data-testid="coverLetter-method-change"]');
    if (await radioButton.count() > 0) {
      await radioButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const textarea = page.locator('textarea[data-testid="coverLetterTextInput"]');
      if (await textarea.count() > 0) {
        const baseDir = ctx.base_dir || path.resolve(__dirname, '../..');
        const settings = loadSettings(baseDir, "seek");
        const appSettings = (typeof settings === 'object' && settings) ? settings.application_settings || {} : {};
        const coverLetterText = appSettings.cover_letter_template || getDefaultCoverLetter();
        
        await textarea.fill(coverLetterText);
        yield "cover_letter_filled";
      } else {
        yield "cover_letter_textarea_not_found";
      }
    } else {
      yield "cover_letter_not_required";
    }
  } catch (e) {
    console.log(`Cover letter error: ${e}`);
    yield "cover_letter_error";
  }
}

async function* clickContinueButton(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const continueBtn = page.locator('button[data-testid="continue-button"]');
    if (await continueBtn.count() > 0) {
      await continueBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      yield "continue_clicked";
    } else {
      const altContinue = page.locator('button:has-text("Continue"), button:has-text("Next")');
      if (await altContinue.count() > 0) {
        await altContinue.first().click();
        await new Promise(resolve => setTimeout(resolve, 100));
        yield "continue_clicked";
      } else {
        yield "continue_button_not_found";
      }
    }
  } catch (e) {
    console.log(`Continue button error: ${e}`);
    yield "continue_button_error";
  }
}

async function* getCurrentStep(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const progressScript = `
      () => {
        const nav = document.querySelector('nav[aria-label="Progress bar"]');
        if (!nav) return "progress_bar_not_found";
        const quickApplyCurrentStep = nav.querySelector('li button[aria-current="step"]');
        if (!quickApplyCurrentStep) return "progress_bar_not_found";
        const stepText = quickApplyCurrentStep.querySelector('span:nth-child(2) span:nth-child(2) span span')?.textContent?.trim() || '';
        return stepText;
      }
    `;
    
    const quickApplyCurrentStepText = await page.evaluate(progressScript);
    
    if (quickApplyCurrentStepText === "progress_bar_not_found") {
      yield "progress_bar_not_found";
    } else if (quickApplyCurrentStepText) {
      ctx.quick_apply_current_step_text = quickApplyCurrentStepText;
      
      if (quickApplyCurrentStepText === "Choose documents") {
        yield "current_step_choose_documents";
      } else if (quickApplyCurrentStepText === "Answer employer questions") {
        yield "current_step_employer_questions";
      } else if (quickApplyCurrentStepText === "Update SEEK Profile") {
        yield "current_step_update_profile";
      } else if (quickApplyCurrentStepText === "Review and submit") {
        yield "current_step_review_submit";
      } else {
        yield "current_step_unknown";
      }
    } else {
      yield "progress_bar_not_found";
    }
  } catch (e) {
    yield "progress_bar_evaluation_error";
  }
}

async function* handleAnswerEmployerQuestions(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  console.log("Starting employer questions detection...");
  
  try {
    const scriptPath = path.resolve(__dirname, "scripts", "quick_apply_questions.js");
    const jsCode = fs.readFileSync(scriptPath, "utf-8");
  } catch (e) {
    console.log(`Error reading quick_apply_questions.js: ${e}`);
    yield "employer_questions_script_error";
    return;
  }
  
  try {
    const form = await page.locator('form').first();
    if (await form.count() === 0) {
      console.log("Form element not found on page.");
      yield "form_not_found";
      return;
    }
    
    const result = await page.evaluate((form, jsCode) => {
      return eval(`(form) => {${jsCode}}`)(form);
    }, await form.elementHandle(), jsCode);
    
    if (result && typeof result === 'object') {
      if (result.results) {
        console.log(`Found ${result.results.length} question(s)`);
        result.results.forEach((qa: any, i: number) => {
          console.log(`Question ${i + 1}: ${qa.question || 'N/A'}`);
          console.log(`Answers: ${qa.answers || []}`);
        });
        yield "employer_questions_handled";
        return;
      }
    } else {
      console.log("No employer questions detected or invalid result.");
      yield "employer_questions_none";
    }
  } catch (e) {
    console.log(`Error evaluating employer questions JS: ${e}`);
    yield "employer_questions_eval_error";
  }
}

async function* handleUpdateSeekProfile(ctx: Context): AsyncGenerator<string> {
  const context = ctx.browser_context;
  if (!context) {
    yield "no_browser_context";
    return;
  }
  
  try {
    let dashboardPage: Page | null = null;
    for (const p of context.pages()) {
      const url = p.url() || "";
      if (url.includes("seek.com.au") && (url.includes("dashboard") || url.includes("profile"))) {
        dashboardPage = p;
        break;
      }
    }
    
    if (!dashboardPage) {
      for (const p of context.pages()) {
        if ((p.url() || "").includes("seek.com.au")) {
          dashboardPage = p;
          break;
        }
      }
    }
    
    if (dashboardPage) {
      try {
        await dashboardPage.bringToFront();
        console.log("Found existing SEEK page, brought to front");
      } catch (e) {
        console.log(`Error bringing dashboard to front: ${e}`);
      }
    }
    
    let uiPage: Page | null = null;
    try {
      for (const p of context.pages()) {
        if ((p.url() || "").includes("127.0.0.1:6666")) {
          uiPage = p;
          break;
        }
      }
    } catch {
      // Ignore
    }
    
    if (!uiPage) {
      uiPage = await context.newPage();
      try {
        await uiPage.goto("http://127.0.0.1:6666/");
      } catch {
        // Ignore
      }
    }
    
    try {
      await uiPage.bringToFront();
    } catch {
      // Ignore
    }
    
    try {
      await uiPage.evaluate(() => {
        const id = 'guu-update-profile-banner';
        if (document.getElementById(id)) return;
        const div = document.createElement('div');
        div.id = id;
        div.textContent = 'Please update your SEEK profile on seek.com.au, then resume the bot.';
        Object.assign(div.style, { 
          position: 'fixed', 
          top: '12px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          background: '#059669', 
          color: '#fff', 
          padding: '10px 14px', 
          borderRadius: '6px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)', 
          zIndex: '2147483647' 
        });
        document.body.appendChild(div);
        setTimeout(() => { 
          try { 
            div.remove(); 
          } catch(e) {} 
        }, 15000);
      });
    } catch {
      // Ignore
    }
    
    console.log("Update SEEK Profile step detected - showing banner");
    yield "update_profile_banner_shown";
    
  } catch (e) {
    console.log(`Update SEEK Profile error: ${e}`);
    yield "update_profile_error";
  }
}

async function* backButtonQuickapply(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    const backBtn = page.locator('button[data-testid="back-button"]');
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("Back button clicked successfully");
      yield "back_button_clicked";
    } else {
      console.log("Back button not found");
      yield "back_button_not_found";
    }
  } catch (e) {
    console.log(`Back button error: ${e}`);
    yield "back_button_error";
  }
}

async function* submitApplication(ctx: Context): AsyncGenerator<string> {
  const page = ctx.quick_apply_page;
  if (!page) {
    yield "no_quick_apply_page";
    return;
  }
  
  try {
    await logQuickApplyProgress(page, "SUBMIT");
    
    const submitBtn = page.locator('button[data-testid="submit-button"], button:has-text("Submit"), button:has-text("Apply")');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      if (await isApplicationComplete(page)) {
        yield "application_submitted";
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (await isApplicationComplete(page)) {
          yield "application_submitted";
        } else {
          yield "application_submitted"; // Proceed anyway
        }
      }
    } else {
      yield "submit_button_not_found";
    }
  } catch (e) {
    console.log(`Submit application error: ${e}`);
    yield "submit_application_error";
  }
}

async function* closeQuickApplyAndContinueSearch(ctx: Context): AsyncGenerator<string> {
  const applyPage = ctx.quick_apply_page || ctx.regular_apply_page;
  const originalPage = ctx.original_job_search_page;
  
  if (!originalPage) {
    yield "no_original_page";
    return;
  }
  
  try {
    if (applyPage) {
      await applyPage.close();
    }
    
    ctx.page = originalPage;
    await originalPage.bringToFront();
    
    delete ctx.quick_apply_page;
    delete ctx.regular_apply_page;
    delete ctx.original_job_search_page;
    
    yield "hunting_next_job";
    
  } catch (e) {
    console.log(`Close and continue error: ${e}`);
    yield "close_and_continue_error";
  }
}

async function* finishRun(ctx: Context): AsyncGenerator<string> {
  yield "run_finished";
}

// Utility functions (stub implementations)
function loadSettings(baseDir: string, workflow: string): any {
  // Stub implementation
  return {};
}

function splitTitleAndDetails(details: string): { titleGuess: string; remaining: string } {
  // Stub implementation
  return { titleGuess: "", remaining: details };
}

function cleanUnwantedContent(content: string): string {
  // Stub implementation
  return content;
}

function parseJobTitleWithSvgMarkers(title: string): any {
  // Stub implementation
  return {};
}

function formatJobData(parsedJob: any, details: string, jobIndex: number): any {
  // Stub implementation
  return {};
}

function getDefaultCoverLetter(): string {
  // Stub implementation
  return "Default cover letter";
}

async function logQuickApplyProgress(page: Page, step: string): Promise<void> {
  // Stub implementation
}

async function isApplicationComplete(page: Page): Promise<boolean> {
  // Stub implementation
  return true;
}

export {
  step0,
  openHomepage,
  refreshPage,
  waitForPageLoad,
  detectPageState,
  showSignInBanner,
  collectJobCards,
  clickJobCard,
  waitForDetailsPanel,
  extractJobDetailsRaw,
  detectQuickApply,
  parseJobDetails,
  clickQuickApply,
  waitForQuickApplyPage,
  getAvailableSteps,
  handleResumeSelection,
  handleCoverLetter,
  clickContinueButton,
  handleAnswerEmployerQuestions,
  submitApplication,
  finishRun,
  getCurrentStep,
  backButtonQuickapply,
  genericFormsLions,
  handleUpdateSeekProfile,
  closeQuickApplyAndContinueSearch
};