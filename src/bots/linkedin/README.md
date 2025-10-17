# LinkedIn Bot Implementation Guide

## Current State

The LinkedIn bot exists as **Python code** using Playwright:
- `steps_impl.py` - Python implementation (~1850 lines)
- `steps_config.py` - Python workflow config
- `linkedin_selectors.json` - Selectors (✓ Already compatible)

## Target State (to match Seek bot)

Need to convert to **TypeScript** using Selenium WebDriver to work with the bot_starter.ts system.

---

## Required Changes

### 1. **Create linkedin_impl.ts**
Convert all Python async functions to TypeScript:
- Use Selenium WebDriver instead of Playwright
- Import: `src/bots/core/browser_manager.ts:setupChromeDriver()`
- Import: `src/bots/core/universal_overlay.ts:UniversalOverlay`
- Import: `src/bots/core/humanization.ts` (HumanBehavior, StealthFeatures)
- Export as `export const linkedinStepFunctions = { ... }`

**Key functions to port** (from steps_impl.py):
- `open_check_login` → Login detection
- `credential_login` → Credential-based login
- `set_search_location` → Set search location
- `set_search_keywords` → Set search keywords
- `apply_filters` → Apply job filters
- `extract_job_details` → Extract job cards
- `attempt_easy_apply` → Click Easy Apply
- `upload_resume` → Upload resume
- `answer_questions` → Answer application questions
- `submit_application` → Submit application
- `continue_processing` → Move to next job/page
- All 24 step functions from steps_impl.py

### 2. **Create linkedin_steps.yaml**
Convert Python STEPS_CONFIG (steps_config.py:16-224) to YAML format:
- Pattern: `src/bots/seek/seek_steps.yaml`
- Define `workflow_meta` section
- Define `steps_config` section with all 24 steps
- Set `start_step: "step0"`

### 3. **Update choose-bot page**
Edit: `src/routes/choose-bot/+page.svelte:8-14`

Add linkedin_bot to array:
```javascript
let bots = [
  {
    name: 'seek_bot',
    description: 'Automate job searching on Seek.com.au...',
    image: '/seek-logo.png'
  },
  {
    name: 'linkedin_bot',
    description: 'Automate job searching on LinkedIn with Easy Apply',
    image: '/linkedin-logo.png'
  }
];
```

### 4. **Add LinkedIn logo**
Create: `static/linkedin-logo.png`
- Should match the style of seek-logo.png
- Recommended size: 200x200px or similar

### 5. **Integrate Progress Tracking & Overlay**

In linkedin_impl.ts, add overlay initialization:
```typescript
export async function* openLinkedInPage(ctx: WorkflowContext) {
  const { driver, sessionExists, sessionsDir } = await setupChromeDriver('linkedin');
  ctx.driver = driver;
  ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.linkedin);
  ctx.overlay = new UniversalOverlay(driver);

  // Show initial overlay
  await ctx.overlay.showJobProgress(0, 0, "Initializing...", 0);

  yield "linkedin_page_opened";
}
```

**Update progress throughout workflow:**
```typescript
// After extracting jobs
ctx.total_jobs = extracted_jobs.length;
ctx.applied_jobs = 0;
ctx.skipped_jobs = 0;

// After each application
ctx.applied_jobs += 1;
await ctx.overlay.updateJobProgress(
  ctx.applied_jobs,
  ctx.total_jobs,
  "Application submitted",
  currentStepNumber
);

// After each skip
ctx.skipped_jobs += 1;
await ctx.overlay.updateJobProgress(
  ctx.applied_jobs,
  ctx.total_jobs,
  "Job skipped",
  currentStepNumber
);
```

### 6. **Registry Auto-Discovery**
**No changes needed!** The bot will be automatically discovered by `src/bots/core/registry.ts` when:
- ✓ `src/bots/linkedin/linkedin_impl.ts` exists
- ✓ `src/bots/linkedin/linkedin_steps.yaml` exists
- ✓ `src/bots/linkedin/linkedin_selectors.json` exists (already present)

---

## Key Implementation Notes

### Browser Driver Differences
| Python (Playwright) | TypeScript (Selenium) |
|---------------------|----------------------|
| `page.locator(selector)` | `driver.findElement(By.css(selector))` |
| `await element.click()` | `await element.click()` |
| `await element.fill(text)` | `await element.sendKeys(text)` |
| `page.goto(url)` | `driver.get(url)` |
| `page.wait_for_url()` | `await driver.wait(until.urlContains())` |

### Context Variables
Store in `ctx` (WorkflowContext):
- `ctx.driver` - WebDriver instance
- `ctx.overlay` - UniversalOverlay instance
- `ctx.total_jobs` - Total jobs found
- `ctx.applied_jobs` - Jobs successfully applied
- `ctx.skipped_jobs` - Jobs skipped
- `ctx.job_index` - Current job index
- `ctx.extracted_jobs` - Array of job objects
- `ctx.applied_job_ids` - Set of applied job IDs
- `ctx.sessionManager` - Session manager

### Progress UI Components
The progress will automatically show in:
1. **Browser overlay** (via UniversalOverlay) - draggable, collapsible
2. **Dashboard UI** (via BotStats.svelte) - progress bar, console output, stats grid

---

## Summary: What Changes Are Needed

| Component | Action | Files |
|-----------|--------|-------|
| **Implementation** | Create TypeScript version | `linkedin_impl.ts` (new) |
| **Workflow** | Create YAML config | `linkedin_steps.yaml` (new) |
| **Selectors** | Already exists ✓ | `linkedin_selectors.json` |
| **UI Card** | Add to bots array | `src/routes/choose-bot/+page.svelte` |
| **Logo** | Add image file | `static/linkedin-logo.png` (new) |
| **Progress** | Use UniversalOverlay | Integrated in linkedin_impl.ts |
| **Registry** | Auto-discovers | No changes needed |

Once these files are created, you'll be able to run:
```bash
bun bot_starter.ts linkedin
```

And the bot will appear in the choose-bot page with full progress tracking just like seek!

## Usage

```bash
# Run the LinkedIn bot
bun bot_starter.ts linkedin

# Run with headless mode
bun bot_starter.ts linkedin --headless

# Close browser after completion
bun bot_starter.ts linkedin --close
```
