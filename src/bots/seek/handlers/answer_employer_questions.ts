import type { WorkflowContext } from '../../core/workflow_engine';
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
          const checkboxAnswers = Array.isArray(answer) ? answer : [answer];
          printLog(`[DEBUG] Checkbox - attempting to select: ${checkboxAnswers.join(', ')}`);

          // New approach: Use Selenium WebDriver's click() instead of JavaScript
          const checkboxData = await ctx.driver.executeScript(`
            const container = document.querySelector(arguments[0]);
            if (!container) {
              return { success: false, error: 'Container not found' };
            }

            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            if (checkboxes.length === 0) {
              return { success: false, error: 'No checkboxes found' };
            }

            const answersToSelect = arguments[1];
            const checkboxesToClick = [];

            for (const answerText of answersToSelect) {
              for (const checkbox of checkboxes) {
                const label = document.querySelector('label[for="' + checkbox.id + '"]');
                const optionText = label ? label.textContent.trim() : '';

                if (optionText.toLowerCase() === answerText.toLowerCase()) {
                  checkboxesToClick.push({
                    id: checkbox.id,
                    optionText: optionText,
                    checked: checkbox.checked
                  });
                  break;
                }
              }
            }

            return {
              success: true,
              checkboxesToClick: checkboxesToClick
            };
          `, containerSelector, checkboxAnswers);

          if (!checkboxData.success) {
            printLog(`❌ Failed to find checkboxes: ${checkboxData.error}`);
            return false;
          }

          // Click each checkbox using Selenium WebDriver
          let successCount = 0;
          for (const checkboxInfo of checkboxData.checkboxesToClick) {
            try {
              printLog(`[DEBUG] Clicking checkbox for "${checkboxInfo.optionText}" (ID: ${checkboxInfo.id})`);

              // Find the checkbox element using Selenium
              const checkboxElement = await ctx.driver.findElement({ css: `input[id="${checkboxInfo.id}"]` });

              // Click it using Selenium (this should properly trigger React/framework events)
              await checkboxElement.click();

              successCount++;
              printLog(`✅ Successfully clicked checkbox for "${checkboxInfo.optionText}"`);

              // Small delay between clicks
              await ctx.driver.sleep(100);
            } catch (error) {
              printLog(`❌ Failed to click checkbox for "${checkboxInfo.optionText}": ${error}`);
            }
          }

          // Verify final state
          const finalState = await ctx.driver.executeScript(`
            const container = document.querySelector(arguments[0]);
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const state = [];
            for (const checkbox of checkboxes) {
              const label = document.querySelector('label[for="' + checkbox.id + '"]');
              state.push({
                option: label ? label.textContent.trim() : 'N/A',
                checked: checkbox.checked
              });
            }
            return state;
          `, containerSelector);

          console.log('[DEBUG] Final checkbox state:', JSON.stringify(finalState, null, 2));

          if (successCount > 0) {
            printLog(`✅ Successfully clicked ${successCount} checkboxes using Selenium`);
            return true;
          } else {
            printLog(`❌ Failed to click any checkboxes`);
            return false;
          }
        } catch (error) {
          printLog(`❌ CRASH in checkbox field logic: ${error}`);
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

    const questions = await extractQuestionsFromPage(ctx);

    if (questions.length === 0) {
      printLog("ℹ️ No questions found on current page");
      yield "no_questions";
      return;
    }

    printLog(`📋 Found ${questions.length} employer questions to answer`);

    const answeredQuestions = await getIntelligentAnswers(questions, ctx);

    printLog("\n📋 Question answering plan:");
    answeredQuestions.forEach((q: any, index: number) => {
      printLog(`   ${index + 1}. [${q.answerSource}] ${q.question.substring(0, 60)}...`);
    });

    let successCount = 0;
    let errorCount = 0;
    const qnaResults: any[] = [];

    for (let i = 0; i < answeredQuestions.length; i++) {
      const question = answeredQuestions[i];
      try {
        printLog(`[DEBUG] Processing question ${i + 1}: ${JSON.stringify(question, null, 2)}`);
        printLog(`🎯 Filling Q${i + 1} [${question.answerSource}]: "${question.question.substring(0, 50)}"...`);

        let answer;
        if (question.type === 'select') {
          answer = question.selectedAnswer;
        } else if (question.type === 'text') {
          answer = question.textAnswer;
        } else if (question.type === 'checkbox') {
          if (question.selectedAnswer && Array.isArray(question.selectedAnswer)) {
            // Check if selectedAnswer contains strings (option text) or numbers (indices)
            if (typeof question.selectedAnswer[0] === 'string') {
              // selectedAnswer contains option text
              answer = question.selectedAnswer;
              printLog(`📝 Using generic checkbox answers (text): ${answer.join(', ')}`);
            } else {
              // selectedAnswer contains indices - convert to option text
              const options = question.options || [];
              answer = question.selectedAnswer.map((index: number) => options[index]).filter(Boolean);
              printLog(`📝 Using generic checkbox answers (indices ${question.selectedAnswer}): ${answer.join(', ')}`);
            }
          } else {
            const options = question.opts || [];
            if (options.length > 0) {
              // Fallback: Select 2 random options, or fewer if not enough are available
              const numToSelect = Math.min(2, options.length);
              const shuffled = options.sort(() => 0.5 - Math.random());
              answer = shuffled.slice(0, numToSelect);
              printLog(`📝 Randomly selected checkbox answers: ${answer.join(', ')}`);
            }
          }
        }

        if (answer !== undefined && answer !== null && question.answerSource !== 'No Answer') {
          const filled = await fillQuestionField(ctx, question.containerSelector, question.type, answer);

          if (filled) {
            printLog(`✅ Question ${i + 1} answered successfully`);
            successCount++;
            qnaResults.push({
              question: question.question,
              type: question.type,
              answer: answer,
              answerSource: question.answerSource,
              status: 'success'
            });
          } else {
            printLog(`⚠️ Failed to fill form field for question ${i + 1}`);
            errorCount++;
            qnaResults.push({
              question: question.question,
              type: question.type,
              answer: answer,
              answerSource: question.answerSource,
              status: 'failed'
            });
          }
        } else {
          printLog(`⏭️ Skipping question ${i + 1} - no answer available`);
          qnaResults.push({
            question: question.question,
            type: question.type,
            answer: null,
            answerSource: 'No Answer',
            status: 'skipped'
          });
        }

        await ctx.driver.sleep(500);
      } catch (error) {
        printLog(`❌ Error answering question ${i + 1}: ${error}`);
        errorCount++;
        qnaResults.push({
          question: question.question,
          type: question.type,
          error: String(error),
          status: 'error'
        });
      }
    }

    const fs = await import('fs');
    const path = await import('path');
    let jobData: any = {};
    if (ctx.currentJobFile) {
      jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));
    }
    const jobId = jobData.jobId || 'unknown';
    const jobDir = path.join(__dirname, '../../jobs', jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(jobDir, 'qna.json'),
      JSON.stringify({ questions: qnaResults, summary: { total: answeredQuestions.length, success: successCount, errors: errorCount } }, null, 2)
    );
    printLog(`💾 QNA saved to qna.json`);

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
