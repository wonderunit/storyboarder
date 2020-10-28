# Thumbnail Renderer Test UI

- Tests the ThumbnailRenderer code
- Generates the pre-rendered thumbnails we ship for use by Shot Generator UI

From the root source folder, build and watch with:

    npx webpack --mode development --target electron-main --module-bind js=babel-loader --watch test/views/thumbnail-renderer/window.js -o src/build/thumbnail-renderer-window.js

... then run with:

    ELECTRON_DISABLE_SECURITY_WARNINGS=true npx electron test/views/thumbnail-renderer/index.js
