# API Updates Applied

## Summary
Updated all three Seek bot API handlers to match the new Corpus RAG API specification from `README-from-corpus-rag.md`.

## Changes Made

### 1. Cover Letter Handler (`src/bots/seek/handlers/cover_letter_handler.ts`)
- ✅ Added `platform: "seek"`
- ✅ Added `platform_job_id: jobId`
- ✅ Added `job_title` and `company` fields
- ✅ Added custom `prompt` for better AI results
- ✅ Changed `job_id` format to `seek_${jobId}`
- ✅ Switched to authenticated API client
- ✅ Removed unused `extractJobInfo` function

### 2. Resume Handler (`src/bots/seek/handlers/resume_handler.ts`)
- ✅ Added `platform: "seek"`
- ✅ Added `platform_job_id: jobId`
- ✅ Added `job_title` and `company` fields
- ✅ Added custom `prompt` for ATS optimization
- ✅ Changed `job_id` format to `seek_${jobId}`
- ✅ Switched to authenticated API client

### 3. Q&A Handler (`src/bots/seek/handlers/intelligent_qa_handler.ts`)
- ✅ Added `platform: "seek"`
- ✅ Added `platform_job_id: jobId`
- ✅ Added `job_title` and `company` fields
- ✅ Added custom `prompt` for professional answers
- ✅ Changed `job_id` format to `seek_${jobId}`
- ✅ Switched to authenticated API client

### 4. New API Client (`src/bots/core/api_client.ts`)
Created centralized API client with:
- ✅ Authentication token management
- ✅ Token caching in `.cache/api_token.txt`
- ✅ Automatic token validation
- ✅ Graceful fallback when no token available
- ✅ Helper functions: `apiRequest()`, `saveSessionToken()`, `clearSessionToken()`

## API Request Format (Before vs After)

### Before
```javascript
{
  job_id: "87057769",
  job_details: "...",
  resume_text: "...",
  useAi: "deepseek-chat",
  additional_data: "..."
}
```

### After
```javascript
{
  job_id: "seek_87057769",           // ✨ Prefixed with platform
  job_details: "...",
  resume_text: "...",
  useAi: "deepseek-chat",

  // ✨ NEW: Required tracking fields
  platform: "seek",
  platform_job_id: "87057769",
  job_title: "Senior Software Engineer",
  company: "Acme Corporation",

  // ✨ NEW: Custom prompt for better AI
  prompt: "Write a compelling, professional cover letter..."
}
```

## Benefits

### Better Tracking
- Jobs are now properly organized by platform in MongoDB
- Unique identification via `userId + platform + platformJobId`
- Complete application history per platform

### Better AI Results
- Custom prompts guide AI to generate more relevant content
- Cover letters are more personalized
- Resumes are ATS-optimized
- Q&A answers are professional and honest

### Better Organization
- All API calls tracked in job_applications collection
- Complete audit trail with:
  - Request/response data
  - AI tokens used and costs
  - Processing times
  - Automation logs

### Admin Visibility
Via the Job Tracking UI (`/jobs`), you can now:
- View all jobs by platform (Seek/LinkedIn/Indeed)
- See all generated content per job
- Review API call history with costs
- Monitor automation success rates

## Authentication Setup

### Current Status
- API calls will work **without authentication** (if your backend allows it)
- Ready for authentication when you need it

### To Enable Authentication (Optional)

#### Option 1: Manual Token
If you have a session token:
```bash
# Create cache directory
mkdir -p .cache

# Add your token
echo "your-session-token-here" > .cache/api_token.txt
```

#### Option 2: Environment Variable (Future)
Add to `.env`:
```bash
SESSION_TOKEN=your-token-here
```

Then update `api_client.ts` to check `process.env.SESSION_TOKEN` first.

#### Option 3: Google OAuth Login (Full Implementation)
Would need to implement Google OAuth login flow in the bot to get tokens automatically.

## Testing

Run your Seek bot as usual:
```bash
bun src/bots/bot_starter.ts seek
```

Or test mode:
```bash
bun src/bots/bot_starter.ts seek quicktest
```

## What to Check

1. **API Requests**: Check `src/bots/jobs/{jobId}/*_request.json` files
   - Should contain new fields: `platform`, `platform_job_id`, `job_title`, `company`, `prompt`

2. **API Responses**: Check `src/bots/jobs/{jobId}/*_response.json` files
   - Should contain generated content

3. **Backend Database**: Check your MongoDB collections
   - `jobs`: Should have entries with `platform: "seek"` and `platformJobId`
   - `job_applications`: Should have complete tracking data

4. **Admin UI**: Visit `http://localhost:3000/jobs`
   - Should show Seek jobs organized by platform
   - Click to expand and see all generated content

## Troubleshooting

### If API calls fail with 401 Unauthorized
Your backend requires authentication. Follow "Authentication Setup" above.

### If API calls fail with 400 Bad Request
Check the error message - might be missing required fields in your backend API.

### If generated content seems generic
Check the `prompt` field in request JSON files - make sure it's being sent to the API.

## Next Steps

### For LinkedIn and Indeed
When you implement LinkedIn and Indeed bots:
1. Copy the same pattern from Seek handlers
2. Change `platform: "linkedin"` or `platform: "indeed"`
3. Use platform-specific job IDs in `platform_job_id`
4. Reuse the same `api_client.ts` helper

### For Better AI Results
Experiment with different prompts in each handler to improve:
- Cover letter tone and personalization
- Resume keyword optimization
- Q&A answer quality
