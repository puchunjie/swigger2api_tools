const { defineConfig } = require('../../lib/utils/defineConfig');

module.exports = defineConfig({
  // 项目基本信息
  projectName: "test-project-js",
  language: "js",

  // 数据源配置 - 使用本地测试文件
  source: "./test/fixtures/sample-swagger.json",
  
  // Swagger 版本配置
  swaggerVersion: "auto",

  // 输出配置
  outputDir: "./test/output/js-api",
  generateTypes: false, // JS项目不生成类型
  
  // 请求库导入配置
  requestImport: "const axios = require('./request')",
  
  // 更新日志配置
  updateLog: {
    enabled: true,
    outputPath: "./test/output/",
  },

  // 模块名生成规则
  moduleNaming: {
    strategy: "tags",
    customFunction: null,
  },

  // API 函数名生成规则
  apiNaming: {
    strategy: "operationId",
    customFunction: null,
  },
});