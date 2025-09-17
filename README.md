# FinalBoss - Job Search Automation Platform

A powerful job search automation platform built with Tauri, SvelteKit, and TypeScript. Features intelligent bot workflows for job sites like Seek, LinkedIn, and Indeed with advanced humanization and session management.

## 🚀 Features

- **Universal Bot System**: YAML-driven workflow engine for easy bot configuration
- **Advanced Humanization**: Random delays, human-like typing, stealth mode to avoid detection
- **Session Management**: Persistent browser sessions with automatic login detection
- **Selenium Integration**: Robust browser automation with Chrome WebDriver
- **Registry System**: Auto-discovery and validation of bot modules
- **UI & CLI Support**: Both graphical interface and command-line execution

## 📁 Architecture

```
src/bots/
├── core/                    # Core infrastructure
│   ├── registry.ts          # Bot discovery & validation
│   ├── browser_manager.ts   # Chrome/browser setup
│   ├── workflow_engine.ts   # YAML workflow execution
│   ├── humanization.ts      # Human behavior simulation
│   └── sessionManager.ts    # Session persistence
├── seek/                    # Seek.com.au bot
│   ├── seek_configuration.ts # Bot-specific config
│   ├── seek_impl.ts         # Step function implementations
│   ├── seek_steps.yaml      # Workflow definition
│   └── seek_selectors.json  # CSS selectors
├── bot_starter.ts           # Universal bot runner
└── user-bots-config.json    # User configuration
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

## 📄 License

This project is for educational and personal use only. Please respect the terms of service of job sites when using automation tools.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for job seekers everywhere**