# P2P Shot Generator Server

## Requirements

Before you start running your server, you should install MongoDB server from the original site (see https://www.mongodb.com/)

## Usage

1. Build the current app, using `npm run build`
2. Move in to the `dist` folder.
3. Run `node ./server.js`

## Deploy

0. Don't forget to install all the node modules in the server folder
1. Build whole app, using `npm run build` in the root directory
2. Use `git add .` - To add all files to the git
3. Use `git commit -m "Commit msg"` - To commit your changes
4. Run `git subtree split --prefix dist -b build` - To create and update build branch from dist folder
5. Run `git push -f heroku build:master` - To push dist folder into heroku master

