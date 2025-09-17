const fs = require('fs');
const path = require('path');

/**
 * 加载配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Object|null} 配置对象或null
 */
async function loadConfig(configPath) {
  // 如果提供了具体路径，直接使用
  if (configPath) {
    // 处理绝对路径和相对路径
    const resolvedPath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
    
    if (fs.existsSync(resolvedPath)) {
      return await loadConfigFile(resolvedPath);
    }
    
    // 如果指定的路径不存在，但是是默认路径，则尝试自动检测
    const basename = path.basename(configPath);
    if (basename === 'swigger2api.config.js' || basename === 'swigger2api.config.ts') {
      // 继续执行自动检测逻辑
    } else {
      // 如果是用户明确指定的非默认路径，直接返回null
      return null;
    }
  }
  
  // 自动检测配置文件
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, 'swigger2api.config.js'),
    path.join(cwd, 'swigger2api.config.ts')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return await loadConfigFile(filePath);
    }
  }
  
  return null;
}

/**
 * 加载具体的配置文件
 * @param {string} filePath - 文件路径
 * @returns {Object} 配置对象
 */
async function loadConfigFile(filePath) {
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
      // 尝试使用动态 import() 加载 ES 模块，如果失败则使用 require() 加载 CommonJS 模块
      try {
        // 首先尝试使用 require() 加载 CommonJS 模块
        // 清除require缓存，确保获取最新配置
        delete require.cache[require.resolve(filePath)];
        config = require(filePath);
      } catch (requireError) {
        try {
          // 如果 require 失败，检查是否是 ES 模块相关错误
          if (requireError.message.includes('ES Module') || requireError.message.includes('ES module')) {
            // 读取文件内容并检查是否使用 CommonJS 语法
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('module.exports') || content.includes('exports.')) {
              // 如果文件使用 CommonJS 语法但被当作 ES 模块，创建一个临时的 .cjs 文件
              const tempCjsPath = filePath.replace(/\.js$/, '.temp.cjs');
              fs.writeFileSync(tempCjsPath, content);
              
              try {
                delete require.cache[require.resolve(tempCjsPath)];
                config = require(tempCjsPath);
                // 清理临时文件
                fs.unlinkSync(tempCjsPath);
              } catch (cjsError) {
                // 清理临时文件
                if (fs.existsSync(tempCjsPath)) {
                  fs.unlinkSync(tempCjsPath);
                }
                throw cjsError;
              }
            } else {
              // 如果是真正的 ES 模块，使用动态 import
              const fileUrl = `file://${path.resolve(filePath)}`;
              const module = await import(fileUrl);
              config = module.default || module;
            }
          } else {
            // 其他错误，尝试动态 import
            const fileUrl = `file://${path.resolve(filePath)}`;
            const module = await import(fileUrl);
            config = module.default || module;
          }
        } catch (importError) {
          // 如果两种方式都失败，抛出更详细的错误信息
          throw new Error(`Failed to load config file using both require() and import(): 
            Require error: ${requireError.message}
            Import error: ${importError.message}`);
        }
      }
    }
    
    // 添加配置文件目录信息，用于相对路径解析
    const finalConfig = typeof config === 'object' && config.default ? config.default : config;
    if (finalConfig && typeof finalConfig === 'object') {
      finalConfig._configDir = configDir;
    }
    
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