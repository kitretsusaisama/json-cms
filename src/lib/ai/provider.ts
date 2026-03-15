export interface AIProvider {
  complete(input: { prompt: string; system?: string; maxTokens?: number }): Promise<string>;
}

class LocalMockProvider implements AIProvider {
  async complete(input: { prompt: string }): Promise<string> {
    const p = input.prompt.trim();
    if (!p) { return ""; }
    // Very simple mock behavior
    if (/hello/i.test(p)) { return "Hi! I'm a local mock AI. How can I help?"; }
    if (/seo/i.test(p)) { return "Consider entity-based SEO with JSON-LD structured data and canonical URLs."; }
    return `You said: ${p}`;
  }
}

export const aiProvider: AIProvider = new LocalMockProvider();
