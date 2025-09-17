const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');

/**
 * 初始化命令实现
 * @param {Object} options - 命令选项
 */
async function initCommand(options) {
  console.log(chalk.blue('🚀 Welcome to swigger2api!'));
  console.log(chalk.gray('Let\'s set up your project configuration.\n'));

  // 检查是否已存在配置文件
  const jsConfigPath = path.join(process.cwd(), 'swigger2api.config.js');
  const tsConfigPath = path.join(process.cwd(), 'swigger2api.config.ts');
  
  if (fs.existsSync(jsConfigPath) || fs.existsSync(tsConfigPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration file already exists. Do you want to overwrite it?',
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('⚠️  Initialization cancelled.'));
      return;
    }
  }

  // 如果没有通过命令行指定语言，则询问用户
  let language = options.language;
  if (!language || !['js', 'ts'].includes(language)) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Which language would you like to use?',
        choices: [
          { name: 'TypeScript (.ts)', value: 'ts' },
          { name: 'JavaScript (.js)', value: 'js' }
        ],
        default: 'ts'
      }
    ]);
    language = answers.language;
  }

  const spinner = ora('Generating configuration file...').start();

  try {
    // 生成配置文件
    const configFileName = `swigger2api.config.${language}`;
    const configPath = path.join(process.cwd(), configFileName);
    const templatePath = path.join(__dirname, '../../templates', `config.${language}.template`);
    
    // 读取模板文件
    const template = fs.readFileSync(templatePath, 'utf8');
    
    // 写入配置文件
    fs.writeFileSync(configPath, template);
    
    spinner.succeed(chalk.green(`✅ Configuration file created: ${configFileName}`));
    
    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.gray('1. Edit the configuration file:'));
    console.log(chalk.yellow(`   - Set your projectName`));
    console.log(chalk.yellow(`   - Set your Swagger documentation source URL`));
    console.log(chalk.yellow(`   - Adjust requestImport if needed`));
    console.log(chalk.gray('2. Run the generator:'));
    console.log(chalk.cyan(`   swigger2api generate`));
    console.log(chalk.gray('3. For force regeneration:'));
    console.log(chalk.cyan(`   swigger2api generate --force`));
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to create configuration file'));
    throw error;
  }
}

module.exports = {
  initCommand
};