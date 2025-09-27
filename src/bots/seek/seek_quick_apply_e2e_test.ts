import { setupChromeDriver } from '../core/browser_manager';
import { By } from 'selenium-webdriver';
import { fillQuestionField } from './answer_employer_questions';
import type { WorkflowContext } from '../core/workflow_engine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

export async function runQuickApplyE2ETest(url: string) {
  printLog('🚀 Starting Quick Apply E2E Test...');

  const { driver } = await setupChromeDriver('seek', false);
  const ctx = { driver } as WorkflowContext;

  try {
    printLog(`Navigating to: ${url}`);
    await driver.get(url);

    printLog('Waiting for document page to be interactive...');
    let pageReady = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      pageReady = await driver.executeScript(
        `return document.querySelector('button[data-testid="continue-button"]')`
      );
      if (pageReady) {
        printLog('✓ Document page is interactive.');
        break;
      }
      printLog(`Page not interactive, attempt ${attempt + 1}/10, waiting...`);
      await driver.sleep(1000);
    }
    if (!pageReady) {
      throw new Error('Document page did not become interactive in time.');
    }

    try {
      const noCoverLetterRadio = await driver.findElement(By.xpath("//label[contains(., \"Don't include a cover letter\")]"));
      await noCoverLetterRadio.click();
      printLog('✓ Selected "Don\'t include a cover letter"');
    } catch (e) {
      printLog("Could not find \"Don't include a cover letter\" radio. It might not be present.");
    }
    
    await driver.sleep(1000);

    try {
      const noResumeRadio = await driver.findElement(By.xpath("//label[contains(., \"Don't include a resumé\")]"));
      await noResumeRadio.click();
      printLog('✓ Selected "Don\'t include a resumé"');
    } catch (e) {
        printLog("Could not find \"Don't include a resumé\" radio. It might not be present.");
    }

    await driver.sleep(1000);

    printLog('Clicking "Continue"...');
    const continueButton = await driver.findElement(By.css('button[data-testid="continue-button"]'));
    await continueButton.click();

    await driver.sleep(5000);

    // Robust wait for the questions page
    printLog('Waiting for "Answer employer questions" page to be fully ready...');
    pageReady = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      // Check multiple ways to verify the page is ready
      pageReady = await driver.executeScript(`
        return document.title.includes('Answer employer questions') ||
               document.querySelector('h1, h2')?.textContent.includes('Answer employer questions') ||
               document.querySelector('[data-automation*="question"]') !== null ||
               document.querySelector('form') !== null;
      `);
      if (pageReady) {
        printLog('✓ "Answer employer questions" page is ready.');
        break;
      }
      printLog(`Questions page not fully ready, attempt ${attempt + 1}/10, waiting...`);
      await driver.sleep(1000);
    }
    if (!pageReady) {
      throw new Error('Employer questions page did not load correctly.');
    }

    // Use the main browser extractor script
    const scriptPath = path.join(__dirname, 'browser_question_extractor.js');
    const browserScript = fs.readFileSync(scriptPath, 'utf8');
    const extractedData = await driver.executeScript(browserScript);

    if (!extractedData || extractedData.questionsFound === 0) {
      throw new Error('Could not find any questions on the page using the main extraction script.');
    }

    printLog(`Found ${extractedData.questionsFound} questions.`);

    const questions = extractedData.questions;
    const answers = [0, 1];

    // Debug: show what we extracted
    questions.forEach((q: any, index: number) => {
      printLog(`Question ${index + 1}: Type=${q.type}, Container=${q.containerSelector}, Question="${q.question}"`);
      if (q.options && q.options.length > 0) {
        printLog(`  Options: ${q.options.join(', ')}`);
      }
    });

    for (let i = 0; i < answers.length; i++) {
      if (i >= questions.length) {
        printLog(`Warning: Not enough questions on page for all hardcoded answers. Stopping at question ${i + 1}.`);
        break;
      }

      const question = questions[i];
      const answerIndex = answers[i];

      printLog(`Attempting to answer question ${i + 1} (\"${question.question}\") with option index ${answerIndex}`);

      const success = await fillQuestionField(ctx, question.containerSelector, question.type, answerIndex);

      if (success) {
        printLog(`✓ Successfully filled question ${i + 1}.`);
      } else {
        printLog(`❌ Failed to fill question ${i + 1}.`);
      }
      await driver.sleep(1000);
    }

    printLog('✅ Test script finished. Browser will remain open for inspection.');

  } catch (error) {
    console.error('Error during Quick Apply E2E test:', error);
  }
}
