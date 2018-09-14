// const WebSocketClient = require('websocket').client
const fs = require('fs')
const WebSocket = require('ws')
const ReconnectingWebSocket = require('./node_modules/reconnecting-websocket/dist/reconnecting-websocket-cjs')
// const uuid = require('uuid/v4')
const MarkovJa = require('markov-ja')
const fetch = require('node-fetch')
const Database = require('./database/index.js')

/**
 * @prop {User} me このbotのユーザー情報。
 * @prop {MarcovJa} markov マルコフ連鎖をするためのインスタンス。
 * @prop {object} config 接続先インスタンスなどの設定。
 * @prop {conn} connection WebSocketのタイムラインへの接続。
 * @prop {bool} interrupted botを中断するべきか否かのフラグ。
 */
class Ai {
  constructor (config) {
    this.config = config
    this.unsavedPostCount = 0
    this.markov = new MarkovJa()
    this.markov.mecab.commandOptions = this.config.mecab.commandOptions
    this.interrupted = false
    this.database = Database.create(config.database.type, this.markov, this.config)
    this.database.load()
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
    // console.log('onMessage')
    if (msg.type === 'note' && msg.body.userId !== this.me.id &&
      !msg.body.user.isBot) {
      this.markov.learn((msg.body.text || '').replace(/(@.+)?\s/, ''))
      this.database.databaseSync()

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

    // #region Timeline
    this.connection = new ReconnectingWebSocket(`${this.config.wsURL}/hybrid-timeline?i=${this.config.token}`, [], {
      WebSocket: WebSocket
    })
    this.connection.addEventListener('open', () => {
      console.log('connected!', Date())
    })
    this.connection.addEventListener('close', () => {
      console.log('disconnedted!', Date())
      if (!this.interrupted) this.connection.reconnect()
    })
    this.connection.addEventListener('message', message => {
      let msg = JSON.parse(message.data)

      this.onMessage(msg, false)
    })
    // #endregion
  }
  async onMention (body, isDM) {
    // console.log('onMention')
    // 他人へのリプライとなる @…… の部分は削除します。
    let text = body.text.replace(/(@.+)?\s/, '')
    if (isDM) {

    } else {
      // console.log('onMention - else')
      // console.log(body)
      // console.log(body.id)
      let speech
      try {
        speech = this.markov.generate(this.config.sentenceLength || 2).join('\n')
      } catch (e) {
        speech = '...'
      }
      let res = await this.api('notes/create', {
        replyId: body.id,
        text: speech,
        visibility: this.config.visibility
      })
      // console.log(res)
      let resText = await res.text()
      // console.log(resText)
    }
  }
  onInterrupt () {
    this.interrupted = true
    this.connection.close()
    this.database.save()
  }
}

module.exports = Ai
