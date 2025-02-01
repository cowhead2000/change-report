import { OpenAIApi, Configuration, ChatCompletionRequestMessage } from 'openai';

export const composeReport = async (
    daysCount: number,
    commitMessagesList: string[]
): Promise<string> => {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
  }

  const openai = new OpenAIApi(
      new Configuration({ apiKey: OPENAI_API_KEY })
  );

  const systemPrompt = [
    `You're a software delivery assistant working in a team of software developers (us) developing a discord bot.`,
    `You're helping our team to write reports about the key changes that we've made over the last ${daysCount} days.`,
    `You're writing a report for our support team that uses our discord bot.`,
    `Your goal is to summarize important and impactful changes from commit messages to our support team of server moderators.`,
    `It's important that you help the support staff understand which part of the code that has changed.`,
    `You should also help them understand the impact of the changes on the bot's behavior.`
  ].join('\n');

  const userPrompt = [
    `Write in the past tense, active voice.`,
    `Start with a title, then a summary of key changes.`,
    `Group by type of work, order by importance, and use relevant emojis.`,
    `Summarize minor updates into brief points.`,
    `Write in simple, witty language.`,
    `Plain text only, no formatting.`,
    `Keep it short unless needed, summarize multiple similar changes.`,
  ].join('\n');

  // Limit commit messages to avoid exceeding API limits
  const limitedCommitMessages = commitMessagesList.slice(-50).join('\n');

  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt } as const,
    { role: "user", content: userPrompt } as const,
    { role: "user", content: "Commit messages:" } as const,
    { role: "user", content: limitedCommitMessages } as const,
    { role: "assistant", content: "Report:" } as const
  ];

  const maxRetries = 5;
  let delay = 2000; // Start with 2s delay for exponential backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 300,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        temperature: 0.5,
        top_p: 1,
        n: 1
      });

      return response.data.choices[0]?.message?.content || '';

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`⚠️ Rate limit hit. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 2s → 4s → 8s...
      } else {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
    }
  }

  throw new Error('Failed to generate report after multiple retries.');
};
