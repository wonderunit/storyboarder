//  npx webpack --mode development --target electron-main --module-bind js=babel-loader --watch test/views/thumbnail-renderer/window.js -o src/build/thumbnail-renderer-window.js
// ELECTRON_DISABLE_SECURITY_WARNINGS=true npx electron test/views/thumbnail-renderer/index.js
require = require('esm')(module)
module.exports = require('./main.js')
