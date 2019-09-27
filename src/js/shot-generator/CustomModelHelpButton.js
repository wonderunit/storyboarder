const { shell } = require('electron')

const h = require('../utils/h')

const CustomModelHelpButton = ({ style = {
  color: '#eee',
  backgroundColor: '#444',
  padding: '2px 0 0 0'
}}) => {
  const url = 'https://github.com/wonderunit/storyboarder/wiki/Creating-custom-3D-Models-for-Shot-Generator'

  const onPointerUp = event => {
    event.preventDefault()
    shell.openExternal(url)
  }

  return h([
    'a[href=#]',
    {
      style: {
        boxSizing: 'border-box',
        display: 'flex',
        fontSize: '12px',
        lineHeight: '1',
        borderRadius: '50%',
        alignItems: 'center',
        width: '20px',
        height: '20px',
        cursor: 'pointer',

        ...style
      },
      title: `How to Create 3D Models for Custom Objects\n\n${url}`,
      onPointerUp
    },
    [
      'span',
      {
        style: {
          textAlign: 'center',
          display: 'inline-block',
          width: '100%'
        }
      },
      '?'
    ]
  ])
}

module.exports = CustomModelHelpButton
