const path = require('path')

const getFilepathForEnv = ( { file } ) => {
  const parts = file.split(/\//)
  let newPath = ''
  for (let i = 0; i < parts.length; i++){
    newPath = path.join( newPath, parts[i] === 'models' ? '/data/user/' : parts[i] )
  }
  return newPath
}

module.exports = getFilepathForEnv