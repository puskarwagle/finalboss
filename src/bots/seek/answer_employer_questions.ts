import type { WorkflowContext } from '../core/workflow_engine';
import { isGenericQuestion, getGenericAnswer } from './generic_question_handler';
import { getIntelligentAnswers, extractQuestionsFromPage } from './intelligent_qa_handler';

const printLog = (message: string) => {
  console.log(message);
};

// Refactored to use the robust containerSelector from the extraction step
export async function fillQuestionField(
  ctx: WorkflowContext,
  containerSelector: string, // The robust selector for the question's container
  questionType: string,
  answer: any
): Promise<boolean> {
  if (!containerSelector) {
    printLog('❌ Cannot fill field: containerSelector is missing.');
    return false;
  }

  try {
    switch (questionType) {
      case 'select':
        const selectResult = await ctx.driver.executeScript(`
          const container = document.querySelector(arguments[0]);
          if (!container) return { success: false, error: 'Container not found: ' + arguments[0] };

          // Debug: what's actually in the container
          console.log('Container HTML:', container.outerHTML);
          console.log('Container tagName:', container.tagName);

          // Try multiple ways to find the select element
          let select = container.querySelector('select');
          if (!select && container.tagName === 'SELECT') {
            select = container; // The container itself is the select
          }
          if (!select) {
            // Also check if there's a select as a direct child or sibling
            select = container.parentElement?.querySelector('select');
          }

          const answerIndex = arguments[1];

          if (select && select.options && select.options[answerIndex]) {
            select.selectedIndex = answerIndex;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          }
          return {
            success: false,
            error: 'Select element or option not found. Found select: ' + !!select +
                   ', container tagName: ' + container.tagName +
                   ', has options: ' + (select ? select.options.length : 0) +
                   ', container id: ' + container.id
          };
        `, containerSelector, answer);

        if (!selectResult.success) {
          printLog(`Failed to fill select: ${selectResult.error}`);
        }
        return selectResult.success;

      case 'radio':
        const radioResult = await ctx.driver.executeScript(`
          const container = document.querySelector(arguments[0]);
          if (!container) return { success: false, error: 'Container not found: ' + arguments[0] };

          const radioButtons = container.querySelectorAll('input[type="radio"]');
          const answerIndex = arguments[1];

          if (radioButtons && radioButtons[answerIndex]) {
            radioButtons[answerIndex].checked = true;
            radioButtons[answerIndex].dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          }
          return { success: false, error: 'Radio button not found. Found radios: ' + radioButtons.length + ', requested index: ' + answerIndex };
        `, containerSelector, answer);

        if (!radioResult.success) {
          printLog(`Failed to fill radio: ${radioResult.error}`);
        }
        return radioResult.success;

      case 'text':
      case 'textarea':
        try {
          // Use the same approach as cover letter handler - find element with Selenium and use sendKeys
          const textElements = await ctx.driver.executeScript(`
            const container = document.querySelector(arguments[0]);
            if (!container) return null;

            // Find textarea or text input within the container
            const textElement = container.querySelector('textarea, input[type="text"]');
            if (textElement) {
              return {
                tagName: textElement.tagName.toLowerCase(),
                selector: textElement.tagName.toLowerCase() +
                         (textElement.id ? '#' + textElement.id : '') +
                         (textElement.className ? '.' + textElement.className.split(' ').join('.') : '')
              };
            }
            return null;
          `, containerSelector);

          if (!textElements) {
            printLog(`Failed to find text element in container: ${containerSelector}`);
            return false;
          }

          // Use more specific selector to find the exact element
          const fullSelector = `${containerSelector} ${textElements.tagName}`;
          printLog(`Found text element: ${fullSelector}`);

          // Use Selenium's findElement and sendKeys like cover letter handler
          const textElement = await ctx.driver.findElement({ css: fullSelector });

          // Clear existing content first
          await textElement.clear();

          // Use sendKeys to simulate human typing (triggers proper events)
          await textElement.sendKeys(answer.toString());

          // Wait for form processing
          await ctx.driver.sleep(500);

          printLog(`✅ Successfully filled text field with: "${answer}"`);
          return true;

        } catch (error) {
          printLog(`❌ Failed to fill text field: ${error}`);
          return false;
        }

      case 'checkbox':
        try {
          // Handle multi-select checkbox questions
          // Answer should be an array of option texts to select
          const checkboxAnswers = Array.isArray(answer) ? answer : [answer];

          printLog(`Checkbox question - looking for options: ${checkboxAnswers.join(', ')}`);

          // Find all checkboxes in the container
          const checkboxResult = await ctx.driver.executeScript(`
            const container = document.querySelector(arguments[0]);
            if (!container) return { success: false, error: 'Container not found: ' + arguments[0] };

            // Find all checkboxes (look in container and parent containers)
            const checkboxes = container.querySelectorAll('input[type="checkbox"]') ||
                             container.parentElement?.querySelectorAll('input[type="checkbox"]') ||
                             document.querySelectorAll('input[type="checkbox"]');

            const answersToSelect = arguments[1];
            let selectedCount = 0;
            const debugInfo = [];

            for (const checkbox of checkboxes) {
              // Get label text for this checkbox
              const label = document.querySelector('label[for="' + checkbox.id + '"]');
              const optionText = label ? label.textContent.trim() : checkbox.value;

              debugInfo.push({
                id: checkbox.id,
                text: optionText,
                checked: checkbox.checked
              });

              // Check if this option should be selected
              const shouldSelect = answersToSelect.some(answer =>
                optionText.toLowerCase().includes(answer.toLowerCase()) ||
                answer.toLowerCase().includes(optionText.toLowerCase())
              );

              if (shouldSelect && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                checkbox.dispatchEvent(new Event('click', { bubbles: true }));
                selectedCount++;
                console.log('✓ Selected checkbox:', optionText);
              }
            }

            return {
              success: selectedCount > 0,
              selectedCount: selectedCount,
              totalCheckboxes: checkboxes.length,
              debugInfo: debugInfo
            };
          `, containerSelector, checkboxAnswers);

          if (checkboxResult.success) {
            printLog(`✅ Successfully selected ${checkboxResult.selectedCount} checkboxes out of ${checkboxResult.totalCheckboxes}`);
            return true;
          } else {
            printLog(`❌ Failed to select checkboxes: ${checkboxResult.error || 'No matches found'}`);
            if (checkboxResult.debugInfo) {
              printLog(`Available options: ${checkboxResult.debugInfo.map(cb => cb.text).join(', ')}`);
            }
            return false;
          }

        } catch (error) {
          printLog(`❌ Failed to fill checkbox field: ${error}`);
          return false;
        }

      default:
        printLog(`⚠️ Unknown question type: ${questionType}`);
        return false;
    }
  } catch (error) {
    printLog(`❌ Failed to fill question field: ${error}`);
    return false;
  }
}

// Enhanced handler that uses unified intelligent Q&A approach
export async function* answerEmployerQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔍 Starting intelligent employer questions handling...");

    // Step 1: Extract questions directly from the current page
    const questions = await extractQuestionsFromPage(ctx);

    if (questions.length === 0) {
      printLog("ℹ️ No questions found on current page");
      yield "no_questions";
      return;
    }

    printLog(`📋 Found ${questions.length} employer questions to answer`);

    // Step 2: Get intelligent answers (generic config + AI)
    const answeredQuestions = await getIntelligentAnswers(questions, ctx);

    // Step 3: Display the Q&A plan
    printLog("\n📋 Question answering plan:");
    answeredQuestions.forEach((q: any, index: number) => {
      printLog(`   ${index + 1}. [${q.answerSource}] ${q.question.substring(0, 60)}...`);
    });

    // Step 4: Fill all the questions
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < answeredQuestions.length; i++) {
      const question = answeredQuestions[i];
      try {
        printLog(`🎯 Filling Q${i + 1} [${question.answerSource}]: "${question.question.substring(0, 50)}..."`);

        let answer;
        if (question.type === 'select') {
          answer = question.selectedAnswer;
        } else if (question.type === 'text') {
          answer = question.textAnswer;
        }

        if (answer !== undefined && answer !== null && question.answerSource !== 'No Answer') {
          const filled = await fillQuestionField(ctx, question.containerSelector, question.type, answer);

          if (filled) {
            printLog(`✅ Question ${i + 1} answered successfully`);
            successCount++;
          } else {
            printLog(`⚠️ Failed to fill form field for question ${i + 1}`);
            errorCount++;
          }
        } else {
          printLog(`⏭️ Skipping question ${i + 1} - no answer available`);
          // Don't count as error, just skip
        }

        await ctx.driver.sleep(500);
      } catch (error) {
        printLog(`❌ Error answering question ${i + 1}: ${error}`);
        errorCount++;
      }
    }

    printLog(`📊 Results: ${successCount}/${answeredQuestions.length} questions answered, ${errorCount} errors`);

    if (errorCount === 0 && answeredQuestions.length > 0) {
      yield "employer_questions_saved";
    } else if (answeredQuestions.length === 0) {
      yield "no_questions";
    } else {
      yield "employer_questions_error";
    }

  } catch (error) {
    printLog(`💥 Intelligent employer questions handler crash: ${error}`);
    yield "employer_questions_error";
  }
}