import { registerAs } from '@nestjs/config';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
}

export default registerAs(
  'qdrant',
  (): QdrantConfig => ({
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  }),
);
