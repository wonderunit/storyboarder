#!/usr/bin/env bash
npx electron-builder --dir
npm test
mocha test/app/index.test.main.js
