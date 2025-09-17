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
    let configPath = null;
    if (options.config !== './swigger2api.config.js') {
      // 用户指定了自定义配置文件路径
      configPath = path.resolve(process.cwd(), options.config);
    }
    
    console.log('🔍 调试信息:');
    console.log('   当前工作目录:', process.cwd());
    console.log('   配置文件路径:', configPath);
    
    // 如果是默认路径或指定路径不存在，使用自动检测
    const config = await loadConfig(configPath);
    
    console.log('   加载的配置:', config ? '成功' : '失败');
    if (config) {
      console.log('   配置文件目录:', config._configDir);
    }
    
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