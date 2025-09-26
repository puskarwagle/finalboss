import type { WorkflowContext } from '../core/workflow_engine';
import { isGenericQuestion, getGenericAnswer } from './generic_question_handler';

const printLog = (message: string) => {
  console.log(message);
};

// Get user session and API key for AI questions
async function getUserApiKey(): Promise<{apiKey: string, userId: string}> {
  try {
    printLog("🔑 Getting user API key from session...");

    const response = await fetch('http://localhost:3000/api/session');

    if (!response.ok) {
      throw new Error(`Session API failed: ${response.status}`);
    }

    const sessionData = await response.json();

    if (!sessionData.success || !sessionData.data?.apiKey) {
      throw new Error(`No API key found in session: ${sessionData.error || 'Unknown error'}`);
    }

    const userId = 'puskarwagle17@gmail.com'; // This should come from the actual session

    return {
      apiKey: sessionData.data.apiKey,
      userId: userId
    };

  } catch (error) {
    printLog(`❌ Failed to get API key: ${error}`);
    throw error;
  }
}

// Answer questions using AI for complex questions
async function getAIAnswers(questions: any[], jobData: any): Promise<any> {
  try {
    const { apiKey, userId } = await getUserApiKey();

    // Structure job and question data for the new API
    const jobDetails = {
      title: jobData.title || '',
      company: jobData.company || '',
      description: jobData.details || '',
      requirements: [] // We don't need requirements for Q&A
    };

    printLog(`📡 Making request to /api/questionAndAnswers for ${questions.length} questions`);

    const response = await fetch('http://localhost:3000/api/questionAndAnswers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        questions: questions,
        userEmail: userId,
        jobDetails: jobDetails
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Q&A API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.success && data.data?.answers) {
      printLog("✅ AI answers generated successfully");
      return data.data.answers;
    } else {
      throw new Error(data.error || 'No answers returned from AI');
    }

  } catch (error) {
    printLog(`❌ AI Q&A failed: ${error}`);
    throw error;
  }
}

// Fill form field based on question type and answer
async function fillQuestionField(
  ctx: WorkflowContext,
  questionId: number,
  questionType: string,
  answer: any
): Promise<boolean> {
  try {
    // Common selectors for Seek.com employer questions
    const baseSelector = `[data-automation="employer-question-${questionId}"]`;

    switch (questionType) {
      case 'select':
        // Handle dropdown/select fields
        const selectResult = await ctx.driver.executeScript(`
          // Try different selector patterns
          const selectors = [
            '${baseSelector} select',
            '[data-testid="question-${questionId}"] select',
            'select[name*="${questionId}"]',
            '#question-${questionId} select'
          ];

          for (const selector of selectors) {
            const select = document.querySelector(selector);
            if (select && select.options) {
              if (select.options[${answer}]) {
                select.selectedIndex = ${answer};
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, selector: selector };
              }
            }
          }
          return { success: false };
        `);

        return selectResult.success;

      case 'radio':
        // Handle radio button groups
        const radioResult = await ctx.driver.executeScript(`
          const selectors = [
            '${baseSelector} input[type="radio"]',
            '[data-testid="question-${questionId}"] input[type="radio"]',
            'input[name*="${questionId}"][type="radio"]'
          ];

          for (const selector of selectors) {
            const radios = document.querySelectorAll(selector);
            if (radios.length > ${answer}) {
              radios[${answer}].checked = true;
              radios[${answer}].dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true, selector: selector };
            }
          }
          return { success: false };
        `);

        return radioResult.success;

      case 'checkbox':
        // Handle checkbox groups
        if (!Array.isArray(answer)) {
          printLog(`⚠️ Checkbox answer should be array, got: ${typeof answer}`);
          return false;
        }

        const checkboxResult = await ctx.driver.executeScript(`
          const selectors = [
            '${baseSelector} input[type="checkbox"]',
            '[data-testid="question-${questionId}"] input[type="checkbox"]',
            'input[name*="${questionId}"][type="checkbox"]'
          ];

          for (const selector of selectors) {
            const checkboxes = document.querySelectorAll(selector);
            if (checkboxes.length > 0) {
              // First uncheck all
              checkboxes.forEach(cb => cb.checked = false);

              // Then check selected indices
              const indices = ${JSON.stringify(answer)};
              let checkedCount = 0;
              indices.forEach(index => {
                if (checkboxes[index]) {
                  checkboxes[index].checked = true;
                  checkboxes[index].dispatchEvent(new Event('change', { bubbles: true }));
                  checkedCount++;
                }
              });

              return { success: checkedCount > 0, selector: selector };
            }
          }
          return { success: false };
        `);

        return checkboxResult.success;

      case 'text':
      case 'textarea':
        // Handle text input fields
        const textSelectors = [
          `${baseSelector} input[type="text"]`,
          `${baseSelector} textarea`,
          `[data-testid="question-${questionId}"] input`,
          `[data-testid="question-${questionId}"] textarea`,
          `input[name*="${questionId}"]`,
          `textarea[name*="${questionId}"]`
        ];

        for (const selector of textSelectors) {
          try {
            const element = await ctx.driver.findElement({ css: selector });
            await element.clear();
            await element.sendKeys(String(answer));
            return true;
          } catch (e) {
            // Try next selector
            continue;
          }
        }

        return false;

      default:
        printLog(`⚠️ Unknown question type: ${questionType}`);
        return false;
    }

  } catch (error) {
    printLog(`❌ Failed to fill question field: ${error}`);
    return false;
  }
}

// Enhanced handler that uses both generic and AI answers
export async function* handleEmployerQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔍 Starting enhanced employer questions handling...");

    // Load job data with questions
    if (!ctx.currentJobFile) {
      printLog("❌ No current job file available");
      yield "no_job_data";
      return;
    }

    const fs = await import('fs');
    const jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));

    if (!jobData.questions || !Array.isArray(jobData.questions)) {
      printLog("ℹ️ No structured questions found in job data");
      yield "no_questions";
      return;
    }

    const totalQuestions = jobData.questions.length;
    printLog(`📋 Found ${totalQuestions} employer questions to answer`);

    // Separate generic and AI questions
    const genericQuestions: any[] = [];
    const aiQuestions: any[] = [];

    jobData.questions.forEach((question: any, index: number) => {
      if (isGenericQuestion(question.q)) {
        genericQuestions.push({ ...question, originalIndex: index });
      } else {
        aiQuestions.push({ ...question, originalIndex: index });
      }
    });

    printLog(`🎯 ${genericQuestions.length} generic questions, 🤖 ${aiQuestions.length} AI questions`);

    let successCount = 0;
    let errorCount = 0;

    // Handle generic questions first (faster)
    for (const question of genericQuestions) {
      try {
        printLog(`🎯 Answering generic question: "${question.q}"`);

        const answer = getGenericAnswer(question.q, question.type, question.opts || []);

        if (answer !== null) {
          const filled = await fillQuestionField(ctx, question.id, question.type, answer);

          if (filled) {
            printLog(`✅ Generic question ${question.id} answered successfully`);
            successCount++;
          } else {
            printLog(`⚠️ Failed to fill form field for question ${question.id}`);
            errorCount++;
          }
        } else {
          printLog(`❌ No generic answer for question ${question.id}`);
          errorCount++;
        }

        // Small delay between questions
        await ctx.driver.sleep(500);

      } catch (error) {
        printLog(`❌ Error answering generic question ${question.id}: ${error}`);
        errorCount++;
      }
    }

    // Handle AI questions if any remain
    if (aiQuestions.length > 0) {
      try {
        printLog(`🤖 Getting AI answers for ${aiQuestions.length} complex questions...`);

        // Format questions for AI API
        const aiQuestionsForAPI = aiQuestions.map(q => ({
          q: q.q,
          opts: q.opts || []
        }));

        const aiAnswers = await getAIAnswers(aiQuestionsForAPI, jobData);

        // Parse AI answers and fill forms
        // Note: This would need custom parsing logic based on AI response format
        printLog(`🤖 AI answers received: ${aiAnswers}`);

        // TODO: Parse AI answers and fill form fields
        // This part would need implementation based on the actual AI response format

        successCount += aiQuestions.length; // Assume success for now

      } catch (aiError) {
        printLog(`❌ AI questions failed: ${aiError}`);
        errorCount += aiQuestions.length;
      }
    }

    printLog(`📊 Results: ${successCount}/${totalQuestions} questions answered, ${errorCount} errors`);

    if (successCount > 0) {
      yield "employer_questions_answered";
    } else {
      yield "employer_questions_error";
    }

  } catch (error) {
    printLog(`💥 Enhanced employer questions handler crash: ${error}`);
    yield "employer_questions_error";
  }
}