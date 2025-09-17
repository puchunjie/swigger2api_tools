import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
  // CommonJS 构建
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'auto'
    },
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json()
    ],
    external: [
      // Node.js 内置模块
      'fs', 'path', 'url', 'util', 'events', 'stream', 'crypto', 'os',
      // 依赖包
      'commander', 'inquirer', 'chalk', 'ora'
    ]
  },
  // ES Module 构建 - 直接从 CommonJS 源文件构建
  {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.mjs',
      format: 'es'
    },
    plugins: [
      resolve({
        preferBuiltins: true
      }),
      commonjs(),
      json()
    ],
    external: [
      // Node.js 内置模块
      'fs', 'path', 'url', 'util', 'events', 'stream', 'crypto', 'os',
      // 依赖包
      'commander', 'inquirer', 'chalk', 'ora'
    ]
  }
];