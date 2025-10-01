import axios from 'axios';

export async function handleLLMJob(data: {
  userId: string;
  query: string;
  context: string[];
}) {
  const { userId, query, context } = data;

  // Call LLM API (OpenAI, Anthropic, local model, etc.)
  const prompt = `
Контекст:
${context.join('\n\n')}

Вопрос: ${query}

Ответь на вопрос кратко и по существу, используя только информацию из контекста. Укажи даты и источники.
`;

  const response = await axios.post(
    `${process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'}/chat/completions`,
    {
      model: process.env.FAST_LLM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Ты помощник по локальным новостям и объявлениям. Отвечай кратко, с датами и источниками.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const answer = response.data.choices[0].message.content;

  // TODO: Send answer back to user via bot or store in cache

  return answer;
}