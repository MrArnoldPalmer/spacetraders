'use strict'

const vorpal = require('vorpal')()
const clear = require('clear')
const figlet = require('figlet')
const Auth = require('./lib/auth')
const Preferences = require('preferences')
const pkg = require('./package.json')
const config = require('./lib/config')
const chalk = vorpal.chalk
const prefs = new Preferences(pkg.name)

const client = {
  vorpal,
  config: prefs,
  auth: new Auth(config, prefs)
}

// Show banner
clear()
console.log(
  chalk.yellow(figlet.textSync('SpaceTraders', {
    horizontalLayout: 'right smushing',
    font: 'Small Slant'
  }))
)
console.log(chalk.bold.green('\n  Online Space Trading MMORPG'))
console.log(chalk.cyan(`  Version ${pkg.version}\n`))
console.log(chalk.white('  Type `help` see available commands. \n'))

// fetch and instantiate all commands
require('./commands')(client)

// initiate REPL
vorpal
  .delimiter('spacetraders$')
  .show();

// catch any unknown commands
vorpal
  .catch('[words...]', 'Catches incorrect commands')
  .action(function (args, cb) {
    this.log(args.words.join(' ') + ' is not a valid SpaceTraders command.\n');
    cb();
  });
