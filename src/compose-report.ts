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
    `You're writing a report that will be sent to the support/moderation team`,
    `You're taking a list of commit messages as input.`,
    `Your goal is to summarize important and impactful changes from commit messages to our support team of server moderators.`,
    `It's important that you help the support staff understand which part of the code that has changed.`,
    'You should also help them understand the impact of the changes on the bots behavior in a language that they can understand.',
  ].join('\n');

  const userPrompt = [
    `Write what we've done in the past tense, active voice.`,
    `Start with a title, then a brief summary of the most important changes.`,
    `Group by the type of work, order by importance, and use relevant emojis.`,
    'Squash updates that are not important, or that are too specific into brief summaries.',
    'Write in simple, casual, witty language.',
    'Talk about the changes in a way that the moderation team can understand.',
    'Be concise, but not too concise. Summarise multiple similar changes.',
    'Write in plain text, with no formatting.',
    `Keep it short, summarise changes when there's many of them.`
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
        model: "gpt-4",
        messages,
        max_tokens: 800,
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
