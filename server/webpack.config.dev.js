const webpack = require('webpack')
const path = require('path')
const DotEnv = require('dotenv-webpack')

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
    new DotEnv(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    })
  ],
  devtool: 'cheap-source-map'
}