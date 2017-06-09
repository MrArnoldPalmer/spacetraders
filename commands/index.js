const utils = require('../lib/utils')

module.exports = (vorpal) => {
  utils.getCommands().forEach(command => {
    if (command === 'index') { return }
    require(`./${command}`)(vorpal)
  })
}
