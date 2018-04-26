let { acceleratorAsHtml } = require('./accelerator')
const Color = require('color-js')

let msToTime = (s)=> {
  if(!s) s = 0
  s = Math.max(0, s)
  function addZ(n) {
    return (n<10? '0':'') + n
  }
  var ms = (s % 1000)
  //s = (s - ms) / 1000.0

  s = Math.round(s / 1000)

  var secs = s % 60
  s = (s - secs) / 60
  var mins = s % 60
  var hrs = (s - mins) / 60
  if (hrs) {
    return hrs + ':' + addZ(mins) + ':' + addZ(secs)
  } else {
    return mins + ':' + addZ(secs)
  }
}

let uidGen = (chars)=> {
  return ("00000" + (Math.random()*Math.pow(36,chars) << 0).toString(36)).slice(-chars).toUpperCase()
}

// via https://gist.github.com/kaizhu256/4482069
let uuid4 = () => {
  // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  var uuid = '', ii
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
    case 8:
    case 20:
      uuid += '-'
      uuid += (Math.random() * 16 | 0).toString(16)
      break
    case 12:
      uuid += '-'
      uuid += '4'
      break
    case 16:
      uuid += '-'
      uuid += (Math.random() * 4 | 8).toString(16)
      break
    default:
      uuid += (Math.random() * 16 | 0).toString(16)
    }
  }
  return uuid
}

let wordCount = (text)=>  {
  if (!text) return 0
  return text.trim().replace(/ +(?= )/g,'').split(' ').length
}

let durationOfWords = (text, durationPerWord) => {
  if (!text) return 0
  return wordCount(text)*durationPerWord
}

let range = (begin, end, step = 1) => {
  let a = [begin], b = begin
  while (b < end) {
    b += step
    a.push(b)
  }
  return a
}

let norm = (val, min, max) => (val - min) / (max - min)

let clamp = (val, min, max) => val < min ? min : (val > max ? max : val)

// Caveats (via https://github.com/ahmadnassri/stringify-clone)
// - cannot clone RegExp (returns {})
// - NaN values will be converted to null
// - Date objects will be converted to ISO strings (equivalent of running Date.toISOString())
//    you can reconstruct the Date by calling new Date(string)
let stringifyClone = (object) => JSON.parse(JSON.stringify(object))

// via https://github.com/skellock/ramdasauce/blob/master/lib/isUndefined.js
let isUndefined = (x) => typeof x === 'undefined'

// return a copy of an array with elements swapped
let swap = (arr, x, y) => {
  let a = arr.slice(0)
  let b = a[x]
  a[x] = a[y]
  a[y] = b
  return a
}

let shuffle = (arr) => {
  let a = arr.slice(0) // make a copy
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = a[i]
    a[i] = a[j]
    a[j] = temp
  }
  return a
}

let compareNumbers = (a, b) => a - b

const pluralize = (number, string) => number > 1 ? string + 's' : string

const sample = list => list[(Math.random() * list.length)|0]

Object.equals = function( x, y ) {
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor

    if ( ! y.hasOwnProperty( p ) ) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal

    if ( typeof( x[ p ] ) !== "object" ) return false;
      // Numbers, Strings, Functions, Booleans must be strictly equal

    if ( ! Object.equals( x[ p ],  y[ p ] ) ) return false;
      // Objects and Arrays must be tested recursively
  }

  for ( p in y ) {
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;
      // allows x[ p ] to be set to undefined
  }
  return true;
}

/**
 * via https://github.com/feross/zero-fill
 * Given a number, return a zero-filled string.
 * From http://stackoverflow.com/questions/1267283/
 * @param  {number} width
 * @param  {number} number
 * @return {string}
 */
const zeroFill = (width, number, pad = '0') => {
  width -= number.toString().length
  if (width > 0) return new Array(width + (/\./.test(number) ? 2 : 1)).join(pad) + number
  return number + ''
}

let uniq = arr => [...new Set(arr)]

// via https://stackoverflow.com/questions/5723154/truncate-a-string-in-the-middle-with-javascript
//     https://stackoverflow.com/questions/831552/ellipsis-in-the-middle-of-a-text-mac-style/36470401#36470401
const truncateMiddle = (string, maxLength = 30, separator = '…') => {
  if (!string) return string
  if (maxLength < 1) return string
  if (string.length <= maxLength) return string
  if (maxLength == 1) return string.substring(0, 1) + separator

  var midpoint = Math.ceil(string.length / 2)
  var toremove = string.length - maxLength
  var lstrip = Math.ceil(toremove / 2)
  var rstrip = toremove - lstrip

  return string.substring(0, midpoint - lstrip) +
         separator +
         string.substring(midpoint + rstrip)
}

const dashed = str => str.replace(/\s+/g, '-')

// via https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
//
// Image data: (wi, hi) and define ri = wi / hi
// Screen resolution: (ws, hs) and define rs = ws / hs
//
// rs > ri ? (wi * hs/hi, hs) : (ws, hi * ws/wi)
//
// top = (hs - hnew)/2
// left = (ws - wnew)/2

const fitToDst = (dst, src) => {
  let wi = src.width
  let hi = src.height
  let ri = wi / hi

  let ws = dst.width
  let hs = dst.height
  let rs = ws / hs

  let [wnew, hnew] = rs > ri ? [wi * hs / hi, hs] : [ws, hi * ws / wi]

  let x = (ws - wnew) / 2
  let y = (hs - hnew) / 2

  return [x, y, wnew, hnew]
}

const colorToNumber = color =>
  ((color.red * 255) << 16) +
    ((color.green * 255) << 8) +
    color.blue * 255

const numberToColor = number =>
  Color([
    (number >> 16) & 255,
    (number >> 8) & 255,
    number & 255
  ])

module.exports = {
  msToTime,
  uidGen,
  uuid4,
  durationOfWords,
  range,
  norm,
  clamp,
  stringifyClone,
  isUndefined,
  swap,
  acceleratorAsHtml,
  shuffle,
  compareNumbers,
  pluralize,
  sample,
  zeroFill,
  uniq,
  truncateMiddle,
  dashed,
  fitToDst,
  colorToNumber,
  numberToColor
}
