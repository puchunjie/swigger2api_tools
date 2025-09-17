'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var require$$0 = require('fs');
var require$$1 = require('path');
var require$$2 = require('chalk');
var require$$3 = require('ora');
var require$$0$1 = require('crypto');
var require$$1$1 = require('https');
var require$$2$1 = require('http');

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var lib = {exports: {}};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

const fs$1 = require$$0;
const path$2 = require$$1;

/**
 * 加载配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Object|null} 配置对象或null
 */
async function loadConfig$1(configPath) {
  // 如果提供了具体路径，直接使用
  if (configPath) {
    // 处理绝对路径和相对路径
    const resolvedPath = path$2.isAbsolute(configPath) ? configPath : path$2.resolve(process.cwd(), configPath);
    
    if (fs$1.existsSync(resolvedPath)) {
      return await loadConfigFile(resolvedPath);
    }
    
    // 如果指定的路径不存在，但是是默认路径，则尝试自动检测
    const basename = path$2.basename(configPath);
    if (basename === 'swigger2api.config.js' || basename === 'swigger2api.config.ts') ; else {
      // 如果是用户明确指定的非默认路径，直接返回null
      return null;
    }
  }
  
  // 自动检测配置文件
  const cwd = process.cwd();
  const possiblePaths = [
    path$2.join(cwd, 'swigger2api.config.mjs'),
    path$2.join(cwd, 'swigger2api.config.js'),
    path$2.join(cwd, 'swigger2api.config.ts')
  ];
  
  for (const filePath of possiblePaths) {
    if (fs$1.existsSync(filePath)) {
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
    const configDir = path$2.dirname(filePath);
    let config;
    
    // 读取文件内容以判断文件类型
    const content = fs$1.readFileSync(filePath, 'utf8');
    const isESModule = content.includes('import ') && content.includes('export default');
    const isDefineConfig = content.includes('defineConfig');
    
    if (filePath.endsWith('.mjs')) {
      // .mjs 文件处理 - 始终使用 ES 模块语法
      try {
        const fileUrl = `file://${path$2.resolve(filePath)}`;
        const module = await import(fileUrl);
        config = module.default || module;
      } catch (importError) {
        throw new Error(`Failed to load .mjs config file: ${importError.message}`);
      }
    } else if (filePath.endsWith('.ts')) {
      // TypeScript 文件处理
      if (isESModule && isDefineConfig) {
        // 新格式的 TypeScript 配置文件，使用 defineConfig
         // 转换为可执行的 JavaScript
         const defineConfigPath = path$2.resolve(__dirname, '../utils/defineConfig');
         let jsContent = content
           .replace(/import\s+{\s*defineConfig\s*}\s+from\s+['"swigger2api['"'];?\s*/g, `const { defineConfig } = require("${defineConfigPath}");`)
           .replace(/import\s+{\s*defineConfig\s*}\s+from\s+['"[^'"]*['"'];?\s*/g, `const { defineConfig } = require("${defineConfigPath}");`)
           .replace(/export\s+default\s+defineConfig\s*\(/g, 'module.exports = defineConfig(')
          .replace(/:\s*string/g, '') // 移除类型注解
          .replace(/:\s*boolean/g, '')
          .replace(/:\s*number/g, '')
          .replace(/\/\/.*$/gm, '') // 移除单行注释
          .replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释
        
        // 创建临时JS文件
        const tempPath = filePath.replace('.ts', '.temp.js');
        fs$1.writeFileSync(tempPath, jsContent);
        
        try {
          // 清除require缓存
          delete require.cache[require.resolve(tempPath)];
          config = commonjsRequire(tempPath);
          
          // 清理临时文件
          fs$1.unlinkSync(tempPath);
        } catch (error) {
          // 清理临时文件
          if (fs$1.existsSync(tempPath)) {
            fs$1.unlinkSync(tempPath);
          }
          throw error;
        }
      } else {
        // 旧格式的 TypeScript 配置文件
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
        fs$1.writeFileSync(tempPath, jsContent);
        
        try {
          // 清除require缓存
          delete require.cache[require.resolve(tempPath)];
          config = commonjsRequire(tempPath);
          
          // 清理临时文件
          fs$1.unlinkSync(tempPath);
        } catch (error) {
          // 清理临时文件
          if (fs$1.existsSync(tempPath)) {
            fs$1.unlinkSync(tempPath);
          }
          throw error;
        }
      }
    } else {
      // JavaScript 文件处理
      if (isESModule && isDefineConfig) {
        // 新格式的 ES 模块配置文件，使用 defineConfig
        try {
          // 尝试使用动态 import 加载 ES 模块
          const fileUrl = `file://${path$2.resolve(filePath)}`;
          const module = await import(fileUrl);
          config = module.default || module;
        } catch (importError) {
           // 如果动态 import 失败，尝试转换为 CommonJS 格式
           const defineConfigPath = path$2.resolve(__dirname, '../utils/defineConfig');
           let jsContent = content
             .replace(/import\s+{\s*defineConfig\s*}\s+from\s+['"swigger2api['"'];?\s*/g, `const { defineConfig } = require("${defineConfigPath}");`)
             .replace(/import\s+{\s*defineConfig\s*}\s+from\s+['"[^'"]*['"'];?\s*/g, `const { defineConfig } = require("${defineConfigPath}");`)
             .replace(/export\s+default\s+defineConfig\s*\(/g, 'module.exports = defineConfig(');
          
          const tempPath = filePath.replace(/\.js$/, '.temp.cjs');
          fs$1.writeFileSync(tempPath, jsContent);
          
          try {
            delete require.cache[require.resolve(tempPath)];
            config = commonjsRequire(tempPath);
            // 清理临时文件
            fs$1.unlinkSync(tempPath);
          } catch (cjsError) {
            // 清理临时文件
            if (fs$1.existsSync(tempPath)) {
              fs$1.unlinkSync(tempPath);
            }
            throw cjsError;
          }
        }
      } else {
        // 传统的 CommonJS 或 ES 模块配置文件
        try {
          // 首先尝试使用 require() 加载 CommonJS 模块
          // 清除require缓存，确保获取最新配置
          delete require.cache[require.resolve(filePath)];
          config = commonjsRequire(filePath);
        } catch (requireError) {
          try {
            // 如果 require 失败，检查是否是 ES 模块相关错误
            if (requireError.message.includes('ES Module') || requireError.message.includes('ES module')) {
              // 读取文件内容并检查是否使用 CommonJS 语法
              if (content.includes('module.exports') || content.includes('exports.')) {
                // 如果文件使用 CommonJS 语法但被当作 ES 模块，创建一个临时的 .cjs 文件
                const tempCjsPath = filePath.replace(/\.js$/, '.temp.cjs');
                fs$1.writeFileSync(tempCjsPath, content);
                
                try {
                  delete require.cache[require.resolve(tempCjsPath)];
                  config = commonjsRequire(tempCjsPath);
                  // 清理临时文件
                  fs$1.unlinkSync(tempCjsPath);
                } catch (cjsError) {
                  // 清理临时文件
                  if (fs$1.existsSync(tempCjsPath)) {
                    fs$1.unlinkSync(tempCjsPath);
                  }
                  throw cjsError;
                }
              } else {
                // 如果是真正的 ES 模块，使用动态 import
                const fileUrl = `file://${path$2.resolve(filePath)}`;
                const module = await import(fileUrl);
                config = module.default || module;
              }
            } else {
              // 其他错误，尝试动态 import
              const fileUrl = `file://${path$2.resolve(filePath)}`;
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
    }
    
    // 处理配置对象
    const finalConfig = typeof config === 'object' && config.default ? config.default : config;
    
    // 如果配置没有通过 defineConfig 创建，添加配置文件目录信息
    if (finalConfig && typeof finalConfig === 'object') {
      if (!finalConfig._configDir) {
        finalConfig._configDir = configDir;
      }
      
      // 如果配置有 updateLog 且 outputPath 是相对路径，则解析为绝对路径
      if (finalConfig.updateLog && finalConfig.updateLog.outputPath === "./") {
        finalConfig.updateLog.outputPath = configDir;
      }
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

var config = {
  loadConfig: loadConfig$1,
  loadConfigFile,
  getDefaultConfig
};

const path$1 = require$$1;

/**
 * 定义配置的函数，类似于 Vite 的 defineConfig
 * 这个函数主要用于提供类型提示和配置验证
 * @param {Object} config - 配置对象
 * @returns {Object} 返回配置对象，并添加一些元信息
 */
function defineConfig$1(config) {
  // 验证配置对象
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }
  
  // 获取调用 defineConfig 的文件路径
  // 由于在转换后的临时文件中调用，我们需要从调用栈中找到真正的配置文件路径
  let configDir = process.cwd(); // 默认使用当前工作目录
  
  try {
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    
    // 查找包含配置文件路径的行
    for (let i = 1; i < stackLines.length; i++) {
      const line = stackLines[i];
      const match = line.match(/\(([^)]+):\d+:\d+\)/);
      if (match) {
        const filePath = match[1];
        // 跳过临时文件和node_modules
        if (!filePath.includes('.temp.') && !filePath.includes('node_modules') && 
            (filePath.includes('swigger2api.config') || filePath.endsWith('.js') || filePath.endsWith('.ts'))) {
          configDir = path$1.dirname(filePath);
          break;
        }
      }
    }
  } catch (error) {
    // 如果获取调用栈失败，使用当前工作目录
    console.warn('Warning: Could not determine config file directory, using current working directory');
  }
  
  // 添加配置文件目录信息，用于相对路径解析
  const finalConfig = {
    ...config,
    _configDir: configDir,
    _isDefineConfig: true // 标记这是通过 defineConfig 创建的配置
  };
  
  // 设置默认值
  if (!finalConfig.projectName) {
    finalConfig.projectName = "my-project";
  }
  
  if (!finalConfig.language) {
    finalConfig.language = "ts";
  }
  
  if (!finalConfig.outputDir) {
    finalConfig.outputDir = "./src/api";
  }
  
  if (finalConfig.generateTypes === undefined) {
    finalConfig.generateTypes = true;
  }
  
  if (!finalConfig.updateLog) {
    finalConfig.updateLog = {
      enabled: true,
      outputPath: "./"
    };
  }
  
  // 确保 updateLog.outputPath 是相对于配置文件的路径
  if (finalConfig.updateLog && finalConfig.updateLog.outputPath === "./") {
    finalConfig.updateLog.outputPath = configDir;
  }
  
  return finalConfig;
}

var defineConfig_1 = {
  defineConfig: defineConfig$1
};

const fs = require$$0;
const path = require$$1;
const chalk = require$$2;
const ora = require$$3;

/**
 * 生成API代码的主函数
 * 直接使用现有的swigger功能，不做重复开发
 * @param {Object} config - 配置对象
 * @param {Object} options - 生成选项
 */
async function generateApiCode$1(config, options = {}) {
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
      
      const swiggerModule = commonjsRequire(swiggerPath);
      
      // 设置配置到 swigger 模块，传递项目工作目录
      if (typeof swiggerModule.setConfig === 'function') {
        const configWithDir = { ...config };
        configWithDir._projectDir = originalCwd; // 传递项目工作目录
        configWithDir._configDir = configDir; // 保留配置文件目录信息
        swiggerModule.setConfig(configWithDir);
      }
      
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

var generator = {
  generateApiCode: generateApiCode$1
};

const crypto = require$$0$1;
const https = require$$1$1;
const http = require$$2$1;

/**
 * 检测字符串是否为 URL
 * @param {string} str - 待检测的字符串
 * @returns {boolean} 是否为URL
 */
function isUrl(str) {
  if (typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 从URL获取数据
 * @param {string} url - 请求URL
 * @returns {Promise<Object>} 返回JSON数据
 */
function fetchDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 生成数据哈希值
 * @param {Object} data - 数据对象
 * @returns {string} MD5哈希值
 */
function generateDataHash(data) {
  const jsonString = JSON.stringify(data, null, 0);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * 从导入语句中提取变量名
 * @param {string} importStatement - 导入语句
 * @returns {string} 变量名
 */
function extractVariableNameFromImport(importStatement) {
  if (!importStatement) return 'request';
  
  // 匹配 import xxx from 'xxx' 格式
  const importMatch = importStatement.match(/import\s+(\w+)\s+from/);
  if (importMatch) {
    return importMatch[1];
  }
  
  // 匹配 import { xxx } from 'xxx' 格式
  const destructureMatch = importStatement.match(/import\s*{\s*(\w+)\s*}/);
  if (destructureMatch) {
    return destructureMatch[1];
  }
  
  // 匹配 const xxx = require('xxx') 格式
  const requireMatch = importStatement.match(/const\s+(\w+)\s*=/);
  if (requireMatch) {
    return requireMatch[1];
  }
  
  // 默认返回
  return 'request';
}

/**
 * 生成函数名
 * @param {string} operationId - 操作ID
 * @param {string} method - HTTP方法
 * @param {string} path - API路径
 * @returns {string} 函数名
 */
function generateFunctionName(operationId, method, path) {
  if (operationId) {
    // 移除可能的前缀，如 "UsingGET", "UsingPOST" 等
    let cleanOperationId = operationId.replace(/Using(GET|POST|PUT|DELETE|PATCH)$/i, '');
    
    // 如果清理后为空，使用原始operationId
    if (!cleanOperationId) {
      cleanOperationId = operationId;
    }
    
    return cleanOperationId;
  }
  
  // 如果没有operationId，根据路径和方法生成
  const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
  const lastPart = pathParts[pathParts.length - 1] || 'api';
  
  return `${method.toLowerCase()}${lastPart.charAt(0).toUpperCase() + lastPart.slice(1)}`;
}

var helpers = {
  isUrl,
  fetchDataFromUrl,
  generateDataHash,
  extractVariableNameFromImport,
  generateFunctionName
};

// 导出主要功能模块
const moduleExports = {
  // 配置相关
  loadConfig: config.loadConfig,
  defineConfig: defineConfig_1.defineConfig,
  
  // 核心生成功能
  generateApiCode: generator.generateApiCode,
  
  // 工具函数
  utils: {
    isUrl: helpers.isUrl,
    fetchDataFromUrl: helpers.fetchDataFromUrl,
    generateDataHash: helpers.generateDataHash
  }
};

// CommonJS 导出
lib.exports = moduleExports;

// 为了支持 ES Module 构建，添加命名导出
var defineConfig = lib.exports.defineConfig = moduleExports.defineConfig;
var loadConfig = lib.exports.loadConfig = moduleExports.loadConfig;
var generateApiCode = lib.exports.generateApiCode = moduleExports.generateApiCode;
var utils = lib.exports.utils = moduleExports.utils;

var libExports = lib.exports;
var index = /*@__PURE__*/getDefaultExportFromCjs(libExports);

exports.default = index;
exports.defineConfig = defineConfig;
exports.generateApiCode = generateApiCode;
exports.loadConfig = loadConfig;
exports.utils = utils;
