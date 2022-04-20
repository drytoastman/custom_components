import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import babel from 'rollup-plugin-babel';
import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
// import { terser } from '@rollup/plugin-terser';

const plugins = [
  nodeResolve(),
  /* commonjs({
    include: 'node_modules/**'
  }), */
  typescript(),
  json(),
  babel({
    exclude: 'node_modules/**',
  }),

  // terser()
];

export default [
  {
    input: 'src/locks-panel.ts',
    output: {
      dir: 'dist',
      //format: 'iife',
      //sourcemap: false
    },
    plugins: [...plugins],
    context: 'window'
  },
];
