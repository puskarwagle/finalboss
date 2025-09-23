import type { WorkflowContext } from '../core/workflow_engine';

const printLog = (message: string) => {
  console.log(message);
};

// Handle Resume Selection (Choose Documents step)
export async function* handleResumeSelection(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Handling resume selection...");

    const resumeHandled = await ctx.driver.executeScript(`
      // Try to find and select the first available resume
      const resumeSelectors = [
        'select[data-testid="select-input"]',
        'select[placeholder*="resumé"]',
        'select[placeholder*="resume"]',
        'select'
      ];

      for (const selector of resumeSelectors) {
        const select = document.querySelector(selector);
        if (select && select.options && select.options.length > 1) {
          // Find first non-empty option
          for (let i = 1; i < select.options.length; i++) {
            if (select.options[i].value && select.options[i].value !== '') {
              select.value = select.options[i].value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('Selected resume:', select.options[i].text);
              return true;
            }
          }
        }
      }

      // Try to click resume method change radio button if select not found
      const methodChange = document.querySelector('input[data-testid="resume-method-change"][value="change"]');
      if (methodChange && !methodChange.checked) {
        methodChange.click();

        // Wait a bit and try select again
        setTimeout(() => {
          const select = document.querySelector('select[data-testid="select-input"]');
          if (select && select.options && select.options.length > 1) {
            for (let i = 1; i < select.options.length; i++) {
              if (select.options[i].value && select.options[i].value !== '') {
                select.value = select.options[i].value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Selected resume after method change:', select.options[i].text);
                return true;
              }
            }
          }
        }, 1000);

        return true;
      }

      return false;
    `);

    if (resumeHandled) {
      await ctx.driver.sleep(1000); // Give time for any UI updates
      printLog("Resume selection handled");
      yield "resume_selected";
    } else {
      printLog("No resume options found or already selected");
      yield "resume_not_required";
    }

  } catch (error) {
    printLog(`Resume selection error: ${error}`);
    yield "resume_selection_error";
  }
}