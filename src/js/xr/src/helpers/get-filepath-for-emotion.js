const isUserModel = require('./is-user-model')
const getFilepathForEmotion = ( emotion ) => {
    if (isUserModel(emotion)) {
      const parts = emotion.split(/[\\\/]/)
      const filename = parts[parts.length - 1]
      return `/data/user/emotions/${filename}`
    } else {
      return `/data/system/emotions/${emotion}.png`
    }
  }
  
  module.exports = getFilepathForEmotion
  