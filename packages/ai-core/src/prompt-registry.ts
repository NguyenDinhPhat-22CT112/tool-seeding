export interface PromptDefinition {
  id: string;
  version: string;
  hash: string;
  description: string;
  createdAt: string;
  template: string;
}

export class PromptRegistry {
  private readonly prompts = new Map<string, PromptDefinition>();

  register(prompt: PromptDefinition): void {
    const key = `${prompt.id}-${prompt.version}`;
    this.prompts.set(key, prompt);
    if (!this.prompts.has(prompt.id)) {
      this.prompts.set(prompt.id, prompt);
    }
  }

  get(id: string): PromptDefinition {
    const prompt = this.prompts.get(id);
    if (!prompt) throw new Error(`Prompt not found: ${id}`);
    return prompt;
  }

  getVersion(id: string, version: string): PromptDefinition {
    const prompt = this.prompts.get(`${id}-${version}`);
    if (!prompt) throw new Error(`Prompt not found: ${id}-${version}`);
    return prompt;
  }
}

export const promptRegistry = new PromptRegistry();
