// seek.ts - Seek-specific bot logic
import type { Page } from 'playwright';

interface BotModule {
  name: string;
  url: string;
  port: number;
  checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean>;
  waitForLogin(page: Page): Promise<void>;
  runAutomation?(page: Page, config: ConfigData): Promise<void>;
}

interface ConfigData {
  formData: {
    keywords: string;
    locations: string;
    [key: string]: any;
  };
  [key: string]: any;
}

async function fillKeywords(page: Page, keywords: string): Promise<void> {
  const selectors = ['input[id="keywords-input"]', 'input[placeholder*="Job title"]', 'input[placeholder*="What"]'];
  for (const selector of selectors) {
    try {
      await page.fill(selector, keywords);
      console.log(`✅ Filled keywords: ${keywords}`);
      return;
    } catch {}
  }
  console.log('⚠️ Keywords input not found');
}

async function fillLocation(page: Page, location: string): Promise<void> {
  const selectors = ['input[id="SearchBar__Where"]', 'input[placeholder*="Location"]', 'input[placeholder*="Where"]'];
  for (const selector of selectors) {
    try {
      await page.fill(selector, location);
      console.log(`✅ Filled location: ${location}`);
      return;
    } catch {}
  }
  console.log('⚠️ Location input not found');
}

const seekBot: BotModule = {
  name: 'Seek',
  url: 'https://seek.com.au',
  port: 9222,

  async checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean> {
    if (!sessionExists) {
      console.log('LOGIN REQUIRED: NO SESSION FOUND - PLEASE LOG IN MANUALLY');
      return false;
    }

    const signInButton = await page.$('a[data-automation="sign in"][title="Sign in"]');
    if (signInButton) {
      console.log('LOGIN REQUIRED: SIGN IN BUTTON FOUND - PLEASE LOG IN MANUALLY');
      return false;
    }

    return true; // No sign in button = logged in
  },

  async waitForLogin(page: Page): Promise<void> {
    console.log('🔴 PLEASE COMPLETE LOGIN MANUALLY');
    console.log('🔴 PRESS ENTER WHEN YOU ARE FULLY LOGGED IN');

    // Wait for user to press Enter
    process.stdin.setRawMode(true);
    process.stdin.resume();

    return new Promise((resolve) => {
      process.stdin.on('data', (key) => {
        if (key[0] === 0x0D) { // Enter key
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.log('🟢 LOGIN CONFIRMED - CONTINUING...');
          resolve();
        }
      });
    });
  },

  async runAutomation(page: Page, config: ConfigData): Promise<void> {
    console.log('🔄 Running Seek automation...');

    // Wait for page to be ready - check for search form or sign in button
    console.log('⏳ Waiting for page to be ready...');
    await page.waitForSelector('input[id="keywords-input"], a[data-automation="sign in"]');

    // Check if user needs to login
    const signInButton = await page.$('a[data-automation="sign in"][title="Sign in"]');
    if (signInButton) {
      // Inject login prompt overlay
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
          justify-content: center; align-items: center;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
          background: white; padding: 30px; border-radius: 10px;
          text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        card.innerHTML = `
          <h2 style="margin: 0 0 20px 0; color: #333;">Login Required</h2>
          <p style="margin: 0 0 25px 0; color: #666;">Please log in to Seek manually, then click continue.</p>
          <button id="continueBtn" style="
            background: #e60278; color: white; border: none; padding: 12px 24px;
            border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;
          ">I'm Logged In - Continue</button>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        window.loginOverlay = overlay;
      });

      // Wait for user to click continue button
      await page.waitForFunction(() => {
        const btn = document.getElementById('continueBtn');
        return new Promise(resolve => {
          if (btn) {
            btn.onclick = () => {
              document.body.removeChild(window.loginOverlay);
              resolve(true);
            };
          }
        });
      });

      console.log('✅ User confirmed login, continuing...');
    }

    console.log('🔍 Starting to fill keywords...');
    await fillKeywords(page, config.formData.keywords);

    console.log('🔍 Starting to fill location...');
    await fillLocation(page, config.formData.locations);

    console.log('🔍 Clicking search button...');
    await page.click('#searchButton');
    console.log('✅ Search button clicked!');

    console.log('✅ Seek automation completed!');
  }
};

export default seekBot;