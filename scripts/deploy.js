const fs = require('fs');
const path = require('path');
const util = require('util');
const { spawnSync } = require( 'child_process' );


const GIT_URL = 'https://git.heroku.com/stbr-link.git'
const SOURCE_FOLDER = '../server/dist'
const DIST_FOLDER = '__temp'

/**
 * Look ma, it's cp -R.
 * @param {string} src The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(path.join(src, childItemName),
                            path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
};

const removeDir = (src) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        fs.rmdirSync(src, { recursive: true });
    }
}

const run = (command, args = [], cwd) => {
    const ls = spawnSync( command, args, {cwd, shell: true, env: {PATH: process.env.PATH}});//shell: true
    //console.log(ls)
    //ls.error && console.log('error', ls.error.toString());
    ls.stdout && console.log(ls.stdout.toString());
    ls.stderr && console.error(ls.stderr.toString());
}


const src = path.join(__dirname, SOURCE_FOLDER)
const dst = path.join(__dirname, DIST_FOLDER)

// STEP 0 - remove dist dir if exists
removeDir(dst)

// STEP 1 - copy server into temp directory
copyRecursiveSync(src, dst)

// STEP 2 - init and setup git repository
run('git init', [], dst)
run(`git remote add heroku ${GIT_URL}`, [], dst)
run('git add .', [], dst)
run('git commit -m "update"', [], dst)

// STEP 3 - push to herku
console.log('Deploying...')
run('git push --force heroku master', [], dst)

// STEP 4 - remove dist dir
removeDir(dst)
