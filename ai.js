// const WebSocket = require('ws')
const WebSocketClient = require('websocket').client
const fs = require('fs')
var client = new WebSocketClient()
const uuid = require('uuid/v4')
const MarkovJa = require('markov-ja')
const fetch = require('node-fetch')

/**
 * @prop {User} me このbotのユーザー情報。
 * @prop {MarcovJa} markov マルコフ連鎖をするためのインスタンス。
 * @prop {object} config 接続先インスタンスなどの設定。
 * @prop {conn} conn 接続。
 * @prop {number} unsavedPostCount this.config.saveFrequency 回の投稿ごとに、データベースに保存します。
 */
class Ai {
  constructor (config) {
    this.config = config
    this.unsavedPostCount = 0
    this.markov = new MarkovJa()
    try {
      this.markov.loadDatabase(fs.readFileSync(this.config.databasePath), 'utf-8')
    } catch (e) {
      this.markov.loadDatabase('{}')
    }
  }
  api (endpoint, body = {}) {
    let url = `${this.config.apiURL}/${endpoint}`
    // console.log('calling', url)
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(Object.assign({
        'i': this.config.token
      }, body)) })
  }
  onMessage (msg, isDM) {
    if (msg.type === 'note' && msg.body.userId !== this.me.id) {
      this.markov.learn((msg.body.text || '').replace(/(@.+)?\s/, ''))
      if (this.unsavedPostCount >= this.config.saveFrequency) {
        this.unsavedPostCount = 0
        fs.writeFile(this.config.databasePath, this.markov.exportDatabase(), 'utf-8', function () {
          console.log('database successfully saved')          
        })
      } else this.unsavedPostCount++

      console.log(`${msg.body.user.name}(@${msg.body.user.username}): ${msg.body.text}`)

      // 自分が送信したものには反応しません。また、自分へのリプライでないと反応しません。
      if ((msg.body.text || '').indexOf(`@${this.me.username}`) >= 0) {
        this.onMention(msg.body, isDM)
      }
    }
  }
  async init () {
    var res = await this.api('i')
    var text = await res.text()
    this.me = JSON.parse(text)
    console.log(`I am ${this.me.name}(@${this.me.username}), whose id is ${this.me.id}.`)

    client.on('connect', conn => {
      this.conn = conn
      console.log('connected!', Date())

      conn.on('message', message => {
        var msg = JSON.parse(message.utf8Data)
        this.onMessage(msg, false)
      })
    })
    client.connect(`${this.config.wsURL}/hybrid-timeline?i=${this.config.token}`)
  }
  async onMention (body, isDM) {
    // 他人へのリプライとなる @…… の部分は削除します。
    let text = body.text.replace(/(@.+)?\s/, '')
    if (isDM) {

    } else {
      // console.log(body)
      // console.log(body.id)
      let res = await this.api('notes/create', { replyId: body.id, text: this.markov.generate(2).join('\n') })
      // console.log(res)
      let resText = await res.text()
      // console.log(rest)
    }
  }
  onInterrupt () {
    this.conn.close()
    fs.writeFileSync(this.config.databasePath, this.markov.exportDatabase(), 'utf-8')
  }
}

module.exports = Ai
