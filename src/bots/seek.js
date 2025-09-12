// test-chrome.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome', // Your Chrome path
    args: ['--remote-debugging-port=9222']
  });
  
  const page = await browser.newPage();
  await page.goto('https://seek.com.au');
  
  console.log('Chrome opened successfully!');
  
  // Keep it open for testing
  await page.waitForTimeout(5000);
  await browser.close();
})();
