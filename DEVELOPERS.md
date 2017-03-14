# Notes for Developers

Tested with node v6.1.0.

## Developing

    $ npm install
    $ npm start

## Catching Errors during Development

We added an error handler to catch renderer errors and report them to the main process. See [this StackOverflow thread](http://stackoverflow.com/a/39305399) for more detail. However, by default, errors in loaded HTML windows are not logged.

To log errors, and force the main window to open a Developer Tools console, enable `DEBUG` mode:

    $ DEBUG=true npm start

This is useful for catching syntax errors that would otherwise prevent the main window from opening.

## Building a Release

If cross-compiling from Mac to Windows, install [Wine](see https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) first.

    $ npm run build:mac # Mac only
    $ npm run build:win # Windows only
    $ npm run build     # Mac and Windows

Remember to sync data files that have server representation (like `messages.json`).