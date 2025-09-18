import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { UniversalOverlay } from './universal_overlay';

export interface WorkflowStep {
  step: number;
  func: string;
  transitions: Record<string, string>;
  timeout: number;
  on_timeout_event: string;
}

export interface WorkflowConfig {
  workflow_meta: {
    title: string;
    description: string;
    start_step: string;
  };
  steps_config: Record<string, WorkflowStep>;
}

export interface WorkflowContext {
  [key: string]: any;
}

export type StepFunction = (ctx: WorkflowContext) => AsyncGenerator<string, void, unknown>;

export class WorkflowEngine {
  private config: WorkflowConfig;
  private stepFunctions: Map<string, StepFunction> = new Map();
  private currentStep: string;
  private context: WorkflowContext = {};
  private overlay: UniversalOverlay | null = null;

  constructor(configPath: string) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configContent) as WorkflowConfig;
    this.currentStep = this.config.workflow_meta.start_step;
  }

  registerStepFunction(stepName: string, func: StepFunction): void {
    this.stepFunctions.set(stepName, func);
  }

  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  getContext(): WorkflowContext {
    return this.context;
  }

  async executeStep(stepName: string): Promise<string> {
    const stepConfig = this.config.steps_config[stepName];
    if (!stepConfig) {
      throw new Error(`Step '${stepName}' not found in configuration`);
    }

    const stepFunction = this.stepFunctions.get(stepConfig.func);
    if (!stepFunction) {
      throw new Error(`Function '${stepConfig.func}' not registered`);
    }

    try {
      const generator = stepFunction(this.context);
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(stepConfig.on_timeout_event), stepConfig.timeout * 1000);
      });

      const result = await Promise.race([
        this.executeGenerator(generator),
        timeoutPromise
      ]);

      console.log(`Step ${stepConfig.step} [${stepConfig.func}] → ${result}`);

      // Initialize overlay after first step if not already done (driver might be set in first step)
      if (!this.overlay && this.context.driver) {
        console.log('🎨 Creating overlay...');
        this.overlay = new UniversalOverlay(this.context.driver);
        try {
          await this.overlay.showStepProgress(
            "🚀 BOT RUNNING",
            stepConfig.step,
            `Current: ${stepConfig.func} → ${result}`
          );
          console.log('✅ Overlay is now visible in browser!');
        } catch (error) {
          console.warn('❌ Failed to initialize late overlay:', error);
          this.overlay = null;
        }
      }

      // Update overlay if available
      if (this.overlay) {
        try {
          await this.overlay.updateStepProgress(
            "🚀 BOT RUNNING",
            stepConfig.step,
            `Current: ${stepConfig.func} → ${result}`
          );
        } catch (error) {
          // Ignore overlay errors to not break workflow
          console.warn('Overlay update failed:', error);
        }
      }

      return result;
    } catch (error) {
      console.error(`[Workflow] Error in step '${stepName}':`, error);
      throw error;
    }
  }

  private async executeGenerator(generator: AsyncGenerator<string, void, unknown>): Promise<string> {
    const result = await generator.next();
    return result.value || 'unknown';
  }

  async run(): Promise<void> {
    console.log(`🤖 ${this.config.workflow_meta.title}`);

    // Initialize overlay if driver is available in context
    console.log('🔍 Debug: Checking for driver in context...', !!this.context.driver);
    if (this.context.driver && !this.overlay) {
      console.log('🎨 Debug: Creating overlay...');
      this.overlay = new UniversalOverlay(this.context.driver);
      try {
        console.log('🎨 Debug: Showing initial overlay...');
        await this.overlay.showStepProgress(
          "Starting Workflow",
          0,
          this.config.workflow_meta.description
        );
        console.log('✅ Debug: Overlay initialized successfully');
      } catch (error) {
        console.warn('❌ Failed to initialize overlay:', error);
        this.overlay = null;
      }
    } else if (!this.context.driver) {
      console.log('❌ Debug: No driver found in context');
    }

    let currentStepName = this.currentStep;
    const maxSteps = 10; // Prevent infinite loops
    let stepCount = 0;

    while (currentStepName !== 'done' && stepCount < maxSteps) {
      stepCount++;

      const event = await this.executeStep(currentStepName);
      const stepConfig = this.config.steps_config[currentStepName];

      if (stepConfig.transitions[event]) {
        currentStepName = stepConfig.transitions[event];
      } else {
        console.warn(`❌ No transition found for event '${event}' in step '${currentStepName}'`);
        break;
      }

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (stepCount >= maxSteps) {
      console.warn('❌ Maximum step count reached, stopping workflow');
    }

    // Update overlay with completion status
    if (this.overlay) {
      try {
        await this.overlay.updateStepProgress(
          "Workflow Completed",
          stepCount,
          "✅ All steps finished successfully"
        );
      } catch (error) {
        console.warn('Failed to update overlay completion:', error);
      }
    }

    console.log('✅ Workflow completed');
  }
}