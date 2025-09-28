#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');

// 快速测试 - 只测试一个配置
function quickTest() {
  console.log(chalk.blue('🚀 快速测试开始...\n'));
  
  try {
    // 清理之前的输出
    console.log(chalk.gray('清理之前的测试输出...'));
    if (fs.existsSync('./test/output')) {
      execSync('rm -rf ./test/output/*', { stdio: 'pipe' });
    }
    
    // 运行 TypeScript 配置测试
    console.log(chalk.blue('运行 TypeScript 配置测试...'));
    const output = execSync('node bin/swigger2api.js generate --config ./test/configs/test.config.ts --force', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(chalk.gray('生成输出:'));
    console.log(output);
    
    // 检查结果
    const outputDir = './test/output/ts-api';
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      console.log(chalk.green(`✅ 成功生成 ${files.length} 个文件/目录:`));
      files.forEach(file => {
        const stat = fs.statSync(`${outputDir}/${file}`);
        const icon = stat.isDirectory() ? '📁' : '📄';
        console.log(`  ${icon} ${file}`);
      });
    } else {
      throw new Error('输出目录不存在');
    }
    
    console.log(chalk.green('\n🎉 快速测试通过！'));
    
  } catch (error) {
    console.log(chalk.red(`❌ 快速测试失败: ${error.message}`));
    process.exit(1);
  }
}

if (require.main === module) {
  quickTest();
}

module.exports = { quickTest };