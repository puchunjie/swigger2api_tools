const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { loadConfig } = require('../utils/config');
const { generateApiCode } = require('../core/generator');

/**
 * 生成命令实现
 * @param {Object} options - 命令选项
 */
async function generateCommand(options) {
  console.log(chalk.blue('🚀 Starting API code generation...'));
  
  const spinner = ora('Loading configuration...').start();
  
  try {
    // 加载配置文件
    const configPath = path.resolve(process.cwd(), options.config);
    const config = await loadConfig(configPath);
    
    if (!config) {
      spinner.fail(chalk.red('❌ Configuration file not found'));
      console.log(chalk.yellow('💡 Run "swigger2api init" to create a configuration file first.'));
      return;
    }
    
    spinner.text = 'Validating configuration...';
    
    // 验证必要的配置项
    if (!config.source) {
      spinner.fail(chalk.red('❌ Missing required configuration: source'));
      console.log(chalk.yellow('💡 Please set the "source" field in your configuration file.'));
      return;
    }
    
    if (!config.projectName) {
      spinner.fail(chalk.red('❌ Missing required configuration: projectName'));
      console.log(chalk.yellow('💡 Please set the "projectName" field in your configuration file.'));
      return;
    }
    
    spinner.succeed(chalk.green('✅ Configuration loaded successfully'));
    
    // 执行代码生成
    await generateApiCode(config, {
      force: options.force,
      verbose: true
    });
    
    console.log(chalk.green('🎉 API code generation completed successfully!'));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Generation failed'));
    console.error(chalk.red('Error details:'), error.message);
    
    if (error.code === 'ENOENT') {
      console.log(chalk.yellow('💡 Make sure the configuration file exists and the source URL is accessible.'));
    }
    
    throw error;
  }
}

module.exports = {
  generateCommand
};