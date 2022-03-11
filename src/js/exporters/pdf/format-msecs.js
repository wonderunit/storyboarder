const pad = n => n.toString().padStart(2, '0')

// refactored msToTime from ../src/js/utils
module.exports = msecs => {
  if (!msecs) msecs = 0
  msecs = Math.max(0, msecs)

  let t = Math.round(msecs / 1000)
  let h = Math.floor(t / (60 * 60))
  let m = Math.floor(t / 60) % 60
  let s = Math.floor(t % 60)

  return h > 0
    ? h + ':' + pad(m) + ':' + pad(s)
    : m + ':' + pad(s)
}
