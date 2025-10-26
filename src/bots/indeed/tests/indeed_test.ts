import { BotStarter } from '../../bot_starter';

export async function runIndeedTests() {
  const bot_starter = new BotStarter();

  try {
    console.log("🧪 Testing Indeed Bot...");

    await bot_starter.run_bot({
      bot_name: 'indeed',
      config: {
        search: {
          base_url: 'https://au.indeed.com/jobs?q=software+engineer&l=Remote&start=0',
          start: 0,
          end: 0 // Only test first page
        },
        camoufox: {
          language: 'au',
          headless: false
        }
      },
      headless: false,
      keep_open: true
    });

    console.log("✅ Indeed Bot Test passed");
  } catch (error) {
    console.error("❌ Indeed Bot Test failed:", error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIndeedTests().catch(console.error);
}