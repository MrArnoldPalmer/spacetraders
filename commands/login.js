const clear = require('clear')

module.exports = function(client) {
  const {vorpal, config, auth} = client

  vorpal
    .command('login')
    .description('log the CLI into SpaceTraders API')
    .option('-r, --reauth', 'force reauthentication even if already logged in')
    .option('-v, --resend-verification', 'resends verification email')
    .option('-u, --update-usage-collection', 'changes usage collection preferences')
    .action(function(args, cb) {
      clear()
      return this.prompt([
        {
          type: 'confirm',
          name: 'collectUsage',
          message: 'Allow SpaceTraders to collect anonymous CLI usage information?',
          when() {
            return typeof config.usage === 'undefined' || args.options['update-usage-collection']
          }
        },
        {
          type: 'list',
          name: 'provider',
          message: 'Choose authentication method',
          when() { return !args.options['update-usage-collection'] },
          choices: [
            { value: 'email', name: 'Email and Password' },
            { value: 'google', name: 'Google (disabled)', disabled: true},
            { value: 'facebook', name: 'Facebook (disabled)', disabled: true },
            { value: 'phone', name: 'Phone Number (disabled)', disabled: true }
          ]
        }
      ]).then(({collectUsage, provider}) => {
        clear()
        if (collectUsage) {
          config.usage = collectUsage
          this.log(vorpal.chalk.green('CLI usage preference saved.\n'))
          if (args.options['update-usage-collection']) return
        }
        return auth.login(provider)
      }).then(user => {
        this.log({user})
      }).catch(error => {
        switch (error.code) {
          case 'auth/user-not-found':
            return auth.createUserWithEmailAndPassword()
            break;
          case 'auth/wrong-password':
            this.log(vorpal.chalk.bold('Invalid Password') + ' please try again.\n');
            return auth.emailProvider({passwordOnly: true})
            break;
          default:
            this.log('Sign In Error: ', error.code)
            throw new Error(error.message)
        }
      })
    })
}
