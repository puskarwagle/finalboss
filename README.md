# FinalBoss - Job Search Automation Platform

A powerful job search automation platform built with Tauri, SvelteKit, and TypeScript. Features intelligent bot workflows for job sites like Seek, LinkedIn, and Indeed with advanced humanization and session management.

## 🚀 Features

- **Universal Bot System**: YAML-driven workflow engine for easy bot configuration
- **Advanced Humanization**: Random delays, human-like typing, stealth mode to avoid detection
- **Google OAuth Integration**: Dynamic user authentication with email-based personalization
- **AI-Powered Cover Letters**: Automatic cover letter generation using user's RAG corpus
- **Generic Questions Handler**: Smart automation for employer screening questions
- **Session Management**: Persistent browser sessions with automatic login detection
- **Selenium Integration**: Robust browser automation with Chrome WebDriver
- **Registry System**: Auto-discovery and validation of bot modules
- **Centralized API Configuration**: Single configuration file for all API endpoints
- **UI & CLI Support**: Both graphical interface and command-line execution

## 📁 Architecture

```
src/
├── bots/
│   ├── core/                      # Core infrastructure
│   │   ├── registry.ts            # Bot discovery & validation
│   │   ├── browser_manager.ts     # Chrome/browser setup
│   │   ├── workflow_engine.ts     # YAML workflow execution
│   │   ├── humanization.ts        # Human behavior simulation
│   │   └── sessionManager.ts      # Session persistence
│   ├── seek/                      # Seek.com.au bot
│   │   ├── seek_impl.ts           # Step implementations
│   │   ├── seek_steps.yaml        # Workflow definition
│   │   ├── cover_letter_handler.ts # AI cover letter generation
│   │   ├── generic_question_handler.ts # Generic questions automation
│   │   └── seek_selectors.json    # CSS selectors
│   ├── bot_starter.ts             # Universal bot runner
│   └── user-bots-config.json      # User configuration
├── lib/
│   ├── api-config.js              # Centralized API configuration
│   ├── auth.js                    # Google OAuth authentication
│   └── session.js                 # Session management utilities
└── routes/
    ├── api/                       # API endpoints
    │   ├── session/               # User session API
    │   ├── cover_letter/          # AI cover letter generation
    │   └── generic-questions/     # Generic questions management
    └── auth/google/               # Google OAuth flow
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Selenium WebDriver:**
   ```bash
   npm install selenium-webdriver chromedriver@^139.0.0
   ```

3. **Ensure Chrome is installed and in PATH**

4. **Configure Google OAuth (Required for personalized features):**
   ```bash
   # Set up Google OAuth credentials
   cp .env.example .env
   # Edit .env and add your Google OAuth credentials:
   # GOOGLE_CLIENT_ID=your_client_id
   # GOOGLE_CLIENT_SECRET=your_client_secret
   ```

5. **Set API base URL for deployment (Optional):**
   ```bash
   # For production deployment
   export API_BASE_URL=https://your-domain.com
   # For local development (default)
   export API_BASE_URL=http://localhost:1420
   ```

## 🎯 Usage

### Command Line Interface

```bash
# List available bots
bun src/bots/bot_starter.ts

# Run seek bot
bun src/bots/bot_starter.ts seek

# Run with options
bun src/bots/bot_starter.ts seek --headless --close
```

### Graphical Interface

```bash
# Start the UI
bun run tauri dev
```

Then select your bot and click "Launch Bot" in the interface.

### Google OAuth Login

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Visit** `http://localhost:1420` **and log in with Google**

3. **Your email will be automatically used for:**
   - Personalized cover letter generation
   - AI-powered employer question responses
   - User-specific job application tracking

## 🤖 Bot Configuration

Edit `src/bots/user-bots-config.json` to configure:

```json
{
  "formData": {
    "keywords": "software engineer",
    "locations": "sydney",
    "minSalary": 80000,
    "maxSalary": 150000,
    "enableDeepSeek": false,
    "acceptTerms": true
  }
}
```

## 🤖 AI-Powered Features

### Dynamic Email Integration

The platform automatically uses the **logged-in user's email** from Google OAuth for:

- **Cover Letter Generation**: Personalized cover letters using your RAG corpus
- **Question Responses**: Smart answers to employer screening questions
- **Job Application Tracking**: User-specific application history

**No more hardcoded emails!** The bot dynamically retrieves your email from the authenticated session.

### Generic Questions Automation

Configure automatic answers for common employer questions:

1. **Visit** `/generic-questions` **in the web interface**
2. **Configure answers** for common screening questions
3. **The bot will automatically use these answers** during job applications

### Cover Letter Generation

The bot integrates with your RAG system to generate personalized cover letters:

```typescript
// Automatically uses logged-in user's email
const coverLetter = await generateAICoverLetter(jobDetails, userEmail);
```

## ⚙️ API Configuration

### Centralized Configuration

All API endpoints are configured in `/src/lib/api-config.js`:

```javascript
export const API_CONFIG = {
  BASE_URL: getBaseUrl(), // Dynamic: localhost:1420 or your domain
  ENDPOINTS: {
    SESSION: '/api/session',
    COVER_LETTER: '/api/cover_letter',
    GENERIC_QUESTIONS: '/api/generic-questions'
    // ... all endpoints
  }
};
```

### Deployment Configuration

**For production deployment:**

```bash
# Set environment variable
export API_BASE_URL=https://your-production-domain.com

# The app will automatically use this for all API calls
```

**For development:**
```bash
# Default (automatic)
export API_BASE_URL=http://localhost:1420
```

## 🔧 Adding New Bots

1. **Create bot directory:**
   ```bash
   mkdir src/bots/linkedin
   ```

2. **Add required files:**
   ```
   linkedin/
   ├── linkedin_configuration.ts  # Bot config
   ├── linkedin_impl.ts           # Step functions
   ├── linkedin_steps.yaml        # Workflow
   └── linkedin_selectors.json    # CSS selectors
   ```

3. **The registry will auto-discover the new bot**

## 🎨 Humanization Features

- **Random Delays**: 500ms-1500ms between clicks
- **Human Typing**: Variable typing speed (50-150ms per character)
- **Thinking Pauses**: 1-3 second delays for decision simulation
- **Mouse Movement**: Random small movements
- **Stealth Mode**: Hide webdriver properties, randomize user agent
- **Session Persistence**: Maintain login state between runs

## 📊 Workflow Engine

Uses YAML-driven state machine workflows:

```yaml
workflow_meta:
  title: "Seek Basic Search"
  start_step: "init_context"

steps_config:
  init_context:
    func: "step0"
    transitions:
      ctx_ready: "open_homepage"
    timeout: 30
```

## 🛡️ Session Management

- **Persistent Sessions**: Browser sessions saved to `sessions/{bot_name}/`
- **Auto-Login Detection**: Smart detection of login requirements
- **Manual Login Support**: Interactive login prompts with timeout
- **Session Validation**: Automatic session health checks

## ⚙️ Development

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Project Structure

```
├── src/                     # Frontend (SvelteKit)
│   ├── bots/               # Bot system
│   └── routes/             # UI routes
├── src-tauri/              # Backend (Rust/Tauri)
└── sessions/               # Browser sessions
```

### Running in Development

```bash
# Frontend + Backend
bun run tauri dev

# Bot testing only
bun src/bots/bot_starter.ts seek
```

## 🐛 Troubleshooting

### Chrome Issues
- Ensure Chrome is closed before running
- Update Chrome and ChromeDriver to matching versions
- Check Chrome is in system PATH

### Session Issues
- Clear sessions: `rm -rf sessions/`
- Disable safe mode in browser settings
- Check browser profile permissions

### Import Errors
- Run `npm install` to ensure dependencies
- Check TypeScript compilation with `bun --bun tsc`

### OAuth/Authentication Issues
- Ensure Google OAuth credentials are set in `.env`
- Check that redirect URI matches: `http://localhost:1420/auth/google/callback`
- Clear browser cookies if login fails
- Verify email is in authorized users list

### API Configuration Issues
- Check `API_BASE_URL` environment variable
- Ensure session API returns valid user data
- Verify API endpoints are accessible
- Check browser network tab for API call failures

### Cover Letter Generation Issues
- Ensure user is logged in via Google OAuth
- Check that session API returns user email
- Verify RAG system is running (if using external RAG)
- Check API key configuration in session response

## 📄 License

This project is for educational and personal use only. Please respect the terms of service of job sites when using automation tools.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📋 Key Files Reference

### Core Configuration Files
- `/src/lib/api-config.js` - **Centralized API configuration** (modify for deployment)
- `/src/lib/auth-check.js` - **Authorized users configuration**
- `/src/bots/seek/generic_questions_config.json` - **Generic questions setup**

### Authentication & Session
- `/src/routes/api/session/+server.js` - **User session API endpoint**
- `/src/lib/auth.js` - **Google OAuth authentication logic**
- `/src/lib/session.js` - **Session management utilities**

### AI Features
- `/src/bots/seek/cover_letter_handler.ts` - **AI cover letter generation**
- `/src/bots/seek/generic_question_handler.ts` - **Employer questions automation**
- `/src/routes/api/cover_letter/` - **Cover letter API endpoint**

### Google OAuth
- `/src/routes/auth/google/signin/+server.js` - **OAuth initiation**
- `/src/routes/auth/google/callback/+server.js` - **OAuth callback handling**

---

**Built with ❤️ for job seekers everywhere**