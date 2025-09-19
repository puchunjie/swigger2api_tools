# swigger2api

🚀 A powerful CLI tool to generate TypeScript/JavaScript API code from Swagger/OpenAPI documentation.

## Features

- 🎯 **极简初始化**：只需选择语言，其他都有合理默认值
- 📝 **清晰注释**：每个配置项都有详细说明和TODO提示
- 🔧 **渐进配置**：可以先用默认配置快速开始，后续再自定义
- 💡 **智能模板**：根据JS/TS自动生成对应的配置文件
- 🚀 **开箱即用**：修改3个必要配置项即可开始使用
- 📦 **TypeScript支持**：完整的类型定义生成
- 🔄 **增量更新**：智能检测变化，只更新必要的文件
- 📋 **更新日志**：自动生成详细的API变更日志

## Installation

### Global Installation (Recommended)

```bash
npm install -g swigger2api
```

### Local Installation

```bash
npm install swigger2api --save-dev
```

## Quick Start

### 1. Initialize Configuration

```bash
# Global installation
swigger2api init

# Local installation
npx swigger2api init
```

You'll be prompted to choose your preferred language:
- **TypeScript (.ts)** - Recommended for TypeScript projects
- **JavaScript (.js)** - For JavaScript projects

This will create a `swigger2api.config.js` or `swigger2api.config.ts` file in your project root.

### 2. Configure Your Project

Edit the generated configuration file and update these essential settings:

```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  // 🎯 Required: Your project name
  projectName: "my-awesome-project", // TODO: Change this

  // 📡 Required: Your Swagger documentation source
  source: "http://localhost:3000/api-docs", // TODO: Change this

  // 📦 Required: Request library import (adjust for your project)
  requestImport: "import axios from '@/utils/request'", // TODO: Adjust this

  // Other settings have sensible defaults
  language: "ts",
  outputDir: "./src/api",
  generateTypes: true,
  // ... more options
});
```

### 3. Generate API Code

```bash
# If installed globally
swigger2api generate

# If installed locally (use npx)
npx swigger2api generate

# Force regeneration (even if no changes detected)
swigger2api generate --force
# or with npx
npx swigger2api generate --force

# Use custom config file
swigger2api generate --config ./custom.config.js
# or with npx
npx swigger2api generate --config ./custom.config.js
```

> **Note**: The `swigger2api` command can be used directly only when installed globally. If installed locally as a project dependency, you need to prefix it with `npx`.

## Configuration Options

### Basic Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectName` | `string` | `"my-project"` | Your project name |
| `language` | `"js" \| "ts"` | `"ts"` | Target language |
| `source` | `string \| object \| function` | `null` | Swagger documentation source |
| `outputDir` | `string` | `"./src/api"` | Output directory for generated files |
| `generateTypes` | `boolean` | `true` | Whether to generate TypeScript types |
| `requestImport` | `string` | `"import axios from '@/utils/request'"` | Request library import statement |

### Advanced Configuration

```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  // Update log configuration
  updateLog: {
    enabled: true,
    outputPath: "./",
  },

  // Module naming strategy
  moduleNaming: {
    strategy: "tags", // "tags" | "custom"
    customFunction: null, // Custom naming function
  },

  // API function naming strategy
  apiNaming: {
    strategy: "operationId", // "operationId" | "custom"
    customFunction: null, // Custom naming function
  },
});
```

## Data Source Types

The `source` configuration supports multiple types:

### 1. URL (Most Common)
```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  source: "http://localhost:3000/api-docs"
  // or
  // source: "https://api.example.com/swagger.json"
});
```

### 2. Local File Path
```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  source: "./swagger.json"
  // or
  // source: "/path/to/swagger.json"
});
```

### 3. JSON Object
```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  source: {
    openapi: "3.0.0",
    info: { title: "My API", version: "1.0.0" },
    paths: { /* ... */ }
  }
});
```

### 4. Async Function
```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  source: async () => {
    const response = await fetch("http://api.example.com/docs");
    return response.json();
  }
});
```

## Generated File Structure

```
src/api/
├── types/           # TypeScript type definitions
│   ├── common.ts
│   └── [module].ts
├── [module]/        # API modules grouped by tags
│   ├── index.ts
│   └── types.ts
└── index.ts         # Main export file
```

## CLI Commands

### `swigger2api init`

Initialize a new configuration file.

**Options:**
- `-l, --language <language>` - Specify language (js|ts), default: ts

**Examples:**
```bash
swigger2api init
swigger2api init --language js
```

### `swigger2api generate`

Generate API code from Swagger documentation.

**Options:**
- `-f, --force` - Force regeneration even if no changes detected
- `-c, --config <path>` - Specify config file path, default: ./swigger2api.config.js

**Examples:**
```bash
swigger2api generate
swigger2api generate --force
swigger2api generate --config ./custom.config.js
```

## Examples

### Basic TypeScript Setup

```typescript
// swigger2api.config.ts
import { defineConfig } from 'swigger2api';

export default defineConfig({
  projectName: "my-app",
  language: "ts" as const,
  source: "http://localhost:8080/v3/api-docs",
  requestImport: "import request from '@/utils/request'",
  outputDir: "./src/api",
});
```

### JavaScript with Custom Axios

```javascript
// swigger2api.config.js
import { defineConfig } from 'swigger2api';

export default defineConfig({
  projectName: "my-app",
  language: "js",
  source: "https://petstore.swagger.io/v2/swagger.json",
  requestImport: "const axios = require('./http-client')",
  outputDir: "./api",
});
```

### Custom Module Naming

```javascript
import { defineConfig } from 'swigger2api';

export default defineConfig({
  projectName: "my-app",
  source: "http://localhost:3000/api-docs",
  moduleNaming: {
    strategy: "custom",
    customFunction: (apiPath, operationId, tags) => {
      // Extract module name from API path
      const pathParts = apiPath.split('/').filter(Boolean);
      return pathParts[1] || 'default';
    },
  },
});
```

## Troubleshooting

### Common Issues

1. **Configuration file not found**
   ```bash
   # Make sure you've run init first
   swigger2api init
   ```

2. **Source URL not accessible**
   ```bash
   # Check if your Swagger URL is accessible
   curl http://localhost:3000/api-docs
   ```

3. **Permission errors**
   ```bash
   # Make sure you have write permissions to the output directory
   chmod 755 ./src/api
   ```

### Debug Mode

Set the `DEBUG` environment variable for verbose output:

```bash
DEBUG=swigger2api swigger2api generate
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Your Name](https://github.com/yourusername/swigger2api)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

Made with ❤️ by the swigger2api team