# Notes for Developers

Tested with node v6.1.0.

## Developing

    $ npm install
    $ npm start

## Building a Release

If cross-compiling from Mac to Windows, install [Wine](see https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) first.

    $ npm run build:mac # Mac only
    $ npm run build:win # Windows only
    $ npm run build     # Mac and Windows

Remember to sync data files that have server representation (like `messages.json`).