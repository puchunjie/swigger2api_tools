# Swigger2API 测试套件

这个测试套件提供了完整的测试环境，让你在修改代码后能够快速验证功能是否正常。

## 📁 目录结构

```
test/
├── README.md              # 本文档
├── run-tests.js           # 完整测试套件
├── quick-test.js          # 快速测试脚本
├── cleanup.js             # 清理脚本
├── configs/               # 测试配置文件
│   ├── test.config.ts     # TypeScript 项目配置
│   ├── test.config.js     # JavaScript 项目配置
│   └── custom.config.js   # 自定义配置示例
├── fixtures/              # 测试数据
│   └── sample-swagger.json # 示例 Swagger 文档
└── output/                # 测试输出目录
    ├── ts-api/            # TypeScript 生成结果
    ├── js-api/            # JavaScript 生成结果
    └── custom-api/        # 自定义配置生成结果
```

## 🚀 快速开始

### 1. 快速测试（推荐）

在修改代码后，运行快速测试来验证基本功能：

```bash
# 运行快速测试
node test/quick-test.js

# 或者使用 npm script（如果已配置）
npm run test:quick
```

### 2. 完整测试

运行所有测试配置，全面验证功能：

```bash
# 运行完整测试套件
node test/run-tests.js

# 或者使用 npm script（如果已配置）
npm run test:full
```

### 3. 清理测试文件

清理之前的测试输出：

```bash
# 清理测试文件
node test/cleanup.js

# 或者使用 npm script（如果已配置）
npm run test:clean
```

## 📋 测试配置说明

### TypeScript 配置 (`test.config.ts`)

- **目标语言**: TypeScript
- **输出目录**: `./test/output/ts-api`
- **生成类型**: 是
- **模块命名**: 基于 tags
- **API 命名**: 基于 operationId

### JavaScript 配置 (`test.config.js`)

- **目标语言**: JavaScript
- **输出目录**: `./test/output/js-api`
- **生成类型**: 否
- **模块命名**: 基于 tags
- **API 命名**: 基于 operationId

### 自定义配置 (`custom.config.js`)

- **目标语言**: TypeScript
- **输出目录**: `./test/output/custom-api`
- **模块命名**: 自定义函数（路径前缀 + 首字母大写）
- **API 命名**: 自定义函数

## 🧪 测试数据

### 示例 Swagger 文档

`test/fixtures/sample-swagger.json` 包含一个完整的示例 API 文档，包括：

- **用户管理模块** (`user` tag)
  - 获取用户列表 (`GET /users`)
  - 创建用户 (`POST /users`)
  - 获取用户详情 (`GET /users/{id}`)
  - 更新用户 (`PUT /users/{id}`)
  - 删除用户 (`DELETE /users/{id}`)

- **产品管理模块** (`product` tag)
  - 获取产品列表 (`GET /products`)
  - 创建产品 (`POST /products`)

- **订单管理模块** (`order` tag)
  - 获取订单列表 (`GET /orders`)
  - 创建订单 (`POST /orders`)

## 🔧 自定义测试

### 添加新的测试配置

1. 在 `test/configs/` 目录下创建新的配置文件
2. 在 `test/run-tests.js` 中的 `testConfigs` 数组添加新配置
3. 运行测试验证

### 修改测试数据

编辑 `test/fixtures/sample-swagger.json` 来测试不同的 API 结构。

### 创建自定义测试脚本

参考现有脚本创建针对特定功能的测试。

## 📊 测试输出

测试成功后，你会在对应的输出目录看到：

```
output/
├── ts-api/
│   ├── types.ts           # TypeScript 类型定义
│   ├── user/              # 用户模块
│   │   ├── index.ts       # API 函数
│   │   ├── README.md      # 模块文档
│   │   └── api-docs.json  # API 文档 JSON
│   ├── product/           # 产品模块
│   └── order/             # 订单模块
└── api-update-log.md      # 更新日志
```

## 🐛 故障排除

### 常见问题

1. **权限错误**
   ```bash
   chmod +x test/*.js
   ```

2. **模块找不到**
   ```bash
   npm install
   ```

3. **配置文件错误**
   - 检查配置文件语法
   - 确保路径正确

4. **输出目录问题**
   ```bash
   node test/cleanup.js
   ```

### 调试技巧

1. **查看详细输出**
   - 测试脚本会显示命令输出
   - 检查生成的文件内容

2. **单独测试配置**
   ```bash
   node bin/swigger2api.js generate --config test/configs/test.config.ts --force
   ```

3. **检查日志**
   - 查看 `api-update-log.md`
   - 检查控制台输出

## 💡 最佳实践

1. **修改代码后立即测试**
   ```bash
   node test/quick-test.js
   ```

2. **发布前运行完整测试**
   ```bash
   node test/run-tests.js
   ```

3. **定期清理测试文件**
   ```bash
   node test/cleanup.js
   ```

4. **保持测试数据更新**
   - 根据新功能更新示例 Swagger 文档
   - 添加边界情况测试

## 🔄 持续集成

可以将这些测试脚本集成到 CI/CD 流程中：

```json
{
  "scripts": {
    "test": "node test/run-tests.js",
    "test:quick": "node test/quick-test.js",
    "test:clean": "node test/cleanup.js",
    "pretest": "npm run test:clean"
  }
}
```

这样就可以在每次提交或发布前自动运行测试，确保代码质量。