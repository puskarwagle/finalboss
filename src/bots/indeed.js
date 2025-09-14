// indeed.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome', // Your Chrome path
    args: ['--remote-debugging-port=9224'] // Different port for Indeed
  });
  
  const page = await browser.newPage();
  await page.goto('https://indeed.com');
  
  console.log('Chrome opened successfully for Indeed!');
  console.log('Browser will remain open for you to use. Close it manually when done.');
  
  // Don't close the browser automatically - let user interact
})();