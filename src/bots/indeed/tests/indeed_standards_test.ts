import { BotStarter } from '../../bot_starter';

export async function runIndeedStandardsTests() {
  const bot_starter = new BotStarter();

  try {
    console.log("🧪 Testing Indeed Bot with Standards Compliance...");

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

    console.log("✅ Indeed Bot Standards Test passed");
  } catch (error) {
    console.error("❌ Indeed Bot Standards Test failed:", error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIndeedStandardsTests().catch(console.error);
}
