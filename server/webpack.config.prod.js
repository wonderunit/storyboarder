const webpack = require('webpack')
const path = require('path')
// const DotEnv = require('dotenv-webpack')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const apps = require('./apps.json')

const BUILD_DIR = path.resolve(__dirname, 'dist')
const BUILD_FILE_NAME = 'server.js'

module.exports = {
  entry: './src/index.js',
  output: {
    path: BUILD_DIR,
    filename: BUILD_FILE_NAME
  },
  target: 'node',
  node: {
    __dirname: false
  },
  optimization: {
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new CopyPlugin({
      patterns: [
        { from: apps.development.XR, to: apps.production.XR },
        { from: apps.development.AR, to: apps.production.AR },
        { from: 'dist-package.json', to: 'package.json' },
        '.gitignore',
      ],
      options: {
        concurrency: 100
      }
    })
  ]
}
