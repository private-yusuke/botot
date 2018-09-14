const config = require('./config.json')
const t = require('./token.json')

config.baseURL = config.baseURL || 'https://misskey.xyz'
config.wsURL = config.wsURL || 'wss://misskey.xyz'
config.apiURL = `${config.baseURL}/api`
config.token = t.token || ''

const Ai = require('./ai.js')

let ai = new Ai(config)
async function main () {
  await ai.init()
}
process.on('SIGINT', function () {
  console.log('Caught interrupt signal, killing myself…')
  ai.onInterrupt()
})
process.on('SIGKILL', function () {
  console.log('get killed by another process! shutting down...')
  ai.onInterrupt()
})
main()
