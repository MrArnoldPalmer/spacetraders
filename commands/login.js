const clear = require('clear')
const Preferences = require('preferences')
const CLI = require('clui')
const Spinner = CLI.Spinner

module.exports = function(vorpal) {
  vorpal
    .command('login')
    .description('log the CLI into SpaceTraders API')
    .option('-r', '--reauth', 'force reauthentication even if already logged in')
    .option('-v', '--resend-verification', 'resends verification email')
    .action(function(args, cb) {
      clear()
      this.log(args)
      let status = new Spinner('Authenticating you, please wait...');
      return this.prompt({
        type: 'confirm',
        name: 'continue',
        default: true,
        message: 'Testing Async. Continue?'
      })
      .then(answer => {
        status.start();
        return this.prompt({type: 'confirm', name: 'continue', default: true, message: 'Testing Async Again. Continue?'})
      }).then(answer => {
        status.stop()
        cb()
      })
    });
}
