import axios from 'axios';

export async function handleNotificationJob(data: {
  userId: string;
  tgUserId: string;
  message: string;
}) {
  const { tgUserId, message } = data;

  // Send via Telegram Bot API
  await axios.post(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    {
      chat_id: tgUserId,
      text: message,
      parse_mode: 'Markdown',
    },
  );
}