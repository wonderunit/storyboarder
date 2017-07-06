let keyMapLeft = [
  'Escape F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12',
  '` 1 2 3 4 5 6 7 8 9 0 - = Backspace',
  `Tab Q W E R T Y U I O P [ ] \\`,
  `CapsLock A S D F G H J K L ; ' Return`,
  'Shift Z X C V B N M , . / Shift',
  'Control Option Command Space Command Option Control'
]

let keyMapRight = [
  `F13 F14 F15`,
  `Fn Home PageUp`,
  `Delete End PageDown`,
  ``,
  `Up`,
  `Left Down Right`
]

let commands = [
  ["File", [
      ['Select Pencil', '1'],
      ['Select Pencil', '2'],
      ['Select Pen', '3'],
      ['Select Brush', '4'],
    ]
  ]
]



let renderKeyboard = () => {
  let html = []

  for (var i = 0; i < keyMapLeft.length; i++) {
    html.push('<div class="row">')
    let keys = keyMapLeft[i].split(' ')
    for (var y = 0; y < keys.length; y++) {
      if (keys[y].length > 1) {
        html.push('<div class="key fill" id="key-' + keys[y] + '"><span>' + keys[y] + '</span></div>') 
      } else {
        html.push('<div class="key" id="key-' + keys[y] + '"><span>' + keys[y] + '</span></div>') 
      }
    }

    html.push('</div>')

  }

  document.querySelector('#keyboard .left').innerHTML = html.join('')

  html = []

  for (var i = 0; i < keyMapRight.length; i++) {
    html.push('<div class="row">')
    let keys = keyMapRight[i].split(' ')
    for (var y = 0; y < keys.length; y++) {
      if (keys[y]) {
        html.push('<div class="key" id="key-' + keys[y] + '"><span>' + keys[y] + '</span></div>') 
      }
    }

    html.push('</div>')

  }

  document.querySelector('#keyboard .right').innerHTML = html.join('')

}

renderKeyboard()