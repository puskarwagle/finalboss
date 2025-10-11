# Corpus RAG API Documentation

**Base URL**: `https://your-domain.com` or `http://localhost:5173` (development)

## Overview

This API provides AI-powered job application assistance including cover letter generation, resume tailoring, and question answering. All endpoints require authentication via Bearer token.

---

## Authentication

### 1. Login (Google OAuth)

**Endpoint**: `POST /api/auth/login`

**Description**: Authenticate user with Google OAuth credential

**Request Body**:
```json
{
  "credential": "google_oauth_id_token"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "token": "session_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://...",
    "userType": "freetier|premium|admin",
    "isPaid": false,
    "apiPermissions": {
      "cover_letter": true,
      "resume": false,
      "questionAndAnswers": false,
      "upload": true,
      "jobs": true
    }
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Invalid Google token"
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing credential
- `401` - Invalid token
- `500` - Server error

---

### 2. Verify Token

**Endpoint**: `GET /api/auth/verify`

**Headers**:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "userType": "freetier",
    "isPaid": false,
    "apiPermissions": { ... }
  }
}
```

---

### 3. Logout

**Endpoint**: `POST /api/auth/logout`

**Headers**:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Job Application Endpoints

All endpoints below require authentication header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 1. Generate Cover Letter

**Endpoint**: `POST /api/cover_letter`

**Description**: Generate AI-powered cover letter for a job posting

**Request Body**:
```json
{
  "job_id": "unique_job_identifier",
  "job_details": "Full job description text or JSON object",
  "resume_text": "User's resume text",
  "useAi": "deepseek-chat|claude-sonnet|gemini-flash",
  "prompt": "Optional custom prompt (overrides default)",
  "platform": "seek|linkedin|indeed|other",
  "job_title": "Software Engineer",
  "company": "Acme Corp",
  "platform_job_id": "external_job_id_from_platform"
}
```

**Required Fields**:
- `job_id` - Unique identifier for the job
- `job_details` - Job description (string or object)
- `resume_text` - User's resume
- `useAi` - AI provider to use

**Optional Fields**:
- `prompt` - Custom prompt (if not provided, uses default)
- `platform` - Job platform (default: "other")
- `job_title` - Job title
- `company` - Company name
- `platform_job_id` - External job ID for tracking

**Response (Success)**:
```json
{
  "cover_letter": "Generated cover letter text here...",
  "job_id": "unique_job_identifier"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Missing required fields: job_id, job_details, resume_text, useAi are required"
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing required fields
- `401` - Not authenticated
- `403` - Permission denied (user doesn't have cover_letter permission)
- `500` - AI generation failed

**AI Providers**:
- `deepseek-chat` - Fast, cost-effective (recommended)
- `claude-sonnet` - High quality, creative
- `gemini-flash` - Fast, Google's model

---

### 2. Tailor Resume

**Endpoint**: `POST /api/resume`

**Description**: Generate tailored resume for a specific job

**Request Body**:
```json
{
  "job_id": "unique_job_identifier",
  "job_details": "Full job description",
  "resume_text": "User's resume text",
  "useAi": "deepseek-chat|claude-sonnet|gemini-flash",
  "prompt": "Optional custom prompt",
  "platform": "seek|linkedin|indeed|other",
  "job_title": "Software Engineer",
  "company": "Acme Corp",
  "platform_job_id": "external_job_id"
}
```

**Required Fields**:
- `job_id`
- `job_details`
- `resume_text`
- `useAi`

**Response (Success)**:
```json
{
  "resume": "Tailored resume text here...",
  "job_id": "unique_job_identifier"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Permission denied: resume"
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing fields
- `401` - Not authenticated
- `403` - Permission denied
- `500` - AI generation failed

---

### 3. Answer Questions

**Endpoint**: `POST /api/questionAndAnswers`

**Description**: Generate answers to job application questions

**Request Body**:
```json
{
  "job_id": "unique_job_identifier",
  "questions": [
    {
      "q": "Why do you want to work here?",
      "opts": ["option1", "option2"],
      "question": "Alternative field name",
      "text": "Alternative field name",
      "options": ["alternative field name"]
    }
  ],
  "resume_text": "User's resume text",
  "useAi": "deepseek-chat|claude-sonnet|gemini-flash",
  "prompt": "Optional custom prompt",
  "job_details": "Job description",
  "platform": "seek|linkedin|indeed|other",
  "job_title": "Software Engineer",
  "company": "Acme Corp",
  "platform_job_id": "external_job_id"
}
```

**Required Fields**:
- `job_id`
- `questions` - Array of question objects
- `resume_text`
- `useAi`

**Question Object Fields** (flexible - supports multiple formats):
- `q` or `question` or `text` - The question text
- `opts` or `options` - Array of options (if applicable)

**Response (Success)**:
```json
{
  "answers": "Generated answers text here...",
  "job_id": "unique_job_identifier"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Missing required fields: job_id, questions (array), resume_text, useAi are required"
}
```

**Status Codes**:
- `200` - Success
- `400` - Missing fields or invalid questions array
- `401` - Not authenticated
- `403` - Permission denied
- `500` - AI generation failed

---

## Data Tracking

### What Gets Tracked

All API calls automatically track:
- **API Usage**: endpoint, AI provider, tokens used, cost
- **Generated Content**: Cover letters, resumes, Q&A answers
- **Job Information**: Platform, job ID, title, company
- **Application Status**: Pending, applied, rejected, etc.

### Get User's Applications

**Endpoint**: `GET /api/jobs/hierarchy?userId=USER_ID`

**Headers**:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response**:
```json
{
  "success": true,
  "userId": "user_id",
  "stats": {
    "totalApplications": 15,
    "totalApiCalls": 45,
    "totalTokens": 150000,
    "totalCost": 0.25,
    "byEndpoint": {
      "/api/cover_letter": {
        "calls": 15,
        "tokens": 50000,
        "cost": 0.10
      }
    },
    "byProvider": {
      "deepseek-chat": {
        "calls": 30,
        "tokens": 100000,
        "cost": 0.15
      }
    }
  },
  "hierarchy": [
    {
      "platform": "seek",
      "applications": [
        {
          "id": "app_id",
          "status": "pending",
          "appliedAt": "2025-01-15T10:30:00Z",
          "job": {
            "id": "job_id",
            "platformJobId": "external_id",
            "title": "Software Engineer",
            "company": "Acme Corp",
            "location": "Sydney",
            "salary": "$120k - $150k",
            "url": "https://..."
          },
          "coverLetter": "Generated cover letter...",
          "resume": "Tailored resume...",
          "questionAnswers": [
            {
              "question": "Why do you want to work here?",
              "answer": "Because..."
            }
          ],
          "apiCallsCount": 3,
          "createdAt": "2025-01-15T10:30:00Z",
          "updatedAt": "2025-01-15T10:35:00Z"
        }
      ]
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Status Codes

- `200` - Success
- `400` - Bad Request (missing/invalid fields)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting & Permissions

### User Types

1. **freetier** (default):
   - Cover letter: ✅
   - Resume: ❌
   - Q&A: ❌
   - Upload: ✅
   - Jobs: ✅

2. **premium**:
   - All features: ✅

3. **admin**:
   - All features: ✅
   - Admin endpoints access

### Checking Permissions

After login, check `user.apiPermissions` to see what the user can access:

```json
{
  "apiPermissions": {
    "cover_letter": true,
    "resume": false,
    "questionAndAnswers": false,
    "upload": true,
    "jobs": true
  }
}
```

---

## Example: Finalboss Bot Integration

### 1. Login Flow

```javascript
// Get Google OAuth token
const googleToken = await getGoogleAuthToken();

// Login
const loginResponse = await fetch('https://your-api.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential: googleToken })
});

const { token, user } = await loginResponse.json();

// Store token for future requests
const authToken = token;
```

### 2. Generate Cover Letter

```javascript
const response = await fetch('https://your-api.com/api/cover_letter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    job_id: seekJobId,
    job_details: jobDescription,
    resume_text: userResume,
    useAi: 'deepseek-chat',
    platform: 'seek',
    job_title: 'Software Engineer',
    company: 'Acme Corp',
    platform_job_id: seekJobId
  })
});

const { cover_letter } = await response.json();
```

### 3. Tailor Resume

```javascript
const response = await fetch('https://your-api.com/api/resume', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    job_id: seekJobId,
    job_details: jobDescription,
    resume_text: userResume,
    useAi: 'deepseek-chat',
    platform: 'seek',
    job_title: 'Software Engineer',
    company: 'Acme Corp',
    platform_job_id: seekJobId
  })
});

const { resume } = await response.json();
```

### 4. Answer Questions

```javascript
const response = await fetch('https://your-api.com/api/questionAndAnswers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    job_id: seekJobId,
    questions: [
      { q: 'Why do you want to work here?', opts: [] },
      { q: 'What are your salary expectations?', opts: ['$100k-$120k', '$120k-$150k'] }
    ],
    resume_text: userResume,
    useAi: 'deepseek-chat',
    job_details: jobDescription,
    platform: 'seek',
    job_title: 'Software Engineer',
    company: 'Acme Corp',
    platform_job_id: seekJobId
  })
});

const { answers } = await response.json();
```

---

## Notes

- **All endpoints return plain text responses** for generated content (cover_letter, resume, answers)
- **job_id is required** and should be unique per job application
- **platform_job_id is optional** but recommended for tracking external job postings
- **API usage is automatically tracked** and embedded in application records
- **Sessions expire after 7 days** - re-authenticate if you get 401 errors
- **Custom prompts override default behavior** - use carefully

---

## Support

For issues or questions, contact the API administrator.

**API Version**: 2.0 (Updated: 2025-01-15)
