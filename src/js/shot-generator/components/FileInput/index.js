import React, {useCallback} from 'react'

const remote = require('@electron/remote')
const {dialog} = remote

const FileInput = React.memo(({
  value = "(none)", 
  label, onChange, 
  wrapperClassName="input-group",
  refClassName="file-input",
  ...props
}) => {
  const onFileSelect = useCallback((e) => {
    e.preventDefault()
    if (!onChange) {
      return false
    }
    
    dialog.showOpenDialog(null, {})
    .then(({ filePaths }) => {
      if (filePaths.length) {
        onChange({
          file: filePaths[0],
          files: filePaths
        })
      } else {
        onChange({
          file: undefined,
          files: []
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
