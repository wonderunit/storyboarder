const util = require('./utils/index')

var regex = {
  scene_heading: /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
  scene_number: /( *#(.+)# *)/,
}

// trim all newlines
let trim = string => string.replace(/\r?\n|\r/, '')

// get the EOL char
let eol = string => {
  let m = string.match(/\r?\n|\r/)
  return m && m[0] || ''
}

var insertSceneIds = function (script) {
  var src    = script.split(/\n/g)
    , i      = src.length, line, match, parts, text, meta, x, xlen, dual
    , tokens = []

  let sceneCount = 0

  let addedIds = false

  for (var i = 0; i < src.length; i++) {
    line = src[i]
    
    // scene headings
    if (match = line.match(regex.scene_heading)) {
      sceneCount++
      text = match[1] || match[2]

      if (text.indexOf('  ') !== text.length - 2) {
        if (meta = text.match(regex.scene_number)) {
          meta = meta[2]
          text = text.replace(regex.scene_number, '')
        } else {
          src[i] = trim(src[i]) + ' #' + sceneCount + '-' + util.uidGen(5) + '#' + eol(src[i])
          addedIds = true
        }
      }
      continue
    }
  }
  return [src.join("\n"), addedIds]
}

let fountainSceneIdUtil = {
  insertSceneIds: insertSceneIds,
}

module.exports = fountainSceneIdUtil