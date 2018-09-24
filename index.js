const config = require('./config.json')
const t = require('./token.json')

config.baseURL = config.baseURL || 'https://misskey.xyz'
config.wsURL = config.wsURL || 'wss://misskey.xyz'
config.apiURL = `${config.baseURL}/api`
config.token = t.token || ''
function getTimelineURL (type) {
  switch (type) {
    case 'hybrid':
      return `${config.wsURL}/hybrid-timeline?i=${config.token}`
    case 'social':
      return `${config.wsURL}/hybrid-timeline?i=${config.token}`
    case 'global':
      return `${config.wsURL}/global-timeline?i=${config.token}`
    case 'local':
      return `${config.wsURL}/local-timeline?i=${config.token}`
    case 'home':
      return `${config.wsURL}/?i=${config.token}`
    default:
      console.warn('timeline isn\'t specified, using home timeline.')
      return `${config.wsURL}/?i=${config.token}`
  }
}
config.timelineURL = getTimelineURL(config.timeline)

const Ai = require('./ai.js')

let ai = new Ai(config)
async function main () {
  await ai.init()
}
process.on('SIGINT', async function () {
  console.log('Caught interrupt signal, killing myself…')
  await ai.onInterrupt()
})
main()
