const { defineConfig } = require("../../lib/utils/defineConfig");

module.exports = defineConfig({
  // 项目基本信息
  projectName: "custom-test-project",
  language: "js",

  // 数据源配置
  source: "./test/fixtures/response.json",

  // 输出配置
  outputDir: "./test/output/custom-api",
  generateTypes: false,

  // 请求库导入配置
  requestImport: "import request from '@/api/request'",

  // 更新日志配置
  updateLog: {
    enabled: true,
    outputPath: "./test/output/",
  },

  // 自定义模块名生成规则
  moduleNaming: {
    strategy: "custom",
    customFunction: (apiPath, operationId, tags) => {
      // /api/bops/agency/upload/v2/agencyTemplateDownload => agency
      // /api/bops/businessCenter/update/password => businessCenter
      // /api/bops/manage/v2/freezeUser => manage
      // /api/bops/apply/v2/queryReasonsApplyReject/{channelId} => apply
      // /api/bops/v2/dataPermission/demo1/{path} => dataPermission

      // 特殊处理：file-upload-rest 标签的接口应该归到 fileUploadRest 模块
      if (tags && tags.includes("file-upload-rest")) {
        console.log(
          "🔍 自定义函数检测到 file-upload-rest 标签，返回 fileUploadRest 模块名"
        );
        return "fileUploadRest";
      }

      // 分割路径并提取模块名
      const pathSegments = apiPath
        .split("/")
        .filter(
          (segment) => segment && segment !== "api" && segment !== "bops"
        );

      // 处理特殊情况：如果第一个段是 v2，则取第二个段
      if (pathSegments[0] === "v2" && pathSegments.length > 1) {
        return pathSegments[1];
      }

      // 否则取第一个段作为模块名
      return pathSegments[0] || "default";
    },
  },

  // 自定义API函数名生成规则
  apiNaming: {
    strategy: "operationId",
    // customFunction: (operationId, path) => {
    //   // 如果有operationId，使用它；否则从路径和方法生成
    //   if (operationId) {
    //     return operationId;
    //   }

    //   // 从路径生成函数名
    //   const pathParts = path.split("/").filter(Boolean);
    //   const lastPart = pathParts[pathParts.length - 1];

    //   if (lastPart && lastPart.includes("{")) {
    //     // 如果是带参数的路径，如 /users/{id}
    //     return `get${pathParts[0].charAt(0).toUpperCase()}${pathParts[0].slice(
    //       1
    //     )}ById`;
    //   }

    //   return `handle${pathParts.join("")}`;
    // },
  },
});
