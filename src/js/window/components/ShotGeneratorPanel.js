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
  let src = thumbnail
    ? thumbnail
    : `${placeholderPath}/${placeholder(aspectRatio)}.png`

  let paddingTop = `${1 / aspectRatio * 100}%`

  return h(
    ['div', [
      ['div.inline', [
        ['svg.smallicon', [
          ['use', { xlinkHref: './img/symbol-defs.svg#icon-camera' }]
        ]],
        ' Shot Generator'
      ]],
      ['div.shot-generator-layer-thumbnail', { style: { paddingTop } }, [
        ['a[href=#]', { onClick }, [
          ['img', { src }]
        ]]
      ]]
    ]]
  )
}

module.exports = ShotGeneratorPanel
