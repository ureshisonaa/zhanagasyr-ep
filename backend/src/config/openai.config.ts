import { registerAs } from '@nestjs/config';

export interface OpenAiConfig {
  apiKey?: string;
  model: string;
  embeddingModel: string;
  timeoutMs: number;
}

export default registerAs(
  'openai',
  (): OpenAiConfig => ({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-5.5',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    timeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS ?? '60000', 10),
  }),
);
