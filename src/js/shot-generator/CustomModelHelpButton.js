const { shell } = require('electron')

const h = require('../utils/h')

const CustomModelHelpButton = () => {
  const url = 'https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator'

  const onPointerUp = event => {
    event.preventDefault()
    shell.openExternal(url)
  }

  return h([
    'a[href=#]',
    {
      style: {
        // via .button
        display: 'inline-block',
        padding: '9px',
        color: '#eee',
        backgroundColor: '#444',

        // override
        fontSize: '16px',
        lineHeight: '17px',
        borderRadius: '50%',

        // add
        textAlign: 'center',
        height: '100%',
        cursor: 'pointer'
      },
      title: `How to Create 3D Models for Custom Objects (${url})`,
      onPointerUp
    },
    '?'
  ])
}

module.exports = CustomModelHelpButton
