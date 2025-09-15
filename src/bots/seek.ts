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
    // Try multiple possible paths for the config file
    const possiblePaths = [
      path.resolve(process.cwd(), 'src/bots/user-bots-config.json'),
      path.resolve(__dirname, 'user-bots-config.json'),
      path.resolve(process.cwd(), 'user-bots-config.json')
    ];
    
    console.log('🔧 Looking for config file in these locations:');
    possiblePaths.forEach(p => console.log(`  - ${p}`));
    
    let configPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        configPath = testPath;
        console.log('✅ Found config at:', configPath);
        break;
      }
    }
    
    if (!configPath) {
      console.error('❌ Config file not found in any of the expected locations');
      return null;
    }
    
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('✅ Config loaded successfully:', {
      keywords: configData.formData?.keywords,
      locations: configData.formData?.locations
    });
    return configData;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    return null;
  }
}

async function fillKeywords(page: Page, keywords: string): Promise<void> {
  try {
    // Wait for page to load and try multiple selectors
    await page.waitForLoadState('networkidle');
    
    const selectors = [
      'input[id="keywords-input"]',
      'input[placeholder*="Job title"]',
      'input[placeholder*="What"]',
      'input[data-automation="keywords-input"]',
      'input[name="keywords"]'
    ];
    
    let keywordsInput = null;
    for (const selector of selectors) {
      keywordsInput = await page.$(selector);
      if (keywordsInput) {
        console.log(`Found keywords input with selector: ${selector}`);
        break;
      }
    }
    
    if (keywordsInput) {
      await keywordsInput.fill(keywords);
      console.log(`✅ Filled keywords: ${keywords}`);
    } else {
      console.log('⚠️ Keywords input not found with any selector');
      console.log('Available inputs:', await page.$$eval('input', inputs => 
        inputs.map(input => ({ id: input.id, placeholder: input.placeholder, name: input.name }))
      ));
    }
  } catch (error) {
    console.error('❌ Error filling keywords:', error);
  }
}

async function fillLocation(page: Page, location: string): Promise<void> {
  try {
    const selectors = [
      'input[id="SearchBar__Where"]',
      'input[placeholder*="Location"]',
      'input[placeholder*="Where"]',
      'input[data-automation="location-input"]',
      'input[name="location"]'
    ];
    
    let locationInput = null;
    for (const selector of selectors) {
      locationInput = await page.$(selector);
      if (locationInput) {
        console.log(`Found location input with selector: ${selector}`);
        break;
      }
    }
    
    if (locationInput) {
      await locationInput.fill(location);
      console.log(`✅ Filled location: ${location}`);
    } else {
      console.log('⚠️ Location input not found with any selector');
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
    console.log('📍 Current URL:', page.url());
    
    // Wait a bit for the page to fully load
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional 2 second wait
    
    const config = await loadConfig();
    if (!config) {
      console.log('❌ No config loaded, stopping automation');
      return;
    }
    
    console.log('✅ Config loaded:', config.formData);
    
    console.log('🔍 Starting to fill keywords...');
    await fillKeywords(page, config.formData.keywords);
    
    console.log('🔍 Starting to fill location...');
    await fillLocation(page, config.formData.locations);
    
    console.log('✅ Seek automation completed!');
  }
};

export default seekBot;