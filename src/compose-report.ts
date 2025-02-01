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
    `You're a software delivery assistant working in a team of software developers (us) developing a Discord bot.`,
    `Your task is to generate a clear, concise report summarizing key changes made in the last ${daysCount} days.`,
    `This report will be sent to our support and moderation team, so clarity is critical.`,
    `You'll receive a list of commit messages as input.`,
    `Your goal is to summarize the important and impactful changes in **plain, simple language** that moderators can understand.`,
    `You should explain how each change **affects the bot’s behavior**, including changes to commands, roles, permissions, or any bug fixes.`,
    `If a change affects **support workflows or moderation actions**, make sure to highlight that.`,
    `Do NOT include unnecessary technical details—focus on practical impact.`
  ].join('\n');

  const userPrompt = [
    `Write in the past tense, active voice.`,
    `Start with a **clear title** (e.g., "Moderation Update: Role Management Improved").`,
    `Provide a **brief summary** of the most important changes.`,
    `Group changes into sections (e.g., 🛠 **Bug Fixes**, 🚀 **New Features**, ⚙️ **Improvements**).`,
    `Explain **how these changes impact moderators and support staff**.`,
    `Use **concise, simple wording**—avoid complex technical terms.`,
    `If a change affects bot behavior, **describe it clearly** (e.g., "The mute command now includes a 24-hour timeout option").`,
    `Write in **plain text**, no formatting.`,
    `Summarize multiple small changes together when possible.`
  ].join('\n');

  // Limit commit messages to avoid exceeding API limits
  const commitMessages = commitMessagesList.join('\n'); // No hard limit

  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt } as const,
    { role: "user", content: userPrompt } as const,
    { role: "user", content: "Commit messages:" } as const,
    { role: "user", content: commitMessages } as const,
    { role: "assistant", content: "Report:" } as const
  ];

  const maxRetries = 5;
  let delay = 2000; // Start with 2s delay for exponential backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-4-turbo",
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
