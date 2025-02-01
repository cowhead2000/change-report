const dotenv = require('dotenv')
const {fetchCommitMessages} = require('./lib/fetch-commit-messages')
const {composeReport} = require('./lib/compose-report')
const {sendDiscordMessage} = require('./lib/send-discord-message')

dotenv.config()

const main = async () => {
  const daysCount = 7
  const channel = '1208076799830134847'

  const commitMessages = await fetchCommitMessages(daysCount)
  const report = await composeReport(daysCount, commitMessages)

  console.log(report)

  await sendDiscordMessage(channel, report)
}

main()
