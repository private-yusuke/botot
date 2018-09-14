const fs = require('fs')

/**
 * 一つのデータベースのファイルで管理します。
 * データが肥大化していきます。
 * @prop {number} unsavedPostCount this.config.saveFrequency 回の投稿ごとに、データベースに保存します。
 */
class OnlyOneDatabase {
  constructor (markov, config) {
    this.markov = markov
    this.config = config
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
    fs.writeFile(this.config.database.path, this.markov.exportDatabase(), 'utf-8', function () {
      console.log('database successfully saved')
    })
  }
}

module.exports = OnlyOneDatabase
