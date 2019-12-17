const path = require('path')

module.exports = {
  entry: './src/js/windows/shot-generator-new/window.js',
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, './../../src/build'),
    filename: 'shot-generator.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
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
            plugins: ['@babel/plugin-proposal-class-properties']
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
