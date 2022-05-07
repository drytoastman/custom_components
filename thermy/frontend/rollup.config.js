import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import typescript from 'rollup-plugin-typescript2';

const dev = process.env.ROLLUP_WATCH;

const serveopts = {
  contentBase: ['./dist'],
  host: '0.0.0.0',
  port: 5000,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

const plugins = [
  nodeResolve({}),
  commonjs(),
  typescript(),
  json(),
  babel({
    exclude: 'node_modules/**',
  }),
  dev && serve(serveopts)
];

export default [
  {
    input: 'src/thermy-row.ts',
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [...plugins],
    onwarn ( warning, warn ) {
      if (warning.code == 'THIS_IS_UNDEFINED') return;
      warn(warning)
    }
  },
];
