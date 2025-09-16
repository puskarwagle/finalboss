import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

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

    console.log(`[Workflow] Executing step: ${stepName} (${stepConfig.func})`);

    try {
      const generator = stepFunction(this.context);
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve(stepConfig.on_timeout_event), stepConfig.timeout * 1000);
      });

      const result = await Promise.race([
        this.executeGenerator(generator),
        timeoutPromise
      ]);

      console.log(`[Workflow] Step '${stepName}' yielded: ${result}`);
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
    console.log(`[Workflow] Starting workflow: ${this.config.workflow_meta.title}`);

    let currentStepName = this.currentStep;
    const maxSteps = 50; // Prevent infinite loops
    let stepCount = 0;

    while (currentStepName !== 'done' && stepCount < maxSteps) {
      stepCount++;

      const event = await this.executeStep(currentStepName);
      const stepConfig = this.config.steps_config[currentStepName];

      if (stepConfig.transitions[event]) {
        currentStepName = stepConfig.transitions[event];
        console.log(`[Workflow] Transitioning from '${currentStepName}' to '${stepConfig.transitions[event]}' on event '${event}'`);
      } else {
        console.warn(`[Workflow] No transition found for event '${event}' in step '${currentStepName}'`);
        break;
      }

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (stepCount >= maxSteps) {
      console.warn('[Workflow] Maximum step count reached, stopping workflow');
    }

    console.log('[Workflow] Workflow completed');
  }
}