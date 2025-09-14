// seek.ts - Seek-specific bot logic
import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface BotModule {
  name: string;
  url: string;
  port: number;
  checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean>;
  waitForLogin(page: Page): Promise<void>;
  runAutomation?(page: Page): Promise<void>;
}

interface ConfigData {
  formData: {
    keywords: string;
    locations: string;
    [key: string]: any;
  };
}

async function loadConfig(): Promise<ConfigData | null> {
  try {
    const configPath = path.resolve(__dirname, 'user-bots-config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('✅ Config loaded successfully');
    return configData;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    return null;
  }
}

async function fillKeywords(page: Page, keywords: string): Promise<void> {
  try {
    const keywordsInput = await page.$('input[id="keywords-input"]');
    if (keywordsInput) {
      await keywordsInput.fill(keywords);
      console.log(`✅ Filled keywords: ${keywords}`);
    } else {
      console.log('⚠️ Keywords input not found');
    }
  } catch (error) {
    console.error('❌ Error filling keywords:', error);
  }
}

async function fillLocation(page: Page, location: string): Promise<void> {
  try {
    const locationInput = await page.$('input[id="SearchBar__Where"]');
    if (locationInput) {
      await locationInput.fill(location);
      console.log(`✅ Filled location: ${location}`);
    } else {
      console.log('⚠️ Location input not found');
    }
  } catch (error) {
    console.error('❌ Error filling location:', error);
  }
}

const seekBot: BotModule = {
  name: 'Seek',
  url: 'https://seek.com.au',
  port: 9222,

  async checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean> {
    const signInButton = await page.$('a[data-automation="sign in"][title="Sign in"]');
    return !signInButton && sessionExists;
  },

  async waitForLogin(page: Page): Promise<void> {
    await page.waitForSelector('a[data-automation="sign in"][title="Sign in"]', { 
      state: 'hidden', 
      timeout: 300000 // 5 minutes
    });
  },

  async runAutomation(page: Page): Promise<void> {
    console.log('🔄 Running Seek automation...');
    
    const config = await loadConfig();
    if (!config) return;
    
    await fillKeywords(page, config.formData.keywords);
    await fillLocation(page, config.formData.locations);
  }
};

export default seekBot;