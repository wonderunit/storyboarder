const fs = require('fs-extra')
const path = require('path')
const { spawnSync } = require('child_process')

const GIT_URL = 'https://git.heroku.com/stbr-link.git'
const SOURCE_FOLDER = '../server/dist'
const DIST_FOLDER = '__temp'

const run = (command, args = [], cwd) => {
  const ls = spawnSync(command, args, {
    cwd,
    shell: true,
    env: { PATH: process.env.PATH }
  })

  ls.stdout && console.log(ls.stdout.toString())
  ls.stderr && console.error(ls.stderr.toString())
}

const src = path.join(__dirname, SOURCE_FOLDER)
const dst = path.join(__dirname, DIST_FOLDER)

// STEP 0 - remove temp dist dir if exists
console.log('Clearing previous build', dst)
fs.removeSync(dst)

// STEP 1 - copy server into temp directory
console.log('Copying last build')
fs.copySync(src, dst)

// STEP 2 - init and setup git repository
console.log('Initializing git pepository')
run('git init', [], dst)
run(`git remote add heroku ${GIT_URL}`, [], dst)
run('git add .', [], dst)
run('git commit -m "update"', [], dst)

// STEP 3 - push to herku
console.log('Deploying...')
run('git push --force heroku master', [], dst)

// STEP 4 - remove temp dist dir
console.log('Cleaning up')
fs.removeSync(dst)
