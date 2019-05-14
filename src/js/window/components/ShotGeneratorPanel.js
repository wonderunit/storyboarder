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
      ['div.shot-generator-layer-thumbnail', [
        ['a[href=#]', { onClick }, [
          thumbnail
            ? ['img.shot-generator-layer-thumbnail__image', { src: thumbnail, width: '100%' }]
            : ['div.shot-generator-layer-thumbnail__placeholder', {
              width: '100%',
              style: {
                width: '100%',
                height: 0,
                paddingTop: `${1 / aspectRatio * 100}%`
              }
            }]
        ]]
      ]]
    ]]
  )
}

module.exports = ShotGeneratorPanel
