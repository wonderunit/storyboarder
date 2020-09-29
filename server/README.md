# P2P Shot Generator Server

## HTTPS Setup

To test locally via HTTPS without annoying warnings, you'll need to generate and install a local certificate authority and a locally-trusted development certificate. `mkcert` makes this pretty easy:

    brew install mkcert # install mkcert
    mkcert -install # install CA

Then, from the Storyboarder root source folder, run:

    mkcert -cert-file server/cert.pem -key-file server/key.pem localhost 127.0.0.1

Now you'll have `server/cert.pem` and `server/key.pem`, which the server will use automatically when in `development` mode.

To test, temporarily edit `src/js/services/server/sockets.js` to point to `localhost`:
```diff
 export const serve = (store, service, staticPath, projectPath, userDataPath) => {
   return new Promise((resolve, reject) => {
-    const peer = P2P() // Connect
+    const peer = P2P('localhost') // Connect
     const {io, broadcast} = peer
```

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
2. Go to the server dir running `cd server`
3. Use `git add .` - To add all files to git
4. Use `git commit -m "Commit msg"` - To commit your changes(new build)
5. Run `git subtree split --prefix dist -b build` - To create and update build branch from the dist folder
6. Run `git push -f heroku build:master` - To push dist folder into heroku master https://git.heroku.com/stbr-link.git

### Have troubles with cached node_modules on heroku?

1. Run `heroku plugins:install heroku-repo`
2. Run `heroku repo:purge_cache -a stbr-link`
3. Run `git commit --allow-empty -m "purge cache"`
4. Run `git subtree split --prefix dist -b build`
5. Run `git push -f heroku build:master`

