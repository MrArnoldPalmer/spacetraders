'use strict';

const inquirer = require('inquirer')
const chalk = require('chalk')
const opn = require('opn')
const path = require('path')
const clear = require('clear')
const CLI = require('clui')
const express = require('express')
const bodyParser = require('body-parser')
const Spinner = CLI.Spinner
const firebaseAuth = require('./config').firebase

class Auth {
  constructor(config, vorpal, firebase) {
    this.config = config
    this.vorpal = vorpal
    this.firebase = firebase
    this.firebase.initializeApp(firebaseAuth);
  }

  get db() {
    return this.firebase.database()
  }

  get user() {
     return this.firebase.auth().currentUser
  }

  onAuthStateChanged(callback) {
    return this.firebase.auth().onAuthStateChanged(callback)
  }

  login(provider) {
    switch (provider) {
      case 'email':
        return this.emailProvider()
      case 'google':
        return this.googleProvider()
      default:
        throw new Error('Invalid Provider: ', provider)
    }
  }

  emailProvider(options = {}) {
    let questions = []
    this.vorpal.log(chalk.yellow('Authenticating with email and password...\n'))
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
      this.config.credentials = answers
      return this.signInWithEmailAndPassword()
    })
  }

  googleProvider(options = {}) {
    this.vorpal.log(chalk.yellow('Authenticating with Google...\n'))
    const port = 9005

    return this.localServer(port)
      .then(app => {
        return new Promise((resolve, reject) => {
          opn(`http://localhost:${port}/`)
        })
      })
    // start express app
    // open browser on port 9005
    // have browser automatically redirect to google oAuth endpoint and point back to localhost callback address
    // show success or fail html file (serve via `sendFile()`)
    // grab query parameters and authenticate on success callback
    // return user
    //
    // At some point dont forget to link accounts
  }

  localServer(port) {
    return new Promise((resolve, reject) => {
      const app = express()
      app.use(bodyParser.json())

      app.get('/', (req, res) => {
        res.sendFile(path.resolve('templates/redirect.html'))
      })
      app.get('/google/auth/callback', (req, res) => {
        console.log(req.body)
        res.send('success')
      })
      app.get('/google/auth/error', (req, res) => {
        console.log(req.body)
        res.send('failed')
      })

      app.listen(port, () => resolve(app))
    })
  }

  signInWithEmailAndPassword() {
    // Sign In User
    this.spinner = new Spinner('Authenticating, please wait...')

    clear()
    this.spinner.start()
    return new Promise((resolve, reject) => {
      this.firebase.auth().signInWithEmailAndPassword(this.config.credentials.email, this.config.credentials.password)
        .then(user => {
          this.spinner.stop()
          this.config.user = user
          if (!user.emailVerified) {
            clear()
            this.vorpal.log(chalk.yellow('Please verify your email by clicking the\nverification link sent to: ') + chalk.bold(user.email) + '\n')
            resolve(user)
          }
          resolve(user)
        })
        .catch(error => {
          this.spinner.stop()
          this.config.error = error
          reject(error)
        })
    })
  }

  createUserWithEmailAndPassword() {
    this.spinner = new Spinner('Creating new user, please wait...')
    return inquirer.prompt([
      {
        type: 'confirm',
        name: 'new',
        message: 'This user does not exist, would you like to create a new account with this email?'
      }
    ]).then(answers => {
      if (answers.new) {
        this.spinner.start()
        return this.firebase.auth().createUserWithEmailAndPassword(this.config.credentials.email, this.config.credentials.password)
      }
      this.config.credentials = {}
      return this.emailProvider()
    }).then(() => {
      this.config.user = this.firebase.auth().currentUser
      return this.sendEmailVerification()
    }).catch(error => {
        switch (error.code) {
          default:
            this.vorpal.log('Create User Error: ', error.code)
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
        return this.firebase.auth().signInWithEmailAndPassword(credentials.email, credentials.password)
          .then(user => {
            if (user.emailVerified) {
              return resolve()
            }
            user.resendOnly = true
            return resolve(user)
          })
          .catch(error => {
            this.spinner.stop()
            throw new Error(error.message)
          })
      }
      return resolve(this.user)
    }).then((user) => {
      this.spinner.message('Sending verification email, please wait...')
      if (user) {
        return user.sendEmailVerification().then(() => {
          clear()
          this.spinner.stop()
          this.vorpal.log(`Please click on the verification link\nsent to ${chalk.bold(user.email)}\n`)
          return Promise.resolve(user)
        })
      }
      clear()
      this.vorpal.log(chalk.bold(this.config.user.email) + ' is already verified!')
      return Promise.resolve()
    })
  }

  signOut() {
    this.config.credentials = {}
    delete this.config.user
    return this.firebase.auth().signOut()
  }
}

module.exports = Auth
