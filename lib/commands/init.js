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
  const configPath = path.join(process.cwd(), 'swigger2api.config.js');
  
  if (fs.existsSync(configPath)) {
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
    // 检测项目是否使用 ES 模块
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let isESModule = false;
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        isESModule = packageJson.type === 'module';
      } catch (error) {
        // 如果读取 package.json 失败，默认使用 CommonJS
        console.log(chalk.yellow('⚠️  Could not read package.json, using CommonJS format'));
      }
    }
    
    // 配置文件使用 .mjs 扩展名，统一使用 ES 模块语法，无需区分项目类型
    const configFileName = 'swigger2api.config.mjs';
    const templatePath = path.join(__dirname, '../../templates', 'config.js.template');
    
    // 读取模板内容（保持 ES 模块格式）
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // 在模板中设置语言配置（这个语言是指生成的 API 文件类型）
    template = template.replace(/language:\s*"[^"]*",/, `language: "${language}",`);
    
    const configPath = path.join(process.cwd(), configFileName);
    
    // 写入配置文件
    fs.writeFileSync(configPath, template);
    
    spinner.succeed(chalk.green(`✅ Configuration file created: ${configFileName}`));
    
    console.log(chalk.blue('\n🎉 New features in this version:'));
    console.log(chalk.green('   ✨ Using defineConfig() function for better type support'));
    console.log(chalk.green('   ✨ Automatic path resolution for logs and outputs'));
    console.log(chalk.green('   ✨ Better ES module and CommonJS compatibility'));
    
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