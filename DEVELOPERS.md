# Notes for Developers

Tested with node v6.1.0.

## Developing

    $ cd server && npm install && cd ..
    $ npm install
    $ npm start

## Loading Storyboards via Command Line

Storyboarder accepts an argument for the path to a filename to load when starting up:

    $ npm start ./test/fixtures/example.storyboarder

## Testing

You can run a quick view test using [`budo`](https://github.com/mattdesl/budo) if you have it installed globally (e.g. `npm install -g budo`)

    $ cd test/views/guides
    $ budo index.js --live
    $ open http://localhost:9966

`budo` will "Live Reload" changes as you work, in either the main source or the test harness.

## Building a Release

First, trash any existing build files:

    rm -rf .cache
    rm src/js/xr/dist/*
    rm src/build/*

To compile only (Shot Generator, Shot Explorer, and Shot Generator XR)

    $ npm run build

To compile and build Storyboarder.app:

    $ sudo npm install -g electron-builder
    $ npm run dist:mac    # Mac only
    $ npm run dist:win    # Windows only
    $ npm run dist:linux  # Linux only
    $ npm run dist        # All Platforms

For quick testing:

    $ CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder build -m --arm64 --x64 --dir

- `CSC_IDENTITY_AUTO_DISCOVERY=false` prevents Code Signing and Notarizing
- `--dir` prevents packaging

If cross-compiling from Mac to Windows, install [Wine](see https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) first.

For Linux, you will need these dependencies:

- icnsutils - provides `icns2png`
- graphicsmagick

It is possible to [build for Linux on other platforms using a Docker container](https://www.electron.build/multi-platform-build#build-electron-app-using-docker-on-a-local-machine). See instructions below.

### Building for Linux and Windows with Docker for Mac

First, Install [Docker for Mac](https://www.docker.com/docker-mac).

Clone Storyboarder and start up Docker:
```
git clone git@github.com:wonderunit/storyboarder.git storyboarder
docker run --rm -ti -v ${PWD}:/project -v ${PWD##*/}-node-modules:/project/node_modules -v ~/.electron:/root/.electron electronuserland/builder:wine
```

For Linux, in the Docker instance:
```
cd storyboarder
npm install
npm prune
npm run dist:linux
```

For Windows, in the Docker instance:
```
cd storyboarder
npm install
npm prune

# add the windows ffmpeg, bypassing npm install os and cpu detection
FFMPEG_BIN_TGZ=`npm pack @ffmpeg-installer/win32-x64`
mkdir -p node_modules/@ffmpeg-installer/win32-x64
tar -zxvf $FFMPEG_BIN_TGZ -C node_modules/@ffmpeg-installer/win32-x64 --strip-components=1
rm $FFMPEG_BIN_TGZ

# remove the linux ffmpeg
rm -rf node_modules/@ffmpeg-installer/linux-x64

# if you have the darwin ffmpeg, you npm install'd from mac and that might cause problems
# try again fresh with npm install from linux
# ls node_modules/@ffmpeg-installer/darwin-x64

# build (see https://github.com/wonderunit/storyboarder/issues/858)
ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true npm run dist:win
```

## Testing Auto-Update

- `latest.yml` (for Windows) and `latest-mac.yml` (for Mac) must be published in the GitHub Release along with the other release files.

To test auto update, create a file called `dev-app-update.yml` in the root source folder with contents like:

```
owner: wonderunit
repo: storyboarder
provider: github
```

... then change any `isDev` guards around `autoUpdater` in `main.js`, like so:

```diff
- if (!isDev) autoUpdater.init()
+ autoUpdater.init()
```

... and finally, decrement the current version in `package.json`.

When you run the app, you will be notified that the app is out-of-date (although in dev mode, when unsigned, Squirrel.Mac will throw `Error: Could not get code signature for running application`)

Don’t commit the above changes, they're for testing only.

## Publishing

Be sure to have a local `GH_TOKEN` environment variable. For the value:

    Go to: https://github.com/settings/tokens/new
    Token description: Storyboarder Publishing
    Select scopes: [x] public_repo

Create a Draft in GitHub Releases as the target for publishing

Then, publish:

    GH_TOKEN={...} npm run dist:mac -- --publish onTagOrDraft
    GH_TOKEN={...} npm run dist:win -- --publish onTagOrDraft
    GH_TOKEN={...} npm run dist:linux -- --publish onTagOrDraft

## Deploying

Remember to sync data files that have server representation (like `messages.json`).

## Vendored Libraries

To fix a tooltip bug, we modified the `tether-tooltip` library to use a modified version of one of its dependencies (`tether-drop`).
We forked [tether-drop](https://github.com/HubSpot/drop) to [wonderunit/drop](https://github.com/wonderunit/drop) and applied a fix from [HubSpot/drop/pull/171](https://github.com/HubSpot/drop/pull/171).
The built version is kept in `src/js/vendor/tether-drop` for Storyboarder.
We reference this from a copy of `tether-tooltip`, of which a built version is kept in `src/js/vendor/tether-tooltip`.
