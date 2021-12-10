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

  const dialogSettings = useMemo(()=>{
    if (!platform) return {}
    switch (platform) {
      case 'MAC':
          return {
            properties:['openFile','openDirectory','multiSelections'],
            message:'Choose file or path!'
          }

      default:
        return {
          properties:['openFile','multiSelections'],
        }
    }
  },[platform])

  const onFileSelect = useCallback((e) => {
    e.preventDefault()
    if (!onChange) {
      return false
    }
    dialog.showOpenDialog(null, dialogSettings)
    .then(({ filePaths, canceled }) => {
      
      console.log('FileInput',filePaths,dialogSettings)
      if (filePaths.length) {
        if (filePaths.length>1){
          onChange({
            file:undefined,
            files: filePaths,
            canceled
          })
        } else {
          onChange({
            file: filePaths[0],
            files: filePaths,
            canceled
          })
        }

      } else {
        onChange({
          file: undefined,
          files: [],
          canceled
        })
      }
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

/*
    // filters:[
    //   {name:'images',extensions:['jpg','jpeg','png']}
    // ]
*/