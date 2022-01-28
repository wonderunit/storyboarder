import React, { useCallback } from 'react'

import {remote} from 'electron'
const {dialog, BrowserWindow} = remote

const FileInput = React.memo(({
  value = "(none)", 
  label, onChange, 
  wrapperClassName="input-group",
  refClassName="file-input",
  platform = null,
  dialogSettings = null,
  onClickUsed = true,
  ...props
}) => {

  const onFileSelect = useCallback((e) => {
    e.preventDefault()
    if (!onChange) {
      return false
    }

    dialog.showOpenDialog( BrowserWindow.getFocusedWindow(), 
      dialogSettings ? dialogSettings() :
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
  }, [onChange,dialogSettings,platform])
  
  return (
      <div className={ wrapperClassName }>
        {label ? <div className="input-group__label">{label}</div> : null}
        <div
            className={ refClassName }
            onClick={ onClickUsed ? onFileSelect : null }
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
