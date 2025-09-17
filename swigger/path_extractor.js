/**
 * 统一的API路径模块名提取器
 * 用于兼容多种API路径格式
 */

/**
 * 从API路径中提取模块名
 * 支持多种路径格式：
 * 1. /v1/exchange/update => exchange
 * 2. /dzpzk/v1/getArchiveResultAsync => dzpzk
 * 3. /treasurer/v1/submitPaymentApplyApi => treasurer
 * 4. /compliance/v1/getComplianceMessageList => compliance
 * 
 * @param {string} apiPath - API路径
 * @returns {string} 提取的模块名
 */
function extractModuleName(apiPath) {
  if (!apiPath || typeof apiPath !== 'string') {
    return 'other';
  }

  // 移除开头的斜杠并分割路径
  const pathParts = apiPath.split('/').filter(part => part);
  
  if (pathParts.length === 0) {
    return 'other';
  }

  // 情况1: /v1/module/action 格式 (标准格式)
  if (pathParts.length >= 2 && pathParts[0] === 'v1') {
    return pathParts[1];
  }
  
  // 情况2: /module/v1/action 格式 (非标准格式)
  if (pathParts.length >= 2 && pathParts[1] === 'v1') {
    return pathParts[0];
  }
  
  // 情况3: /module/action 格式 (无版本号)
  if (pathParts.length >= 2) {
    return pathParts[0];
  }
  
  // 情况4: 只有一个路径段
  return pathParts[0];
}

/**
 * 批量提取API路径的模块名并统计
 * @param {Object} paths - Swagger paths对象
 * @returns {Object} 模块统计信息
 */
function analyzeApiPaths(paths) {
  const moduleStats = {};
  const pathsByModule = {};
  
  Object.keys(paths).forEach(apiPath => {
    const moduleName = extractModuleName(apiPath);
    
    // 统计模块出现次数
    if (!moduleStats[moduleName]) {
      moduleStats[moduleName] = 0;
      pathsByModule[moduleName] = [];
    }
    
    moduleStats[moduleName]++;
    pathsByModule[moduleName].push(apiPath);
  });
  
  return {
    moduleStats,
    pathsByModule
  };
}

/**
 * 验证提取结果的合理性
 * @param {Object} paths - Swagger paths对象
 * @returns {Object} 验证结果
 */
function validateExtraction(paths) {
  const analysis = analyzeApiPaths(paths);
  const issues = [];
  
  // 检查是否有太多路径被归类为'other'
  const totalPaths = Object.keys(paths).length;
  const otherCount = analysis.moduleStats['other'] || 0;
  const otherPercentage = (otherCount / totalPaths) * 100;
  
  if (otherPercentage > 20) {
    issues.push(`警告: ${otherPercentage.toFixed(1)}% 的路径被归类为'other'，可能需要优化提取逻辑`);
  }
  
  // 检查模块分布是否合理
  const moduleCount = Object.keys(analysis.moduleStats).length;
  if (moduleCount < 3) {
    issues.push(`警告: 只检测到 ${moduleCount} 个模块，可能存在过度聚合`);
  }
  
  return {
    ...analysis,
    issues,
    totalPaths,
    otherPercentage: otherPercentage.toFixed(1)
  };
}

/**
 * 生成路径提取报告
 * @param {Object} paths - Swagger paths对象
 * @returns {string} 格式化的报告
 */
function generateExtractionReport(paths) {
  const validation = validateExtraction(paths);
  
  let report = '=== API路径模块提取报告 ===\n\n';
  report += `总路径数: ${validation.totalPaths}\n`;
  report += `检测到模块数: ${Object.keys(validation.moduleStats).length}\n`;
  report += `'other'分类占比: ${validation.otherPercentage}%\n\n`;
  
  report += '=== 模块分布 ===\n';
  Object.entries(validation.moduleStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([module, count]) => {
      const percentage = ((count / validation.totalPaths) * 100).toFixed(1);
      report += `${module}: ${count} 个路径 (${percentage}%)\n`;
    });
  
  if (validation.issues.length > 0) {
    report += '\n=== 发现的问题 ===\n';
    validation.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
  }
  
  report += '\n=== 各模块路径示例 ===\n';
  Object.entries(validation.pathsByModule).forEach(([module, paths]) => {
    report += `\n${module}:\n`;
    paths.slice(0, 3).forEach(path => {
      report += `  - ${path}\n`;
    });
    if (paths.length > 3) {
      report += `  ... 还有 ${paths.length - 3} 个路径\n`;
    }
  });
  
  return report;
}

module.exports = {
  extractModuleName,
  analyzeApiPaths,
  validateExtraction,
  generateExtractionReport
};