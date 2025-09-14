// seek.ts - Seek-specific bot logic
import { Page } from 'playwright';

interface BotModule {
  name: string;
  url: string;
  port: number;
  checkLoginStatus(page: Page, sessionExists: boolean): Promise<boolean>;
  waitForLogin(page: Page): Promise<void>;
  runAutomation?(page: Page): Promise<void>;
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
    // Add your Seek-specific automation logic here
    // e.g., job search, application filling, etc.
    console.log('🔄 Running Seek automation...');
    
    // Example: Navigate to job search
    // await page.click('[data-automation="jobsTab"]');
    
    // Add more automation steps here...
  }
};

export default seekBot;