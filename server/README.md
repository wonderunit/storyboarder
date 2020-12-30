# P2P Shot Generator Server

## Running the Server Locally with HTTPS

To test locally via HTTPS without annoying warnings, you'll need to generate and install a local certificate authority and a locally-trusted development certificate. `mkcert` makes this pretty easy:

    brew install mkcert # install mkcert
    mkcert -install # install CA

Then, from the Storyboarder root source folder, run:

    mkcert -cert-file server/cert.pem -key-file server/key.pem localhost 127.0.0.1

Now you'll have `server/cert.pem` and `server/key.pem`, which the server will use automatically when in `development` mode.

By default, all the apps (Shot Generator, AR, XR) connect to `https://stbr.link`.

To connect to a local server instead, temporarily change `STBR_HOST` in `src/js/shared/network/config.js` to `localhost`.

## Usage

From the Storyboarder root source folder:

To run both Storyboarder and the P2P server in development mode:

    PORT=443 npm start

This will also build the XR client JavaScript bundle the P2P server needs.

To build just the server to `server/dist/server.js`:

    cd server
    npm install
    npm run build

To build and run just the server:

    cd server
    npm install
    PORT=443 npm start

If a `server/.env` file exists, it can be used to define the `PORT` environment variable, e.g.:

    PORT=443

## Deploy

- Don't forget to install all the node modules in the server folder
- Build whole app, using `npm run build` in the root directory
- Run `npm run deploy:prod` in the root directory to deploy server to the stbr.link
