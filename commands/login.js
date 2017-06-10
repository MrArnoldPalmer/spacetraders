const clear = require('clear')
const CLI = require('clui')
const Spinner = CLI.Spinner
const spinAuth = new Spinner('Authenticating you, please wait...')

module.exports = function(client) {
  const {vorpal, config, auth} = client

  vorpal
    .command('login')
    .description('log the CLI into SpaceTraders API')
    .option('-r', '--reauth', 'force reauthentication even if already logged in')
    .option('-v', '--resend-verification', 'resends verification email')
    .action(function(args, cb) {
      clear()
      let promises = []

      if (typeof config.usages === 'undefined') {
        promises.push(this.prompt([
          {
            type: 'confirm',
            name: 'collectUsage',
            message: 'Allow SpaceTraders to collect anonymous CLI usage information?'
          }
        ]).then(answers => {
          config.usage = answers.collectUsage
          clear()
          this.log(vorpal.chalk.green('CLI usage preference saved.\n'))
          return Promise.resolve()
        }))
      }
      return Promise.all(promises).then(() => cb())
    });
}
