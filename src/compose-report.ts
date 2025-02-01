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
    `Your **main goal** is to summarize these changes while highlighting any updates to **slash commands and their arguments**.`,
    `Clearly mention any modified, added, or removed commands and explain the changes in a way that helps moderators understand their impact.`,
    `If arguments for a command changed, list them and explain their purpose (e.g., "Added a \`reason\` argument to \`/warn\` to allow specifying why a user was warned").`,
    `You should explain how each change **affects the bot’s behavior**, including changes to commands, roles, permissions, or any bug fixes.`,
    `If a change affects **support workflows or moderation actions**, make sure to highlight that.`,
    `Do NOT include unnecessary technical details—focus on practical impact.`
  ].join('\n');

  const userPrompt = [
    `Write in the past tense, active voice.`,
    `Start with a **clear title** (e.g., "Moderation Update: Role Management Improved").`,
    `Group changes into sections (e.g., 🛠 **Bug Fixes**, 🚀 **New Features**, ⚙️ **Improvements**).`,
    `Explain **how these changes impact moderators and support staff**.`,
    `Use **concise, simple wording**—avoid complex technical terms.`,
    `If a change affects bot behavior, **describe it clearly** (e.g., "The mute command now includes a 24-hour timeout option").`,
    `**If a slash command was changed, explicitly mention the command name and list any changes.**`,
    `For example: "The \`/mute\` command now requires a \`duration\` argument."`,
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
        model: "gpt-4o",
        messages,
        max_tokens: 1200,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
        temperature: 0.4,
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
