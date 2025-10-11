import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
	try {
		const jobsDir = join(process.cwd(), 'src/bots/jobs');
		const entries = await readdir(jobsDir, { withFileTypes: true });

		const jobDirs = entries
			.filter(entry => entry.isDirectory())
			.map(entry => entry.name)
			.filter(name => /^\d+$/.test(name)); // Only numeric folder names (job IDs)

		const jobs = jobDirs.map(id => ({
			id,
			title: `Job ${id}`
		}));

		return json(jobs);
	} catch (error) {
		console.error('Error loading jobs:', error);
		return json([]);
	}
}
