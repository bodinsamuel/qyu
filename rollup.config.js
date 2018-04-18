const commonjs = require('rollup-plugin-commonjs');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const uglify = require('rollup-plugin-uglify');
const pkg = require('./package.json');

module.exports = [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'Qyu',
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [
      resolve({
        jsnext: true,
        main: true,
        browser: true,
      }),
      commonjs(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      }),
      process.env.NODE_ENV === 'production' && uglify(),
    ],
  },
];
