const path = require('path')
// via https://github.com/foliojs/fontkit/issues/67
const nodeExternals = require('webpack-node-externals')

module.exports = {
  entry: {
    'print-project': './src/js/windows/print-project/window.js'
  },
  target: 'electron-renderer',
  externals: [nodeExternals({
    allowlist: [/^@thi.ng/]
  })],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './../../src/build'),
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
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
            ]
          }
        }
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  }
}
