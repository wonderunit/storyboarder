

const ModelLoader = require('../../services/model-loader')
const path = require('path')
const { truncateMiddle } = require('../../utils')
const h = require('../../utils/h')
const classNames = require('classnames')
const FileSelect = ({ model, onSelectFile }) => {
    const isCustom = ModelLoader.isCustomModel(model)
    const ext = path.extname(model)
    const basenameWithoutExt = path.basename(model, ext)
    const displayName = truncateMiddle(basenameWithoutExt, 13)
  
    const className = classNames({
      'button__file--selected': isCustom
    })
  
    return h(
      ['div.column', { style: { width: 106 } }, [
        [
          'a.button__file[href=#]', {
            style: { flex: 1, width: '100%', height: 34, whiteSpace: 'nowrap', overflow: 'hidden' },
            className,
            onPointerUp: onSelectFile,
            title: isCustom ? path.basename(model) : undefined
          },
          isCustom
            ? displayName
            : 'Select File …'
        ]
      ]]
    )
  }
  module.exports = FileSelect
