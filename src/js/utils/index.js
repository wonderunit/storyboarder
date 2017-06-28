let { acceleratorAsHtml } = require('./accelerator.js')

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

let clamp = (val, min, max) => val < min? min : (val > max? max : val)

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
  sample
}
