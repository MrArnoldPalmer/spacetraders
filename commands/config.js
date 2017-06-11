const clear = require('clear')

module.exports = function(client) {
  const {vorpal, config, auth} = client

  vorpal
    .command('config')
    .description('print config')
    .action(function(args, cb) {
      clear()
      cb(config)
    })
}
