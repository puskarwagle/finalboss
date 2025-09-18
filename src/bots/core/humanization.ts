import { WebDriver, WebElement } from 'selenium-webdriver';
import { Actions } from 'selenium-webdriver/lib/input';

export interface HumanizationConfig {
  clickDelay: {
    min: number;
    max: number;
  };
  typingSpeed: {
    min: number;
    max: number;
  };
  scrollSpeed: number;
  mouseMovement: boolean;
  randomPauses: boolean;
}

export const DEFAULT_HUMANIZATION: HumanizationConfig = {
  clickDelay: { min: 500, max: 1500 },
  typingSpeed: { min: 50, max: 150 },
  scrollSpeed: 300,
  mouseMovement: true,
  randomPauses: true
};

export class HumanBehavior {
  private config: HumanizationConfig;

  constructor(config: HumanizationConfig = DEFAULT_HUMANIZATION) {
    this.config = config;
  }

  // Random delay between actions
  async randomDelay(min?: number, max?: number): Promise<void> {
    const minDelay = min || this.config.clickDelay.min;
    const maxDelay = max || this.config.clickDelay.max;
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Human-like clicking with movement and delays
  async humanClick(driver: WebDriver, element: WebElement): Promise<void> {
    if (this.config.mouseMovement) {
      // Scroll element into view first
      await driver.executeScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element);
      await this.randomDelay(200, 500);
    }

    // Small random delay before clicking
    await this.randomDelay(100, 300);

    // Perform the click
    await element.click();

    // Small delay after clicking
    await this.randomDelay(200, 600);
  }

  // Human-like typing with variable speeds
  async humanType(element: WebElement, text: string): Promise<void> {
    await element.clear();

    if (!this.config.randomPauses) {
      await element.sendKeys(text);
      return;
    }

    // Type character by character with random delays
    for (const char of text) {
      await element.sendKeys(char);
      const delay = Math.random() * (this.config.typingSpeed.max - this.config.typingSpeed.min) + this.config.typingSpeed.min;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Smooth scrolling
  async smoothScroll(driver: WebDriver, direction: 'up' | 'down', pixels: number = 300): Promise<void> {
    const scrollDirection = direction === 'down' ? pixels : -pixels;

    await driver.executeScript(`
      window.scrollBy({
        top: ${scrollDirection},
        behavior: 'smooth'
      });
    `);

    await this.randomDelay(500, 1000);
  }

  // Random mouse movements (simulate human browsing)
  async randomMouseMovement(driver: WebDriver): Promise<void> {
    if (!this.config.mouseMovement) return;

    const actions = driver.actions();

    // Move to a random position
    const x = Math.floor(Math.random() * 100) - 50;
    const y = Math.floor(Math.random() * 100) - 50;

    await actions.move({ x, y }).perform();
    await this.randomDelay(100, 300);
  }

  // Simulate reading time based on content length
  async readingPause(contentLength: number): Promise<void> {
    if (!this.config.randomPauses) return;

    // Estimate reading time: ~200 words per minute, ~5 chars per word
    const wordsEstimate = contentLength / 5;
    const readingTimeMs = (wordsEstimate / 200) * 60 * 1000;

    // Add some randomness (50% to 150% of estimated time)
    const randomFactor = 0.5 + Math.random();
    const actualDelay = Math.min(readingTimeMs * randomFactor, 5000); // Cap at 5 seconds

    await new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  // Simulate thinking/decision time
  async thinkingPause(): Promise<void> {
    if (!this.config.randomPauses) return;
    await this.randomDelay(1000, 3000);
  }

  // Check if element is visible and in viewport
  async isElementVisible(driver: WebDriver, element: WebElement): Promise<boolean> {
    try {
      const isVisible = await driver.executeScript(`
        const elem = arguments[0];
        const rect = elem.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
          elem.offsetParent !== null
        );
      `, element);

      return Boolean(isVisible);
    } catch {
      return false;
    }
  }

  // Human-like form filling
  async fillFormField(driver: WebDriver, element: WebElement, value: string, label?: string): Promise<void> {
    if (label) {
      console.log(`[Human] Filling field: ${label}`);
    }

    // Simulate looking at the field
    await this.humanClick(driver, element);
    await this.thinkingPause();

    // Type the value
    await this.humanType(element, value);

    // Brief pause after filling
    await this.randomDelay(300, 800);
  }
}

// Stealth mode detection evasion
export class StealthFeatures {
  static async hideWebDriver(driver: WebDriver): Promise<void> {
    // Hide webdriver property
    await driver.executeScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    `);

    // Override plugins
    await driver.executeScript(`
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    `);

    // Override languages
    await driver.executeScript(`
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    `);
  }

  static async randomizeUserAgent(driver: WebDriver): Promise<void> {
    const userAgents = [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ];

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    await driver.executeScript(`
      Object.defineProperty(navigator, 'userAgent', {
        get: () => '${randomUA}',
      });
    `);
  }
}