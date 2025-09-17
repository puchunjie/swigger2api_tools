const fs = require('fs');
const path = require('path');

/**
 * 加载配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Object|null} 配置对象或null
 */
async function loadConfig(configPath) {
  // 如果提供了具体路径，直接使用
  if (configPath && configPath !== './swigger2api.config.js') {
    if (fs.existsSync(configPath)) {
      return loadConfigFile(configPath);
    }
    return null;
  }
  
  // 自动检测配置文件
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, 'swigger2api.config.js'),
    path.join(cwd, 'swigger2api.config.ts')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return loadConfigFile(filePath);
    }
  }
  
  return null;
}

/**
 * 加载具体的配置文件
 * @param {string} filePath - 文件路径
 * @returns {Object} 配置对象
 */
function loadConfigFile(filePath) {
  try {
    const configDir = path.dirname(filePath);
    let config;
    
    if (filePath.endsWith('.ts')) {
      // 对于TypeScript文件，使用动态import或者转换为JS
      // 这里我们简化处理，读取文件内容并评估
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 简单的TypeScript配置文件解析
      // 移除export default，转换为module.exports
      let jsContent = content
        .replace(/export\s+default\s+/, 'module.exports = ')
        .replace(/as\s+const/g, '') // 移除 as const
        .replace(/:\s*\(\([^)]*\)\s*=>\s*[^)]*\)\s*\|\s*null/g, ': null') // 简化函数类型
        .replace(/\/\/.*$/gm, '') // 移除单行注释
        .replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释
      
      // 移除复杂的类型注解
      jsContent = jsContent.replace(/:\s*\([^)]*\)\s*=>\s*[^,}]*/g, ': null');
      
      // 创建临时JS文件
      const tempPath = filePath.replace('.ts', '.temp.js');
      fs.writeFileSync(tempPath, jsContent);
      
      try {
        // 清除require缓存
        delete require.cache[require.resolve(tempPath)];
        config = require(tempPath);
        
        // 清理临时文件
        fs.unlinkSync(tempPath);
      } catch (error) {
        // 清理临时文件
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw error;
      }
    } else {
      // 清除require缓存，确保获取最新配置
      delete require.cache[require.resolve(filePath)];
      config = require(filePath);
    }
    
    // 添加配置文件目录信息，用于相对路径解析
    const finalConfig = typeof config === 'object' && config.default ? config.default : config;
    finalConfig._configDir = configDir;
    
    return finalConfig;
  } catch (error) {
    throw new Error(`Failed to load config file ${filePath}: ${error.message}`);
  }
}

/**
 * 获取默认配置
 * @returns {Object} 默认配置对象
 */
function getDefaultConfig() {
  return {
    projectName: "default-project",
    language: "ts",
    source: null,
    outputDir: "./src/api",
    generateTypes: true,
    requestImport: "import axios from '@/utils/request'",
    updateLog: {
      enabled: true,
      outputPath: "./",
    },
    moduleNaming: {
      strategy: "tags",
      customFunction: null,
    },
    apiNaming: {
      strategy: "operationId",
      customFunction: null,
    },
  };
}

module.exports = {
  loadConfig,
  loadConfigFile,
  getDefaultConfig
};