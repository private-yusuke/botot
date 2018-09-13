const WebSocket = require('ws')
const WebSocketClient = require('websocket').client
var client = new WebSocketClient()
const uuid = require('uuid/v4')
const MarcovJa = require('marcov-ja')
var marcov = new MarcovJa()
const fetch = require('node-fetch')

/**
 * @prop {User} me このbotのユーザー情報。
 */
class Ai {
  async init (config) {
    this.config = config
    var res = await fetch(`${config.apiURL}/i`, { method: 'POST', body: JSON.stringify({ 'i': config.token }) })
    var text = await res.text()
    this.me = JSON.parse(text)
    console.log(this.me)

    client.on('connect', conn => {
      console.log('connected!', Date())

      conn.on('message', message => {
        var msg = JSON.parse(message.utf8Data)
        // console.log(msg)
        if (msg.type === 'note') {
          var text = msg.body.text || ''
          console.log(text, msg.body.user.name)
          // console.log(text.indexOf(`@${this.me.username}`))
          if (msg.body.userId !== this.me.id && text.indexOf(`@${this.me.username}`) >= 0) {
            this.onMention(msg.body, false)
          }
        }
      })
    })
    client.connect(`${config.wsURL}/hybrid-timeline?i=${config.token}`)
  }
  onMention (body, isDM) {
    console.log(body.text)
  }
}

module.exports = Ai
