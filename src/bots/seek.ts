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

    // Wait a bit for the page to fully load
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

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