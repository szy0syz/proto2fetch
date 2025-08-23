import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const external = ['ky', 'protobufjs'];

const plugins = [
  resolve({
    preferBuiltins: true
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: true,
    inlineSources: true
  })
];

export default defineConfig([
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external,
    plugins
  },
  
  // Runtime bundle
  {
    input: 'src/runtime/index.ts',
    output: [
      {
        file: 'dist/runtime.mjs',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/runtime.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external,
    plugins
  },

  // Generator bundle
  {
    input: 'src/generator/index.ts',
    output: [
      {
        file: 'dist/generator.mjs',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/generator.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external: [...external, 'fs', 'path'],
    plugins
  },

  // CLI bundle
  {
    input: 'src/cli.ts',
    output: {
      file: 'dist/cli.cjs',
      format: 'cjs',
      sourcemap: true,
      banner: '#!/usr/bin/env node'
    },
    external: [...external, 'fs', 'path', 'process'],
    plugins
  },

  // Type declarations
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  {
    input: 'src/runtime/index.ts',
    output: {
      file: 'dist/runtime.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  {
    input: 'src/generator/index.ts',
    output: {
      file: 'dist/generator.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
]);