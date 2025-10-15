import type { WorkflowContext } from '../core/workflow_engine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import puppeteer, { Browser, Page } from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://www.indeed.com';

const printLog = (message: string) => {
  console.log(message);
};

async function showProgressOverlay(page: Page, title: string, message: string): Promise<void> {
  await page.evaluate(({ title, message }) => {
    const existingOverlay = document.getElementById('puppeteer-progress-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'puppeteer-progress-overlay';
    overlay.style.cssText = `position: fixed; top: 20px; right: 20px; width: 350px; height: 120px; background: #1a1a1a; border: 2px solid #00ffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 999998; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #ffffff; user-select: none;`;

    const header = document.createElement('div');
    header.style.cssText = `padding: 12px 16px; border-bottom: 1px solid #00ffff40; display: flex; justify-content: space-between; align-items: center;`;
    header.innerHTML = `<div style="font-weight: bold; font-size: 16px;">${title}</div><div style="font-size: 12px; color: #00ffff;">Puppeteer Bot</div>`;

    const content = document.createElement('div');
    content.style.cssText = `padding: 16px; font-size: 14px; line-height: 1.4;`;
    content.innerHTML = message;

    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    let isDragging = false; let startX = 0; let startY = 0; let startLeft = 0; let startTop = 0;
    const makeDraggable = (element: HTMLElement) => {
      element.onmousedown = (e: MouseEvent) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        startLeft = parseInt(overlay.style.left) || 0;
        startTop = parseInt(overlay.style.top) || 0;
        e.preventDefault();
        document.addEventListener('mousemove', onMouseMove as any);
        document.addEventListener('mouseup', onMouseUp as any);
        overlay.style.opacity = '0.8'; overlay.style.transform = 'scale(1.02)';
      };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX; const deltaY = e.clientY - startY;
      let newLeft = startLeft + deltaX; let newTop = startTop + deltaY;
      const ww = window.innerWidth, wh = window.innerHeight, ow = overlay.offsetWidth, oh = overlay.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, ww - ow));
      newTop = Math.max(0, Math.min(newTop, wh - oh));
      overlay.style.left = newLeft + 'px'; overlay.style.top = newTop + 'px';
    };
    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove as any);
      document.removeEventListener('mouseup', onMouseUp as any);
      overlay.style.opacity = '1'; overlay.style.transform = 'scale(1)';
      (window as any).puppeteerProgressOverlayPosition = { x: parseInt(overlay.style.left), y: parseInt(overlay.style.top) };
    };
    makeDraggable(header); makeDraggable(overlay);
  }, { title, message });
}

function buildSearchUrl(base_url: string, keywords: string, location: string): string {
  const params = new URLSearchParams();
  if (keywords) params.append('q', keywords);
  if (location) params.append('l', location);
  const queryString = params.toString();
  return queryString ? `${base_url}/jobs?${queryString}` : `${base_url}/jobs`;
}

async function getPuppeteer(browserWSEndpoint?: string): Promise<Browser> {
  if (browserWSEndpoint) return await puppeteer.connect({ browserWSEndpoint });
  const debugPort = process.env.PUPPETEER_DEBUG_PORT || '21222';
  return await puppeteer.connect({ browserURL: `http://localhost:${debugPort}` });
}

export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  // Selectors and config are injected by the runner into context already.
  const cfg = ctx.config || JSON.parse(fs.readFileSync(path.join(__dirname, '../core/user-bots-config.json'), 'utf8'));
  ctx.config = cfg;
  ctx.indeed_url = buildSearchUrl(BASE_URL, cfg.formData?.keywords || '', cfg.formData?.locations || '');
  yield 'ctx_ready';
}

export async function* openHomepage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const browser: Browser = await getPuppeteer(process.env.BROWSER_WS);
    const pages = await browser.pages();
    const page: Page = pages[0] || await browser.newPage();
    ctx.browser = browser; ctx.page = page;
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.evaluate(() => {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        else (document.documentElement as any).webkitRequestFullscreen?.();
      });
    } catch {}
    await page.goto(ctx.indeed_url || `${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    yield 'homepage_opened';
  } catch {
    yield 'page_navigation_failed';
  }
}

export async function* waitForPageLoad(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { await (ctx.page as any).waitForLoadState?.('networkidle'); yield 'page_loaded'; } catch { yield 'page_load_retry'; }
}

export async function* refreshPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { await ctx.page.reload({ waitUntil: 'domcontentloaded' }); yield 'page_refreshed'; } catch { yield 'page_reload_failed'; }
}

export async function* detectPageState(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const signInElements = await ctx.page.$$('a[href*="signin"], button:has-text("Sign in"), a:has-text("Sign in"), [data-testid*="signin"]');
    if (signInElements.length > 0) { yield 'sign_in_required'; return; }
    const jobCards = await ctx.page.$$(ctx.selectors.job_cards.join(','));
    yield jobCards.length > 0 ? 'logged_in' : 'no_cards_found';
  } catch { yield 'no_cards_found'; }
}

export async function* showSignInBanner(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    await ctx.page.evaluate(() => {
      const existing = document.getElementById('puppeteer-signin-overlay'); if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'puppeteer-signin-overlay';
      overlay.style.cssText = `position: fixed; top: 20px; left: 20px; width: 400px; height: 200px; background: #ffffff; border: 2px solid #ff4444; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #333333; cursor: move; user-select: none;`;
      const header = document.createElement('div');
      header.style.cssText = `padding: 12px 16px; border-bottom: 1px solid #ff444440; display: flex; justify-content: space-between; align-items: center; cursor: move;`;
      header.innerHTML = `<div style="font-weight: bold; font-size: 16px;">🔐 Please Sign In</div><div style="font-size: 12px; color: #666;">Puppeteer Bot</div>`;
      const content = document.createElement('div');
      content.style.cssText = `padding: 20px; text-align: center;`;
      content.innerHTML = `<p style=\"margin:0 0 20px 0; font-size:14px; line-height:1.4;\">Please sign in to your Indeed account manually. Then click continue.</p><button id=\"signin-continue-btn\" style=\"background:#ff4444;color:white;border:none;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:bold;cursor:pointer;width:100%;\">✅ I have logged in - Continue</button>`;
      overlay.appendChild(header); overlay.appendChild(content); document.body.appendChild(overlay);
      const button = document.getElementById('signin-continue-btn') as HTMLButtonElement | null;
      if (button) {
        button.onmouseover = () => button.style.background = '#dd3333';
        button.onmouseout = () => button.style.background = '#ff4444';
        button.onclick = () => { (window as any).puppeteerSignInCompleted = true; overlay.remove(); };
      }
      let isDragging = false; let startX = 0, startY = 0, startLeft = 0, startTop = 0;
      const makeDraggable = (el: HTMLElement) => {
        el.onmousedown = (e: MouseEvent) => {
          isDragging = true; startX = e.clientX; startY = e.clientY; startLeft = parseInt(overlay.style.left)||0; startTop = parseInt(overlay.style.top)||0;
          e.preventDefault(); document.addEventListener('mousemove', onMouseMove as any); document.addEventListener('mouseup', onMouseUp as any);
          overlay.style.opacity='0.8'; overlay.style.transform='scale(1.02)';
        };
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY;
        let nl = startLeft + dx; let nt = startTop + dy;
        const ww = window.innerWidth, wh = window.innerHeight, ow = overlay.offsetWidth, oh = overlay.offsetHeight;
        nl = Math.max(0, Math.min(nl, ww - ow)); nt = Math.max(0, Math.min(nt, wh - oh));
        overlay.style.left = nl + 'px'; overlay.style.top = nt + 'px';
      };
      const onMouseUp = () => {
        isDragging = false; document.removeEventListener('mousemove', onMouseMove as any); document.removeEventListener('mouseup', onMouseUp as any);
        overlay.style.opacity='1'; overlay.style.transform='scale(1)';
        (window as any).puppeteerOverlayPosition = { x: parseInt(overlay.style.left), y: parseInt(overlay.style.top) };
      };
      makeDraggable(header); makeDraggable(overlay);
    });
    await ctx.page.waitForFunction(() => (window as any).puppeteerSignInCompleted === true, { timeout: 300000 });
    yield 'signin_banner_shown';
  } catch { yield 'signin_banner_retry'; }
}

export async function* performBasicSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const page: Page = ctx.page;
    await showProgressOverlay(page, '🔍 Searching Jobs', 'Performing search with keywords and location...');
    const keywordSelector = ctx.selectors.keywords.join(',');
    const locationSelector = ctx.selectors.location.join(',');
    const searchBtnSelector = ctx.selectors.search_button.join(',');
    if (ctx.config.formData.keywords) { const kw = await page.$(keywordSelector); if (kw) { await (kw as any).click({ clickCount: 3 }); await page.keyboard.type(ctx.config.formData.keywords); } }
    if (ctx.config.formData.locations) { const loc = await page.$(locationSelector); if (loc) { await (loc as any).click({ clickCount: 3 }); await page.keyboard.type(ctx.config.formData.locations); } }
    const searchBtn = await page.$(searchBtnSelector); if (searchBtn) { await searchBtn.click(); await new Promise(r => setTimeout(r, 3000)); }
    yield 'search_completed';
  } catch { yield 'search_failed'; }
}

export async function* collectJobCards(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    await showProgressOverlay(ctx.page, '📋 Collecting Jobs', 'Finding job listings on the page...');
    const cards = await ctx.page.$$(ctx.selectors.job_cards.join(','));
    ctx.jobCards = cards; ctx.currentJobIndex = 0;
    yield cards.length > 0 ? 'cards_collected' : 'cards_collect_retry';
  } catch { yield 'cards_collect_retry'; }
}

export async function* clickJobCard(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const idx = ctx.currentJobIndex || 0;
    const cards = await ctx.page.$$(ctx.selectors.job_cards.join(','));
    if (!cards.length || idx >= cards.length) { yield 'job_cards_finished'; return; }
    await showProgressOverlay(ctx.page, '👆 Clicking Job', `Clicking job card ${idx + 1}/${cards.length}...`);
    await cards[idx].click(); await new Promise(r => setTimeout(r, 1500)); ctx.currentJobIndex = idx + 1;
    yield 'job_card_clicked';
  } catch { ctx.currentJobIndex = (ctx.currentJobIndex || 0) + 1; yield 'job_card_skipped'; }
}

export async function* clickNextPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { const next = await ctx.page.$(ctx.selectors.pagination.next_page); if (next) { await next.click(); await new Promise(r => setTimeout(r, 3000)); yield 'next_page_clicked'; } else { yield 'no_more_pages'; } } catch { yield 'no_more_pages'; }
}

export async function* detectApplyType(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { const easy = await ctx.page.$(ctx.selectors.easy_apply_button.join(',')); if (easy) { yield 'easy_apply_found'; return; } const apply = await ctx.page.$(ctx.selectors.apply_button.join(',')); if (apply) { yield 'regular_apply_found'; return; } yield 'no_apply_found'; } catch { yield 'detect_apply_failed'; }
}

export async function* parseJobDetails(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const getText = async (sel: string) => { const el = await ctx.page.$(sel); if (!el) return ''; const txt = await ctx.page.evaluate((elm: Element) => (elm.textContent || '').trim(), el); return txt; };
    ctx.currentJobDetails = { title: await getText(ctx.selectors.job_details.title), company: await getText(ctx.selectors.job_details.company), location: await getText(ctx.selectors.job_details.location), description: await getText(ctx.selectors.job_details.description), salary: await getText(ctx.selectors.job_details.salary) };
    yield 'job_parsed';
  } catch { yield 'parse_failed'; }
}

export async function* clickEasyApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { const btn = await ctx.page.$(ctx.selectors.easy_apply_button.join(',')); if (!btn) { yield 'easy_apply_failed'; return; } await btn.click(); yield 'easy_apply_clicked'; } catch { yield 'easy_apply_failed'; }
}

export async function* waitForEasyApplyPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { await ctx.page.waitForSelector(ctx.selectors.easy_apply.resume_select + ', ' + ctx.selectors.easy_apply.cover_letter_textarea, { timeout: 15000 } as any); yield 'easy_apply_page_ready'; } catch { yield 'page_load_timeout'; }
}

export async function* handleEasyApplyForm(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { yield 'form_completed'; } catch { yield 'form_error'; }
}

export async function* submitApplication(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { const submit = await ctx.page.$(ctx.selectors.easy_apply.submit_button); if (submit) { await submit.click(); await new Promise(r => setTimeout(r, 2000)); yield 'application_submitted'; return; } yield 'submission_failed'; } catch { yield 'submission_failed'; }
}

export async function* closeEasyApplyAndContinueSearch(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try { const closeBtn = await ctx.page.$(ctx.selectors.easy_apply.close_button); if (closeBtn) { await closeBtn.click(); await new Promise(r => setTimeout(r, 1000)); } yield 'hunting_next_job'; } catch { yield 'close_and_continue_error'; }
}

export async function* skipToNextCard(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  ctx.currentJobIndex = (ctx.currentJobIndex || 0) + 1; yield 'card_skipped';
}

export const indeed_puppeteerStepFunctions = {
  step0,
  openHomepage,
  waitForPageLoad,
  refreshPage,
  detectPageState,
  showSignInBanner,
  performBasicSearch,
  collectJobCards,
  clickJobCard,
  clickNextPage,
  detectApplyType,
  parseJobDetails,
  clickEasyApply,
  waitForEasyApplyPage,
  handleEasyApplyForm,
  submitApplication,
  closeEasyApplyAndContinueSearch,
  skipToNextCard
};


