const path = require('path');

module.exports = {
  mode: 'production',
  entry: `./${process.env.FUNC_PATH}/src-ts/index.ts`,
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: [
          [
            path.resolve(__dirname, 'node_modules'),
          ]
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  { targets: { node: '14' }, useBuiltIns: 'usage', corejs: '3.6' }
                ]
              ]
            }
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
    alias: {
      '@swm-core': path.resolve(__dirname, 'core'),
    },
    modules: [path.resolve(__dirname, 'node_modules')],
  },
  externals: [
    /^aws-sdk/,
    'aws-xray-sdk-core',
    'sharp'
  ],
  output: {
    libraryTarget: 'commonjs2',
    filename: 'index.js',
    path: path.resolve(__dirname, `${process.env.FUNC_PATH}`, 'src'),
  },
  optimization: {
    minimize: false
  }
};