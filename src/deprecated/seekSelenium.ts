import { WebDriver, until, By } from 'selenium-webdriver';
import { setupChromeDriver } from '../bots/runchrome';
import * as path from 'path';
import * as fs from 'fs';

interface BotConfig {
  formData: {
    keywords: string;
    locations: string;
    minSalary: number;
    maxSalary: number;
    jobType: string;
    experienceLevel: string;
    industry: string;
    listedDate: string;
    remotePreference: string;
    rightToWork: string;
    rewriteResume: boolean;
    excludedCompanies: string;
    excludedKeywords: string;
    skillWeight: string;
    locationWeight: string;
    salaryWeight: string;
    companyWeight: string;
    enableDeepSeek: boolean;
    deepSeekApiKey: string;
    acceptTerms: boolean;
  };
}

const printLog = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export const runSeekSearch = async () => {
  try {
    const { driver } = await setupChromeDriver();

    const configPath = path.join(__dirname, 'user-bots-config.json');
    const config: BotConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    printLog('Navigating to Seek...');
    await driver.get('https://www.seek.com.au/');

    await new Promise(resolve => setTimeout(resolve, 2000));
    printLog('Page loaded, looking for search elements...');

    try {
      const whatInput = await driver.wait(until.elementLocated(By.css('input#searchKeywords, [data-testid="keywords-input"], input[placeholder*="What"]')), 15000);
      printLog('Found What field');
      await whatInput.click();
      await whatInput.clear();
      await whatInput.sendKeys(config.formData.keywords || 'java');
      printLog(`Filled What field with "${config.formData.keywords || 'java'}"`);

      const whereInput = await driver.wait(until.elementLocated(By.css('input#searchLocation, [data-testid="location-input"], input[placeholder*="Where"]')), 15000);
      printLog('Found Where field');
      await whereInput.click();
      await whereInput.clear();
      await whereInput.sendKeys(config.formData.locations || 'sydney');
      printLog(`Filled Where field with "${config.formData.locations || 'sydney'}"`);

      const submitButton = await driver.wait(until.elementLocated(By.css('button[data-testid="search-submit"], button[type="submit"], button:contains("Search")')), 15000);
      printLog('Found submit button');
      await submitButton.click();
      printLog('Clicked submit button');

      await new Promise(resolve => setTimeout(resolve, 5000));
      printLog('Search completed successfully!');

    } catch (elementError) {
      printLog(`Element error: ${elementError instanceof Error ? elementError.message : String(elementError)}`);
      const currentUrl = await driver.getCurrentUrl();
      printLog(`Current URL: ${currentUrl}`);
      const title = await driver.getTitle();
      printLog(`Page title: ${title}`);
    }

    await driver.quit();

  } catch (error) {
    console.error('Error during seek search:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runSeekSearch();
}