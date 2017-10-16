#!/usr/bin/env bash
npx electron-builder --dir
mocha test/app/index.test.js
