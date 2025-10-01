import 'dotenv/config';
import { Bot, webhookCallback, Context, session } from 'grammy';
import { Router } from '@grammyjs/router';
import { limit } from '@grammyjs/ratelimiter';
import { createServer } from 'http';
import Redis from 'ioredis';
import pino from 'pino';
import axios from 'axios';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: true,
    },
  },
});

const bot = new Bot(process.env.BOT_TOKEN!);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const apiUrl = process.env.API_ORIGIN || 'http://localhost:3001';
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000';
const canUseWebAppButton = webAppUrl.startsWith('https://');

if (!canUseWebAppButton) {
  logger.warn(
    'WEBAPP_URL does not use https. Falling back to a plain link for /board. Telegram web apps require HTTPS.',
  );
}

// Session middleware
interface SessionData {
  step?: string;
}

bot.use(
  session({
    initial: (): SessionData => ({}),
  }),
);

// Rate limiting
bot.use(
  limit({
    timeFrame: 60000,
    limit: 20,
    onLimitExceeded: (ctx) => {
      ctx.reply('Слишком много запросов. Подождите минуту.');
    },
  }),
);

// Idempotency check
bot.use(async (ctx, next) => {
  const updateId = ctx.update.update_id;
  const key = `idempotency:${updateId}`;
  const exists = await redis.exists(key);

  if (exists) {
    logger.info(`Duplicate update ${updateId}, skipping`);
    return;
  }

  await redis.setex(key, 300, '1'); // 5 min TTL
  await next();
});

// Error handler
bot.catch((err) => {
  logger.error(err, 'Bot error');
});

// Commands
bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 Привет, ${ctx.from?.first_name}!

Я бот Кавалерово — ваш помощник по локальным новостям, событиям и объявлениям.

*Команды:*
/board — Открыть доску объявлений
/ask <вопрос> — Задать вопрос
/news — Последние новости
/events — Мероприятия
/outage — Отключения
/training — Спортивные секции

Или просто напишите мне любой вопрос!`,
    { parse_mode: 'Markdown' },
  );
});

bot.command('board', async (ctx) => {
  if (canUseWebAppButton) {
    await ctx.reply('Открыть доску объявлений:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 Доска объявлений',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      },
    });
    return;
  }

  const fallbackMessage = [
    'Открыть доску объявлений:',
    webAppUrl,
    '',
    '⚠️ Мини-приложение Telegram открывается только по HTTPS. Настройте HTTPS и обновите переменную WEBAPP_URL (например, через ngrok или локальный сертификат).',
  ]
    .filter(Boolean)
    .join('\n');

  await ctx.reply(fallbackMessage, {
    disable_web_page_preview: true,
  });
});

// Intent shortcuts
bot.command('news', async (ctx) => {
  await handleSearch(ctx, 'Какие последние новости?');
});

bot.command('events', async (ctx) => {
  await handleSearch(ctx, 'Какие мероприятия планируются?');
});

bot.command('outage', async (ctx) => {
  await handleSearch(ctx, 'Есть ли отключения света?');
});

bot.command('training', async (ctx) => {
  await handleSearch(ctx, 'Куда можно сходить на тренировку?');
});

bot.command('ask', async (ctx) => {
  const question = ctx.match;
  if (!question) {
    await ctx.reply('Пожалуйста, укажите вопрос. Например: /ask Какие новости?');
    return;
  }
  await handleSearch(ctx, question.toString());
});

// Handle all text messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }

  await handleSearch(ctx, text);
});

async function handleSearch(ctx: Context, query: string) {
  try {
    await ctx.replyWithChatAction('typing');

    // Call API search endpoint
    const response = await axios.get(`${apiUrl}/search`, {
      params: { q: query, limit: 5 },
    });

    const { results } = response.data;

    if (!results || results.length === 0) {
      await ctx.reply(
        'К сожалению, я не нашел ничего по вашему запросу. Попробуйте переформулировать вопрос.',
      );
      return;
    }

    // Format response
    let message = `🔍 *Результаты поиска:*\n\n`;

    for (const result of results.slice(0, 5)) {
      if (result.type === 'document') {
        const date = result.publishedAt
          ? new Date(result.publishedAt).toLocaleDateString('ru-RU')
          : '';
        message += `📄 *${result.title}*\n`;
        if (date) message += `📅 ${date}\n`;
        message += `${result.snippet}\n`;
        if (result.source) message += `🔗 Источник: ${result.source}\n`;
        if (result.url) message += `🌐 ${result.url}\n`;
        message += `\n`;
      } else if (result.type === 'listing') {
        message += `🏷 *${result.title}*\n`;
        if (result.category) message += `📂 ${result.category}\n`;
        if (result.price) message += `💰 ${result.price} ₽\n`;
        message += `${result.snippet}\n\n`;
      }
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error(error, 'Error handling search');
    await ctx.reply('Произошла ошибка при обработке запроса. Попробуйте позже.');
  }
}

// Start bot
if (process.env.NODE_ENV === 'production') {
  // Webhook mode
  const port = parseInt(process.env.PORT || '3002', 10);
  const webhookPath = `/bot${process.env.BOT_TOKEN}`;

  const server = createServer(webhookCallback(bot, 'http'));
  server.listen(port, () => {
    logger.info(`Bot webhook listening on port ${port}`);
    logger.info(`Webhook path: ${webhookPath}`);
  });

  // Set webhook
  const webhookUrl = `${process.env.WEBHOOK_URL}${webhookPath}`;
  bot.api.setWebhook(webhookUrl).then(() => {
    logger.info(`Webhook set to ${webhookUrl}`);
  });
} else {
  // Long polling mode for development
  logger.info('Starting bot in long polling mode...');
  bot.start();
}
