const fs = require('fs')
const moment = require('moment')

class FlexibleDatabase {
  constructor (markov, config) {
    this.markov = markov
    this.config = config
    this.duration = this.config.database.duration
    this.nextTime = moment().add(this.duration[0], this.duration[1])
    console.log('the next time is', this.nextTime)
  }
  databaseSync () {
    if (moment().isAfter(this.nextTime)) {
      this.nextTime = moment().add(this.duration[0], this.duration[1])
      console.log('the next time is', this.nextTime)
      this.syncSave()
    }
  }
  load () {
    try {
      this.markov.loadDatabase(fs.readFileSync(this.config.database.path), 'utf-8')
    } catch (e) {
      this.markov.loadDatabase('{}')
    }
  }
  syncSave () {
    fs.writeFile(`${this.config.database.path}-${moment().unix()}.json`, this.markov.exportDatabase(), 'utf-8', () => {
      console.log('database successfully saved')
    })
    this.markov.loadDatabase('{}')
  }
  save () {
    fs.writeFile(this.config.database.path, this.markov.exportDatabase(), 'utf-8', function () {
      console.log('database successfully saved')
    })
  }
}

module.exports = FlexibleDatabase
