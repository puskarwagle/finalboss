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

// Step 0: Initialize Context - Load config, selectors, and job IDs
export async function* step0(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const selectorsConfigPath = path.join(__dirname, 'config/linkedin_selectors.json');
    const selectorsRootPath = path.join(__dirname, 'linkedin_selectors.json');
    const selectorsPath = fs.existsSync(selectorsConfigPath) ? selectorsConfigPath : selectorsRootPath;
    ctx.selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));

    const configPath = path.join(__dirname, '../core/user-bots-config.json');
    if (fs.existsSync(configPath)) {
      ctx.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      ctx.config = {};
    }

    const jobIdsPath = path.join(process.cwd(), 'deknilJobsIds.json');
    let jobIds: Set<string> = new Set();

    if (fs.existsSync(jobIdsPath)) {
      const data = JSON.parse(fs.readFileSync(jobIdsPath, 'utf-8'));
      jobIds = new Set(Array.isArray(data) ? data : []);
    }

    ctx.applied_job_ids = jobIds;

    yield "ctx_ready";
  } catch (error) {
    yield "ctx_failed";
  }
}

// Open LinkedIn and check login status
export async function* openCheckLogin(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    // Only setup Chrome if driver doesn't exist yet
    if (!ctx.driver) {
      const { driver, sessionExists, sessionsDir } = await setupChromeDriver('linkedin');
      ctx.driver = driver;
      ctx.sessionExists = sessionExists;
      ctx.sessionsDir = sessionsDir;
      ctx.humanBehavior = new HumanBehavior(DEFAULT_HUMANIZATION);
      ctx.sessionManager = new UniversalSessionManager(driver, SessionConfigs.linkedin);
      ctx.overlay = new UniversalOverlay(driver, 'LinkedIn');

      await StealthFeatures.hideWebDriver(driver);
      await StealthFeatures.randomizeUserAgent(driver);
    }

    const jobsUrl = ctx.selectors?.urls?.jobs_url || 'https://www.linkedin.com/jobs/';

    // Check current URL first - don't navigate if already on LinkedIn
    let currentUrl = await ctx.driver.getCurrentUrl();

    if (!currentUrl.includes('linkedin.com') || currentUrl === 'data:,') {
      printLog(`Navigating to: ${jobsUrl}`);
      await ctx.driver.get(jobsUrl);
      await ctx.driver.sleep(2000);
      currentUrl = await ctx.driver.getCurrentUrl();
    } else {
      printLog(`Already on LinkedIn: ${currentUrl}`);
    }

    const title = await ctx.driver.getTitle();
    printLog(`Current URL: ${currentUrl}`);
    printLog(`Page title: ${title}`);

    // Check if we're on the jobs page (logged in) or redirected to login
    if (currentUrl.includes('/login') || currentUrl.includes('/uas/login')) {
      printLog("Redirected to login - user needs to log in");
      yield "user_needs_to_login";
      return;
    }

    // Check if we're on jobs page (indicates logged in)
    if (currentUrl.includes('/jobs')) {
      printLog("Already on jobs page - logged in");
      yield "login_not_needed";
      return;
    }

    // Check for sign-in indicators in page content
    const pageSource = await ctx.driver.getPageSource();
    if (pageSource.includes('Sign in') || pageSource.includes('Join now')) {
      printLog("Sign-in indicators found - user needs to log in");
      yield "user_needs_to_login";
    } else {
      printLog("Login status unclear, proceeding");
      yield "cannot_determine_login_status";
    }
  } catch (error) {
    printLog(`Error checking login: ${error}`);
    yield "failed_to_navigate";
  }
}

// Attempt credential login (skipped - users login manually like Seek)
export async function* credentialLogin(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Skipping credential login - users login manually");

  // Always skip to manual login since users login manually like Seek
  printLog("Proceeding to manual login prompt");
  yield "no_login_credentials_found";
}

// Show manual login prompt
export async function* showManualLoginPrompt(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Showing manual login prompt");

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
  try {
    const driver = ctx.driver;
    const currentUrl = await driver.getCurrentUrl();

    if (!currentUrl.includes('/jobs')) {
      const selectors = ctx.selectors;
      await driver.get(selectors.urls?.jobs_url || 'https://www.linkedin.com/jobs/');
      await driver.sleep(3000);
    }

    await ctx.overlay.showJobProgress(0, 0, "Initializing LinkedIn bot...", 5);

    yield "jobs_page_loaded";
  } catch (error) {
    yield "failed_opening_jobs_page";
  }
}

// Set search location
export async function* setSearchLocation(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    const location = ctx.config.formData?.locations || '';

    if (!location) {
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

        printLog(`Location: ${location}`);
        ctx.search_location = location;
        yield "search_location_set";
        return;
      } catch (error) {
        continue;
      }
    }

    yield "location_input_not_found";
  } catch (error) {
    yield "failed_setting_search_location";
  }
}

// Set search keywords
export async function* setSearchKeywords(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;
    const selectors = ctx.selectors;

    const keywords = ctx.config.formData?.keywords || '';

    if (!keywords) {
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

        printLog(`Keywords: ${keywords}`);
        ctx.search_keywords = keywords;
        yield "search_keywords_set";
        return;
      } catch (error) {
        continue;
      }
    }

    yield "keywords_input_not_found";
  } catch (error) {
    yield "failed_setting_search_keywords";
  }
}

// Apply filters
export async function* applyFilters(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {

  try {
    const driver = ctx.driver;

    await driver.sleep(2000);

    // Try to find and click "All filters" button
    try {
      const allFiltersButton = await driver.findElement(By.css('button:has-text("All filters")'));
      await allFiltersButton.click();
      await driver.sleep(2000);

      // Click Easy Apply filter if configured
      if (ctx.config.formData?.easyApplyOnly) {
        try {
          const easyApplyButton = await driver.findElement(By.xpath('//button[contains(text(), "Easy Apply")]'));
          await easyApplyButton.click();
          await driver.sleep(1000);
        } catch (error) {
          // Filter not available
        }
      }

      // Click "Show results" button
      try {
        const showResultsButton = await driver.findElement(By.css('button[aria-label*="Apply current filters"]'));
        await showResultsButton.click();
        await driver.sleep(3000);
      } catch (error) {
        // Continue without filters
      }

      yield "filters_applied_successfully";
    } catch (error) {
      yield "filters_application_failed";
    }
  } catch (error) {
    yield "filters_application_failed";
  }
}

// Get page info
export async function* getPageInfo(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {

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
    } catch (error) {
      ctx.has_pagination = false;
      ctx.pagination_current_page = 1;
    }

    yield "page_info_extracted";
  } catch (error) {
    yield "failed_extracting_page_info";
  }
}

// Extract job details
export async function* extractJobDetails(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;

    await driver.sleep(2000);

    // Find job cards
    const jobCards = await driver.findElements(By.css('li[data-occludable-job-id]'));

    if (jobCards.length === 0) {
      yield "no_job_cards_found";
      return;
    }

    printLog(`Found ${jobCards.length} jobs`);

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
          const titleElement = await card.findElement(By.css('a.job-card-list__title--link'));
          title = (await titleElement.getText()).trim();
        } catch (error) {
          continue;
        }

        // Extract company
        let company = '';
        try {
          const companyElement = await card.findElement(By.css('.artdeco-entity-lockup__subtitle span'));
          company = (await companyElement.getText()).trim();
        } catch (error) {
          // Ignore
        }

        // Extract location
        let location = '';
        try {
          const locationElement = await card.findElement(By.css('.job-card-container__metadata-wrapper li span'));
          location = (await locationElement.getText()).trim();
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
      } catch (error) {
        continue;
      }
    }

    ctx.extracted_jobs = extractedJobs;
    ctx.total_jobs = extractedJobs.length;
    ctx.applied_jobs = 0;
    ctx.skipped_jobs = 0;
    ctx.current_job_index = 0;

    await ctx.overlay.updateJobProgress(0, extractedJobs.length, "Jobs extracted", 10);

    yield "proceed_to_process_jobs";
  } catch (error) {
    printLog(`Error extracting job details: ${error}`);
    yield "failed_extracting_jobs";
  }
}

// Process jobs
export async function* processJobs(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const extractedJobs = ctx.extracted_jobs || [];

  if (extractedJobs.length === 0) {
    yield "no_jobs_to_process";
    return;
  }

  ctx.current_job = extractedJobs[0];
  ctx.current_job_index = 0;

  yield "starting_to_process_jobs";
}

// Attempt Easy Apply
export async function* attemptEasyApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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

    printLog(`Processing: ${jobTitle}`);

    // Click on the job card to load details
    try {
      const jobCard = await driver.findElement(By.css(`[data-occludable-job-id="${jobId}"]`));
      await jobCard.click();
      await driver.sleep(2000);
    } catch (error) {
      yield "job_card_not_found";
      return;
    }

    // Look for Easy Apply button - check button text to differentiate from regular Apply
    const easyApplySelectors = ctx.selectors?.easy_apply?.button_css_candidates || [
      'button#jobs-apply-button-id',
      'button.jobs-apply-button'
    ];

    let easyApplyButton = null;

    for (const selector of easyApplySelectors) {
      try {
        const button = await driver.findElement(By.css(selector));
        const buttonText = await button.getText();

        // Only accept if it's "Easy Apply", not just "Apply"
        if (buttonText.includes('Easy Apply')) {
          easyApplyButton = button;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (easyApplyButton) {
      try {
        await easyApplyButton.click();
        await driver.sleep(2000);

        // Check if the Easy Apply modal opened
        try {
          const modal = await driver.findElement(By.css('div.jobs-easy-apply-modal'));

          // Check for initial profile setup form inside modal
          try {
            const modalHtml = await modal.getAttribute('innerHTML');
            if (modalHtml.includes('Be sure to include an updated resume') ||
                modalHtml.includes('Upload resume') ||
                modalHtml.includes('DOC, DOCX, PDF')) {

              printLog('⚠️ PROFILE SETUP REQUIRED');
              await ctx.overlay.showMessage(
                '⚠️ PROFILE SETUP REQUIRED ⚠️',
                'LinkedIn needs you to:\n\n1. Fill in contact info\n2. Upload resume\n3. Click Next\n4. Then click Continue here',
                'error'
              );

              yield "modal_failed_to_open";
              return;
            }
          } catch (innerError) {
            // No profile setup form found, continue
          }

          await ctx.overlay.updateJobProgress(
            ctx.applied_jobs || 0,
            ctx.total_jobs || 0,
            `Applying: ${jobTitle}`,
            14
          );

          yield "modal_opened_successfully";
        } catch (error) {
          yield "modal_failed_to_open";
        }
      } catch (error) {
        yield "failed_to_click_easy_apply";
      }
    } else {
      yield "no_easy_apply_button_found";
    }
  } catch (error) {
    yield "easy_apply_process_error";
  }
}

// Extract job details from the job details panel and save to JSON
export async function* extractJobDetailsFromPanel(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;
    const currentJob = ctx.current_job;

    if (!currentJob || !currentJob.job_id) {
      yield "job_details_extraction_failed";
      return;
    }

    const jobId = currentJob.job_id;
    const selectors = ctx.selectors?.jobs?.job_details_panel;

    const jobDetails: any = {
      job_id: jobId,
      extracted_at: new Date().toISOString(),
    };

    // Extract title
    try {
      const titleElement = await driver.findElement(By.css(selectors?.title_css || 'div.job-details-jobs-unified-top-card__job-title h1'));
      jobDetails.title = (await titleElement.getText()).trim();
    } catch (error) {
      jobDetails.title = currentJob.title || '';
    }

    // Extract company
    try {
      const companyElement = await driver.findElement(By.css(selectors?.company_name_css || 'div.job-details-jobs-unified-top-card__company-name a'));
      jobDetails.company = (await companyElement.getText()).trim();
    } catch (error) {
      jobDetails.company = currentJob.company || '';
    }

    // Extract location
    try {
      const locationElement = await driver.findElement(By.xpath(selectors?.location_xpath || "//div[contains(@class, 'job-details-jobs-unified-top-card__tertiary-description')]//span[contains(@class, 'tvm__text--low-emphasis')][1]"));
      jobDetails.location = (await locationElement.getText()).trim();
    } catch (error) {
      jobDetails.location = currentJob.work_location || '';
    }

    // Extract time posted
    try {
      const timeElement = await driver.findElement(By.xpath(selectors?.time_posted_xpath || "//div[contains(@class, 'job-details-jobs-unified-top-card__tertiary-description')]//span[contains(@class, 'tvm__text--positive')]//span"));
      jobDetails.time_posted = (await timeElement.getText()).trim();
    } catch (error) {
      jobDetails.time_posted = '';
    }

    // Extract applicants count
    try {
      const applicantsElement = await driver.findElement(By.xpath(selectors?.applicants_count_xpath || "//div[contains(@class, 'job-details-jobs-unified-top-card__tertiary-description')]//span[contains(text(), 'applicants')]"));
      jobDetails.applicants_count = (await applicantsElement.getText()).trim();
    } catch (error) {
      jobDetails.applicants_count = '';
    }

    // Extract job type tags (Remote, Full-time, etc.)
    try {
      const tagElements = await driver.findElements(By.css(selectors?.job_type_tags_css || 'div.job-details-fit-level-preferences button'));
      const tags = [];
      for (const tag of tagElements) {
        const tagText = (await tag.getText()).trim();
        if (tagText) tags.push(tagText);
      }
      jobDetails.job_type_tags = tags;
    } catch (error) {
      jobDetails.job_type_tags = [];
    }

    // Extract description
    try {
      const descElement = await driver.findElement(By.css(selectors?.description_text_css || 'div.jobs-box__html-content'));
      jobDetails.description = (await descElement.getText()).trim();
    } catch (error) {
      jobDetails.description = '';
    }

    // Save to file
    const jobsDir = path.join(process.cwd(), 'jobs', 'linkedinjobs', jobId);

    if (!fs.existsSync(jobsDir)) {
      fs.mkdirSync(jobsDir, { recursive: true });
    }

    const jobDetailsPath = path.join(jobsDir, 'job_details.json');
    fs.writeFileSync(jobDetailsPath, JSON.stringify(jobDetails, null, 2));

    printLog(`Saved: ${jobDetails.title} at ${jobDetails.company}`);
    ctx.current_job_details = jobDetails;

    yield "job_details_extracted";
  } catch (error) {
    yield "job_details_extraction_failed";
  }
}

// Upload resume
export async function* uploadResume(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Uploading resume...");

  try {
    const driver = ctx.driver;

    const resumePath = ctx.config.formData?.resumePath || '';

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
  printLog("Answering questions...");

  try {
    const driver = ctx.driver;

    const phone = ctx.config.formData?.phone || '';
    const email = ctx.config.formData?.email || '';

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
  printLog("Submitting application...");

  try {
    const driver = ctx.driver;
    const currentJob = ctx.current_job;

    // Click "Next" buttons until we reach submit
    let nextClicked = true;
    let nextCount = 0;
    const nextButtonXPath = ctx.selectors?.easy_apply?.next_button_xpath || "//button[contains(., 'Next') or contains(., 'Continue')]";

    while (nextClicked && nextCount < 5) {
      nextClicked = false;
      try {
        const nextButton = await driver.findElement(By.xpath(nextButtonXPath));
        const buttonText = await nextButton.getText();
        await nextButton.click();
        printLog(`Clicked "${buttonText}" button (${nextCount + 1})`);
        await driver.sleep(2000);
        nextClicked = true;
        nextCount++;
      } catch (error) {
        printLog("No more Next/Continue buttons found");
      }
    }

    // Look for Submit button
    const submitButtonXPath = ctx.selectors?.easy_apply?.submit_button_xpath || "//button[contains(., 'Submit application') or contains(., 'Submit')]";

    let submitButton = null;

    try {
      submitButton = await driver.findElement(By.xpath(submitButtonXPath));
      const buttonText = await submitButton.getText();
      printLog(`Found submit button: "${buttonText}"`);
    } catch (error) {
      printLog(`Submit button not found using XPath: ${submitButtonXPath}`);
      printLog(`Error: ${error}`);
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
      printLog("Submit button not found - modal may not have proper form");
      yield "application_failed";
    }
  } catch (error) {
    printLog(`Submit error: ${error}`);
    yield "application_failed";
  }
}

// Save applied job
export async function* saveAppliedJob(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  printLog("Saving applied job...");

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

// External apply - Extract job details and save to JSON
export async function* externalApply(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;
    const currentJob = ctx.current_job;

    if (!currentJob) {
      yield "application_failed";
      return;
    }

    // Extract full job details from panel
    const jobDetails: any = {
      job_id: currentJob.job_id,
      title: currentJob.title,
      company: currentJob.company,
      location: currentJob.work_location || '',
      extracted_at: new Date().toISOString(),
      apply_type: 'external'
    };

    // Extract description
    try {
      const descElement = await driver.findElement(By.css('div.jobs-description__content'));
      jobDetails.description = (await descElement.getText()).trim();
    } catch (error) {
      jobDetails.description = '';
    }

    // Extract job URL
    try {
      const currentUrl = await driver.getCurrentUrl();
      jobDetails.url = currentUrl;
    } catch (error) {
      jobDetails.url = '';
    }

    // Save to JSON file
    const jobsDir = path.join(process.cwd(), 'jobs/linkedinjobs');
    if (!fs.existsSync(jobsDir)) {
      fs.mkdirSync(jobsDir, { recursive: true });
    }

    const filename = `${currentJob.job_id}.json`;
    const filepath = path.join(jobsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(jobDetails, null, 2));

    ctx.skipped_jobs = (ctx.skipped_jobs || 0) + 1;

    await ctx.overlay.updateJobProgress(
      ctx.applied_jobs || 0,
      ctx.total_jobs || 0,
      "External job saved",
      19
    );

    yield "save_external_job";
  } catch (error) {
    yield "application_failed";
  }
}

// Save external job
export async function* saveExternalJob(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  yield "external_job_saved";
}

// Application failed
export async function* applicationFailed(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  const currentJob = ctx.current_job;

  if (currentJob) {
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
  const extractedJobs = ctx.extracted_jobs || [];
  const currentIndex = ctx.current_job_index || 0;

  if (currentIndex < extractedJobs.length - 1) {
    const nextIndex = currentIndex + 1;
    ctx.current_job_index = nextIndex;
    ctx.current_job = extractedJobs[nextIndex];

    yield "starting_next_application";
  } else {
    yield "navigate_to_next_page";
  }
}

// Navigate to next page
export async function* navigateToNextPage(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    const driver = ctx.driver;
    const currentPage = ctx.pagination_current_page || 1;

    try {
      const nextPageButton = await driver.findElement(By.css(`button[aria-label="Page ${currentPage + 1}"]`));
      await nextPageButton.click();
      printLog(`Page ${currentPage + 1}`);
      await driver.sleep(3000);

      ctx.pagination_current_page = currentPage + 1;
      yield "extract_job_details";
    } catch (error) {
      yield "finish";
    }
  } catch (error) {
    yield "finish";
  }
}

// Finish
export async function* finish(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
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
  step0,
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
  extractJobDetailsFromPanel,
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
