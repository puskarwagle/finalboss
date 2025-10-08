import { setupChromeDriver } from '../../core/browser_manager';
import { By } from 'selenium-webdriver';
import { fillQuestionField } from '../handlers/answer_employer_questions';
import type { WorkflowContext } from '../../core/workflow_engine';
import { seekStepFunctions } from '../seek_impl';
import { extractEmployerQuestions } from '../handlers/extract_employer_questions';
import { getIntelligentAnswers, extractQuestionsFromPage } from '../handlers/intelligent_qa_handler';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

// Removed: Now using shared function from intelligent_qa_handler.ts

export async function runQuickApplyE2ETest(jobUrl: string = 'https://www.seek.com.au/job/87457750') {
  console.log('🤖 Testing Seek Quick Apply with Main Flow Functions...\n');

  const { driver } = await setupChromeDriver('seek', false);
  const ctx = { driver } as WorkflowContext;

  try {
    // Step 1: Navigate to job page and extract job details using main flow function
    console.log('📋 STEP 1: Extract Job Details');
    console.log('═'.repeat(60));

    console.log(`📍 Navigating to: ${jobUrl}`);
    await driver.get(jobUrl);
    await driver.sleep(3000);

    // Use main flow parseJobDetails function
    let jobData = null;
    for await (const result of seekStepFunctions.parseJobDetails(ctx)) {
      if (result === "job_parsed") {
        console.log('✅ Job details extracted successfully');
        break;
      } else if (result === "parse_failed") {
        throw new Error('Failed to parse job details');
      }
    }

    // Step 2: Find and click Quick Apply button using main flow function
    console.log('\n📋 STEP 2: Detect Apply Type');
    console.log('═'.repeat(60));

    for await (const result of seekStepFunctions.detectApplyType(ctx)) {
      if (result === "quick_apply_found") {
        console.log('✅ Quick Apply button found');
        break;
      } else {
        throw new Error(`Apply type detection failed: ${result}`);
      }
    }

    // Step 3: Click Quick Apply using main flow function
    console.log('\n📋 STEP 3: Click Quick Apply Button');
    console.log('═'.repeat(60));

    for await (const result of seekStepFunctions.clickQuickApply(ctx)) {
      if (result === "quick_apply_clicked") {
        console.log('✅ Quick Apply button clicked');
        break;
      } else {
        throw new Error(`Quick Apply click failed: ${result}`);
      }
    }

    // Step 4: Handle Documents Page - Select "Don't include" options
    console.log('\n📋 STEP 4: Handle Documents Selection');
    console.log('═'.repeat(60));

    // Wait for documents page to load
    let documentsPageReady = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      documentsPageReady = await driver.executeScript(`
        return document.querySelector('button[data-testid="continue-button"]') !== null ||
               document.title.includes('Choose documents') ||
               document.querySelector('input[type="radio"]') !== null;
      `);
      if (documentsPageReady) break;
      await driver.sleep(1000);
    }

    if (!documentsPageReady) {
      throw new Error('Documents page did not load properly');
    }

    console.log('✅ Documents page loaded');

    // Handle resume selection - click "Don't include a resumé"
    try {
      const noResumeRadio = await driver.findElement(By.xpath("//label[contains(., \"Don't include a resumé\")]"));
      await noResumeRadio.click();
      console.log('✅ Selected "Don\'t include a resumé"');
      await driver.sleep(1000);
    } catch (e) {
      console.log('⚠️ Could not find "Don\'t include a resumé" option');
    }

    // Handle cover letter selection - click "Don't include a cover letter"
    try {
      const noCoverLetterRadio = await driver.findElement(By.xpath("//label[contains(., \"Don't include a cover letter\")]"));
      await noCoverLetterRadio.click();
      console.log('✅ Selected "Don\'t include a cover letter"');
      await driver.sleep(1000);
    } catch (e) {
      console.log('⚠️ Could not find "Don\'t include a cover letter" option');
    }

    // Step 5: Wait for form to be ready
    console.log('\n📋 STEP 5: Wait for Form Validation');
    console.log('═'.repeat(60));

    // Wait for form to process and become ready
    let formReady = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await driver.sleep(1000);

      formReady = await driver.executeScript(`
        // Check if continue button is available and enabled
        const continueBtn = document.querySelector('button[data-testid="continue-button"]');
        const btnExists = !!continueBtn;
        const btnEnabled = continueBtn ? !continueBtn.disabled : false;

        // Check for validation errors
        const errorElements = document.querySelectorAll('[role="alert"], .error, .invalid, [aria-invalid="true"]');
        const hasErrors = errorElements.length > 0;

        console.log('Form check attempt ' + (arguments[0] + 1) + ': Button exists:', btnExists, 'Enabled:', btnEnabled, 'Errors:', hasErrors);

        return btnExists && (btnEnabled || !hasErrors);
      `, attempt);

      if (formReady) {
        console.log(`✅ Form ready after ${attempt + 1} attempts`);
        break;
      }
    }

    if (!formReady) {
      console.log('⚠️ Form may not be fully ready, continuing anyway...');
    }

    // Step 6: Click Continue Button using main flow function
    console.log('\n📋 STEP 6: Click Continue Button');
    console.log('═'.repeat(60));

    for await (const result of seekStepFunctions.clickContinueButton(ctx)) {
      if (result === "continue_clicked") {
        console.log('✅ Continue button clicked');
        break;
      } else {
        throw new Error(`Continue button click failed: ${result}`);
      }
    }

    // Step 7: Extract Employer Questions using main flow function
    console.log('\n📋 STEP 7: Extract Employer Questions');
    console.log('═'.repeat(60));

    for await (const result of extractEmployerQuestions(ctx)) {
      if (result === "employer_questions_saved") {
        console.log('✅ Employer questions extracted and saved');
        break;
      } else if (result === "no_employer_questions") {
        console.log('⚠️ No employer questions found');
        break;
      } else if (result === "employer_questions_error") {
        throw new Error('Failed to extract employer questions');
      }
    }

    // Step 8: Answer Employer Questions using main flow function
    console.log('\n📋 STEP 8: Answer Employer Questions with Intelligence');
    console.log('═'.repeat(60));

    // Set test mode flag for API logging
    (globalThis as any).API_TEST_MODE = true;

    for await (const result of seekStepFunctions.handleEmployerQuestions(ctx)) {
      if (result === "employer_questions_saved") {
        console.log('✅ All employer questions answered successfully');
        break;
      } else if (result === "no_questions") {
        console.log('⚠️ No questions to answer');
        break;
      } else if (result === "employer_questions_error") {
        console.log('⚠️ Some questions could not be answered');
        break;
      }
    }

    // Step 9: Click Continue Button After Q&A
    console.log('\n📋 STEP 9: Click Continue After Q&A');
    console.log('═'.repeat(60));

    await driver.sleep(2000); // Wait for form to process answers

    // Check current progress step before clicking continue
    const currentStepBefore = await driver.executeScript(`
      // Look for progress indicators or current step
      const progressSteps = document.querySelectorAll('[data-automation*="step"], .progress-step, .step-indicator');
      const currentStepElement = document.querySelector('.active, .current, [aria-current="step"]');

      return {
        progressStepsFound: progressSteps.length,
        currentStep: currentStepElement ? currentStepElement.textContent : 'unknown',
        pageTitle: document.title,
        hasQuestions: document.querySelectorAll('select, textarea, input[type="radio"]').length
      };
    `);

    console.log(`📊 BEFORE Continue: Step="${currentStepBefore.currentStep}", Questions=${currentStepBefore.hasQuestions}, Title="${currentStepBefore.pageTitle}"`);

    // Try to click continue button after answering questions
    for await (const result of seekStepFunctions.clickContinueButton(ctx)) {
      if (result === "continue_clicked") {
        console.log('✅ Continue button clicked after Q&A');
        break;
      } else if (result === "continue_button_not_found") {
        console.log('⚠️ Continue button not found - may already be on next step');
        break;
      } else {
        console.log(`⚠️ Continue click result: ${result}`);
        break;
      }
    }

    await driver.sleep(3000); // Wait for page transition

    // Check progress step after clicking continue
    const currentStepAfter = await driver.executeScript(`
      const progressSteps = document.querySelectorAll('[data-automation*="step"], .progress-step, .step-indicator');
      const currentStepElement = document.querySelector('.active, .current, [aria-current="step"]');

      return {
        progressStepsFound: progressSteps.length,
        currentStep: currentStepElement ? currentStepElement.textContent : 'unknown',
        pageTitle: document.title,
        hasQuestions: document.querySelectorAll('select, textarea, input[type="radio"]').length
      };
    `);

    console.log(`📊 AFTER Continue: Step="${currentStepAfter.currentStep}", Questions=${currentStepAfter.hasQuestions}, Title="${currentStepAfter.pageTitle}"`);

    // Check if we moved to next step
    if (currentStepBefore.currentStep !== currentStepAfter.currentStep ||
        currentStepBefore.pageTitle !== currentStepAfter.pageTitle) {
      console.log('✅ Successfully moved to next step!');
    } else {
      console.log('⚠️ May still be on same step - investigating form issues...');

      // Check for validation errors
      const validationErrors = await driver.executeScript(`
        const errorElements = document.querySelectorAll('[role="alert"], .error, .invalid, [aria-invalid="true"]');
        const errors = Array.from(errorElements).map(el => ({
          text: el.textContent.trim(),
          tagName: el.tagName,
          className: el.className
        })).filter(e => e.text);

        return {
          errorCount: errors.length,
          errors: errors
        };
      `);

      if (validationErrors.errorCount > 0) {
        console.log(`🔥 VALIDATION ERRORS FOUND (${validationErrors.errorCount}):`);
        validationErrors.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.text} (${error.tagName}.${error.className})`);
        });
      } else {
        console.log('ℹ️ No validation errors found');
      }
    }

    // Step 10: Test session API
    console.log('\n📋 STEP 10: Test Session API');
    console.log('═'.repeat(60));

    try {
      const sessionResponse = await fetch('http://localhost:1420/api/session');
      const sessionData = await sessionResponse.json();
      const prettyJson = JSON.stringify(sessionData, null, 2);
      console.log(prettyJson);
    } catch (error) {
      console.log(`❌ Failed to fetch session: ${error.message}`);
    }

    console.log('\n✅ Test completed. Browser remains open for inspection.');

  } catch (error) {
    console.error('Error during Quick Apply E2E test:', error);
  }
}
