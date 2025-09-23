import type { WorkflowContext } from '../core/workflow_engine';

const printLog = (message: string) => {
  console.log(message);
};

// Handle Cover Letter (part of Choose Documents step) - Improved from Python version
export async function* handleCoverLetter(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Handling cover letter...");

    // Step 1: Click cover letter radio button (improved from Python version)
    const radioClicked = await ctx.driver.executeScript(`
      const coverLetterRadio = document.querySelector('input[data-testid="coverLetter-method-change"]');
      if (coverLetterRadio && !coverLetterRadio.checked) {
        // Use improved click strategy from Python
        coverLetterRadio.click();
        coverLetterRadio.checked = true;

        // Dispatch change event
        const changeEvent = new Event('change', { bubbles: true });
        coverLetterRadio.dispatchEvent(changeEvent);

        // Dispatch click event
        const clickEvent = new Event('click', { bubbles: true });
        coverLetterRadio.dispatchEvent(clickEvent);

        console.log('Cover letter radio clicked successfully');
        return true;
      }
      return false;
    `);

    if (!radioClicked) {
      printLog("Cover letter radio not found or already selected");
      yield "cover_letter_not_required";
      return;
    }

    printLog("Cover letter radio clicked successfully");

    // Step 2: Wait for textarea to appear (outside executeScript like Python)
    await ctx.driver.sleep(1000);

    // Step 3: Use Selenium's sendKeys for human-like typing instead of executeScript
    await ctx.driver.sleep(500); // Let radio button change settle

    let textareaResult;

    try {
      const textarea = await ctx.driver.findElement({ css: 'textarea[data-testid="coverLetterTextInput"]' });

      // Clear any existing content
      await textarea.clear();

      const coverLetterText = "Dear Hiring Manager,\n\nI am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.\n\nI am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.\n\nThank you for your consideration.\n\nBest regards";

      // Use sendKeys to simulate human typing - this triggers proper events
      printLog("Typing cover letter text using sendKeys...");
      await textarea.sendKeys(coverLetterText);

      // Give it a moment to process
      await ctx.driver.sleep(1000);

      // Verify the content was set
      textareaResult = await ctx.driver.executeScript(`
        const textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]');
        if (textarea) {
          const finalValue = textarea.value;
          const valueLength = finalValue.length;

          // Check for validation errors
          const errorElements = document.querySelectorAll('[role="alert"], .error, .invalid, [aria-invalid="true"]');
          const hasErrors = errorElements.length > 0;
          const errorMessages = Array.from(errorElements).map(el => el.textContent.trim()).filter(txt => txt);

          // Check textarea validation state
          const textareaInvalid = textarea.getAttribute('aria-invalid') === 'true';
          const textareaRequired = textarea.hasAttribute('required') && finalValue.length === 0;

          console.log('SendKeys result - Length:', valueLength, 'Errors:', hasErrors, 'TextareaInvalid:', textareaInvalid, 'Required:', textareaRequired);

          return {
            success: valueLength > 0 && !textareaInvalid && !textareaRequired,
            length: valueLength,
            hasErrors: hasErrors || textareaInvalid || textareaRequired,
            errorMessages: errorMessages,
            actualValue: finalValue.substring(0, 50) + '...',
            textareaInvalid: textareaInvalid,
            textareaRequired: textareaRequired
          };
        }
        return { success: false, error: 'textarea_not_found' };
      `);

    } catch (seleniumError) {
      printLog(`❌ Selenium sendKeys failed: ${seleniumError}`);
      // Fallback to JavaScript method
      textareaResult = await ctx.driver.executeScript(`
        const textarea = document.querySelector('textarea[data-testid="coverLetterTextInput"]');
        if (textarea) {
          const defaultText = "Dear Hiring Manager,\\n\\nI am writing to express my interest in this position. Based on my experience and skills outlined in my resume, I believe I would be a valuable addition to your team.\\n\\nI am excited about the opportunity to contribute to your organization and look forward to discussing how my background aligns with your needs.\\n\\nThank you for your consideration.\\n\\nBest regards";

          textarea.focus();
          textarea.value = defaultText;

          // Dispatch events
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));

          const finalValue = textarea.value;
          return {
            success: finalValue.length > 0,
            length: finalValue.length,
            actualValue: finalValue.substring(0, 50) + '...',
            hasErrors: false,
            errorMessages: []
          };
        }
        return { success: false, error: 'textarea_not_found' };
      `);
    }

    if (textareaResult.success) {
      printLog(`✅ Cover letter filled - Length: ${textareaResult.length}, Value: ${textareaResult.actualValue}`);
      if (textareaResult.hasErrors) {
        printLog(`⚠️ VALIDATION WARNINGS: ${textareaResult.errorMessages.join(', ')}`);
      }
      yield "cover_letter_filled";
    } else {
      printLog(`❌ Cover letter filling failed: ${textareaResult.error || 'Unknown error'}`);
      if (textareaResult.errorMessages && textareaResult.errorMessages.length > 0) {
        printLog(`🔥 Error messages: ${textareaResult.errorMessages.join(', ')}`);
      }
      if (textareaResult.textareaInvalid) {
        printLog(`🔥 Textarea marked as invalid (aria-invalid="true")`);
      }
      if (textareaResult.textareaRequired) {
        printLog(`🔥 Textarea is required but empty`);
      }
      printLog(`📋 Length: ${textareaResult.length}, Invalid: ${textareaResult.textareaInvalid}, Required: ${textareaResult.textareaRequired}`);
      yield "cover_letter_error";
    }

  } catch (error) {
    printLog(`Cover letter error: ${error}`);
    yield "cover_letter_error";
  }
}