import type { WorkflowContext } from '../../core/workflow_engine';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { By } from 'selenium-webdriver';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printLog = (message: string) => {
  console.log(message);
};

async function createResumeFile(resumeText: string, jobId: string): Promise<string> {
  const jobDir = path.join(__dirname, '../../jobs', jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const txtPath = path.join(jobDir, 'resume.txt');
  const docxPath = path.join(jobDir, 'resume.docx');
  const pdfPath = path.join(jobDir, 'resume.pdf');

  fs.writeFileSync(txtPath, resumeText);
  printLog(`💾 Created: resume.txt`);

  const paragraphs = resumeText.split('\n').map(line =>
    new Paragraph({
      children: [new TextRun(line)]
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  printLog(`💾 Created: resume.docx`);

  const pdfDoc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  pdfDoc.pipe(stream);
  pdfDoc.fontSize(12).text(resumeText, {
    align: 'left'
  });
  pdfDoc.end();

  await new Promise((resolve) => stream.on('finish', resolve));
  printLog(`💾 Created: resume.pdf`);

  return txtPath;
}

async function generateAIResume(ctx: WorkflowContext): Promise<string> {
  let jobData: any = {};
  if (ctx.currentJobFile) {
    jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));
  }

  if (!jobData.title || !jobData.company) {
    throw new Error("No job data available - cannot generate resume");
  }

  const jobId = jobData.jobId || 'unknown';
  printLog("Generating AI resume...");
  printLog(`📝 Job: ${jobData.title} at ${jobData.company}`);

  const resumePath = path.join(process.cwd(), 'src/bots/all-resumes/software_engineer.txt');
  const resumeText = fs.existsSync(resumePath)
    ? fs.readFileSync(resumePath, 'utf8')
    : "Experienced software developer with full stack expertise";

  const requestBody = {
    job_id: jobId,
    job_details: jobData.details || `${jobData.title} at ${jobData.company}`,
    resume_text: resumeText,
    useAi: "deepseek-chat",
    additional_data: `Title: ${jobData.title}\nCompany: ${jobData.company}\nLocation: ${jobData.location || 'N/A'}`
  };

  const jobDir = path.join(__dirname, '../../jobs', jobId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(jobDir, 'resume_request.json'),
    JSON.stringify(requestBody, null, 2)
  );

  const response = await fetch('http://localhost:3000/api/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resume API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  fs.writeFileSync(
    path.join(jobDir, 'resume_response.json'),
    JSON.stringify(data, null, 2)
  );

  if (data.resume) {
    printLog("✅ AI resume generated");
    printLog(`📄 Length: ${data.resume.length} chars`);
    return data.resume;
  } else {
    throw new Error('No resume field returned from API');
  }
}

// Handle Resume Upload/Selection (Choose Documents step)
export async function* handleResumeSelection(ctx: WorkflowContext): AsyncGenerator<string, void, unknown> {
  try {
    printLog("Handling resume with AI generation and upload...");

    // Step 1: Generate AI resume
    printLog("🤖 Generating AI-tailored resume...");
    const resumeText = await generateAIResume(ctx);

    // Step 2: Create resume file
    let jobData: any = {};
    if (ctx.currentJobFile) {
      jobData = JSON.parse(fs.readFileSync(ctx.currentJobFile, 'utf8'));
    }
    const resumeFilePath = await createResumeFile(
      resumeText,
      jobData.jobId || 'unknown'
    );

    // Step 3: Click "Upload a resumé" radio button
    printLog("🔍 Looking for upload resume option...");

    const uploadRadioClicked = await ctx.driver.executeScript(`
      // Find and click the "Upload a resumé" radio button
      const uploadRadio = document.querySelector('input[data-testid="resume-method-upload"][value="upload"]');
      if (uploadRadio) {
        uploadRadio.click();
        uploadRadio.checked = true;
        uploadRadio.dispatchEvent(new Event('change', { bubbles: true }));
        uploadRadio.dispatchEvent(new Event('click', { bubbles: true }));
        console.log('Upload radio button clicked');
        return true;
      }
      return false;
    `);

    if (uploadRadioClicked) {
      printLog("✅ Upload resume option selected");
      await ctx.driver.sleep(1000); // Wait for UI to update

      // Step 4: Upload the file
      printLog("📤 Uploading resume file...");

      try {
        // Find the hidden file input - it should be visible now
        const fileInput = await ctx.driver.findElement(By.css('input[data-testid="file-input"][type="file"]'));

        // Send the absolute file path to the input
        await fileInput.sendKeys(resumeFilePath);
        printLog("✅ Resume file uploaded successfully");

        await ctx.driver.sleep(3000); // Wait for upload to process

        yield "resume_selected";
        return;
      } catch (uploadError) {
        printLog(`⚠️ File upload failed: ${uploadError}`);
        printLog("Falling back to existing resume selection...");
      }
    } else {
      printLog("⚠️ Upload resume radio button not found");
    }

    // Step 4: Fallback - try to select existing resume
    printLog("📋 Checking for existing resume options...");
    const resumeSelected = await ctx.driver.executeScript(`
      const select = document.querySelector('select[data-testid="select-input"]');
      if (select && select.options && select.options.length > 1) {
        for (let i = 1; i < select.options.length; i++) {
          if (select.options[i].value && select.options[i].value !== '') {
            select.value = select.options[i].value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Selected resume:', select.options[i].text);
            return true;
          }
        }
      }
      return false;
    `);

    if (resumeSelected) {
      await ctx.driver.sleep(1000);
      printLog("✅ Selected existing resume from dropdown");
      yield "resume_selected";
      return;
    }

    printLog("ℹ️ No upload option or existing resume found - will skip resume");
    yield "resume_not_required";

  } catch (error) {
    printLog(`💥 Resume handling error: ${error}`);
    if (error instanceof Error) {
      printLog(`💥 Error stack: ${error.stack}`);
    }
    yield "resume_selection_error";
  }
}