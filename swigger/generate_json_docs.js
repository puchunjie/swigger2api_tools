const fs = require('fs');
const path = require('path');
const { extractModuleName } = require('./path_extractor');

// 获取英文文件夹名称
function getEnglishFolderName(chineseTag, apiPaths = []) {
  // 如果有API路径，使用第一个路径提取模块名
  if (apiPaths.length > 0) {
    const moduleName = extractModuleName(apiPaths[0]);
    if (moduleName && moduleName !== 'unknown') {
      return moduleName;
    }
  }
  
  // 如果无法从路径提取，使用默认映射
  const mapping = {
    '用户管理': 'user',
    '角色管理': 'role',
    '权限管理': 'permission'
  };
  return mapping[chineseTag] || chineseTag.toLowerCase().replace(/\s+/g, '-');
}

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 生成JSON格式文档
function generateJsonDocumentation(apiDoc, outputBaseDir = '../src/api/generated') {
  // 主要功能已注释掉 - 不再生成JSON文档
  console.log('📝 JSON文档生成功能已禁用');
  return;
  
  // 以下代码已被注释掉，不再执行
  // 按模块分组接口
  // const moduleGroups = {};
  // const tagPaths = {}; // 收集每个tag对应的API路径
  
  // 过滤掉不需要生成文档的标签
  // const excludeTags = ['健康检查服务'];
  
  // 创建英文模块名到中文tag的映射关系
  // const moduleToTagMapping = {};
  
  // 首先遍历所有API路径，建立模块名和tag的映射关系
  // Object.entries(apiDoc.paths).forEach(([apiPath, methods]) => {
  //   Object.entries(methods).forEach(([method, details]) => {
  //     // 使用统一的路径提取逻辑
  //     const moduleName = extractModuleName(apiPath);
  //     
  //     if (details.tags && details.tags.length > 0) {
  //       const tag = details.tags[0];
  //       if (!excludeTags.includes(tag)) {
  //         if (!tagPaths[tag]) {
  //           tagPaths[tag] = [];
  //         }
  //         tagPaths[tag].push(apiPath);
  //         
  //         // 建立模块名和tag的映射
  //         if (moduleName && moduleName !== 'unknown') {
  //           moduleToTagMapping[moduleName] = tag;
  //         }
  //       }
  //     }
  //   });
  // });
  
  // 其余代码已被注释...
}

// 如果直接运行此文件，则读取本地文件并生成文档 - 已注释掉
// if (require.main === module) {
//   const apiDoc = JSON.parse(fs.readFileSync('./response.json', 'utf8'));
//   generateJsonDocumentation(apiDoc);
// }

module.exports = {
  generateJsonDocumentation
};