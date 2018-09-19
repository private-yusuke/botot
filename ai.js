// const WebSocketClient = require('websocket').client
const fs = require('fs')
const WebSocket = require('ws')
const moment = require('moment')
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

    if (this.config.intervalPost) {
      let duration = this.config.intervalPostDuration
      this.intervalObj = setInterval(async () => {
        let text = ''
        if (!this.connection) {
          await this.initSocket()
          text += '[WebSocket revived]\n'
          console.log('connection revived!')
        } else this.connection.reconnect()
        text += this.markov.generate(this.sentenceLength()).join('\n')
        let res = await this.api('notes/create', {
          text: text
        })
        let resText = await res.text()
        let json = JSON.parse(resText)
        if (json.error) {
          console.log(json.error)
        } else {
          console.log('successfully posted on setInterval')
        }
      }, moment.duration(duration[0], duration[1]))
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
    if (this.me.error) throw new Error(this.me.error)
    console.log(`I am ${this.me.name}(@${this.me.username}), whose id is ${this.me.id}.`)

    this.initSocket()
    // #endregion
  }
  async initSocket () {
    this.connection = new ReconnectingWebSocket(this.config.timelineURL, [], {
      WebSocket: WebSocket
    })
    this.connection.addEventListener('open', () => {
      console.log('connected!:', this.config.timeline, Date())
    })
    this.connection.addEventListener('close', () => {
      // console.log('disconnedted!', Date())
      if (!this.interrupted) this.connection.reconnect()
    })
    this.connection.addEventListener('message', message => {
      let msg = JSON.parse(message.data)

      this.onMessage(msg, false)
    })
  }
  sentenceLength () {
    function getRandomInt (max) {
      return Math.floor(Math.random() * Math.floor(max))
    }
    if (this.config.sentenceLength) return this.config.sentenceLength
    else if (this.config.sentenceLengthRange) {
      let l = this.config.sentenceLengthRange[0]
      let r = this.config.sentenceLengthRange[1]
      let m = r - l
      return getRandomInt(m + 1) + l
    }
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
        speech = this.markov.generate(this.sentenceLength()).join('\n')
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
    clearInterval(this.intervalObj)
  }
}

module.exports = Ai
