import Discord from 'discord.js'

export const sendDiscordMessage = async (
    channel: string,
    message: string
): Promise<void> => {
  const discord = new Discord.Client({ intents: [] })
  await discord.login(process.env.DISCORD_BOT_TOKEN)

  const discordChannel = await discord.channels.fetch(String(channel))

  if (!discordChannel) {
    throw new Error(`Discord channel ${channel} not found`)
  }

  if (!discordChannel.isTextBased()) {
    throw new Error(`Discord channel ${channel} is not text-based`)
  }

  // Split the message into multiple parts if necessary
  const messages = splitMessage(message, 2000)

  for (const msgPart of messages) {
    await discordChannel.send(
        Discord.MessagePayload.create(discordChannel, {
          content: msgPart
        })
    )
  }

  discord.destroy()
}

/**
 * Splits a long message into smaller chunks, ensuring each part is ≤ 2000 characters.
 */
const splitMessage = (message: string, maxLength: number = 2000): string[] => {
  const messages: string[] = []
  let currentMessage = ''

  for (const line of message.split('\n')) {
    if ((currentMessage + '\n' + line).length > maxLength) {
      messages.push(currentMessage.trim()) // Push the current message
      currentMessage = line // Start a new message
    } else {
      currentMessage += '\n' + line
    }
  }

  if (currentMessage.trim().length > 0) {
    messages.push(currentMessage.trim()) // Push the last part
  }

  return messages
}