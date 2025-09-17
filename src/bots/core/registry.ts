import * as fs from 'fs';
import * as path from 'path';

interface BotInfo {
  name: string;
  display_name: string;
  description: string;
  yaml_path: string;
  impl_path: string;
  config_path: string;
  selectors_path: string;
}

export class BotRegistry {
  private bots_dir: string;
  private discovered_bots: Map<string, BotInfo> = new Map();

  constructor(bots_dir?: string) {
    this.bots_dir = bots_dir || path.join(__dirname, '..');
  }

  // Discover all available bots
  discover_bots(): string[] {
    const bot_names: string[] = [];

    try {
      const entries = fs.readdirSync(this.bots_dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'core') {
          const bot_name = entry.name;
          const bot_path = path.join(this.bots_dir, bot_name);

          if (this.validate_bot_structure(bot_name, bot_path)) {
            bot_names.push(bot_name);
            this.discovered_bots.set(bot_name, this.create_bot_info(bot_name, bot_path));
          }
        }
      }
    } catch (error) {
      console.error(`Error discovering bots: ${error}`);
    }

    console.log(`[Registry] Discovered bots: ${bot_names.join(', ')}`);
    return bot_names;
  }

  // Validate bot has required files
  private validate_bot_structure(bot_name: string, bot_path: string): boolean {
    const required_files = [
      `${bot_name}_steps.yaml`,
      `${bot_name}_impl.ts`,
      `${bot_name}_selectors.json`
    ];

    for (const file of required_files) {
      const file_path = path.join(bot_path, file);
      if (!fs.existsSync(file_path)) {
        console.warn(`[Registry] Bot '${bot_name}' missing required file: ${file}`);
        return false;
      }
    }

    return true;
  }

  // Create bot info object
  private create_bot_info(bot_name: string, bot_path: string): BotInfo {
    return {
      name: bot_name,
      display_name: this.format_display_name(bot_name),
      description: `Automation bot for ${this.format_display_name(bot_name)}`,
      yaml_path: path.join(bot_path, `${bot_name}_steps.yaml`),
      impl_path: path.join(bot_path, `${bot_name}_impl.ts`),
      config_path: path.join(bot_path, `${bot_name}_configuration.ts`),
      selectors_path: path.join(bot_path, `${bot_name}_selectors.json`)
    };
  }

  // Format bot name for display
  private format_display_name(bot_name: string): string {
    return bot_name.charAt(0).toUpperCase() + bot_name.slice(1);
  }

  // Get bot information
  get_bot_info(bot_name: string): BotInfo | null {
    return this.discovered_bots.get(bot_name) || null;
  }

  // Get all discovered bots
  get_all_bots(): BotInfo[] {
    return Array.from(this.discovered_bots.values());
  }

  // Load bot configuration
  load_bot_config(bot_name: string): any {
    const bot_info = this.get_bot_info(bot_name);
    if (!bot_info) {
      throw new Error(`Bot '${bot_name}' not found in registry`);
    }

    try {
      if (fs.existsSync(bot_info.config_path)) {
        const config_module = require(bot_info.config_path);
        return config_module.default || config_module;
      } else {
        console.warn(`[Registry] Configuration file not found for '${bot_name}', using defaults`);
        return {};
      }
    } catch (error) {
      console.error(`[Registry] Error loading config for '${bot_name}': ${error}`);
      return {};
    }
  }

  // Load bot selectors
  load_bot_selectors(bot_name: string): any {
    const bot_info = this.get_bot_info(bot_name);
    if (!bot_info) {
      throw new Error(`Bot '${bot_name}' not found in registry`);
    }

    try {
      const selectors_content = fs.readFileSync(bot_info.selectors_path, 'utf8');
      return JSON.parse(selectors_content);
    } catch (error) {
      throw new Error(`Error loading selectors for '${bot_name}': ${error}`);
    }
  }

  // Check if bot exists
  bot_exists(bot_name: string): boolean {
    return this.discovered_bots.has(bot_name);
  }

  // Get available bot names
  get_bot_names(): string[] {
    return Array.from(this.discovered_bots.keys());
  }
}

// Export singleton instance
export const bot_registry = new BotRegistry();