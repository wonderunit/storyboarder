const h = require('../../utils/h')

const ShotGeneratorPanel = ({ thumbnail, onClick, aspectRatio }) => {
  return h(
    ['div', [
      ['div.inline', [
        ['svg.smallicon', [
          ['use', { xlinkHref: './img/symbol-defs.svg#icon-camera' }]
        ]],
        ' Shot Generator'
      ]],
      ['div', [
        ['a[href=#]', { onClick }, [
          thumbnail
            ? ['img', { src: thumbnail, width: '100%', padding: '3px 0 0 0' }]
            : ['div', {
              width: '100%',
              style: {
                width: '100%',
                height: 0,
                paddingTop: `${1 / aspectRatio * 100}%`,
                backgroundColor: 'white'
              }
            }]
        ]]
      ]]
    ]]
  )
}

module.exports = ShotGeneratorPanel
