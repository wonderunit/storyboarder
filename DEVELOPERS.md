# Notes for Developers

Tested with node v6.1.0.

## Developing (optionally you could use [yarn](https://yarnpkg.com/en/))

    $ npm install
    $ npm start

## Loading Storyboards via Command Line

Storyboarder accepts an argument for the path to a filename to load when starting up:

    $ npm start ../fixtures/example.storyboarder

## Testing

You can run a quick view test using [`budo`](https://github.com/mattdesl/budo) if you have it installed globally (e.g. `npm install -g budo`)

    $ cd test/views/guides
    $ budo index.js --live
    $ open http://localhost:9966

`budo` will "Live Reload" changes as you work, in either the main source or the test harness.

## Building a Release

    $ npm run dist:mac    # Mac only
    $ npm run dist:win    # Windows only
    $ npm run dist:linux  # Linux only
    $ npm run dist        # All Platforms

If cross-compiling from Mac to Windows, install [Wine](see https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) first.

For Linux, you will need these dependencies:

- icnsutils - provides `icns2png`
- graphicsmagick

It is possible to [build for Linux on other platforms using a Docker container](https://github.com/electron-userland/electron-builder/wiki/Docker).

## Deploying

Remember to sync data files that have server representation (like `messages.json`).
