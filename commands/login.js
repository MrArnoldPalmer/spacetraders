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
      return new Promise((resolve, reject) => {
        if (auth.user) {
          if (!auth.user.emailVerified) {
            cb(vorpal.chalk.yellow('Please verify your email by clicking the\nverification link sent to: ') + vorpal.chalk.bold(auth.user.email) + '\n')
          }
          cb(vorpal.chalk.green('Currently logged in as: ') + vorpal.chalk.bold(auth.user.email) + '\n')
          return
        }
        resolve()
      }).then(() => {
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
            type: 'confirm',
            name: 'reauth',
            message: `Log in with ${vorpal.chalk.bold(config.credentials.email)}?`,
            when() {
              if (config.credentials) {
                return config.credentials.email
              }
              return false
            }
          },
          {
            type: 'list',
            name: 'provider',
            message: 'Choose authentication method',
            when(answers) {
              return !args.options['update-usage-collection'] && !answers.reauth
            },
            choices: [
              { value: 'email', name: 'Email and Password' },
              { value: 'google', name: 'Google (disabled)', disabled: true},
              { value: 'facebook', name: 'Facebook (disabled)', disabled: true },
              { value: 'phone', name: 'Phone Number (disabled)', disabled: true }
            ]
          }
        ])
      }).then(({collectUsage, provider, reauth}) => {
        clear()
        if (collectUsage) {
          config.usage = collectUsage
          this.log(vorpal.chalk.green('CLI usage preference saved.\n'))
          if (args.options['update-usage-collection']) return
        }
        if (reauth) {
          return auth.signInWithEmailAndPassword()
        }
        this.log(vorpal.chalk.yellow('Authenticating with email and password...\n'))
        return auth.login(provider)
      }).then((user) => {
        if (user.emailVerified) {
          this.log(vorpal.chalk.green('Successfully logged in as: ') + vorpal.chalk.bold(user.email) + '\n');
          cb()
          return
        }
        cb()
        return
      }).catch(error => {
        switch (error.code) {
          case 'auth/user-not-found':
            return auth.createUserWithEmailAndPassword()
            break;
          case 'auth/wrong-password':
            this.log(vorpal.chalk.bold('Invalid Password') + ' please try again.\n');
            return auth.emailProvider({passwordOnly: true}).then(user => {
              this.log(vorpal.chalk.green('Successfully logged in as: ') + vorpal.chalk.bold(user ? user.email : config.user.email) + '\n');
            })
            break;
          default:
            this.log('Sign In Error: ', error.code)
            throw new Error(error)
        }
      })
    })
}
