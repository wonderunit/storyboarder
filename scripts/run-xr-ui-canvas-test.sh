#!/bin/sh
npx trash test/views/xr-ui/dist
mkdir -p test/views/xr-ui/dist/data/system/xr/ui
cp src/data/shot-generator/xr/ui/controls.glb test/views/xr-ui/dist/data/system/xr/ui/controls.glb
cp test/fixtures/xr/xr.storyboarder test/views/xr-ui/dist
cp src/data/shot-generator/xr/*.png test/views/xr-ui/dist/data/system/xr/

mkdir -p test/views/xr-ui/dist/data/presets/poses/
cp $HOME/Library/Application\ Support/Storyboarder/presets/poses/*.jpg test/views/xr-ui/dist/data/presets/poses/

mkdir -p test/views/xr-ui/dist/data/system/objects/
cp src/data/shot-generator/objects/*.jpg test/views/xr-ui/dist/data/system/objects/

mkdir -p test/views/xr-ui/dist/data/system/dummies/gltf/
cp src/data/shot-generator/dummies/gltf/*.jpg test/views/xr-ui/dist/data/system/dummies/gltf/

npx parcel serve test/views/xr-ui/index.html -d test/views/xr-ui/dist -p 9966
