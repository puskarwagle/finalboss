import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const linkedinJobsPath = path.join(process.cwd(), 'jobs', 'linkedinjobs');

    if (!fs.existsSync(linkedinJobsPath)) {
      return json({
        success: false,
        error: 'LinkedIn jobs directory not found'
      });
    }

    const jobDirs = fs.readdirSync(linkedinJobsPath);
    const jobs = [];

    for (const jobDir of jobDirs) {
      const jobDetailsPath = path.join(linkedinJobsPath, jobDir, 'job_details.json');

      if (fs.existsSync(jobDetailsPath)) {
        try {
          const jobData = JSON.parse(fs.readFileSync(jobDetailsPath, 'utf-8'));
          jobs.push({
            filename: `${jobDir}/job_details.json`,
            company: jobData.company || 'Unknown',
            title: jobData.title || 'No title',
            location: jobData.location || '',
            jobId: jobData.job_id,
            hasJobDetails: !!jobData.description,
            size: Buffer.byteLength(JSON.stringify(jobData))
          });
        } catch (err) {
          console.error(`Failed to parse job ${jobDir}:`, err);
        }
      }
    }

    return json({
      success: true,
      data: {
        jobs: jobs
      }
    });
  } catch (error) {
    console.error('Error loading jobs:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
