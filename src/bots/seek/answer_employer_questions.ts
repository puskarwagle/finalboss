import type { WorkflowContext } from '../core/workflow_engine';
import { isGenericQuestion, getGenericAnswer } from './generic_question_handler';

const printLog = (message: string) => {
  console.log(message);
};

// Refactored to use the robust containerSelector from the extraction step
async function fillQuestionField(
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
          if (!container) return { success: false, error: 'Container not found' };

          const select = container.querySelector('select');
          const answerIndex = arguments[1];

          if (select && select.options && select.options[answerIndex]) {
            select.selectedIndex = answerIndex;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true };
          }
          return { success: false, error: 'Select element or option not found' };
        `, containerSelector, answer);

        if (!selectResult.success) {
          printLog(`Failed to fill select: ${selectResult.error}`);
        }
        return selectResult.success;

      // Cases for radio, checkbox, etc. would be updated similarly

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
export async function* answerEmployerQuestions(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("🔍 Starting enhanced employer questions handling...");

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

    const genericQuestions = jobData.questions.filter((q: any) => isGenericQuestion(q.q));
    const aiQuestions = jobData.questions.filter((q: any) => !isGenericQuestion(q.q));

    printLog(`🎯 ${genericQuestions.length} generic questions, 🤖 ${aiQuestions.length} AI questions`);

    let successCount = 0;
    let errorCount = 0;

    for (const question of genericQuestions) {
      try {
        printLog(`🎯 Answering generic question: "${question.q}"`);
        const answer = getGenericAnswer(question.q, question.type, question.opts || []);

        if (answer !== null) {
          // Pass the robust containerSelector to the filling function
          const filled = await fillQuestionField(ctx, question.containerSelector, question.type, answer);

          if (filled) {
            printLog(`✅ Generic question answered successfully`);
            successCount++;
          } else {
            printLog(`⚠️ Failed to fill form field for question: "${question.q}"`);
            errorCount++;
          }
        } else {
          printLog(`❌ No generic answer for question: "${question.q}"`);
          errorCount++;
        }
        await ctx.driver.sleep(500);
      } catch (error) {
        printLog(`❌ Error answering generic question: ${error}`);
        errorCount++;
      }
    }

    // AI question handling would follow a similar pattern

    printLog(`📊 Results: ${successCount}/${totalQuestions} questions answered, ${errorCount} errors`);

    if (errorCount === 0 && totalQuestions > 0) {
      yield "employer_questions_saved";
    } else if (totalQuestions === 0) {
      yield "no_questions";
    } else {
      yield "employer_questions_error";
    }

  } catch (error) {
    printLog(`💥 Enhanced employer questions handler crash: ${error}`);
    yield "employer_questions_error";
  }
}