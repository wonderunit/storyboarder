import React, {useCallback, useMemo} from 'react'

import {remote} from 'electron'
const {dialog} = remote

const FileInput = React.memo(({
  value = "(none)", 
  label, onChange, 
  wrapperClassName="input-group",
  refClassName="file-input",
  platform = null,
  ...props
}) => {

  const onFileSelect = useCallback((e) => {
    e.preventDefault()
    if (!onChange) {
      return false
    }
    
    dialog.showOpenDialog(null,
      !platform ? {} : 
      (platform === 'MAC') ? {
          properties:['openFile','openDirectory','multiSelections'],
          message:'Choose file or folder!'
        } : {
          properties:['openFile','multiSelections'],
        }
      )
    .then(({ filePaths, canceled }) => {
      onChange({
        file: ( canceled || (filePaths.length > 1) ) ? undefined : filePaths[0],
        files: ( canceled ) ? [] : filePaths,
        canceled
      })
    })
    .catch(err => console.error(err))
    .finally(() => {
      // automatically blur to return keyboard control
      document.activeElement.blur()
    })    
  }, [onChange])
  
  return (
      <div className={ wrapperClassName }>
        {label ? <div className="input-group__label">{label}</div> : null}
        <div
            className={ refClassName }
            onClick={ onFileSelect }
            title={value}
        >
          <a
            href="#"
            {...props}
          >
            {value}
          </a>
        </div>
      </div>
  )
})

export default FileInput
