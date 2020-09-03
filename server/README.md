# P2P Shot Generator Server

## Requirements

Before you start running your server, you should install MongoDB server from the original site (see https://www.mongodb.com/)

## Usage

1. Build the current app, using `npm run build`
2. Move in to the `dist` folder.
3. Run `node ./server.js`

## Deploy

1. Run `git subtree split --prefix dist -b build` - To create and update build branch from dist folder
2. Run `git push -f heroku build:master` - To push dist folder into heroku master

