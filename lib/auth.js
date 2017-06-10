'use strict';

const firebase = require('firebase')

class Auth {
  constructor(vorpal, config) {
    this.vorpal = vorpal
    this.config = config

    firebase.initializeApp(config.firebase);
  }

  login(provider) {
    switch (provider) {
      case 'email':
        return this.emailProvider()
      default:
        throw SpaceTradersError('Invalid Provider: ', provider)
    }
  }

  emailProvider(options = {}) {
    let questions = []
    if (!options.passwordOnly) {
      questions.push({
        type: 'input',
        name: 'email',
        message: 'Enter your email address',
        validate (val) {
          const emailRegex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
          return val.match(emailRegex) ? true : 'Please enter a valid email address'
        }
      })
    }
    questions.push({
      type: 'password',
      message: 'Enter your password',
      name: 'password',
      mask: '*',
      validate (val) {
        const passwordRegex = new RegExp(/^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})/)
        return val.match(passwordRegex) ? true : 'Password must be at least 6 characters long and contain at least one number or uppercase letter'
      }
    })
    return vorpal.prompt(questions).then((answers) => {
      if (options.passwordOnly) {
        answers.email = configstore.get('email')
      }
      return this.signInWithEmailAndPassword(answers)
    })
  }

  signInWithEmailAndPassword(credentials) {
    return new Promise((resolve, reject) => {

      // Collect CLI information
      if (configstore.get('usage') === null) {
        return vorpal.prompt([
          {
            type: 'confirm',
            name: 'collectUsage',
            message: 'Allow SpaceTraders to collect anonymous CLI usage information?'
          }
        ]).then(function(answers) {
          configstore.set('usage', answers.collectUsage)
        })
      }

      // Sign In User
      const {email, password} = credentials
      configstore.set('email', email)
      configstore.set('password', password)

      return firebase.auth().signInWithEmailAndPassword(email, password)
        .then(user => resolve(user))
        .catch(error => reject(error))
    }).then((user) => {
      this.user = user
      return user.getIdToken()
    }).then((token) => {
      this.token = token
      configstore.set('token', { token, expires: moment().unix() })

      if (!this.user.emailVerified) {
        logger.info()
        utils.logWarning(
          'Please verify your email address:\n   ' +
          chalk.bold(this.user.email) +
          '\n\n   To log in with a different account, enter:\n   ' +
          chalk.bold('spacetraders login --reauth') +
          '\n\n   To resend verification email, enter:\n   ' +
          chalk.bold('spacetraders login --resend-verification'))
        logger.info()
        return
      }

      logger.info()
      utils.logSuccess(
        'Success! Logged in as ' +
        chalk.bold(this.user.email)
      )
      logger.info()
      return Promise.resolve()
    }).catch(error => {
        this.processing = false
        switch (error.code) {
          case 'auth/user-not-found':
            return this.createUserWithEmailAndPassword()
            break;
          case 'auth/wrong-password':
            logger.warn();
            utils.logWarning(chalk.bold('Invalid Password') + ' please try again.');
            logger.warn();
            return this.emailProvider({passwordOnly: true})
            break;
          default:
            console.log('Sign In Error: ', error.code)
            throw new SpaceTradersError(error.message, {exit: 2})
        }
      })
  }

  createUserWithEmailAndPassword() {
    return vorpal.prompt([
      {
        type: 'confirm',
        name: 'new',
        message: 'This user does not exist, would you like to create a new account with this email?'
      }
    ]).then(answers => {
      if (answers.new) {
        return firebase.auth().createUserWithEmailAndPassword(configstore.get('email'), configstore.get('password'))
      }
      configstore.delete('email')
      configstore.delete('password')
      logger.info()
      utils.logWarning(chalk.bold('Okay') + ', lets try something else.');
      logger.info()
      return this.emailProvider()
    }).then(() => {
      this.user = firebase.auth().currentUser
      return this.sendEmailVerification()
    }).catch(error => {
        this.processing = false
        switch (error.code) {
          default:
            console.log('Create User Error: ', error.code)
            throw new SpaceTradersError(error.message, {exit: 2})
        }
      })
  }

  collectUsage() {
    return vorpal.prompt([
      {
        type: 'confirm',
        name: 'collectUsage',
        message: 'Allow SpaceTraders to collect anonymous CLI usage information?'
      }
    ]).then(function(answers) {
      config.usage = answers.collectUsage
      return Promise.resolve()
    })
  }

  sendEmailVerification(credentials) {
    return new Promise((resolve, reject) => {
      if(credentials) {
        return firebase.auth().signInWithEmailAndPassword(credentials.email, credentials.password)
          .then(user => {
            this.user = user
            if (user.emailVerified) {
              return resolve()
            }
            user.resendOnly = true
            return resolve(user)
          })
          .catch(error => { throw new SpaceTradersError(error.message) })
      }
      return resolve(this.user)
    }).then((user) => {
      if (user) {
        return user.sendEmailVerification().then(() => {
          logger.info()
          utils.logSuccess(chalk.bold(!user.resendOnly ? 'User Created!' : 'Email Resent!') + ' Please verify your email address and log in again')
          logger.info()
        })
      }
      logger.info()
      utils.logSuccess(chalk.bold(this.user.email) + ' is already verified!')
      logger.info()
    })
  }
}

module.exports = Auth
