const { defineConfig } = require('../../lib/utils/defineConfig');

module.exports = defineConfig({
  // 项目基本信息
  projectName: "test-project",
  language: "ts",

  // 数据源配置 - 使用本地测试文件
  source: "./test/fixtures/sample-swagger.json",
  
  // Swagger 版本配置
  swaggerVersion: "auto",

  // 输出配置
  outputDir: "./test/output/ts-api",
  generateTypes: true,
  
  // 请求库导入配置
  requestImport: "import axios from '@/utils/request'",
  
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