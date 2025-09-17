const path = require('path');

/**
 * 定义配置的函数，类似于 Vite 的 defineConfig
 * 这个函数主要用于提供类型提示和配置验证
 * @param {Object} config - 配置对象
 * @returns {Object} 返回配置对象，并添加一些元信息
 */
function defineConfig(config) {
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
          configDir = path.dirname(filePath);
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

module.exports = {
  defineConfig
};