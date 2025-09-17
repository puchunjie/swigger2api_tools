const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

/**
 * 生成API代码的主函数
 * 直接使用现有的swigger功能，不做重复开发
 * @param {Object} config - 配置对象
 * @param {Object} options - 生成选项
 */
async function generateApiCode(config, options = {}) {
  const spinner = ora('Preparing to generate API code...').start();
  
  try {
    // 获取配置文件目录
    const configDir = config._configDir || process.cwd();
    const originalCwd = process.cwd();
    
    // 备份原始配置文件 - swigger模块期望配置文件在其父目录
    const swiggerDir = path.join(__dirname, '../../swigger');
    const originalConfigPath = path.join(swiggerDir, '../swigger.config.js');
    const hasOriginalConfig = fs.existsSync(originalConfigPath);
    let originalConfigBackup = null;
    
    if (hasOriginalConfig) {
      originalConfigBackup = fs.readFileSync(originalConfigPath, 'utf8');
    }
    
    try {
      // 创建临时配置文件，移除内部属性
      const cleanConfig = { ...config };
      delete cleanConfig._configDir; // 移除内部属性
      
      const configContent = `module.exports = ${JSON.stringify(cleanConfig, null, 2)};`;
      fs.writeFileSync(originalConfigPath, configContent);
      
      spinner.text = 'Loading swigger generator...';
      
      // 切换到配置文件目录
      process.chdir(configDir);
      
      // 动态require原始的swigger功能
      const swiggerPath = path.join(__dirname, '../../swigger/index.js');
      
      // 清除require缓存，确保使用最新配置
      delete require.cache[require.resolve(swiggerPath)];
      
      const swiggerModule = require(swiggerPath);
      
      spinner.text = 'Generating API code...';
      
      // 调用原始swigger的generateApiFiles函数，传递选项
      await swiggerModule.generateApiFiles(options);
      
      spinner.succeed(chalk.green('✅ API code generated successfully'));
      
    } finally {
      // 恢复工作目录
      process.chdir(originalCwd);
      
      // 恢复原始配置文件
      if (hasOriginalConfig && originalConfigBackup) {
        fs.writeFileSync(originalConfigPath, originalConfigBackup);
      } else if (!hasOriginalConfig && fs.existsSync(originalConfigPath)) {
        fs.unlinkSync(originalConfigPath);
      }
    }
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate API code'));
    throw error;
  }
}

module.exports = {
  generateApiCode
};