const fs = require('fs');
const path = require('path');

// 导出主要功能模块
module.exports = {
  // 配置相关
  loadConfig: require('./utils/config').loadConfig,
  
  // 核心生成功能
  generateApiCode: require('./core/generator').generateApiCode,
  
  // 工具函数
  utils: {
    isUrl: require('./utils/helpers').isUrl,
    fetchDataFromUrl: require('./utils/helpers').fetchDataFromUrl,
    generateDataHash: require('./utils/helpers').generateDataHash
  }
};