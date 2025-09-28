#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// 测试配置
const testConfigs = [
  {
    name: 'TypeScript 配置测试',
    config: './test/configs/test.config.ts',
    description: '测试 TypeScript 项目的 API 生成'
  },
  {
    name: 'JavaScript 配置测试',
    config: './test/configs/test.config.js',
    description: '测试 JavaScript 项目的 API 生成'
  },
  {
    name: '自定义配置测试',
    config: './test/configs/custom.config.js',
    description: '测试自定义命名规则的 API 生成'
  }
];

// 颜色输出函数
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✅'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠️'), msg),
  title: (msg) => console.log(chalk.bold.cyan(`\n🧪 ${msg}\n`)),
  separator: () => console.log(chalk.gray('─'.repeat(60)))
};

// 检查文件是否存在
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// 检查目录是否存在且不为空
function checkDirectoryContent(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { exists: false, files: [] };
  }
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  return {
    exists: true,
    files: files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory()
    }))
  };
}

// 运行单个测试
async function runSingleTest(testConfig) {
  log.title(`${testConfig.name}`);
  log.info(testConfig.description);
  
  try {
    // 检查配置文件是否存在
    if (!checkFileExists(testConfig.config)) {
      throw new Error(`配置文件不存在: ${testConfig.config}`);
    }
    
    log.info(`使用配置文件: ${testConfig.config}`);
    
    // 运行生成命令
    log.info('正在生成 API 代码...');
    const command = `node bin/swigger2api.js generate --config ${testConfig.config} --force`;
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log.info('生成命令输出:');
    console.log(chalk.gray(output));
    
    // 检查输出结果
    const configModule = require(path.resolve(testConfig.config));
    const config = configModule.default || configModule;
    const outputDir = config.outputDir;
    
    log.info(`检查输出目录: ${outputDir}`);
    const dirContent = checkDirectoryContent(outputDir);
    
    if (!dirContent.exists) {
      throw new Error(`输出目录不存在: ${outputDir}`);
    }
    
    if (dirContent.files.length === 0) {
      throw new Error(`输出目录为空: ${outputDir}`);
    }
    
    log.success(`生成成功！输出目录包含 ${dirContent.files.length} 个文件/目录:`);
    dirContent.files.forEach(file => {
      const icon = file.isDirectory ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });
    
    // 检查特定文件
    const expectedFiles = [];
    if (config.generateTypes) {
      expectedFiles.push('types.ts');
    }
    
    // 检查模块目录
    const moduleDirs = dirContent.files.filter(f => f.isDirectory);
    if (moduleDirs.length === 0) {
      log.warning('未找到模块目录');
    } else {
      log.success(`找到 ${moduleDirs.length} 个模块目录`);
      
      // 检查第一个模块目录的内容
      const firstModuleDir = moduleDirs[0];
      const moduleContent = checkDirectoryContent(path.join(outputDir, firstModuleDir.name));
      log.info(`模块 "${firstModuleDir.name}" 包含:`);
      moduleContent.files.forEach(file => {
        const icon = file.isDirectory ? '📁' : '📄';
        console.log(`    ${icon} ${file.name}`);
      });
    }
    
    return { success: true, config: testConfig };
    
  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    return { success: false, config: testConfig, error: error.message };
  }
}

// 运行所有测试
async function runAllTests() {
  log.title('Swigger2API 工具测试套件');
  
  const results = [];
  
  for (const testConfig of testConfigs) {
    const result = await runSingleTest(testConfig);
    results.push(result);
    log.separator();
  }
  
  // 输出测试总结
  log.title('测试总结');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`总测试数: ${results.length}`);
  console.log(chalk.green(`成功: ${successCount}`));
  console.log(chalk.red(`失败: ${failCount}`));
  
  if (failCount > 0) {
    console.log(chalk.red('\n失败的测试:'));
    results.filter(r => !r.success).forEach(result => {
      console.log(chalk.red(`  ❌ ${result.config.name}: ${result.error}`));
    });
  }
  
  if (successCount === results.length) {
    log.success('所有测试通过！🎉');
    process.exit(0);
  } else {
    log.error('部分测试失败！');
    process.exit(1);
  }
}

// 主函数
async function main() {
  try {
    // 检查必要的文件
    const requiredFiles = [
      './bin/swigger2api.js',
      './test/fixtures/sample-swagger.json'
    ];
    
    for (const file of requiredFiles) {
      if (!checkFileExists(file)) {
        throw new Error(`必要文件不存在: ${file}`);
      }
    }
    
    await runAllTests();
    
  } catch (error) {
    log.error(`测试运行失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  runSingleTest,
  testConfigs
};