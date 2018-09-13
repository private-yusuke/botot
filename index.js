const config = require('./config.json')

config.baseURL = config.baseURL || 'https://misskey.xyz'
config.wsURL = config.wsURL || 'wss://misskey.xyz'
config.apiURL = `${config.baseURL}/api`
config.token = config.token || ''

const Ai = require('./ai.js')

let ai = new Ai()
async function main () {
  await ai.init(config)
}

main()
