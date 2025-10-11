import { json, error } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET({ params }) {
	const { jobId } = params;

	try {
		// First try to find main JSON in root jobs directory
		const rootJobsDir = join(process.cwd(), 'src/bots/jobs');
		const rootFiles = await readdir(rootJobsDir);
		const mainJsonInRoot = rootFiles.find(f => f.endsWith(`_${jobId}.json`));

		let jobInfo = null;
		let resumeText = 'Sample resume text';

		if (mainJsonInRoot) {
			// Load from root directory
			const jobJsonPath = join(rootJobsDir, mainJsonInRoot);
			const jobJsonContent = await readFile(jobJsonPath, 'utf-8');
			jobInfo = JSON.parse(jobJsonContent);
		} else {
			// Try subdirectory
			const jobDir = join(rootJobsDir, jobId);
			const files = await readdir(jobDir);

			// Look for cover_letter_request.json as fallback
			const requestFile = files.find(f => f === 'cover_letter_request.json' || f === 'resume_request.json');

			if (requestFile) {
				const requestPath = join(jobDir, requestFile);
				const requestContent = await readFile(requestPath, 'utf-8');
				const requestData = JSON.parse(requestContent);

				jobInfo = {
					title: requestData.additional_data?.split('Title: ')[1]?.split('\n')[0] || 'Unknown',
					company: requestData.additional_data?.split('Company: ')[1]?.split('\n')[0] || 'Unknown',
					details: requestData.job_details || '',
					questions: []
				};
				resumeText = requestData.resume_text || 'Sample resume text';
			}

			// Try to load resume.txt
			try {
				const resumePath = join(jobDir, 'resume.txt');
				resumeText = await readFile(resumePath, 'utf-8');
			} catch (e) {
				// Keep default
			}
		}

		if (!jobInfo) {
			throw error(404, 'Job data not found');
		}

		// Build the job data structure for the API
		const jobData = {
			job_id: jobId,
			job_title: jobInfo.title || jobInfo.raw_title || 'Unknown Title',
			company: jobInfo.company || 'Unknown Company',
			job_details: jobInfo.details || jobInfo.description || '',
			resume_text: resumeText,
			questions: jobInfo.questions || []
		};

		return json(jobData);
	} catch (err) {
		console.error('Error loading job:', err);
		throw error(500, `Failed to load job ${jobId}: ${err.message}`);
	}
}
