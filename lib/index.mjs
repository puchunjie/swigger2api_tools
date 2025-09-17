import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 导入CommonJS模块
const commonjsModule = require('./index.js');

// ES6 命名导出
export const defineConfig = commonjsModule.defineConfig;
export const loadConfig = commonjsModule.loadConfig;
export const generateApiCode = commonjsModule.generateApiCode;
export const utils = commonjsModule.utils;

// 默认导出
export default commonjsModule;