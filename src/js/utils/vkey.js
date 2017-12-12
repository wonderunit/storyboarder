// modified version of https://raw.githubusercontent.com/chrisdickinson/vkey/master/index.js
'use strict'

var ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
  , isOSX = /OS X/.test(ua)
  , isOpera = /Opera/.test(ua)
  , maybeFirefox = !/like Gecko/.test(ua) && !isOpera

var i, output = module.exports = {
  0:  isOSX ? 'Menu' : 'UNK'
, 1:  'Mouse 1'
, 2:  'Mouse 2'
, 3:  'Break'
, 4:  'Mouse 3'
, 5:  'Mouse 4'
, 6:  'Mouse 5'
, 8:  'Backspace'
, 9:  'Tab'
, 12: 'Clear'
, 13: 'Enter'
, 16: 'Shift'
, 17: 'Control'
, 18: 'Alt'
, 19: 'Pause'
, 20: 'CapsLock'
, 21: 'Ime-hangul'
, 23: 'Ime-junja'
, 24: 'Ime-final'
, 25: 'Ime-kanji'
, 27: 'Escape'
, 28: 'Ime-convert'
, 29: 'Ime-nonconvert'
, 30: 'Ime-accept'
, 31: 'Ime-mode-change'
, 32: 'Space'
, 33: 'PageUp'
, 34: 'PageDown'
, 35: 'End'
, 36: 'Home'
, 37: 'Left'
, 38: 'Up'
, 39: 'Right'
, 40: 'Down'
, 41: 'Select'
, 42: 'Print'
, 43: 'Execute'
, 44: 'Snapshot'
, 45: 'Insert'
, 46: 'Delete'
, 47: 'Help'
, 91: 'Meta'  // meta-left -- no one handles left and right properly, so we coerce into one.
, 92: 'Meta'  // meta-right
, 93: isOSX ? 'Meta' : 'Menu'      // chrome,opera,safari all report this for meta-right (osx mbp).
, 95: 'Sleep'
, 106: 'Num-*'
, 107: 'Num-+'
, 108: 'Num-enter'
, 109: 'Num--'
, 110: 'Num-.'
, 111: 'Num-/'
, 144: 'NumLock'
, 145: 'ScrollLock'
, 160: 'ShiftLeft'
, 161: 'ShiftRight'
, 162: 'ControlLeft'
, 163: 'ControlRight'
, 164: 'AltLeft'
, 165: 'AltRight'
, 166: 'Browser-back'
, 167: 'Browser-forward'
, 168: 'Browser-refresh'
, 169: 'Browser-stop'
, 170: 'Browser-search'
, 171: 'Browser-favorites'
, 172: 'Browser-home'

  // ff/osx reports 'Volume-mute' for '-'
, 173: isOSX && maybeFirefox ? '-' : 'Volume-mute'
, 174: 'Volume-down'
, 175: 'Volume-up'
, 176: 'Next-track'
, 177: 'Prev-track'
, 178: 'Stop'
, 179: 'Play-pause'
, 180: 'Launch-mail'
, 181: 'Launch-media-select'
, 182: 'Launch-app 1'
, 183: 'Launch-app 2'
, 186: ';'
, 187: '='
, 188: ','
, 189: '-'
, 190: '.'
, 191: '/'
, 192: '`'
, 219: '['
, 220: '\\'
, 221: ']'
, 222: "'"
, 223: 'Meta'
, 224: 'Meta'       // firefox reports meta here.
, 226: 'Alt-gr'
, 229: 'Ime-process'
, 231: isOpera ? '`' : 'Unicode'
, 246: 'Attention'
, 247: 'Crsel'
, 248: 'Exsel'
, 249: 'Erase-eof'
, 250: 'Play'
, 251: 'Zoom'
, 252: 'No-name'
, 253: 'Pa-1'
, 254: 'Clear'
}

// : ; < = > ? @
for(i = 58; i < 65; ++i) {
  output[i] = String.fromCharCode(i)
}

// 0 - 9
for(i = 48; i < 58; ++i) {
  output[i] = (i - 48)+''
}

// a - z (always lowercase)
for (i = 65; i < 91; ++i) {
  output[i] = String.fromCharCode(i).toLowerCase()
}

// num 0 - 9
for(i = 96; i < 106; ++i) {
  output[i] = 'Num-'+(i - 96)+''
}

// F1 - F24
for(i = 112; i < 136; ++i) {
  output[i] = 'F'+(i-111)
}
