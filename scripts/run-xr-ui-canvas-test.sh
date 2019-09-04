#!/bin/sh
npx trash test/views/xr-ui/dist
mkdir -p test/views/xr-ui/dist/data/system/xr/ui
cp src/data/shot-generator/xr/ui/controls.glb test/views/xr-ui/dist/data/system/xr/ui/controls.glb
cp test/fixtures/xr/xr.storyboarder test/views/xr-ui/dist
cp src/data/shot-generator/xr/*.png test/views/xr-ui/dist/data/system/xr/
npx parcel serve --no-hmr test/views/xr-ui/index.html -d test/views/xr-ui/dist -p 9966
