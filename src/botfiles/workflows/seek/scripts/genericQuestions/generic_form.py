import asyncio
from playwright.async_api import async_playwright

# Hardcoded URL to open
URL = "https://jobs.smartrecruiters.com/oneclick-ui/company/NCSAustralia/publication/bf2c0399-ee25-4dfb-ab64-255d5c2bbacb?dcr_ci=NCSAustralia&vq_campaign=e82452d0-2905-5416-acf6-c4733d817f96&vq_source=9b4b5594-5f78-4abf-ac8b-325351ded3e6&utm_source=seek"  # Change this to your target URL

async def main():
    # Read the JS file
    with open("generic_form_detector.js", "r") as f:
        js_code = f.read()

    async with async_playwright() as p:
        # Persistent context setup (like browser_server.py)
        from pathlib import Path
        user_data_dir = str(Path.home() / ".guu_chromium_profile")
        launch_args = [
            "--no-default-browser-check",
            "--no-first-run",
            "--explicitly-allowed-ports=6666",
            "--disable-session-crashed-bubble",
            "--disable-extensions",
            "--disable-plugins",
            "--disable-gpu-sandbox",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--start-maximized",
            "--disable-web-security",
        ]
        context_args = {
            "user_data_dir": user_data_dir,
            "headless": False,
            "args": launch_args,
            "viewport": {"width": 1920, "height": 1080},
        }
        context = await p.chromium.launch_persistent_context(**context_args)
        page = await context.new_page()
        await page.goto(URL)

        # Wait for at least one form to appear (timeout 15s)
        try:
            await page.wait_for_selector('form', timeout=15000)
        except Exception as e:
            print("No form found within timeout.")

        # Inject and run the JS code
        result = await page.evaluate(js_code)
        print("JS Result:", result)

        await context.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, asyncio.CancelledError):
        print("Interrupted. Exiting cleanly.")
