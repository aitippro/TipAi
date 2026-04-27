export interface IntentAnalysis {
  goal: string;
  domain: string;
  subDomain: string;
  audience: string;
  tone: string;
  style: string;
  constraints: string[];
  outputFormat: string;
  complexity: "simple" | "medium" | "complex";
  language: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  options?: string[];
  type: "choice" | "text" | "multichoice";
  why: string;
  required: boolean;
}

export interface StepDecomposition {
  shouldDecompose: boolean;
  reason: string;
  steps: {
    stepNumber: number;
    title: string;
    description: string;
    inputNeeded: string;
    estimatedComplexity: string;
  }[];
}

export interface FrameworkRecommendation {
  framework: string;
  frameworkName: string;
  confidence: number;
  reason: string;
}

export interface GeneratedPrompt {
  title: string;
  framework: string;
  prompt: string;
  explanation: string;
  tips: string[];
  usageExample: string;
}

export interface SlashCommand {
  command: string;
  name: string;
  icon: string;
  description: string;
  targetModel: string;
  defaultFramework: string;
}

export interface Framework {
  name: string;
  nameEn: string;
  description: string;
  bestFor: string[];
  components: string[];
  template: string;
  example: string;
}
