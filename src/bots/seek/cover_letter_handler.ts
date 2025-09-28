import type { WorkflowContext } from '../core/workflow_engine';
import { API_URLS, createAuthHeaders } from '../../lib/api-config.js';

const printLog = (message: string) => {
  console.log(message);
};

// Get user session and API key
async function getUserApiKey(): Promise<{apiKey: string, userId: string}> {
  try {
    printLog("🔑 Getting user API key from session...");

    const sessionUrl = API_URLS.SESSION();
    const response = await fetch(sessionUrl);

    if (!response.ok) {
      throw new Error(`Session API failed: ${response.status}`);
    }

    const sessionData = await response.json();
    printLog(`🔑 Session response: ${JSON.stringify(sessionData, null, 2)}`);

    if (!sessionData.success || !sessionData.data?.apiKey) {
      throw new Error(`No API key found in session: ${sessionData.error || 'Unknown error'}`);
    }

    // Extract user email from the authenticated session
    const userId = sessionData.data.user?.email;
    if (!userId) {
      throw new Error('No user email found in session data');
    }

    return {
      apiKey: sessionData.data.apiKey,
      userId: userId
    };

  } catch (error) {
    printLog(`❌ Failed to get API key: ${error}`);
    throw error;
  }
}

// Extract categorized information from job details
interface JobInfo {
  requirements: string[];
  description: string;
  responsibilities: string;
  benefits: string;
}

function extractJobInfo(details: string): JobInfo {
  const requirements: string[] = [];
  let description = '';
  let responsibilities = '';
  let benefits = '';

  // Common tech keywords to look for
  const techKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
    'Angular', 'Vue', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'SQL',
    'MongoDB', 'PostgreSQL', 'Express', 'API', 'REST', 'GraphQL', 'DevOps',
    'CI/CD', 'Spring Boot', 'Microservices', 'Agile', 'Scrum', 'Redis', 'Kafka',
    'Terraform', 'Jenkins', 'Helm', 'Elasticsearch', 'RabbitMQ', 'Selenium'
  ];

  // Find mentioned technologies
  techKeywords.forEach(tech => {
    if (details.toLowerCase().includes(tech.toLowerCase())) {
      requirements.push(tech);
    }
  });

  // Extract sections based on common patterns
  const lines = details.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    // Identify section headers
    if (lowerLine.includes('what you\'ll do') || lowerLine.includes('responsibilities') ||
        lowerLine.includes('key duties') || lowerLine.includes('your role')) {
      currentSection = 'responsibilities';
    } else if (lowerLine.includes('about you') || lowerLine.includes('what you\'ll bring') ||
               lowerLine.includes('requirements') || lowerLine.includes('skills') ||
               lowerLine.includes('experience')) {
      currentSection = 'requirements';
    } else if (lowerLine.includes('what you\'ll enjoy') || lowerLine.includes('benefits') ||
               lowerLine.includes('perks') || lowerLine.includes('we offer')) {
      currentSection = 'benefits';
    } else if (lowerLine.includes('about the role') || lowerLine.includes('opportunity') ||
               lowerLine.includes('position')) {
      currentSection = 'description';
    }

    // Add content to appropriate section
    if (currentSection && line.trim() && !lowerLine.includes('what you\'ll') &&
        !lowerLine.includes('about you') && !lowerLine.includes('benefits') &&
        !lowerLine.includes('requirements')) {
      switch (currentSection) {
        case 'responsibilities':
          responsibilities += line + '\n';
          break;
        case 'benefits':
          benefits += line + '\n';
          break;
        case 'description':
          description += line + '\n';
          break;
      }
    }
  }

  // If no structured sections found, use first part as description
  if (!description && !responsibilities) {
    const paragraphs = details.split('\n\n');
    description = paragraphs.slice(0, 3).join('\n\n'); // First 3 paragraphs
  }

  return {
    requirements: [...new Set(requirements)], // Remove duplicates
    description: description.trim(),
    responsibilities: responsibilities.trim(),
    benefits: benefits.trim()
  };
}

// Generate AI-powered cover letter using the new /api/cover_letter endpoint
async function generateAICoverLetter(ctx: WorkflowContext): Promise<string> {
  const fs = await import('fs');

  // Read job data from the current job file
  let jobData: any = {};
  if (ctx.currentJobFile) {
    jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));
  }

  if (!jobData.title || !jobData.company) {
    throw new Error("No job data available - cannot generate cover letter");
  }

  // Extract structured information from job details
  const jobInfo = extractJobInfo(jobData.details || '');

  // Structure job details for the new API
  const jobDetails = {
    title: jobData.title || '',
    company: jobData.company || '',
    description: jobInfo.description || jobData.details || '',
    requirements: jobInfo.requirements
  };

  printLog("Generating AI cover letter using new /api/cover_letter endpoint...");
  printLog(`📝 Job: ${jobDetails.title} at ${jobDetails.company}`);
  printLog(`🔧 Requirements found: ${jobDetails.requirements.join(', ')}`);

  // Get user's API key and ID
  const { apiKey, userId } = await getUserApiKey();

  const coverLetterUrl = API_URLS.COVER_LETTER();
  printLog(`📡 Making authenticated API request to: ${coverLetterUrl}`);
  printLog(`👤 Using userEmail: ${userId}`);

  const response = await fetch(coverLetterUrl, {
    method: 'POST',
    headers: createAuthHeaders(apiKey),
    body: JSON.stringify({
      jobDetails: jobDetails,
      userEmail: userId
    })
  });

  printLog(`📡 API Response Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    printLog(`❌ API Error Response Body: ${errorText}`);
    throw new Error(`Cover Letter API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  printLog(`📡 API Response Data Structure: ${JSON.stringify(data, null, 2)}`);

  if (data.success && data.data?.coverLetter) {
    printLog("✅ AI cover letter generated successfully");
    printLog(`📄 Cover letter length: ${data.data.coverLetter.length} chars`);
    return data.data.coverLetter;
  } else {
    printLog(`❌ Cover Letter API returned unsuccessful response:`);
    printLog(`   - Success: ${data.success}`);
    printLog(`   - Error: ${data.error || 'No error message'}`);
    printLog(`   - Data: ${JSON.stringify(data.data)}`);
    throw new Error(data.error || 'No cover letter returned from API');
  }
}

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
      printLog("🔍 Step 1: Finding textarea element...");
      const textarea = await ctx.driver.findElement({ css: 'textarea[data-testid="coverLetterTextInput"]' });
      printLog("✅ Step 1: Textarea found successfully");

      // Clear any existing content
      printLog("🔍 Step 2: Clearing existing content...");
      await textarea.clear();
      printLog("✅ Step 2: Content cleared successfully");

      // Generate AI-powered cover letter based on job description
      printLog("🔍 Step 3: Generating AI cover letter - this MUST succeed, no fallbacks!");
      const coverLetterText = await generateAICoverLetter(ctx);
      printLog("✅ Step 3: AI cover letter generated successfully");

      if (!coverLetterText || coverLetterText.trim().length < 50) {
        throw new Error(`Generated cover letter is too short: ${coverLetterText?.length || 0} chars`);
      }

      // Use sendKeys to simulate human typing - this triggers proper events
      printLog("🔍 Step 4: Typing AI-generated cover letter text using sendKeys...");
      await textarea.sendKeys(coverLetterText);
      printLog("✅ Step 4: Text typed successfully");

      // Give it a moment to process
      printLog("🔍 Step 5: Waiting for form processing...");
      await ctx.driver.sleep(1000);
      printLog("✅ Step 5: Processing wait complete");

      // Verify the content was set
      printLog("🔍 Step 6: Verifying content was set and checking validation...");
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

          // Debug validation logic
          const successCondition = valueLength > 0 && !textareaInvalid && !textareaRequired;
          console.log('SendKeys result - Length:', valueLength, 'Errors:', hasErrors, 'TextareaInvalid:', textareaInvalid, 'Required:', textareaRequired);
          console.log('Success calculation: valueLength > 0:', valueLength > 0, '!textareaInvalid:', !textareaInvalid, '!textareaRequired:', !textareaRequired);
          console.log('Final success result:', successCondition);

          return {
            success: successCondition,
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
      throw new Error(`Both AI generation and form filling failed: ${seleniumError}`);
    }

    printLog("🔍 Step 7: Evaluating final result...");
    printLog(`🔍 Step 7 DEBUG: textareaResult.success = ${textareaResult.success}`);
    printLog(`🔍 Step 7 DEBUG: Full textareaResult = ${JSON.stringify(textareaResult, null, 2)}`);

    if (textareaResult.success) {
      printLog(`✅ Step 7: SUCCESS! Cover letter filled - Length: ${textareaResult.length}, Value: ${textareaResult.actualValue}`);
      if (textareaResult.hasErrors) {
        printLog(`⚠️ VALIDATION WARNINGS: ${textareaResult.errorMessages.join(', ')}`);
      }
      printLog("🎉 YIELDING: cover_letter_filled");
      yield "cover_letter_filled";
    } else {
      printLog(`❌ Step 7: FAILURE! Cover letter filling failed: ${textareaResult.error || 'Unknown error'}`);
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
      printLog("💥 YIELDING: cover_letter_error");
      yield "cover_letter_error";
    }

  } catch (error) {
    printLog(`💥 COVER LETTER HANDLER CRASH: ${error}`);
    if (error instanceof Error) {
      printLog(`💥 Error stack: ${error.stack}`);
    }
    printLog(`🛑 STAYING PUT FOR MANUAL INSPECTION - Cover letter handler failed`);
    yield "cover_letter_error";
  }
}