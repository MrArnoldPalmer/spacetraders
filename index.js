'use strict'

const vorpal = require('vorpal')()
const pkg = require('./package.json')
const chalk = vorpal.chalk
const clear = require('clear')
const figlet = require('figlet')

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
require('./commands')(vorpal)

// initiate REPL
vorpal
  .delimiter('spacetraders$')
  .show();
