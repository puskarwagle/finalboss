import { WebDriver, By, until, Key } from 'selenium-webdriver';
import { setupChromeDriver } from '../core/browser_manager';
import { HumanBehavior, StealthFeatures, DEFAULT_HUMANIZATION } from '../core/humanization';
import { UniversalSessionManager, SessionConfigs } from '../core/sessionManager';
import { UniversalOverlay } from '../core/universal_overlay';
import type { WorkflowContext } from '../core/workflow_engine';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

// Load applied job IDs from file
export async function* loadAppliedJobIds(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step0: load applied job IDs");

  const jobIdsPath = path.join(process.cwd(), 'deknilJobsIds.json');
  let jobIds: Set<string> = new Set();

  try {
    if (fs.existsSync(jobIdsPath)) {
      const data = JSON.parse(fs.readFileSync(jobIdsPath, 'utf-8'));
      jobIds = new Set(Array.isArray(data) ? data : []);
      printLog(`Loaded ${jobIds.size} applied job IDs`);
    } else {
      printLog("deknilJobsIds.json not found, starting fresh");
    }
  } catch (error) {
    printLog(`Error loading job IDs: ${error}`);
  }

  ctx.applied_job_ids = jobIds;
  yield "applied_job_ids_loaded";
}

// Open LinkedIn and check login status
export async function* openCheckLogin(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step1: open and check login");

  try {
    const { driver, sessionExists, sessionsDir } = await setupChromeDriver('linkedin');
    ctx.driver = driver;
    ctx.sessionExists = sessionExists;
    ctx.sessionsDir = sessionsDir;
    ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
    ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.linkedin);
    ctx.overlay = new UniversalOverlay(driver);

    await StealthFeatures.hideWebDriver(driver);
    await StealthFeatures.randomizeUserAgent(driver);

    // Load selectors
    const selectorsPath = path.join(__dirname, 'linkedin_selectors.json');
    ctx.selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));

    printLog("Opening LinkedIn...");
    await driver.get(ctx.selectors.urls?.home_url || 'https://www.linkedin.com/');
    await driver.sleep(3000);

    const currentUrl = await driver.getCurrentUrl();

    // Check if already on feed (logged in)
    if (currentUrl.startsWith(ctx.selectors.urls?.feed_url || 'https://www.linkedin.com/feed/')) {
      printLog("Already logged in");
      yield "login_not_needed";
      return;
    }

    // Check for sign-in indicators
    const pageSource = await driver.getPageSource();
    if (pageSource.includes('Sign in') || pageSource.includes('Join now')) {
      printLog("User needs to log in");
      yield "user_needs_to_login";
    } else {
      printLog("Cannot determine login status, proceeding");
      yield "cannot_determine_login_status";
    }
  } catch (error) {
    printLog(`Error opening LinkedIn: ${error}`);
    yield "failed_to_navigate";
  }
}

// Attempt credential login
export async function* credentialLogin(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step2: attempt credential login");

  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const username = config.linkedin?.username || '';
    const password = config.linkedin?.password || '';

    if (!username || !password) {
      printLog("No credentials configured");
      yield "no_login_credentials_found";
      return;
    }

    printLog("Navigating to login page...");
    await driver.get(selectors.urls?.login_url || 'https://www.linkedin.com/login');
    await driver.sleep(2000);

    try {
      const usernameInput = await driver.findElement(By.id(selectors.auth?.username_input_id || 'username'));
      await usernameInput.sendKeys(username);
      printLog("Username filled");
    } catch (error) {
      printLog("Username input not found");
      yield "username_input_not_found";
      return;
    }

    try {
      const passwordInput = await driver.findElement(By.id(selectors.auth?.password_input_id || 'password'));
      await passwordInput.sendKeys(password);
      printLog("Password filled");
    } catch (error) {
      printLog("Password input not found");
      yield "password_input_not_found";
      return;
    }

    try {
      const signInButton = await driver.findElement(By.xpath(selectors.auth?.signin_button_xpath || '//button[@type="submit"]'));
      await signInButton.click();
      printLog("Sign in button clicked");
      await driver.sleep(5000);

      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/feed')) {
        printLog("Login successful");
        yield "login_successful_on_feed";
      } else {
        printLog("Login incomplete");
        yield "credentials_login_incomplete";
      }
    } catch (error) {
      printLog(`Sign in error: ${error}`);
      yield "signin_button_click_failed";
    }
  } catch (error) {
    printLog(`Credential login failed: ${error}`);
    yield "credential_login_failed";
  }
}

// Show manual login prompt
export async function* showManualLoginPrompt(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step3: show manual login prompt");

  try {
    await ctx.overlay.showSignInOverlay();
    printLog("Manual login prompt shown");
    yield "prompt_displayed_to_user";
  } catch (error) {
    printLog(`Error showing manual login prompt: ${error}`);
    yield "error_showing_manual_login";
  }
}

// Open jobs page
export async function* openJobsPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step5: open jobs page");

  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    await driver.get(selectors.urls?.jobs_url || 'https://www.linkedin.com/jobs/');
    await driver.sleep(3000);

    printLog("Jobs page loaded");

    // Initialize overlay with job progress
    await ctx.overlay.showJobProgress(0, 0, "Initializing LinkedIn bot...", 5);

    yield "jobs_page_loaded";
  } catch (error) {
    printLog(`Error opening jobs page: ${error}`);
    yield "failed_opening_jobs_page";
  }
}

// Set search location
export async function* setSearchLocation(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step6: set search location");

  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const location = config.linkedin?.search_location || '';

    if (!location) {
      printLog("No search location configured");
      yield "no_search_location_in_settings";
      return;
    }

    const locationSelectors = selectors.jobs?.location_input_candidates || [];

    for (const selector of locationSelectors) {
      try {
        const locationInput = await driver.findElement(By.css(selector));
        await locationInput.click();
        await driver.sleep(500);
        await locationInput.sendKeys(Key.CONTROL, 'a');
        await locationInput.sendKeys(Key.DELETE);
        await locationInput.sendKeys(location);
        await driver.sleep(1000);
        await locationInput.sendKeys(Key.ENTER);

        printLog(`Search location set to: ${location}`);
        ctx.search_location = location;
        yield "search_location_set";
        return;
      } catch (error) {
        continue;
      }
    }

    printLog("Location input not found");
    yield "location_input_not_found";
  } catch (error) {
    printLog(`Error setting search location: ${error}`);
    yield "failed_setting_search_location";
  }
}

// Set search keywords
export async function* setSearchKeywords(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step7: set search keywords");

  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const keywords = config.linkedin?.search_keywords || '';

    if (!keywords) {
      printLog("No search keywords configured");
      yield "no_keywords_in_settings";
      return;
    }

    const keywordSelectors = selectors.jobs?.keywords_input_candidates || [];

    for (const selector of keywordSelectors) {
      try {
        const keywordsInput = await driver.findElement(By.css(selector));
        await keywordsInput.click();
        await driver.sleep(500);
        await keywordsInput.sendKeys(Key.CONTROL, 'a');
        await keywordsInput.sendKeys(Key.DELETE);
        await keywordsInput.sendKeys(keywords);
        await driver.sleep(1000);
        await keywordsInput.sendKeys(Key.ENTER);

        printLog(`Search keywords set to: ${keywords}`);
        ctx.search_keywords = keywords;
        yield "search_keywords_set";
        return;
      } catch (error) {
        continue;
      }
    }

    printLog("Keywords input not found");
    yield "keywords_input_not_found";
  } catch (error) {
    printLog(`Error setting search keywords: ${error}`);
    yield "failed_setting_search_keywords";
  }
}

// Apply filters
export async function* applyFilters(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step8: apply filters");

  try {
    const driver = ctx.driver;

    await driver.sleep(2000);

    // Try to find and click "All filters" button
    try {
      const allFiltersButton = await driver.findElement(By.css('button:has-text("All filters")'));
      await allFiltersButton.click();
      await driver.sleep(2000);

      // Click Easy Apply filter if configured
      const configPath = path.join(__dirname, '../core/user-bots-config.json');
      let config: any = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      if (config.linkedin?.easy_apply_only) {
        try {
          const easyApplyButton = await driver.findElement(By.xpath('//button[contains(text(), "Easy Apply")]'));
          await easyApplyButton.click();
          await driver.sleep(1000);
        } catch (error) {
          printLog("Easy Apply filter not found");
        }
      }

      // Click "Show results" button
      try {
        const showResultsButton = await driver.findElement(By.css('button[aria-label*="Apply current filters"]'));
        await showResultsButton.click();
        await driver.sleep(3000);
      } catch (error) {
        printLog("Show results button not found, continuing");
      }

      printLog("Filters applied");
      yield "filters_applied_successfully";
    } catch (error) {
      printLog("Filters not available, continuing");
      yield "filters_application_failed";
    }
  } catch (error) {
    printLog(`Error applying filters: ${error}`);
    yield "filters_application_failed";
  }
}

// Get page info
export async function* getPageInfo(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step9: get page info");

  try {
    const driver = ctx.driver;

    // Try to detect pagination
    try {
      const paginationContainer = await driver.findElement(By.css('ul.artdeco-pagination__pages'));
      const activeButton = await paginationContainer.findElement(By.css('button[aria-current="page"]'));
      const pageText = await activeButton.getText();
      const currentPage = parseInt(pageText) || 1;

      ctx.has_pagination = true;
      ctx.pagination_current_page = currentPage;
      printLog(`Current page: ${currentPage}`);
    } catch (error) {
      ctx.has_pagination = false;
      ctx.pagination_current_page = 1;
      printLog("Pagination not found");
    }

    yield "page_info_extracted";
  } catch (error) {
    printLog(`Error getting page info: ${error}`);
    yield "failed_extracting_page_info";
  }
}

// Extract job details
export async function* extractJobDetails(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step10: extract job details");

  try {
    const driver = ctx.driver;

    await driver.sleep(2000);

    // Find job cards
    const jobCards = await driver.findElements(By.css('li[data-occludable-job-id]'));

    if (jobCards.length === 0) {
      printLog("No job cards found");
      yield "no_job_cards_found";
      return;
    }

    printLog(`Found ${jobCards.length} job cards`);

    const extractedJobs: any[] = [];

    for (let i = 0; i < jobCards.length; i++) {
      try {
        const card = jobCards[i];

        // Scroll to card
        await driver.executeScript("arguments[0].scrollIntoView(true);", card);
        await driver.sleep(500);

        const jobId = await card.getAttribute('data-occludable-job-id');

        if (!jobId) continue;

        // Extract title
        let title = '';
        try {
          const titleElement = await card.findElement(By.css('a.job-card-list__title'));
          title = await titleElement.getText();
        } catch (error) {
          continue;
        }

        // Extract company
        let company = '';
        try {
          const companyElement = await card.findElement(By.css('.artdeco-entity-lockup__subtitle'));
          const companyText = await companyElement.getText();
          company = companyText.split(' · ')[0] || companyText;
        } catch (error) {
          // Ignore
        }

        // Extract location
        let location = '';
        try {
          const locationElement = await card.findElement(By.css('.job-card-container__metadata-item'));
          location = await locationElement.getText();
        } catch (error) {
          // Ignore
        }

        extractedJobs.push({
          job_id: jobId,
          title: title,
          company: company,
          work_location: location,
          is_applied: false
        });

        printLog(`Job ${i + 1}/${jobCards.length}: ${title} at ${company}`);
      } catch (error) {
        printLog(`Error extracting job ${i + 1}: ${error}`);
        continue;
      }
    }

    ctx.extracted_jobs = extractedJobs;
    ctx.total_jobs = extractedJobs.length;
    ctx.applied_jobs = 0;
    ctx.skipped_jobs = 0;
    ctx.current_job_index = 0;

    printLog(`Extracted ${extractedJobs.length} jobs`);

    await ctx.overlay.updateJobProgress(0, extractedJobs.length, "Jobs extracted", 10);

    yield "proceed_to_process_jobs";
  } catch (error) {
    printLog(`Error extracting job details: ${error}`);
    yield "failed_extracting_jobs";
  }
}

// Process jobs
export async function* processJobs(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step11: process jobs");

  const extractedJobs = ctx.extracted_jobs || [];

  if (extractedJobs.length === 0) {
    printLog("No jobs to process");
    yield "no_jobs_to_process";
    return;
  }

  ctx.current_job = extractedJobs[0];
  ctx.current_job_index = 0;

  printLog(`Starting to process ${extractedJobs.length} jobs`);
  yield "starting_to_process_jobs";
}

// Attempt Easy Apply
export async function* attemptEasyApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step14: attempt Easy Apply");

  try {
    const driver = ctx.driver;
    const currentJob = ctx.current_job;

    if (!currentJob) {
      yield "no_job_to_process";
      return;
    }

    const jobId = currentJob.job_id;
    const jobTitle = currentJob.title;
    const company = currentJob.company;

    printLog(`Processing: ${jobTitle} at ${company}`);

    // Click on the job card to load details
    try {
      const jobCard = await driver.findElement(By.css(`[data-occludable-job-id="${jobId}"]`));
      await jobCard.click();
      await driver.sleep(3000);
    } catch (error) {
      printLog("Job card not found");
      yield "job_card_not_found";
      return;
    }

    // Look for Easy Apply button
    const easyApplySelectors = [
      'button[aria-label*="Easy Apply"]',
      'button:contains("Easy Apply")'
    ];

    let easyApplyButton = null;

    for (const selector of easyApplySelectors) {
      try {
        easyApplyButton = await driver.findElement(By.css(selector));
        break;
      } catch (error) {
        continue;
      }
    }

    if (easyApplyButton) {
      try {
        await easyApplyButton.click();
        printLog("Easy Apply button clicked");
        await driver.sleep(2000);

        await ctx.overlay.updateJobProgress(
          ctx.applied_jobs || 0,
          ctx.total_jobs || 0,
          `Applying: ${jobTitle}`,
          14
        );

        yield "proceeding_to_resume_upload";
      } catch (error) {
        printLog("Failed to click Easy Apply button");
        yield "failed_to_click_easy_apply";
      }
    } else {
      printLog("No Easy Apply button found");
      yield "no_easy_apply_button_found";
    }
  } catch (error) {
    printLog(`Easy Apply error: ${error}`);
    yield "easy_apply_process_error";
  }
}

// Upload resume
export async function* uploadResume(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step15: upload resume");

  try {
    const driver = ctx.driver;

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const resumePath = config.linkedin?.resume_path || '';

    if (!resumePath || !fs.existsSync(resumePath)) {
      printLog("No resume configured or file not found");
      yield "proceeding_without_resume";
      return;
    }

    try {
      const fileInput = await driver.findElement(By.css('input[type="file"]'));
      await fileInput.sendKeys(resumePath);
      printLog("Resume uploaded");
      await driver.sleep(2000);
      yield "resume_uploaded_successfully";
    } catch (error) {
      printLog("Resume upload element not found");
      yield "proceeding_without_resume";
    }
  } catch (error) {
    printLog(`Resume upload error: ${error}`);
    yield "proceeding_without_resume";
  }
}

// Answer questions
export async function* answerQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step16: answer questions");

  try {
    const driver = ctx.driver;

    // Load config
    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const phone = config.linkedin?.phone || '';
    const email = config.linkedin?.email || config.linkedin?.username || '';

    // Find all form elements
    try {
      const formElements = await driver.findElements(By.css('[data-test-form-element]'));

      for (const element of formElements) {
        try {
          // Try to fill text inputs
          const textInputs = await element.findElements(By.css('input[type="text"]'));
          for (const input of textInputs) {
            const label = await input.getAttribute('aria-label') || '';

            if (label.toLowerCase().includes('phone')) {
              await input.clear();
              await input.sendKeys(phone);
            } else if (label.toLowerCase().includes('email')) {
              await input.clear();
              await input.sendKeys(email);
            }
          }

          // Try to select first option in dropdowns
          const selects = await element.findElements(By.css('select'));
          for (const select of selects) {
            try {
              const options = await select.findElements(By.css('option'));
              if (options.length > 1) {
                await options[1].click(); // Select first non-empty option
              }
            } catch (error) {
              // Ignore
            }
          }

          // Try to click first radio button
          const radios = await element.findElements(By.css('input[type="radio"]'));
          if (radios.length > 0) {
            try {
              await radios[0].click();
            } catch (error) {
              // Ignore
            }
          }
        } catch (error) {
          continue;
        }
      }

      printLog("Questions answered");
      yield "finished_answering_questions";
    } catch (error) {
      printLog("No form elements found");
      yield "finished_answering_questions";
    }
  } catch (error) {
    printLog(`Error answering questions: ${error}`);
    yield "error_answering_questions";
  }
}

// Submit application
export async function* submitApplication(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step17: submit application");

  try {
    const driver = ctx.driver;
    const currentJob = ctx.current_job;

    // Click "Next" buttons until we reach submit
    let nextClicked = true;
    let nextCount = 0;

    while (nextClicked && nextCount < 5) {
      nextClicked = false;
      try {
        const nextButton = await driver.findElement(By.xpath('//button[contains(text(), "Next")]'));
        await nextButton.click();
        printLog(`Clicked Next button ${nextCount + 1}`);
        await driver.sleep(2000);
        nextClicked = true;
        nextCount++;
      } catch (error) {
        // No more Next buttons
      }
    }

    // Look for Submit button
    const submitSelectors = [
      '//button[contains(text(), "Submit application")]',
      '//button[contains(text(), "Submit")]'
    ];

    let submitButton = null;

    for (const selector of submitSelectors) {
      try {
        submitButton = await driver.findElement(By.xpath(selector));
        break;
      } catch (error) {
        continue;
      }
    }

    if (submitButton) {
      await submitButton.click();
      printLog("Application submitted");
      await driver.sleep(3000);

      ctx.applied_jobs = (ctx.applied_jobs || 0) + 1;

      await ctx.overlay.updateJobProgress(
        ctx.applied_jobs,
        ctx.total_jobs || 0,
        `Applied: ${currentJob.title}`,
        17
      );

      yield "save_applied_job";
    } else {
      printLog("Submit button not found");
      yield "application_failed";
    }
  } catch (error) {
    printLog(`Submit error: ${error}`);
    yield "application_failed";
  }
}

// Save applied job
export async function* saveAppliedJob(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step18: save applied job");

  try {
    const currentJob = ctx.current_job;
    const appliedJobIds = ctx.applied_job_ids || new Set();

    if (currentJob && currentJob.job_id) {
      appliedJobIds.add(currentJob.job_id);
      ctx.applied_job_ids = appliedJobIds;

      const jobIdsPath = path.join(process.cwd(), 'deknilJobsIds.json');
      fs.writeFileSync(jobIdsPath, JSON.stringify(Array.from(appliedJobIds), null, 2));

      printLog(`Saved job ID: ${currentJob.job_id}`);
      yield "job_saved";
    } else {
      yield "save_job_failed";
    }
  } catch (error) {
    printLog(`Error saving job: ${error}`);
    yield "save_job_failed";
  }
}

// External apply
export async function* externalApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step19: external apply");

  try {
    const driver = ctx.driver;

    // Look for regular Apply button
    try {
      const applyButton = await driver.findElement(By.xpath('//button[contains(text(), "Apply")]'));
      await applyButton.click();
      printLog("External Apply clicked");
      await driver.sleep(3000);

      // Get current window handles
      const handles = await driver.getAllWindowHandles();
      if (handles.length > 1) {
        // Switch to new tab
        await driver.switchTo().window(handles[handles.length - 1]);
        const externalUrl = await driver.getCurrentUrl();
        ctx.external_application_url = externalUrl;

        // Close external tab
        await driver.close();
        await driver.switchTo().window(handles[0]);

        printLog(`External application URL: ${externalUrl}`);
      }

      ctx.skipped_jobs = (ctx.skipped_jobs || 0) + 1;

      await ctx.overlay.updateJobProgress(
        ctx.applied_jobs || 0,
        ctx.total_jobs || 0,
        "External apply (skipped)",
        19
      );

      yield "save_external_job";
    } catch (error) {
      printLog("No Apply button found");
      yield "application_failed";
    }
  } catch (error) {
    printLog(`External apply error: ${error}`);
    yield "application_failed";
  }
}

// Save external job
export async function* saveExternalJob(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step20: save external job");

  const currentJob = ctx.current_job;
  const externalUrl = ctx.external_application_url || '';

  printLog(`External job: ${currentJob?.title} - ${externalUrl}`);
  yield "external_job_saved";
}

// Application failed
export async function* applicationFailed(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step21: application failed");

  const currentJob = ctx.current_job;

  if (currentJob) {
    printLog(`Failed to apply: ${currentJob.title}`);

    ctx.skipped_jobs = (ctx.skipped_jobs || 0) + 1;

    await ctx.overlay.updateJobProgress(
      ctx.applied_jobs || 0,
      ctx.total_jobs || 0,
      "Application failed",
      21
    );
  }

  yield "application_marked_failed";
}

// Continue processing
export async function* continueProcessing(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step22: continue processing");

  const extractedJobs = ctx.extracted_jobs || [];
  const currentIndex = ctx.current_job_index || 0;

  if (currentIndex < extractedJobs.length - 1) {
    // Move to next job
    const nextIndex = currentIndex + 1;
    ctx.current_job_index = nextIndex;
    ctx.current_job = extractedJobs[nextIndex];

    printLog(`Moving to next job: ${nextIndex + 1}/${extractedJobs.length}`);
    yield "starting_next_application";
  } else {
    // All jobs processed
    printLog("All jobs on this page processed");
    yield "navigate_to_next_page";
  }
}

// Navigate to next page
export async function* navigateToNextPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Step23: navigate to next page");

  try {
    const driver = ctx.driver;
    const currentPage = ctx.pagination_current_page || 1;

    try {
      const nextPageButton = await driver.findElement(By.css(`button[aria-label="Page ${currentPage + 1}"]`));
      await nextPageButton.click();
      printLog(`Navigated to page ${currentPage + 1}`);
      await driver.sleep(3000);

      ctx.pagination_current_page = currentPage + 1;
      yield "extract_job_details";
    } catch (error) {
      printLog("No more pages");
      yield "finish";
    }
  } catch (error) {
    printLog(`Navigation error: ${error}`);
    yield "finish";
  }
}

// Finish
export async function* finish(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("LinkedIn Finish: cleanup and stop");

  try {
    const appliedCount = ctx.applied_jobs || 0;
    const skippedCount = ctx.skipped_jobs || 0;
    const totalCount = ctx.total_jobs || 0;

    printLog(`Workflow complete: Applied ${appliedCount}, Skipped ${skippedCount}, Total ${totalCount}`);

    if (ctx.overlay) {
      await ctx.overlay.updateJobProgress(
        appliedCount,
        totalCount,
        "Workflow completed!",
        24
      );
    }
  } catch (error) {
    printLog(`Finish error: ${error}`);
  }

  yield "done";
}

// Export step functions
export const linkedinStepFunctions = {
  loadAppliedJobIds,
  openCheckLogin,
  credentialLogin,
  showManualLoginPrompt,
  openJobsPage,
  setSearchLocation,
  setSearchKeywords,
  applyFilters,
  getPageInfo,
  extractJobDetails,
  processJobs,
  attemptEasyApply,
  uploadResume,
  answerQuestions,
  submitApplication,
  saveAppliedJob,
  externalApply,
  saveExternalJob,
  applicationFailed,
  continueProcessing,
  navigateToNextPage,
  finish
};
