'use strict';

const firebase = require('firebase')
const inquirer = require('inquirer')
const chalk = require('chalk')
const clear = require('clear')
const CLI = require('clui')
const Spinner = CLI.Spinner

class Auth {
  constructor(config, prefs) {
    this.config = prefs
    firebase.initializeApp(config.firebase);
  }

  get user() {
     return firebase.auth().currentUser
  }

  login(provider) {
    switch (provider) {
      case 'email':
        return this.emailProvider()
      default:
        throw new Error('Invalid Provider: ', provider)
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
    return inquirer.prompt(questions).then((answers) => {
      if (options.passwordOnly) {
        answers.email = this.config.credentials.email
      }
      return this.signInWithEmailAndPassword(answers)
    })
  }

  signInWithEmailAndPassword(credentials) {
    // Sign In User
    const spinAuth = new Spinner('Authenticating, please wait...')
    const {email, password} = credentials
    console.log('config', this.config)
    this.config.credentials = credentials

    clear()
    spinAuth.start()
    return new Promise((resolve, reject) => {
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(user => {
          spinAuth.stop()
          this.config.user = user
          if (!user.emailVerified) {
            clear()
            console.log(chalk.yellow('Please verify your email by clicking the verification link \nsent to: ') + chalk.bold(user.email) + '\n')
            resolve()
          }
          resolve(user)
        })
        .catch(error => {
          spinAuth.stop()
          this.config.error = error
          reject(error)
        })
    })
  }

  createUserWithEmailAndPassword() {
    return inquirer.prompt([
      {
        type: 'confirm',
        name: 'new',
        message: 'This user does not exist, would you like to create a new account with this email?'
      }
    ]).then(answers => {
      if (answers.new) {
        return firebase.auth().createUserWithEmailAndPassword(this.config.credentials.email, this.config.credentials.password)
      }
      delete this.config.credentials
      return this.emailProvider()
    }).then(() => {
      this.config.user = firebase.auth().currentUser
      return this.sendEmailVerification()
    }).catch(error => {
        switch (error.code) {
          default:
            console.log('Create User Error: ', error.code)
            throw new Error(error)
        }
      })
  }

  collectUsage() {
    return inquirer.prompt([
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
      if (credentials) {
        return firebase.auth().signInWithEmailAndPassword(credentials.email, credentials.password)
          .then(user => {
            this.user = user
            if (user.emailVerified) {
              return resolve()
            }
            user.resendOnly = true
            return resolve(user)
          })
          .catch(error => { throw new Error(error.message) })
      }
      return resolve(this.user)
    }).then((user) => {
      if (user) {
        return user.sendEmailVerification().then(() => {
          clear()
          console.log(chalk.bold(!user.resendOnly ? 'User Created!' : 'Email Resent!') + ' Please check your email for a verification link')
          return Promise.resolve()
        })
      }
      clear()
      console.log(chalk.bold(config.user.email) + ' is already verified!')
      return Promise.resolve()
    })
  }
}

module.exports = Auth
