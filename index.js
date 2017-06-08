'use strict'

const vorpal = require('vorpal')()
const pkg = require('./package.json')
const chalk = vorpal.chalk
const clear = require('clear')
const CLI = require('clui')
const figlet = require('figlet')
const Preferences = require('preferences')
const Spinner = CLI.Spinner

clear()
console.log(
  chalk.yellow(figlet.textSync('SpaceTraders', {
    horizontalLayout: 'universal smushing',
    font: 'Small Slant'
  }))
)
console.log(chalk.bold.green('\n  Online Space Trading MMORPG'))
console.log(chalk.cyan(`  Version ${pkg.version}\n`))

vorpal
  .command('login')
  .description('log the CLI into SpaceTraders API')
  .option('-r', '--reauth', 'force reauthentication even if already logged in')
  .option('-v', '--resend-verification', 'resends verification email')
  .action(function(args, cb) {
    clear()
    this.log('logging in...');
    cb();
  });

  vorpal
  .delimiter('spacetraders$')
  .show();
