/**
 * 清理重复目录的脚本
 * 用于清理由于路径提取逻辑不一致导致的重复目录
 */

const fs = require('fs');
const path = require('path');
const { extractModuleName, analyzeApiPaths } = require('./path_extractor');

// 配置
const CONFIG = {
  generatedDir: '../src/api/generated',
  backupDir: '../src/api/generated_backup',
  responseFile: './response.json'
};

/**
 * 获取绝对路径
 */
function getAbsolutePath(relativePath) {
  return path.resolve(__dirname, relativePath);
}

/**
 * 检查目录是否存在
 */
function directoryExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * 创建备份
 */
function createBackup() {
  const generatedPath = getAbsolutePath(CONFIG.generatedDir);
  const backupPath = getAbsolutePath(CONFIG.backupDir);
  
  if (!directoryExists(generatedPath)) {
    console.log('❌ generated目录不存在，无需备份');
    return false;
  }
  
  if (directoryExists(backupPath)) {
    console.log('⚠️  备份目录已存在，将覆盖现有备份');
    fs.rmSync(backupPath, { recursive: true, force: true });
  }
  
  try {
    fs.cpSync(generatedPath, backupPath, { recursive: true });
    console.log('✅ 备份创建成功:', backupPath);
    return true;
  } catch (error) {
    console.error('❌ 备份创建失败:', error.message);
    return false;
  }
}

/**
 * 分析现有目录结构
 */
function analyzeCurrentStructure() {
  const generatedPath = getAbsolutePath(CONFIG.generatedDir);
  
  if (!directoryExists(generatedPath)) {
    console.log('❌ generated目录不存在');
    return { directories: [], issues: [] };
  }
  
  const directories = [];
  const issues = [];
  
  try {
    const items = fs.readdirSync(generatedPath);
    
    items.forEach(item => {
      const itemPath = path.join(generatedPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        directories.push(item);
        
        // 检查目录内容
        const files = fs.readdirSync(itemPath);
        const hasIndex = files.includes('index.ts');
        const hasTypes = files.includes('types.ts');
        const hasReadme = files.includes('README.md');
        const hasApiDocs = files.includes('api-docs.json');
        
        if (!hasIndex || !hasTypes || !hasReadme) {
          issues.push({
            directory: item,
            missing: [
              !hasIndex && 'index.ts',
              !hasTypes && 'types.ts',
              !hasReadme && 'README.md'
            ].filter(Boolean)
          });
        }
        
        console.log(`📁 ${item}:`);
        console.log(`   - index.ts: ${hasIndex ? '✅' : '❌'}`);
        console.log(`   - types.ts: ${hasTypes ? '✅' : '❌'}`);
        console.log(`   - README.md: ${hasReadme ? '✅' : '❌'}`);
        console.log(`   - api-docs.json: ${hasApiDocs ? '✅' : '❌'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 分析目录结构失败:', error.message);
  }
  
  return { directories, issues };
}

/**
 * 识别应该存在的模块
 */
function getExpectedModules() {
  const responseFilePath = getAbsolutePath(CONFIG.responseFile);
  
  if (!fs.existsSync(responseFilePath)) {
    console.log('❌ response.json文件不存在');
    return [];
  }
  
  try {
    const swaggerData = JSON.parse(fs.readFileSync(responseFilePath, 'utf8'));
    const analysis = analyzeApiPaths(swaggerData.paths);
    
    // 排除'other'和一些特殊模块
    const expectedModules = Object.keys(analysis.moduleStats)
      .filter(module => module !== 'other' && module !== 'health')
      .sort();
    
    console.log('\n📋 预期的模块列表:');
    expectedModules.forEach(module => {
      const count = analysis.moduleStats[module];
      console.log(`   - ${module} (${count} 个API)`);
    });
    
    return expectedModules;
  } catch (error) {
    console.error('❌ 读取response.json失败:', error.message);
    return [];
  }
}

/**
 * 识别重复和无效目录
 */
function identifyDuplicatesAndInvalid(currentDirs, expectedModules) {
  const duplicates = [];
  const invalid = [];
  const missing = [];
  
  // 查找重复目录（如 dzpzk 和 dzpzk_controller）
  const moduleGroups = {};
  currentDirs.forEach(dir => {
    // 移除常见后缀来分组
    const baseModule = dir.replace(/_controller$|_service$|_api$/, '');
    if (!moduleGroups[baseModule]) {
      moduleGroups[baseModule] = [];
    }
    moduleGroups[baseModule].push(dir);
  });
  
  Object.entries(moduleGroups).forEach(([baseModule, dirs]) => {
    if (dirs.length > 1) {
      duplicates.push({ baseModule, directories: dirs });
    }
  });
  
  // 查找无效目录（不在预期列表中）
  currentDirs.forEach(dir => {
    if (!expectedModules.includes(dir)) {
      // 检查是否是某个预期模块的变体
      const isVariant = expectedModules.some(expected => 
        dir.includes(expected) || expected.includes(dir)
      );
      if (!isVariant) {
        invalid.push(dir);
      }
    }
  });
  
  // 查找缺失目录
  expectedModules.forEach(expected => {
    if (!currentDirs.includes(expected)) {
      missing.push(expected);
    }
  });
  
  return { duplicates, invalid, missing };
}

/**
 * 执行清理
 */
function performCleanup(duplicates, invalid, dryRun = true) {
  const generatedPath = getAbsolutePath(CONFIG.generatedDir);
  const toDelete = [];
  
  // 处理重复目录 - 保留最简单的名称
  duplicates.forEach(({ baseModule, directories }) => {
    const sorted = directories.sort((a, b) => a.length - b.length);
    const keep = sorted[0]; // 保留最短的名称
    const remove = sorted.slice(1);
    
    console.log(`\n🔄 处理重复模块 '${baseModule}':`);
    console.log(`   保留: ${keep}`);
    remove.forEach(dir => {
      console.log(`   删除: ${dir}`);
      toDelete.push(dir);
    });
  });
  
  // 处理无效目录
  invalid.forEach(dir => {
    console.log(`\n🗑️  删除无效目录: ${dir}`);
    toDelete.push(dir);
  });
  
  if (toDelete.length === 0) {
    console.log('\n✅ 没有需要清理的目录');
    return true;
  }
  
  if (dryRun) {
    console.log('\n🔍 预览模式 - 以下目录将被删除:');
    toDelete.forEach(dir => console.log(`   - ${dir}`));
    console.log('\n要执行实际删除，请运行: node cleanup_duplicates.js --execute');
    return true;
  }
  
  // 执行实际删除
  let success = true;
  toDelete.forEach(dir => {
    const dirPath = path.join(generatedPath, dir);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ 已删除: ${dir}`);
    } catch (error) {
      console.error(`❌ 删除失败 ${dir}:`, error.message);
      success = false;
    }
  });
  
  return success;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const skipBackup = args.includes('--skip-backup');
  
  console.log('🧹 API目录清理工具\n');
  console.log('=' .repeat(50));
  
  // 创建备份
  if (!skipBackup && execute) {
    console.log('\n📦 创建备份...');
    if (!createBackup()) {
      console.log('❌ 备份失败，停止清理');
      return;
    }
  }
  
  // 分析现有结构
  console.log('\n🔍 分析现有目录结构...');
  const { directories, issues } = analyzeCurrentStructure();
  
  if (issues.length > 0) {
    console.log('\n⚠️  发现问题:');
    issues.forEach(issue => {
      console.log(`   ${issue.directory}: 缺少 ${issue.missing.join(', ')}`);
    });
  }
  
  // 获取预期模块
  const expectedModules = getExpectedModules();
  
  // 识别问题
  console.log('\n🔍 识别重复和无效目录...');
  const { duplicates, invalid, missing } = identifyDuplicatesAndInvalid(directories, expectedModules);
  
  if (duplicates.length > 0) {
    console.log('\n🔄 发现重复目录:');
    duplicates.forEach(({ baseModule, directories }) => {
      console.log(`   ${baseModule}: ${directories.join(', ')}`);
    });
  }
  
  if (invalid.length > 0) {
    console.log('\n🗑️  发现无效目录:');
    invalid.forEach(dir => console.log(`   - ${dir}`));
  }
  
  if (missing.length > 0) {
    console.log('\n❓ 缺失目录 (需要重新生成):');
    missing.forEach(dir => console.log(`   - ${dir}`));
  }
  
  // 执行清理
  if (duplicates.length > 0 || invalid.length > 0) {
    console.log('\n🧹 开始清理...');
    const success = performCleanup(duplicates, invalid, !execute);
    
    if (success && execute) {
      console.log('\n✅ 清理完成！');
      if (missing.length > 0) {
        console.log('\n💡 建议运行以下命令重新生成缺失的模块:');
        console.log('   node index.js');
      }
    }
  } else {
    console.log('\n✅ 目录结构正常，无需清理');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createBackup,
  analyzeCurrentStructure,
  getExpectedModules,
  identifyDuplicatesAndInvalid,
  performCleanup,
  main
};