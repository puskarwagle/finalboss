import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
  try {
    // params.path will be something like "4316675164/job_details.json"
    const filePath = params.path;
    const linkedinJobsPath = path.join(process.cwd(), 'jobs', 'linkedinjobs');
    const jobPath = path.join(linkedinJobsPath, filePath);

    console.log('📂 Looking for job file:', jobPath);

    if (!fs.existsSync(jobPath)) {
      console.error('❌ Job file not found:', jobPath);
      return json({
        success: false,
        error: `Job file not found: ${filePath}`
      }, { status: 404 });
    }

    const jobData = JSON.parse(fs.readFileSync(jobPath, 'utf-8'));
    console.log('✅ Job data loaded:', jobData.job_id || 'unknown');

    return json({
      success: true,
      data: {
        content: jobData
      }
    });
  } catch (error) {
    console.error('❌ Error loading job details:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
