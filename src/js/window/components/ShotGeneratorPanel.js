const h = require('../../utils/h')

const placeholderPath = `./img/shot-generator/placeholder-thumbnails`

const placeholder = aspectRatio =>
 ({
   0.5625: 'shot-generator-bg-9x16',
   1: 'shot-generator-bg-1x1',
   1.3333333333333333: 'shot-generator-bg-4x3',
   1.7777777777777777: 'shot-generator-bg-16x9',
   1.85: 'shot-generator-bg-1.85x1',
   2.39: 'shot-generator-bg-2.39',
   2: 'shot-generator-bg-2x1'
 }[aspectRatio])

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
              }
            }, [
              [
                'img',
                {
                  width: '100%',
                  src: `${placeholderPath}/${placeholder(aspectRatio)}.png`
                }
              ]
            ]]
        ]]
      ]]
    ]]
  )
}

module.exports = ShotGeneratorPanel
