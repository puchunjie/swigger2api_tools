const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')
const http = require('http')

// 全局配置变量
let CONFIG = null

// 读取配置文件
function loadConfig() {
  const configPath = path.join(__dirname, '../swigger.config.js')
  const configDir = path.dirname(configPath) // 配置文件所在目录
  
  if (fs.existsSync(configPath)) {
    try {
      // 清除require缓存，确保获取最新配置
      delete require.cache[require.resolve(configPath)]
      // 直接 require 配置文件
      const config = require(configPath)
      console.log('✅ 已加载配置文件:', configPath)
      // 添加配置文件目录信息
      config._configDir = configDir
      return config
    } catch (error) {
      console.warn('⚠️  配置文件解析失败，使用默认配置:', error.message)
    }
  } else {
    console.log('📝 未找到配置文件，使用默认配置')
  }
  
  // 返回默认配置
  return {
    projectName: "default-project",
    language: "ts",
    source: null,
    swaggerVersion: "auto", // 自动检测 Swagger 版本
    outputDir: "./output",
    generateTypes: true,
    moduleNaming: {
      strategy: "tags",
      customFunction: null,
    },
    apiNaming: {
      strategy: "operationId",
      customFunction: null,
    },
    _configDir: configDir, // 添加配置文件目录信息
  }
}

// 设置配置的函数
function setConfig(config) {
  CONFIG = config
}

// 获取配置的函数
function getConfig() {
  if (!CONFIG) {
    CONFIG = loadConfig()
  }
  return CONFIG
}

// 检测字符串是否为 URL
function isUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// 从 URL 获取数据
function fetchDataFromUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http
    
    const request = client.get(url, (response) => {
      let data = ''
      
      // 处理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchDataFromUrl(response.headers.location).then(resolve).catch(reject)
      }
      
      // 检查状态码
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      
      // 设置响应编码为 UTF-8，确保中文字符正确处理
      response.setEncoding('utf8')
      
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve(jsonData)
        } catch (error) {
          reject(new Error(`解析 JSON 数据失败: ${error.message}`))
        }
      })
    })
    
    request.on('error', (error) => {
      reject(new Error(`网络请求失败: ${error.message}`))
    })
    
    // 设置超时
    request.setTimeout(30000, () => {
      request.destroy()
      reject(new Error('请求超时'))
    })
  })
}

// 从 requestImport 配置中提取变量名
function extractVariableNameFromImport(importStatement) {
  if (!importStatement || typeof importStatement !== 'string') {
    return 'request' // 默认变量名
  }
  
  // 移除多余的空格和换行符
  const cleanImport = importStatement.trim()
  
  // 匹配默认导入: import variableName from '...'
  const defaultImportMatch = cleanImport.match(/^import\s+(\w+)\s+from\s+['"`][^'"`]+['"`]/)
  if (defaultImportMatch) {
    return defaultImportMatch[1]
  }
  
  // 匹配具名导入: import { variableName } from '...'
  const namedImportMatch = cleanImport.match(/^import\s*\{\s*(\w+)\s*\}\s*from\s+['"`][^'"`]+['"`]/)
  if (namedImportMatch) {
    return namedImportMatch[1]
  }
  
  // 匹配具名导入带别名: import { originalName as aliasName } from '...'
  const aliasImportMatch = cleanImport.match(/^import\s*\{\s*\w+\s+as\s+(\w+)\s*\}\s*from\s+['"`][^'"`]+['"`]/)
  if (aliasImportMatch) {
    return aliasImportMatch[1]
  }
  
  // 匹配命名空间导入: import * as variableName from '...'
  const namespaceImportMatch = cleanImport.match(/^import\s*\*\s*as\s+(\w+)\s+from\s+['"`][^'"`]+['"`]/)
  if (namespaceImportMatch) {
    return namespaceImportMatch[1]
  }
  
  // 如果都不匹配，返回默认值
  console.warn('⚠️  无法解析 requestImport 中的变量名，使用默认值 "request"')
  return 'request'
}

// 从 source 配置获取 Swagger 数据
async function getSwaggerDataFromSource() {
  const { source } = getConfig()
  
  if (!source) {
    throw new Error('❌ 未配置数据源 (source)')
  }
  
  // 1. 如果是字符串，检查是 URL 还是文件路径
  if (typeof source === 'string') {
    // 检查是否为 URL
    if (isUrl(source)) {
      console.log('🔄 从 URL 获取数据...')
      console.log(`🌐 数据源: ${source}`)
      
      try {
        const data = await fetchDataFromUrl(source)
        if (!data || typeof data !== 'object') {
          throw new Error('❌ URL 返回的数据无效')
        }
        console.log('✅ 成功从 URL 获取数据')
        return data
      } catch (error) {
        throw new Error(`❌ 从 URL 获取数据失败: ${error.message}`)
      }
    } else {
      // 当作文件路径处理
      console.log('🔄 从文件读取数据...')
      console.log(`📁 数据源: ${source}`)
      
      let filePath
      if (path.isAbsolute(source)) {
        filePath = source
      } else {
        // 使用项目工作目录作为相对路径的基准目录
        const config = getConfig()
        const projectDir = config._projectDir || process.cwd()
        console.log('🔍 调试信息:')
        console.log(`   项目工作目录: ${projectDir}`)
        console.log(`   当前工作目录: ${process.cwd()}`)
        console.log(`   相对路径: ${source}`)
        filePath = path.resolve(projectDir, source)
        console.log(`   解析后路径: ${filePath}`)
      }
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`❌ 数据文件不存在: ${filePath}`)
      }
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8')
        if (!fileContent.trim()) {
          throw new Error('❌ 数据文件为空')
        }
        const data = JSON.parse(fileContent)
        console.log('✅ 成功加载文件数据')
        return data
      } catch (error) {
        throw new Error(`❌ 读取或解析文件失败: ${error.message}`)
      }
    }
  }
  
  // 2. 如果是函数，执行函数获取数据
  if (typeof source === 'function') {
    console.log('🔄 执行自定义函数获取数据...')
    try {
      const result = await source()
      if (!result || typeof result !== 'object') {
        throw new Error('❌ 自定义函数返回的数据无效')
      }
      console.log('✅ 成功从自定义函数获取数据')
      return result
    } catch (error) {
      throw new Error(`❌ 执行自定义函数失败: ${error.message}`)
    }
  }
  
  // 3. 如果是对象，直接使用
  if (typeof source === 'object' && source !== null) {
    console.log('🔄 使用配置中的 JSON 数据...')
    console.log('✅ 成功加载配置数据')
    return source
  }
  
  throw new Error('❌ 不支持的数据源类型，source 必须是字符串路径、URL 地址、JSON 对象或 Promise 函数')
}

// 读取 Swagger JSON 文件（用于对比）
function readSwaggerFile() {
  const config = getConfig()
  // 使用项目工作目录而不是swigger目录
  const projectDir = config._projectDir || config._configDir || process.cwd()
  const swaggerPath = path.join(projectDir, 'response.json')
  
  if (!fs.existsSync(swaggerPath)) {
    return null
  }
  try {
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8')
    if (!swaggerContent.trim()) {
      return null
    }
    return JSON.parse(swaggerContent)
  } catch (error) {
    console.log('⚠️  读取本地文件失败，将使用新数据:', error.message)
    return null
  }
}

// 保存 Swagger 数据到本地文件
function saveSwaggerData(swaggerData) {
  const config = getConfig()
  // 使用项目工作目录而不是swigger目录
  const projectDir = config._projectDir || config._configDir || process.cwd()
  const swaggerPath = path.join(projectDir, 'response.json')
  fs.writeFileSync(swaggerPath, JSON.stringify(swaggerData, null, 2), 'utf8')
}

// 结构化处理 Swagger 数据用于对比
function structureSwaggerData(swaggerData) {
  const structured = {
    info: swaggerData.info,
    tags: swaggerData.tags || [],
    paths: {}
  }
  
  // 处理路径信息，提取关键字段用于对比
  Object.keys(swaggerData.paths || {}).forEach(path => {
    const pathData = swaggerData.paths[path]
    structured.paths[path] = {}
    
    Object.keys(pathData).forEach(method => {
      const apiInfo = pathData[method]
      structured.paths[path][method] = {
        tags: apiInfo.tags || [],
        summary: apiInfo.summary || '',
        description: apiInfo.description || '',
        operationId: apiInfo.operationId || '',
        parameters: apiInfo.parameters || [],
        requestBody: apiInfo.requestBody || null,
        responses: apiInfo.responses || {}
      }
    })
  })
  
  return structured
}

// 生成数据的哈希值用于快速对比
function generateDataHash(data) {
  const jsonString = JSON.stringify(data)
  return crypto.createHash('md5').update(jsonString).digest('hex')
}

// 对比两个结构化数据，返回变化信息
function compareSwaggerData(oldData, newData) {
  if (!oldData) {
    return {
      hasChanges: true,
      changes: {
        added: Object.keys(newData.paths).length,
        modified: 0,
        deleted: 0
      },
      details: {
        added: Object.keys(newData.paths),
        modified: [],
        deleted: []
      }
    }
  }
  
  const changes = {
    added: 0,
    modified: 0,
    deleted: 0
  }
  
  const details = {
    added: [],
    modified: [],
    deleted: []
  }
  
  // 检查新增和修改的路径
  Object.keys(newData.paths).forEach(path => {
    if (!oldData.paths[path]) {
      changes.added++
      details.added.push(path)
    } else {
      const oldHash = generateDataHash(oldData.paths[path])
      const newHash = generateDataHash(newData.paths[path])
      if (oldHash !== newHash) {
        changes.modified++
        details.modified.push(path)
      }
    }
  })
  
  // 检查删除的路径
  Object.keys(oldData.paths).forEach(path => {
    if (!newData.paths[path]) {
      changes.deleted++
      details.deleted.push(path)
    }
  })
  
  const hasChanges = changes.added > 0 || changes.modified > 0 || changes.deleted > 0
  
  return {
    hasChanges,
    changes,
    details
  }
}

// 按模块分组API路径
function groupApiPathsByModule(paths) {
  const modules = {}
  
  paths.forEach(path => {
    // 提取模块名（如 /v1/vessel/create 中的 vessel）
    const pathParts = path.split('/').filter(part => part)
    let moduleName = 'other'
    
    if (pathParts.length >= 2 && pathParts[0] === 'v1') {
      moduleName = pathParts[1]
    } else if (pathParts.length >= 1) {
      moduleName = pathParts[0]
    }
    
    if (!modules[moduleName]) {
      modules[moduleName] = []
    }
    modules[moduleName].push(path)
  })
  
  return modules
}

// 生成更新日志
function generateUpdateLog(compareResult, isForced = false) {
  console.log('🔍 generateUpdateLog 被调用')
  console.log('🔍 compareResult.hasChanges:', compareResult.hasChanges)
  console.log('🔍 isForced:', isForced)
  
  const now = new Date()
  const timestamp = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  let logContent = `## ${timestamp}\n\n`
  
  // 如果是强制模式且没有变化，记录强制重新生成
  if (isForced && !compareResult.hasChanges) {
    logContent += `### 强制重新生成\n\n`
    logContent += `- 使用 --force 参数强制重新生成所有 API 文件\n`
    logContent += `- 没有检测到 API 变化\n\n`
  } else {
    // 按变更类型处理
    const changeTypes = [
      { key: 'added', label: '新增', count: compareResult.changes.added },
      { key: 'modified', label: '修改', count: compareResult.changes.modified },
      { key: 'deleted', label: '删除', count: compareResult.changes.deleted }
    ]
    
    changeTypes.forEach(({ key, label, count }) => {
      if (count > 0) {
        logContent += `### ${label} (${count})\n\n`
        
        // 按模块分组
        const moduleGroups = groupApiPathsByModule(compareResult.details[key])
        const sortedModules = Object.keys(moduleGroups).sort()
        
        sortedModules.forEach(moduleName => {
          const paths = moduleGroups[moduleName]
          logContent += `#### ${moduleName} 模块\n`
          paths.forEach(path => {
            logContent += `- ${path}\n`
          })
          logContent += '\n'
        })
      }
    })
  }
  
  logContent += '---\n\n'
  
  return logContent
}

// 追加更新日志到文件
function appendUpdateLog(logContent) {
  // 检查是否启用了更新日志功能
  const updateLogConfig = getConfig().updateLog || { enabled: true, outputPath: "./" }
  
  console.log('📝 更新日志配置:', updateLogConfig)
  console.log('📝 日志内容长度:', logContent.length)
  
  if (!updateLogConfig.enabled) {
    console.log('❌ 更新日志功能未启用')
    return
  }
  
  // 确定日志文件路径
  let logDir
  const config = getConfig()
  const projectDir = config._projectDir || process.cwd()
  
  // 如果 outputPath 是绝对路径，检查是否是配置目录，如果是则改为项目目录
  if (path.isAbsolute(updateLogConfig.outputPath)) {
    // 如果 outputPath 指向配置目录，则改为项目目录
    if (config._configDir && updateLogConfig.outputPath === config._configDir) {
      logDir = projectDir
    } else {
      logDir = updateLogConfig.outputPath
    }
  } else {
    // 相对路径，相对于项目工作目录
    logDir = path.resolve(projectDir, updateLogConfig.outputPath)
  }
  
  console.log('📁 日志目录:', logDir)
  
  // 确保目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
    console.log('📁 创建日志目录:', logDir)
  }
  
  const logPath = path.join(logDir, 'SWIGGER_UPLOAD_LOG.md')
  console.log('📄 日志文件路径:', logPath)
  
  let existingContent = ''
  if (fs.existsSync(logPath)) {
    existingContent = fs.readFileSync(logPath, 'utf8')
    console.log('📄 读取现有日志内容，长度:', existingContent.length)
  }
  
  // 将新日志添加到文件开头
  const newContent = logContent + existingContent
  fs.writeFileSync(logPath, newContent, 'utf8')
  console.log('✅ 日志文件已写入:', logPath)
}

// 生成函数名
function generateFunctionName(operationId, method, path) {
  // 根据配置文件中的 apiNaming 策略生成函数名
  const apiNamingConfig = getConfig().apiNaming || { strategy: 'operationId' }
  
  // 如果配置了自定义函数，优先使用自定义函数
  if (apiNamingConfig.strategy === 'custom' && typeof apiNamingConfig.customFunction === 'function') {
    try {
      const customName = apiNamingConfig.customFunction(operationId, path)
      if (customName && typeof customName === 'string') {
        return customName
      }
    } catch (error) {
      console.warn('⚠️  自定义函数执行失败，使用默认策略:', error.message)
    }
  }
  
  // 如果策略是 'operationId' 且存在 operationId，使用 operationId
  if (apiNamingConfig.strategy === 'operationId' && operationId) {
    // 将 operationId 转换为驼峰命名
    return operationId.charAt(0).toLowerCase() + operationId.slice(1) + 'Api'
  }

  // 默认策略：根据路径和方法生成函数名
  const pathParts = path.split('/').filter((part) => part && !part.startsWith('{'))
  const lastPart = pathParts[pathParts.length - 1]

  const methodMap = {
    get: 'get',
    post: 'post',
    put: 'update',
    delete: 'delete'
  }

  const prefix = methodMap[method.toLowerCase()] || method.toLowerCase()
  const suffix = lastPart ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1) : 'Data'

  return prefix + suffix + 'Api'
}

// 生成注释
function generateComment(apiInfo) {
  const { summary, description } = apiInfo
  if (summary || description) {
    // 清理注释内容，确保中文字符正确显示，移除可能导致问题的字符
    const commentText = (summary || description)
      .replace(/\r\n/g, ' ')  // 替换 Windows 换行符
      .replace(/\n/g, ' ')    // 替换 Unix 换行符
      .replace(/\r/g, ' ')    // 替换 Mac 换行符
      .replace(/\t/g, ' ')    // 替换制表符
      .replace(/\s+/g, ' ')   // 合并多个空格
      .trim()                 // 去除首尾空格
    
    return `// ${commentText}`
  }
  return ''
}

// 生成参数类型
function generateParameterType(apiInfo, method, schemas = {}) {
  const { parameters, requestBody } = apiInfo

  // 如果有 requestBody，分析其类型
  if (requestBody) {
    const content = requestBody.content
    if (content && content['application/json'] && content['application/json'].schema) {
      const schema = content['application/json'].schema
      const typeName = getTypeNameFromSchema(schema, schemas)
      return `data: ${typeName}`
    }
    return 'data: any'
  }

  // 如果有 parameters，根据参数类型决定
  if (parameters && parameters.length > 0) {
    const queryParams = parameters.filter((p) => p.in === 'query')
    if (queryParams.length === 1 && queryParams[0].name === 'id') {
      return 'id: number | string'
    } else if (queryParams.length > 1) {
      // 生成参数接口类型
      const paramTypeName = generateParamsTypeName(apiInfo.operationId, method)
      return `params: Types.${paramTypeName}`
    } else {
      return 'params: any'
    }
  }

  return ''
}

// 生成请求配置
function generateRequestConfig(path, method, apiInfo) {
  const { parameters, requestBody } = apiInfo

  let config = `{ url: '${path}'`

  // 如果有 requestBody，添加 data
  if (requestBody) {
    config += ', data'
  }

  // 如果有 query 参数
  if (parameters && parameters.length > 0) {
    const queryParams = parameters.filter((p) => p.in === 'query')
    if (queryParams.length === 1 && queryParams[0].name === 'id') {
      // 单个 id 参数，直接拼接到 URL
      const newPath = path.includes('?') ? `${path}&id=\${id}` : `${path}?id=\${id}`
      config = `{ url: \`${newPath}\``
    } else if (queryParams.length > 0) {
      config += ', params'
    }
  }

  config += ' }'
  return config
}

// 生成单个 API 函数
function generateApiFunction(path, method, apiInfo, schemas = {}) {
  const functionName = generateFunctionName(apiInfo.operationId, method, path)
  const comment = generateComment(apiInfo)
  const isTypeScript = CONFIG.language === 'ts'
  const paramType = isTypeScript ? generateParameterType(apiInfo, method, schemas) : ''
  const requestConfig = generateRequestConfig(path, method, apiInfo)
  const responseType = isTypeScript ? getResponseType(apiInfo, schemas) : ''

  let functionCode = ''

  if (comment) {
    functionCode += comment + '\n'
  }

  // 在JS模式下，也需要根据API需要的参数来定义函数参数
  let params = ''
  if (isTypeScript && paramType) {
    params = `(${paramType})`
  } else if (!isTypeScript) {
    // JS模式下，根据API需要确定参数
    const { parameters, requestBody } = apiInfo
    const needsParams = []
    
    if (requestBody) {
      needsParams.push('data')
    }
    
    if (parameters && parameters.length > 0) {
      const queryParams = parameters.filter((p) => p.in === 'query')
      if (queryParams.length === 1 && queryParams[0].name === 'id') {
        needsParams.push('id')
      } else if (queryParams.length > 0) {
        needsParams.push('params')
      }
    }
    
    params = needsParams.length > 0 ? `(${needsParams.join(', ')})` : '()'
  } else {
    params = '()'
  }
  
  const returnType = isTypeScript ? `: Promise<${responseType}>` : ''
  const requestVariableName = extractVariableNameFromImport(CONFIG.requestImport)
  functionCode += `export const ${functionName} = ${params}${returnType} => {\n`
  functionCode += `  return ${requestVariableName}.${method.toLowerCase()}(${requestConfig})\n`
  functionCode += '}'

  return functionCode
}

// 从schema获取类型名称（用于接口定义内部，不添加Types前缀）
function getTypeNameFromSchemaForInterface(schema, schemas = {}) {
  if (!schema) return 'any'
  
  // 处理$ref引用
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    return refName
  }
  
  // 处理数组类型
  if (schema.type === 'array' && schema.items) {
    const itemType = getTypeNameFromSchemaForInterface(schema.items, schemas)
    return `${itemType}[]`
  }
  
  // 处理基础类型
  switch (schema.type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'Record<string, any>'
    default:
      return 'any'
  }
}

// 从schema获取类型名称（用于API函数，添加Types前缀）
function getTypeNameFromSchema(schema, schemas = {}) {
  if (!schema) return 'any'
  
  // 处理$ref引用
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    return `Types.${refName}`
  }
  
  // 处理数组类型
  if (schema.type === 'array' && schema.items) {
    const itemType = getTypeNameFromSchema(schema.items, schemas)
    return `${itemType}[]`
  }
  
  // 处理基础类型
  switch (schema.type) {
    case 'string':
      return 'string'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return 'Record<string, any>'
    default:
      return 'any'
  }
}

// 生成参数类型名称
function generateParamsTypeName(operationId, method) {
  const baseName = operationId || `${method}Params`
  return baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Params'
}

// 获取响应类型
function getResponseType(apiInfo, schemas = {}) {
  const { responses } = apiInfo
  
  if (!responses) return 'any'
  
  // 优先查找 200 响应
  const successResponse = responses['200'] || responses['201'] || responses['204']
  if (!successResponse) return 'any'
  
  const content = successResponse.content
  if (!content) return 'any'
  
  const jsonContent = content['application/json']
  if (!jsonContent || !jsonContent.schema) return 'any'
  
  return getTypeNameFromSchema(jsonContent.schema, schemas)
}

// 生成类型定义
function generateTypeDefinitions(schemas) {
  if (!schemas || Object.keys(schemas).length === 0) {
    return ''
  }

  let typeDefinitions = ''

  Object.keys(schemas).forEach(schemaName => {
    const schema = schemas[schemaName]
    typeDefinitions += generateInterfaceFromSchema(schemaName, schema, schemas)
    typeDefinitions += '\n\n'
  })

  return typeDefinitions
}

// 从schema生成接口定义
function generateInterfaceFromSchema(interfaceName, schema, schemas = {}) {
  if (!schema) return `export interface ${interfaceName} {\n  [key: string]: any\n}`
  
  // 处理$ref引用
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    return `export type ${interfaceName} = ${refName}`
  }
  
  // 处理数组类型
  if (schema.type === 'array' && schema.items) {
    const itemType = getTypeNameFromSchemaForInterface(schema.items, schemas)
    return `export type ${interfaceName} = ${itemType}[]`
  }
  
  // 处理对象类型
  if (schema.type === 'object' || schema.properties) {
    let interfaceContent = `export interface ${interfaceName} {\n`
    
    if (schema.properties) {
      Object.keys(schema.properties).forEach(propName => {
        const propSchema = schema.properties[propName]
        const isRequired = schema.required && schema.required.includes(propName)
        const optional = isRequired ? '' : '?'
        const propType = getTypeNameFromSchemaForInterface(propSchema, schemas)
        
        // 添加属性注释
        if (propSchema.description) {
          interfaceContent += `  /** ${propSchema.description} */\n`
        }
        
        interfaceContent += `  ${propName}${optional}: ${propType}\n`
      })
    } else {
      interfaceContent += `  [key: string]: any\n`
    }
    
    interfaceContent += '}'
    return interfaceContent
  }
  
  // 处理基础类型
  const baseType = getTypeNameFromSchemaForInterface(schema, schemas)
  return `export type ${interfaceName} = ${baseType}`
}

// 生成参数接口定义
function generateParameterInterface(apiInfo, method, schemas = {}) {
  const { parameters } = apiInfo
  
  if (!parameters || parameters.length === 0) {
    return ''
  }
  
  const queryParams = parameters.filter(p => p.in === 'query')
  if (queryParams.length <= 1) {
    return ''
  }
  
  const interfaceName = generateParamsTypeName(apiInfo.operationId, method)
  let interfaceContent = `export interface ${interfaceName} {\n`
  
  queryParams.forEach(param => {
    const optional = param.required ? '' : '?'
    let paramType = 'any'
    
    if (param.schema) {
      paramType = getTypeNameFromSchemaForInterface(param.schema, schemas)
    }
    
    if (param.description) {
      interfaceContent += `  /** ${param.description} */\n`
    }
    
    interfaceContent += `  ${param.name}${optional}: ${paramType}\n`
  })
  
  interfaceContent += '}'
  return interfaceContent
}

// 按标签分组API
function groupApisByTag(swaggerData) {
  const { paths } = swaggerData
  const groupedApis = {}

  Object.keys(paths).forEach(path => {
    const pathData = paths[path]
    Object.keys(pathData).forEach(method => {
      const apiInfo = pathData[method]
      const tags = apiInfo.tags || ['other']

      tags.forEach(tag => {
        if (!groupedApis[tag]) {
          groupedApis[tag] = []
        }
        groupedApis[tag].push({
          path,
          method,
          apiInfo
        })
      })
    })
  })

  return groupedApis
}

// 生成模块名
function generateModuleName(tag, path, operationId, tags) {
  // 根据配置文件中的 moduleNaming 策略生成模块名
  const moduleNamingConfig = getConfig().moduleNaming || { strategy: 'tags' }
  
  // 如果配置了自定义函数，优先使用自定义函数
  if (moduleNamingConfig.strategy === 'custom' && typeof moduleNamingConfig.customFunction === 'function') {
    try {
      const customName = moduleNamingConfig.customFunction(path, operationId, tags)
      if (customName && typeof customName === 'string') {
        return customName
      }
    } catch (error) {
      console.warn('⚠️  自定义模块名函数执行失败，使用默认策略:', error.message)
    }
  }
  
  // 默认策略：使用标签名
  const finalModuleName = tag || 'other'
  return finalModuleName
}

// 生成API文档JSON内容
function generateApiDocsJson(tag, apis, swaggerData) {
  // 获取第一个接口的所有标签
  const firstApiTags = apis[0]?.apiInfo?.tags || [tag]
  const moduleName = generateModuleName(tag, apis[0]?.path, apis[0]?.apiInfo?.operationId, firstApiTags)
  const moduleDescription = swaggerData.tags?.find(t => t.name === tag)?.description || ''
  const schemas = swaggerData.components?.schemas || swaggerData.definitions || {}
  
  const apiDocsData = {
    moduleName: moduleDescription || tag,
    moduleDescription: moduleDescription || tag,
    englishTag: moduleName,
    apis: []
  }
  
  apis.forEach(({ path, method, apiInfo }) => {
    const apiDoc = {
      path: path,
      method: method.toUpperCase(),
      summary: apiInfo.summary || '',
      description: apiInfo.description || apiInfo.summary || '',
      operationId: apiInfo.operationId,
      request: {},
      response: {}
    }
    
    // 处理请求参数
    if (apiInfo.requestBody) {
      const requestBodySchema = apiInfo.requestBody.content?.['application/json']?.schema
      if (requestBodySchema) {
        apiDoc.request.requestBody = parseSchemaToApiDoc(requestBodySchema, schemas)
      }
    }
    
    // 处理URL参数
    if (apiInfo.parameters && apiInfo.parameters.length > 0) {
      apiDoc.request.parameters = apiInfo.parameters.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required || false,
        type: param.schema?.type || 'string',
        description: param.description || ''
      }))
    }
    
    // 处理响应
    if (apiInfo.responses) {
      const successResponse = apiInfo.responses['200'] || apiInfo.responses['201']
      if (successResponse) {
        const responseSchema = successResponse.content?.['application/json']?.schema
        if (responseSchema) {
          apiDoc.response = parseSchemaToApiDoc(responseSchema, schemas)
        }
      }
    }
    
    apiDocsData.apis.push(apiDoc)
  })
  
  return apiDocsData
}

// 为合并模块生成API文档JSON内容
function generateApiDocsJsonForMergedModule(moduleName, apis, swaggerData, originalTags) {
  const schemas = swaggerData.components?.schemas || swaggerData.definitions || {}
  
  // 获取所有相关标签的描述信息
  const tagDescriptions = originalTags.map(tag => {
    const tagInfo = swaggerData.tags?.find(t => t.name === tag)
    return tagInfo ? `${tag}: ${tagInfo.description || tag}` : tag
  }).join(', ')
  
  const apiDocsData = {
    moduleName: moduleName,
    moduleDescription: `合并模块，包含以下标签: ${tagDescriptions}`,
    englishTag: moduleName,
    originalTags: originalTags, // 记录原始标签
    apis: []
  }
  
  apis.forEach(({ path, method, apiInfo }) => {
    const apiDoc = {
      path: path,
      method: method.toUpperCase(),
      summary: apiInfo.summary || '',
      description: apiInfo.description || apiInfo.summary || '',
      operationId: apiInfo.operationId,
      originalTags: apiInfo.tags || [], // 记录每个API的原始标签
      request: {},
      response: {}
    }
    
    // 处理请求参数
    if (apiInfo.requestBody) {
      const requestBodySchema = apiInfo.requestBody.content?.['application/json']?.schema
      if (requestBodySchema) {
        apiDoc.request.requestBody = parseSchemaToApiDoc(requestBodySchema, schemas)
      }
    }
    
    // 处理URL参数
    if (apiInfo.parameters && apiInfo.parameters.length > 0) {
      apiDoc.request.parameters = apiInfo.parameters.map(param => ({
        name: param.name,
        in: param.in,
        required: param.required || false,
        type: param.schema?.type || 'string',
        description: param.description || ''
      }))
    }
    
    // 处理响应
    if (apiInfo.responses) {
      const successResponse = apiInfo.responses['200'] || apiInfo.responses['201']
      if (successResponse) {
        const responseSchema = successResponse.content?.['application/json']?.schema
        if (responseSchema) {
          apiDoc.response = parseSchemaToApiDoc(responseSchema, schemas)
        }
      }
    }
    
    apiDocsData.apis.push(apiDoc)
  })
  
  return apiDocsData
}

// 解析Schema为API文档格式
function parseSchemaToApiDoc(schema, schemas = {}) {
  if (!schema) return {}
  
  // 处理引用
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    const refSchema = schemas[refName]
    if (refSchema) {
      return parseSchemaToApiDoc(refSchema, schemas)
    }
  }
  
  const result = {
    type: schema.type || 'object',
    description: schema.description || ''
  }
  
  if (schema.type === 'object' && schema.properties) {
    result.fields = []
    Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
      const field = {
        name: fieldName,
        required: schema.required?.includes(fieldName) || false,
        type: fieldSchema.type || 'string',
        description: fieldSchema.description || ''
      }
      
      // 处理嵌套对象
      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        field.fields = parseSchemaToApiDoc(fieldSchema, schemas).fields
      }
      
      // 处理数组
      if (fieldSchema.type === 'array' && fieldSchema.items) {
        field.itemType = fieldSchema.items.type || 'object'
        if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
          field.itemFields = parseSchemaToApiDoc(fieldSchema.items, schemas).fields
        }
      }
      
      result.fields.push(field)
    })
  }
  
  return result
}

// 生成README文档内容
function generateReadmeContent(tag, apis, swaggerData) {
  // 构建模块数据，与旧版本generateDocumentContent函数逻辑一致
  const moduleData = {
    name: tag,
    description: swaggerData.tags?.find(t => t.name === tag)?.description || '',
    apis: []
  };
  
  // 直接使用传入的apis参数，为每个API提取详细信息
  apis.forEach(api => {
    const { path, method, apiInfo } = api;
    
    // 提取请求参数信息
    const requestInfo = {};
    
    // 处理requestBody
    if (apiInfo.requestBody) {
      const schema = apiInfo.requestBody.content?.['application/json']?.schema;
      if (schema) {
        requestInfo.requestBody = resolveSchema(schema, swaggerData.components?.schemas || {});
      }
    }
    
    // 处理parameters
    if (apiInfo.parameters) {
      requestInfo.parameters = apiInfo.parameters.map(param => ({
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
    if (apiInfo.responses) {
      Object.entries(apiInfo.responses).forEach(([code, response]) => {
        const schema = response.content?.['*/*']?.schema || response.content?.['application/json']?.schema;
        if (schema) {
          responseInfo[code] = {
            description: response.description,
            schema: resolveSchema(schema, swaggerData.components?.schemas || {})
          };
        }
      });
    }
    
    moduleData.apis.push({
      path,
      method: method.toUpperCase(),
      summary: apiInfo.summary || '',
      description: apiInfo.description || '',
      operationId: apiInfo.operationId || '',
      request: requestInfo,
      responses: responseInfo
    });
  });
  
  return generateAIFriendlyDoc(moduleData, swaggerData);
}

// 解析Schema引用
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

// 格式化Schema为AI友好的文档格式
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

// 生成AI友好的文档格式
function generateAIFriendlyDoc(moduleData, swaggerData) {
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

// 生成API代码内容
function generateDocumentContent(tag, apis, swaggerData) {
  const schemas = swaggerData.components?.schemas || swaggerData.definitions || {}
  const moduleName = generateModuleName(tag, apis[0]?.path, apis[0]?.apiInfo?.operationId, [tag])
  const isTypeScript = CONFIG.language === 'ts'
  
  let content = ''
  
  // 生成导入语句
  const hasSchemas = schemas && Object.keys(schemas).length > 0
  if (isTypeScript && CONFIG.generateTypes && hasSchemas) {
    content += `import * as Types from './types'\n`
  }
  content += `${CONFIG.requestImport || "import request from '@/utils/request'"}\n\n`
  
  // 生成参数接口定义（仅在TypeScript模式下）
  if (isTypeScript) {
    const paramInterfaces = []
    apis.forEach(({ path, method, apiInfo }) => {
      const paramInterface = generateParameterInterface(apiInfo, method, schemas)
      if (paramInterface) {
        paramInterfaces.push(paramInterface)
      }
    })
    
    if (paramInterfaces.length > 0) {
      content += '// 参数接口定义\n'
      content += paramInterfaces.join('\n\n')
      content += '\n\n'
    }
  }
  
  // 生成API函数
  content += '// API 函数\n'
  apis.forEach(({ path, method, apiInfo }) => {
    const apiFunction = generateApiFunction(path, method, apiInfo, schemas)
    content += apiFunction + '\n\n'
  })
  
  return content
}

// 生成索引文件
function generateIndexFile(outputDir, folderNames) {
  let content = '// 自动生成的API索引文件\n\n'
  
  folderNames.forEach(folderName => {
    content += `export * from './${folderName}'\n`
  })
  
  const isTypeScript = getConfig().language === 'ts'
  const indexFileName = isTypeScript ? 'index.ts' : 'index.js'
  const indexPath = path.join(outputDir, indexFileName)
  fs.writeFileSync(indexPath, content, 'utf8')
}

// 主函数：生成API文件
async function generateApiFiles(options = {}) {
  try {
    console.log('🚀 开始生成 API 文件...')
    console.log(`📋 项目名称: ${getConfig().projectName}`)
    console.log(`📂 输出目录: ${getConfig().outputDir}`)
    
    // 从 source 配置获取数据
    const swaggerData = await getSwaggerDataFromSource()

    // 读取上次保存的数据用于对比
    console.log('🔄 检查数据变化...')
    const oldSwaggerData = readSwaggerFile()
    
    // 结构化处理数据
    const oldStructuredData = oldSwaggerData ? structureSwaggerData(oldSwaggerData) : null
    const newStructuredData = structureSwaggerData(swaggerData)
    
    // 对比数据变化
    const compareResult = compareSwaggerData(oldStructuredData, newStructuredData)
    
    if (!compareResult.hasChanges && oldSwaggerData && !options.force) {
      console.log('📋 没有检测到API变化，跳过本次更新')
      console.log('💡 提示：使用 --force 参数可以强制重新生成')
      return
    }
    
    if (options.force && !compareResult.hasChanges) {
      console.log('🔄 强制重新生成模式，忽略数据变化检查')
    }
    
    // 生成更新日志（有变化或强制模式）
    console.log('🔍 检查日志生成条件:')
    console.log('🔍 compareResult.hasChanges:', compareResult.hasChanges)
    console.log('🔍 options.force:', options.force)
    console.log('🔍 条件结果:', compareResult.hasChanges || options.force)
    
    if (compareResult.hasChanges || options.force) {
      if (compareResult.hasChanges) {
        console.log('📝 检测到API变化:')
        console.log(`   新增: ${compareResult.changes.added} 个接口`)
        console.log(`   修改: ${compareResult.changes.modified} 个接口`)
        console.log(`   删除: ${compareResult.changes.deleted} 个接口`)
      }
      
      // 生成并追加更新日志
      console.log('🔍 准备生成更新日志')
      const logContent = generateUpdateLog(compareResult, options.force && !compareResult.hasChanges)
      console.log('🔍 日志内容生成完成，长度:', logContent.length)
      console.log('🔍 准备调用 appendUpdateLog')
      appendUpdateLog(logContent)
      console.log('🔍 appendUpdateLog 调用完成')
      
      // 显示日志文件的实际路径
      const updateLogConfig = getConfig().updateLog || { enabled: true, outputPath: "./" }
      if (updateLogConfig.enabled) {
        let logDir
        if (path.isAbsolute(updateLogConfig.outputPath)) {
          logDir = updateLogConfig.outputPath
        } else {
          const config = getConfig()
          const projectDir = config._projectDir || process.cwd()
          logDir = path.resolve(projectDir, updateLogConfig.outputPath)
        }
        const logPath = path.join(logDir, 'SWIGGER_UPLOAD_LOG.md')
        console.log(`📄 已更新日志到 ${logPath}`)
      }
    }
    
    // 保存当前数据到本地文件
    saveSwaggerData(swaggerData)
    console.log('💾 已保存当前数据到 response.json')

    // 按标签分组API
    const groupedApisByTag = groupApisByTag(swaggerData)
    
    // 按最终模块名重新分组API，解决模块名冲突时的接口整合问题
    const groupedApisByModule = {}
    Object.keys(groupedApisByTag).forEach(tag => {
      const apis = groupedApisByTag[tag]
      if (apis.length === 0) return
      
      // 获取第一个接口的所有标签
      const firstApiTags = apis[0]?.apiInfo?.tags || [tag]
      const moduleName = generateModuleName(tag, apis[0]?.path, apis[0]?.apiInfo?.operationId, firstApiTags)
      
      // 如果模块名已存在，合并接口；否则创建新模块
      if (!groupedApisByModule[moduleName]) {
        groupedApisByModule[moduleName] = {
          apis: [],
          tags: new Set() // 记录所有相关的原始标签
        }
      }
      
      // 合并接口
      groupedApisByModule[moduleName].apis.push(...apis)
      groupedApisByModule[moduleName].tags.add(tag)
    })
    
    // 确保输出目录存在
    // 如果outputDir是相对路径，则相对于项目工作目录；如果是绝对路径，则直接使用
    const config = getConfig()
    const projectDir = config._projectDir || process.cwd()
    const outputDir = path.isAbsolute(config.outputDir) 
      ? config.outputDir 
      : path.resolve(projectDir, config.outputDir)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 类型定义文件现在在每个模块内生成，不再生成全局types.ts

    // 为每个模块生成对应的文件夹和文件
    const folderNames = []
    const isTypeScript = getConfig().language === 'ts'
    Object.keys(groupedApisByModule).forEach(moduleName => {
      const moduleData = groupedApisByModule[moduleName]
      const apis = moduleData.apis
      const originalTags = Array.from(moduleData.tags)
      
      if (apis.length === 0) return

      // 创建模块文件夹
      const moduleFolderPath = path.join(outputDir, moduleName)
      if (!fs.existsSync(moduleFolderPath)) {
        fs.mkdirSync(moduleFolderPath, { recursive: true })
      }

      // 生成类型定义文件（仅在TypeScript模式下）
      let hasTypes = false
      if (isTypeScript) {
        // 支持 Swagger 2.0 和 OpenAPI 3.0 的 schemas 差异
        const schemas = swaggerData.components?.schemas || swaggerData.definitions || {}
        const typesContent = generateTypeDefinitions(schemas)
        hasTypes = typesContent.trim().length > 0
        
        if (hasTypes) {
          const typesFileName = 'types.ts'
          const typesFilePath = path.join(moduleFolderPath, typesFileName)
          const moduleTypesContent = `// 自动生成的类型定义文件\n\n${typesContent}`
          fs.writeFileSync(typesFilePath, moduleTypesContent, 'utf8')
        }
      }

      // 生成接口定义文件 - 使用第一个原始标签作为主标签
      const primaryTag = originalTags[0]
      const apiFileContent = generateDocumentContent(primaryTag, apis, swaggerData)
      const apiFileName = isTypeScript ? 'index.ts' : 'index.js'
      const apiFilePath = path.join(moduleFolderPath, apiFileName)
      fs.writeFileSync(apiFilePath, apiFileContent, 'utf8')

      // 生成文档文件 - 使用第一个原始标签作为主标签
      const docContent = generateReadmeContent(primaryTag, apis, swaggerData)
      const docFileName = 'README.md'
      const docFilePath = path.join(moduleFolderPath, docFileName)
      fs.writeFileSync(docFilePath, docContent, 'utf8')

      // 生成API文档JSON文件 - 使用第一个原始标签作为主标签，但包含所有标签信息
      const apiDocsContent = generateApiDocsJsonForMergedModule(moduleName, apis, swaggerData, originalTags)
      const apiDocsFileName = 'api-docs.json'
      const apiDocsFilePath = path.join(moduleFolderPath, apiDocsFileName)
      fs.writeFileSync(apiDocsFilePath, JSON.stringify(apiDocsContent, null, 2), 'utf8')

       folderNames.push(moduleName)
       
       // 显示模块信息，如果是合并模块则显示原始标签信息
       if (originalTags.length > 1) {
         console.log(`✅ 生成合并模块: ${moduleName}/ (${apis.length} 个接口，来自标签: ${originalTags.join(', ')})`)
       } else {
         console.log(`✅ 生成模块: ${moduleName}/ (${apis.length} 个接口)`)
       }
        console.log(`   ├── ${apiFileName}`)
        if (isTypeScript && hasTypes) {
          console.log(`   ├── types.ts`)
        }
        console.log(`   ├── README.md`)
        console.log(`   └── api-docs.json`)
    })

    // 生成索引文件
    generateIndexFile(outputDir, folderNames)
    const indexFileName = isTypeScript ? 'index.ts' : 'index.js'
    console.log(`✅ 索引文件生成完成: ${indexFileName}`)

    console.log(`🎉 API文件生成完成! 共生成 ${folderNames.length} 个模块`)
    console.log(`📁 输出目录: ${outputDir}`)
  } catch (error) {
    console.error('❌ 生成失败:', error.message)
    throw error
  }
}

// 命令行执行
if (require.main === module) {
  generateApiFiles().catch(error => {
    console.error('❌ 执行失败:', error.message)
    process.exit(1)
  })
}

module.exports = {
  generateApiFiles,
  getSwaggerDataFromSource,
  readSwaggerFile,
  saveSwaggerData,
  structureSwaggerData,
  compareSwaggerData,
  generateUpdateLog,
  appendUpdateLog,
  groupApisByTag,
  groupApiPathsByModule,
  setConfig,
  getConfig
}
