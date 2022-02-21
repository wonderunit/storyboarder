const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/js/windows/shot-generator/window.js',
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, './../../src/build'),
    filename: 'shot-generator.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules\/(?!(electron-redux)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { electron: require('electron/package.json').version }
                }
              ],
              '@babel/preset-react'
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-optional-chaining'
            ]
          }
        }
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  plugins: [
    new webpack.ProvidePlugin({
      'THREE': 'three'
    })
  ],
  externals: {
    uws: "uws"
  },
  resolve: {
    alias: {
      'events': 'node_modules/events/index.js'
    }
  }
}
