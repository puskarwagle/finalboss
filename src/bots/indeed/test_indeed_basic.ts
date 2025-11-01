/**
 * Basic test for Indeed bot with Camoufox/Playwright
 *
 * This test verifies:
 * 1. Browser setup with Camoufox
 * 2. Overlay initialization
 * 3. Basic navigation
 *
 * Run with: bun src/bots/indeed/test_indeed_basic.ts
 */

import { BotStarter } from '../bot_starter';

async function testIndeedBot() {
  console.log('🧪 Starting Indeed bot test...\n');

  const bot_starter = new BotStarter();

  try {
    // Run the Indeed bot
    await bot_starter.run_bot({
      bot_name: 'indeed',
      config: {
        formData: {
          keywords: 'software engineer',
          locations: 'New York',
          enableDeepSeek: false,
          acceptTerms: true,
        },
      },
      headless: false, // Set to true for headless testing
      keep_open: true, // Keep browser open after completion
    });

    console.log('\n✅ Indeed bot test completed successfully!');
  } catch (error) {
    console.error('\n❌ Indeed bot test failed:', error);
    process.exit(1);
  }
}

// Run test
testIndeedBot().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
