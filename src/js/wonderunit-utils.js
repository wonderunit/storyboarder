/* 
WONDER UNIT UTILS
  simple utlities used in Wonder Unit apps.
*/

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

module.exports = {
  msToTime,
  uidGen,
  durationOfWords,
  range,
  norm,
  clamp
}
