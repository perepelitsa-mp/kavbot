import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { QUEUES } from '@kavbot/shared';
import { handleEmbeddingJob } from './jobs/embeddings';
import { handleLLMJob } from './jobs/llm-tasks';
import { handleNotificationJob } from './jobs/notifications';
import { handleImageProcessingJob } from './jobs/image-processing';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: true,
    },
  },
});

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Embeddings worker
const embeddingsWorker = new Worker(
  QUEUES.EMBEDDINGS,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing embedding job');
    await handleEmbeddingJob(job.data);
  },
  { connection, concurrency: 5 },
);

// LLM tasks worker
const llmWorker = new Worker(
  QUEUES.LLM_TASKS,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing LLM job');
    await handleLLMJob(job.data);
  },
  { connection, concurrency: 2 },
);

// Notifications worker
const notificationsWorker = new Worker(
  QUEUES.NOTIFICATIONS,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing notification job');
    await handleNotificationJob(job.data);
  },
  { connection, concurrency: 10 },
);

// Image processing worker
const imageWorker = new Worker(
  QUEUES.IMAGE_PROCESSING,
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing image job');
    await handleImageProcessingJob(job.data);
  },
  { connection, concurrency: 3 },
);

// Error handlers
[embeddingsWorker, llmWorker, notificationsWorker, imageWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
  });
});

logger.info('Workers started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing workers...');
  await Promise.all([
    embeddingsWorker.close(),
    llmWorker.close(),
    notificationsWorker.close(),
    imageWorker.close(),
  ]);
  await connection.quit();
  process.exit(0);
});