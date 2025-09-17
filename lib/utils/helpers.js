const crypto = require('crypto');
const https = require('https');
const http = require('http');

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

module.exports = {
  isUrl,
  fetchDataFromUrl,
  generateDataHash,
  extractVariableNameFromImport,
  generateFunctionName
};