# P2P Shot Generator Server

## Requirements

Before you start running your server, you should install MongoDB server from the original site (see https://www.mongodb.com/)

## Usage

1. Build the current app, using `npm run build`
2. Move in to the `dist` folder.
3. Run `node ./server.js` to run server directly

### Or

Run `npm run start` in the root directory to run the whole app within a server

## Deploy

0. Don't forget to install all the node modules in the server folder
1. Build whole app, using `npm run build` in the root directory
2. Go to the server dir running `cd server`
3. Use `git add .` - To add all files to the git
4. Use `git commit -m "Commit msg"` - To commit your changes(new build)
5. Run `git subtree split --prefix dist -b build` - To create and update build branch from the dist folder
6. Run `git push -f heroku build:master` - To push dist folder into heroku master https://git.heroku.com/stbr-link.git

### Have troubles with cached node_modules on heroku?

1. Run `heroku plugins:install heroku-repo`
2. Run `heroku repo:purge_cache -a stbr-link`
3. Run `git commit --allow-empty -m "purge cache"`
4. Run `git subtree split --prefix dist -b build`
5. Run `git push -f heroku build:master`

