const FlexibleDatabase = require('./flexibleDatabase.js')
const OnlyOneDatabase = require('./onlyOneDatabase.js')

class Database {
  static create (type, markov, config) {
    switch (type.toLowerCase()) {
      case 'flexible':
        return new FlexibleDatabase(markov, config)
      case 'onlyone':
        return new OnlyOneDatabase(markov, config)
      default:
        return new OnlyOneDatabase(markov, config)
    }
  }
}

module.exports = Database
