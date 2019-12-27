import path from 'path'
import classNames from 'classnames'
import { truncateMiddle } from '../../../utils'
import ModelLoader from '../../../services/model-loader'
import React from 'react'

const FileSelect = React.memo(({ model, onSelectFile }) => {
    const isCustom = ModelLoader.isCustomModel(model)
    const ext = path.extname(model)
    const basenameWithoutExt = path.basename(model, ext)
    const displayName = truncateMiddle(basenameWithoutExt, 13)
  
    const className = classNames( "button__file", {
      "button__file--selected": isCustom
    })
  
    return <div className="column" style={{ width: 106 } }> 
        <a className={ className } href="#" 
            style={{ flex: 1, width: "100%", height: 34, whiteSpace: "nowrap", overflow: "hidden" }}
            onPointerUp={ onSelectFile }
            title={ isCustom ? path.basename(model) : undefined }>
          {isCustom
            ? displayName
            : "Select File …"}
        </a>
      </div>
})
export default FileSelect