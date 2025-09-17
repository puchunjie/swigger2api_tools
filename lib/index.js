const fs = require('fs');
const path = require('path');

// 导出主要功能模块
const moduleExports = {
  // 配置相关
  loadConfig: require('./utils/config').loadConfig,
  defineConfig: require('./utils/defineConfig').defineConfig,
  
  // 核心生成功能
  generateApiCode: require('./core/generator').generateApiCode,
  
  // 工具函数
  utils: {
    isUrl: require('./utils/helpers').isUrl,
    fetchDataFromUrl: require('./utils/helpers').fetchDataFromUrl,
    generateDataHash: require('./utils/helpers').generateDataHash
  }
};

// CommonJS 导出
module.exports = moduleExports;

// 为了支持 ES Module 构建，添加命名导出
module.exports.defineConfig = moduleExports.defineConfig;
module.exports.loadConfig = moduleExports.loadConfig;
module.exports.generateApiCode = moduleExports.generateApiCode;
module.exports.utils = moduleExports.utils;