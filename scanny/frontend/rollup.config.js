import babel from 'rollup-plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

// import { terser } from '@rollup/plugin-terser';

const plugins = [
  nodeResolve(),
  commonjs({ include: 'node_modules/**' }),
  typescript(),
  json(),
  babel({ exclude: 'node_modules/**' }),
  // terser()
];

export default [
  {
    input: 'src/scanny-panel.ts',
    output: {
      dir: 'dist',
      //format: 'iife',
      sourcemap: true
    },
    plugins: [...plugins],
    context: 'window'
  },
];
