const fs = require('fs');
const path = require('path');

// 读取OpenAPI文档
const apiDoc = JSON.parse(fs.readFileSync('./response.json', 'utf8'));

// 按模块分组接口
const moduleGroups = {};

// 遍历所有接口路径
Object.entries(apiDoc.paths).forEach(([apiPath, methods]) => {
  Object.entries(methods).forEach(([method, details]) => {
    // 从路径中提取英文模块名，而不是使用中文tags
    let tag = 'other';
    const pathParts = apiPath.split('/').filter(part => part);
    if (pathParts.length >= 2 && pathParts[0] === 'v1') {
      tag = pathParts[1];
    } else if (pathParts.length >= 1) {
      tag = pathParts[0];
    }
    
    if (!moduleGroups[tag]) {
      moduleGroups[tag] = {
        name: tag,
        description: apiDoc.tags?.find(t => t.name === tag)?.description || '',
        apis: []
      };
    }
    
    // 提取请求参数信息
    const requestInfo = {};
    
    // 处理requestBody
    if (details.requestBody) {
      const schema = details.requestBody.content?.['application/json']?.schema;
      if (schema) {
        requestInfo.requestBody = resolveSchema(schema, apiDoc.components.schemas);
      }
    }
    
    // 处理parameters
    if (details.parameters) {
      requestInfo.parameters = details.parameters.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required,
        type: param.schema?.type,
        format: param.schema?.format,
        description: param.description
      }));
    }
    
    // 提取响应信息
    const responseInfo = {};
    if (details.responses) {
      Object.entries(details.responses).forEach(([code, response]) => {
        const schema = response.content?.['*/*']?.schema || response.content?.['application/json']?.schema;
        if (schema) {
          responseInfo[code] = {
            description: response.description,
            schema: resolveSchema(schema, apiDoc.components.schemas)
          };
        }
      });
    }
    
    moduleGroups[tag].apis.push({
      path: apiPath,
      method: method.toUpperCase(),
      summary: details.summary || '',
      description: details.description || '',
      operationId: details.operationId || '',
      request: requestInfo,
      responses: responseInfo
    });
  });
});

// 解析schema引用
function resolveSchema(schema, schemas, visited = new Set()) {
  if (!schema) return null;
  
  // 处理$ref引用
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    
    // 防止循环引用
    if (visited.has(refName)) {
      return { type: 'object', description: `循环引用: ${refName}` };
    }
    
    visited.add(refName);
    const refSchema = schemas[refName];
    if (refSchema) {
      const resolved = resolveSchema(refSchema, schemas, new Set(visited));
      visited.delete(refName);
      return { ...resolved, refName };
    }
    return { type: 'unknown', description: `未找到引用: ${refName}` };
  }
  
  // 处理数组类型
  if (schema.type === 'array' && schema.items) {
    return {
      type: 'array',
      items: resolveSchema(schema.items, schemas, visited),
      description: schema.description
    };
  }
  
  // 处理对象类型
  if (schema.type === 'object' && schema.properties) {
    const properties = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      properties[key] = resolveSchema(prop, schemas, visited);
    });
    
    return {
      type: 'object',
      properties,
      required: schema.required || [],
      description: schema.description
    };
  }
  
  // 基础类型
  return {
    type: schema.type,
    format: schema.format,
    description: schema.description,
    enum: schema.enum,
    example: schema.example
  };
}

// 生成AI友好的文档格式
function generateAIFriendlyDoc(moduleData) {
  let doc = `# ${moduleData.name}\n\n`;
  
  if (moduleData.description) {
    doc += `## 模块描述\n${moduleData.description}\n\n`;
  }
  
  doc += `## 接口列表\n\n`;
  
  moduleData.apis.forEach(api => {
    doc += `### ${api.method} ${api.path}\n`;
    doc += `**功能**: ${api.summary}\n`;
    if (api.description) {
      doc += `**描述**: ${api.description}\n`;
    }
    doc += `**操作ID**: ${api.operationId}\n\n`;
    
    // 请求参数
    if (api.request.parameters && api.request.parameters.length > 0) {
      doc += `**查询参数**:\n`;
      api.request.parameters.forEach(param => {
        doc += `- ${param.name} (${param.type}${param.required ? ', 必填' : ', 可选'}): ${param.description || ''}\n`;
      });
      doc += `\n`;
    }
    
    if (api.request.requestBody) {
      doc += `**请求体**:\n`;
      doc += formatSchemaForAI(api.request.requestBody, 0);
      doc += `\n`;
    }
    
    // 响应信息
    if (Object.keys(api.responses).length > 0) {
      doc += `**响应**:\n`;
      Object.entries(api.responses).forEach(([code, response]) => {
        doc += `- ${code}: ${response.description}\n`;
        if (response.schema) {
          doc += formatSchemaForAI(response.schema, 1);
        }
      });
      doc += `\n`;
    }
    
    doc += `---\n\n`;
  });
  
  return doc;
}

// 格式化schema为AI友好的格式
function formatSchemaForAI(schema, indent = 0) {
  const spaces = '  '.repeat(indent);
  let result = '';
  
  if (!schema) return result;
  
  if (schema.refName) {
    result += `${spaces}引用类型: ${schema.refName}\n`;
  }
  
  if (schema.type === 'object' && schema.properties) {
    result += `${spaces}对象类型:\n`;
    Object.entries(schema.properties).forEach(([key, prop]) => {
      const required = schema.required?.includes(key) ? ' (必填)' : ' (可选)';
      const desc = prop.description ? ` - ${prop.description}` : '';
      result += `${spaces}  - ${key} (${prop.type}${prop.format ? `/${prop.format}` : ''})${required}${desc}\n`;
      
      if (prop.type === 'object' && prop.properties) {
        result += formatSchemaForAI(prop, indent + 2);
      } else if (prop.type === 'array' && prop.items) {
        result += `${spaces}    数组元素类型:\n`;
        result += formatSchemaForAI(prop.items, indent + 3);
      }
    });
  } else if (schema.type === 'array' && schema.items) {
    result += `${spaces}数组类型:\n`;
    result += formatSchemaForAI(schema.items, indent + 1);
  } else {
    const desc = schema.description ? ` - ${schema.description}` : '';
    result += `${spaces}类型: ${schema.type}${schema.format ? `/${schema.format}` : ''}${desc}\n`;
  }
  
  return result;
}

// 创建docs目录
const docsDir = './docs';
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir);
}

// 为每个模块生成文档
Object.values(moduleGroups).forEach(moduleData => {
  const doc = generateAIFriendlyDoc(moduleData);
  const filename = `${moduleData.name.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`;
  const filepath = path.join(docsDir, filename);
  
  fs.writeFileSync(filepath, doc, 'utf8');
  console.log(`生成文档: ${filepath}`);
});

// 生成总览文档
const overviewDoc = `# API接口文档总览\n\n## 模块列表\n\n${Object.values(moduleGroups).map(module => 
  `- [${module.name}](${module.name.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md) - ${module.description}`
).join('\n')}\n\n## 统计信息\n\n- 总模块数: ${Object.keys(moduleGroups).length}\n- 总接口数: ${Object.values(moduleGroups).reduce((sum, module) => sum + module.apis.length, 0)}\n`;

fs.writeFileSync(path.join(docsDir, 'README.md'), overviewDoc, 'utf8');
console.log('生成总览文档: docs/README.md');

console.log('\n文档生成完成！');