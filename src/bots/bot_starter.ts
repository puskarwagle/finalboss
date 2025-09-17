import { bot_registry, BotRegistry } from './core/registry';
import { WorkflowEngine, type WorkflowContext } from './core/workflow_engine';
import * as path from 'path';

const print_log = (message: string) => {
  console.log(message);
};

export interface BotRunOptions {
  bot_name: string;
  config?: any;
  headless?: boolean;
  keep_open?: boolean;
}

export class BotStarter {
  private registry: BotRegistry;

  constructor(registry?: BotRegistry) {
    this.registry = registry || bot_registry;
  }

  // Main entry point - like Python's bot_runner.py
  async run_bot(options: BotRunOptions): Promise<void> {
    const { bot_name, config, headless = false, keep_open = true } = options;

    try {
      print_log(`🚀 Starting bot runner for: ${bot_name}`);

      // 1. Discover and validate bot
      this.registry.discover_bots();

      if (!this.registry.bot_exists(bot_name)) {
        throw new Error(`Bot '${bot_name}' not found. Available bots: ${this.registry.get_bot_names().join(', ')}`);
      }

      const bot_info = this.registry.get_bot_info(bot_name);
      if (!bot_info) {
        throw new Error(`Failed to load bot info for '${bot_name}'`);
      }

      print_log(`✅ Bot validated: ${bot_info.display_name}`);

      // 2. Load bot configuration and selectors
      const bot_config = this.registry.load_bot_config(bot_name);
      const bot_selectors = this.registry.load_bot_selectors(bot_name);

      print_log(`⚙️ Configuration and selectors loaded for ${bot_name}`);

      // 3. Load bot implementation
      const bot_impl = await this.load_bot_implementation(bot_info.impl_path);

      print_log(`🔧 Implementation loaded for ${bot_name}`);

      // 4. Create workflow engine with bot's YAML
      const workflow_engine = new WorkflowEngine(bot_info.yaml_path);

      // 5. Register bot's step functions
      this.register_bot_functions(workflow_engine, bot_impl);

      // 6. Setup initial context
      const initial_context = this.create_initial_context(bot_config, bot_selectors, config);

      // 7. Run the workflow
      print_log(`▶️ Executing workflow for ${bot_name}...`);
      workflow_engine.setContext('config', initial_context.config);
      workflow_engine.setContext('selectors', initial_context.selectors);
      workflow_engine.setContext('bot_name', bot_name);

      await workflow_engine.run();

      // 8. Handle post-execution
      const final_context = workflow_engine.getContext();
      await this.handle_post_execution(final_context, keep_open);

      print_log(`✅ Bot '${bot_name}' execution completed successfully`);

    } catch (error) {
      print_log(`❌ Bot '${bot_name}' execution failed: ${error}`);
      throw error;
    }
  }

  // Load bot implementation module
  private async load_bot_implementation(impl_path: string): Promise<any> {
    try {
      const bot_module = await import(impl_path);

      // Look for step functions export
      if (bot_module.default) {
        return bot_module.default;
      } else {
        // Look for named exports (like seekStepFunctions)
        const step_functions = Object.keys(bot_module).find(key =>
          key.includes('StepFunctions') || key.includes('Functions')
        );

        if (step_functions) {
          return bot_module[step_functions];
        }

        return bot_module;
      }
    } catch (error) {
      throw new Error(`Failed to load bot implementation: ${error}`);
    }
  }

  // Register bot's step functions with workflow engine
  private register_bot_functions(workflow_engine: WorkflowEngine, bot_impl: any): void {
    if (typeof bot_impl === 'object') {
      Object.entries(bot_impl).forEach(([name, func]) => {
        if (typeof func === 'function') {
          workflow_engine.registerStepFunction(name, func as any);
        }
      });
    } else {
      throw new Error('Bot implementation must export an object with step functions');
    }
  }

  // Create initial context for workflow
  private create_initial_context(bot_config: any, bot_selectors: any, user_config?: any): any {
    return {
      config: {
        ...bot_config,
        ...user_config // User config overrides bot defaults
      },
      selectors: bot_selectors
    };
  }

  // Handle cleanup and browser management after execution
  private async handle_post_execution(context: WorkflowContext, keep_open: boolean): Promise<void> {
    if (context.driver && keep_open) {
      print_log('🎯 Workflow completed! Browser will remain open for you to continue using.');
      if (context.sessionsDir) {
        print_log(`📂 Session saved to: ${context.sessionsDir}`);
      }

      // Keep script alive to prevent browser from closing
      try {
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.on('data', () => {}); // Minimal memory usage
      } catch (error) {
        print_log('Note: Browser will remain open');
      }
    } else if (context.driver) {
      print_log('Closing browser...');
      await context.driver.quit();
    }
  }

  // Get list of available bots
  get_available_bots(): string[] {
    this.registry.discover_bots();
    return this.registry.get_bot_names();
  }

  // Validate bot exists
  validate_bot(bot_name: string): boolean {
    this.registry.discover_bots();
    return this.registry.bot_exists(bot_name);
  }
}

// Convenience function for direct usage
export async function run_bot(bot_name: string, config?: any, options?: Partial<BotRunOptions>): Promise<void> {
  const bot_starter = new BotStarter();
  await bot_starter.run_bot({
    bot_name,
    config,
    ...options
  });
}

// CLI usage when run directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: bun bot_starter.ts <bot_name> [options]');
    console.log('Example: bun bot_starter.ts seek');

    const bot_starter = new BotStarter();
    const available_bots = bot_starter.get_available_bots();
    console.log(`Available bots: ${available_bots.join(', ')}`);
    process.exit(1);
  }

  const bot_name = args[0];
  const headless = args.includes('--headless');
  const no_keep_open = args.includes('--close');

  run_bot(bot_name, undefined, {
    headless,
    keep_open: !no_keep_open
  }).catch(error => {
    console.error('Bot execution failed:', error);
    process.exit(1);
  });
}