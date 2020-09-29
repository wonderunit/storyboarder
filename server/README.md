# P2P Shot Generator Server

## Requirements

Before you start running your server, you should install MongoDB server from the original site (see https://www.mongodb.com/)

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

