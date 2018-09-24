const fs = require('fs')
const moment = require('moment')

/**
 * 一つのデータベースのファイルで管理します。
 * configでmaxSizeを0に設定すると、無制限でデータベースを拡張しつづけます。
 * それ以外の場合、maxSizeバイトの大きさになったら、データベースを保管し、初期化します。
 * @prop {number} unsavedPostCount this.config.saveFrequency 回の投稿ごとに、データベースに保存します。
 */
class OnlyOneDatabase {
  constructor (markov, config) {
    this.markov = markov
    this.config = config
    this.unsavedPostCount = 0
  }
  databaseSync () {
    if (this.unsavedPostCount >= this.config.database.saveFrequency) {
      this.unsavedPostCount = 0
      this.save()
    } else this.unsavedPostCount++
  }
  load () {
    try {
      this.markov.loadDatabase(fs.readFileSync(this.config.database.path), 'utf-8')
    } catch (e) {
      this.markov.loadDatabase('{}')
    }
  }
  save () {
    fs.writeFileSync(this.config.database.path, this.markov.exportDatabase(), 'utf-8')
    if (this.config.database.maxSize !== 0) {
      const size = fs.statSync(this.config.database.path).size
      if (size >= this.config.database.maxSize) {
        console.log(`database is too big. max = ${this.config.database.maxSize} <= size = ${size}.`)
        console.log('renaming the database file.')
        fs.renameSync(this.config.database.path, `${this.config.database.path}-${moment().unix()}.json`)
        this.markov.loadDatabase('{}')
      }
    }
  }
}

module.exports = OnlyOneDatabase
