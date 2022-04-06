const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const ProjectMap = {
  shotGenerator: 'shot-generator',
  shotExplorer: 'shot-explorer',
  languagePreferences: 'language-preferences',
  xr: 'xr',
  ar: 'ar'
};

const ProjectMapKeys = Object.keys(ProjectMap);
const ProjectMapValues = Object.values(ProjectMap);

const outPath = (subfolder) => (pathData, assetInfo) => {
  // console.log(pathData)//filename
  // console.log(pathData.module.resourceResolveData.context)
  const chunkName = pathData.runtime//pathData.chunk.name
  if (ProjectMap[chunkName]) {
    return `${chunkName}/${subfolder}/`
  }

  return `not_defined/${subfolder}/`

  // for (let i = 0; i < ProjectMapValues.length; i++) {
  //   const pathPart = ProjectMapValues[i]
  //   if (pathData.indexOf(pathPart) !== -1) {
  //     return `${ProjectMapKeys[i]}/${subfolder}/`
  //   }
  // }

  // return `not_defined/${subfolder}/`
}

const DirMap = {
  'ar': 'src/js/ar/dist/',
  'xr': 'src/js/xr/dist/',
  'shot-generator': 'src/build/',
  'shot-explorer': 'src/build/',
  'print-project': 'src/build/',
  'language-preferences': 'src/build/'
}

const getPath = (entry, res) => {
  if (!DirMap[entry]) {
    return path.join(`prebuild/${entry}/`, res)
  }

  return path.join(DirMap[entry], res)
}

module.exports = {
  entry: {
    shotGenerator: { import: './src/js/windows/shot-generator/window.js', filename: getPath('shot-generator', 'shot-generator.js') },
    shotExplorer: { import: './src/js/windows/shot-explorer/window.js', filename: getPath('shot-explorer', 'shot-explorer.js') },
    printProject: { import: './src/js/windows/print-project/window.js', filename: getPath('print-project', 'print-project.js') },
    languagePreferences: { import: './src/js/windows/language-preferences/window.js', filename: getPath('language-preferences', 'language-preferences.js') },
    xr: { import: './src/js/xr/src/index.js', filename: getPath('xr', '[name].bundle.js') },
    ar: { import: './src/js/ar/src/index.js', filename: getPath('ar', '[name].bundle.js') },
  },
  target: 'electron-main',
  output: {
    path: path.resolve(__dirname, './../'),
    // publicPath: 'auto'
  },
  mode: 'development',
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
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-optional-chaining'
            ]
          }
        }
      },
      {
        test: /\.(sa|sc|c)ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
      {
        test: /\.glsl$/i,
        use: [
          'raw-loader'
        ],
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    uws: "uws"
  },
  optimization: {
    mergeDuplicateChunks: false,
  },
  plugins: [
    // new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new webpack.ProvidePlugin({
      'THREE': 'three'
    }),
    new HtmlWebpackPlugin({
      template: './src/js/ar/src/index.html',
      chunks: ['ar'],
      filename: getPath('ar', 'index.html')
    }),
    new HtmlWebpackPlugin({
      template: './src/js/xr/src/index.html',
      chunks: ['xr'],
      filename: getPath('xr', 'index.html')
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/fonts/thicccboi', to: getPath('xr', 'fonts/thicccboi') }
      ]
    })
  ],
  resolve: {
    alias: {
      'events': 'node_modules/events/index.js'
    }
  }
}
