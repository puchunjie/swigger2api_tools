#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');

// 导入命令处理模块
const { initCommand } = require('../lib/commands/init');
const { generateCommand } = require('../lib/commands/generate');

// 设置程序信息
program
  .name('swigger2api')
  .description('A powerful CLI tool to generate TypeScript/JavaScript API code from Swagger/OpenAPI documentation')
  .version(require('../package.json').version);

// init 命令
program
  .command('init')
  .description('Initialize swigger2api configuration file')
  .option('-l, --language <language>', 'specify language (js|ts)', 'ts')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      console.error(chalk.red('❌ Error during initialization:'), error.message);
      process.exit(1);
    }
  });

// generate 命令
program
  .command('generate')
  .description('Generate API code from Swagger/OpenAPI documentation')
  .option('-f, --force', 'force regenerate even if no changes detected')
  .option('-c, --config <path>', 'specify config file path', './swigger2api.config.js')
  .action(async (options) => {
    try {
      await generateCommand(options);
    } catch (error) {
      console.error(chalk.red('❌ Error during generation:'), error.message);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse();

// 如果没有提供任何命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}