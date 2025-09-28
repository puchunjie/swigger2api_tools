#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 需要清理的目录和文件
const cleanupTargets = [
  './test/output',
  './test/temp',
  './swigger2api.config.js',
  './swigger2api.config.ts',
  './api-update-log.md'
];

// 递归删除目录
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        removeDirectory(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
    
    fs.rmdirSync(dirPath);
  }
}

// 清理函数
function cleanup() {
  console.log(chalk.blue('🧹 开始清理测试文件...\n'));
  
  let cleanedCount = 0;
  
  cleanupTargets.forEach(target => {
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      
      try {
        if (stat.isDirectory()) {
          removeDirectory(target);
          console.log(chalk.green(`✅ 已删除目录: ${target}`));
        } else {
          fs.unlinkSync(target);
          console.log(chalk.green(`✅ 已删除文件: ${target}`));
        }
        cleanedCount++;
      } catch (error) {
        console.log(chalk.red(`❌ 删除失败 ${target}: ${error.message}`));
      }
    } else {
      console.log(chalk.gray(`⏭️  跳过不存在的: ${target}`));
    }
  });
  
  // 重新创建输出目录
  try {
    fs.mkdirSync('./test/output', { recursive: true });
    console.log(chalk.blue('📁 重新创建输出目录: ./test/output'));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  创建输出目录失败: ${error.message}`));
  }
  
  console.log(chalk.green(`\n🎉 清理完成！共清理了 ${cleanedCount} 个项目`));
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanup();
}

module.exports = { cleanup };