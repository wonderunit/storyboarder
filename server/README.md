# P2P Shot Generator Server

## .env

TODO

## HTTPS Setup

To test locally via HTTPS without annoying warnings, you'll need to generate and install a local certificate authority and a locally-trusted development certificate. `mkcert` makes this pretty easy:

    brew install mkcert # install mkcert
    mkcert -install # install CA

Then, from the Storyboarder root source folder, run:

    mkcert -cert-file server/cert.pem -key-file server/key.pem localhost 127.0.0.1

Now you'll have `server/cert.pem` and `server/key.pem`, which the server will use automatically when in `development` mode.

## Usage

From the Storyboarder root source folder:

    npm install
    npm run build
    cd server/dist
    node ./server.js

or, from root, to run both Storyboarder and the P2P server in development mode

    npm start

## Deploy

0. Don't forget to install all the node modules in the server folder
1. Build whole app, using `npm run build` in the root directory
6. Run `npm run deploy:prod` in the root directory to deploy server to the stbr.link

